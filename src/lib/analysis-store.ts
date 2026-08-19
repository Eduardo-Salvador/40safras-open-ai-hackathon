import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  FarmOperationInputSchema,
  HistoricalDatasetSchema,
  PlanResultSchema,
  ReplanResultSchema,
  type FarmOperationInput,
  type HistoricalDataset,
  type PlanResult,
  type ReplanResult,
} from "@/domain/schemas";

export const AnalysisRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  operation: FarmOperationInputSchema,
  dataset: HistoricalDatasetSchema,
  plan: PlanResultSchema,
  replans: z.array(ReplanResultSchema),
});
const AnalysisFileSchema = z.array(AnalysisRecordSchema);

export type AnalysisRecord = z.infer<typeof AnalysisRecordSchema>;
export type NewAnalysis = {
  title: string;
  operation: FarmOperationInput;
  dataset: HistoricalDataset;
  plan: PlanResult;
};

export class FileAnalysisStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = process.env.ANALYSIS_STORE_PATH ?? join(process.cwd(), ".data", "analyses.json"),
    private readonly now: () => Date = () => new Date(),
    private readonly idFactory: () => string = randomUUID,
  ) {}

  private async readAll(): Promise<AnalysisRecord[]> {
    try {
      return AnalysisFileSchema.parse(JSON.parse(await readFile(this.filePath, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeAll(records: AnalysisRecord[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(records, null, 2), "utf8");
    await rename(temporaryPath, this.filePath);
  }

  list(): Promise<AnalysisRecord[]> {
    return this.readAll();
  }

  async get(id: string): Promise<AnalysisRecord | null> {
    return (await this.readAll()).find((record) => record.id === id) ?? null;
  }

  async create(input: NewAnalysis): Promise<AnalysisRecord> {
    const timestamp = this.now().toISOString();
    const record = AnalysisRecordSchema.parse({
      id: this.idFactory(),
      title: input.title,
      createdAt: timestamp,
      updatedAt: timestamp,
      operation: input.operation,
      dataset: input.dataset,
      plan: input.plan,
      replans: [],
    });
    await this.enqueue(async () => this.writeAll([...(await this.readAll()), record]));
    return record;
  }

  async addReplan(id: string, replan: ReplanResult): Promise<AnalysisRecord | null> {
    let updated: AnalysisRecord | null = null;
    await this.enqueue(async () => {
      const records = await this.readAll();
      const index = records.findIndex((record) => record.id === id);
      if (index < 0) return;
      updated = AnalysisRecordSchema.parse({
        ...records[index],
        updatedAt: this.now().toISOString(),
        replans: [...records[index].replans, replan],
      });
      records[index] = updated;
      await this.writeAll(records);
    });
    return updated;
  }

  private async enqueue(work: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(work, work);
    this.writeQueue = next.catch(() => undefined);
    await next;
  }
}

export const analysisStore = new FileAnalysisStore();
