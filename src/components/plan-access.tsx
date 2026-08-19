"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  FarmOperationInput,
  HistoricalDataset,
  ReplanResult,
} from "@/domain/schemas";
import styles from "./plan-access.module.css";

type SavedAnalysis = {
  id: string;
  title: string;
  createdAt: string;
  replans: ReplanResult[];
};

type PlanAccessProps = {
  title: string;
  operation: FarmOperationInput;
  dataset: HistoricalDataset;
  onReplan?: (replan: ReplanResult) => void;
};

type Flow = "idle" | "checking" | "login" | "saving" | "record" | "review" | "replanning" | "complete" | "error";

type SessionResponse = { authenticated: boolean; username?: string };

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function createBrowserId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function PlanAccess({ title, operation, dataset, onReplan }: PlanAccessProps) {
  const formId = useId();
  const sessionId = useRef(createBrowserId("field-event"));
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [flow, setFlow] = useState<Flow>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [effectiveDate, setEffectiveDate] = useState(operation.startDate);
  const [blockedFieldIds, setBlockedFieldIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechUnavailable, setSpeechUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [latestReplan, setLatestReplan] = useState<ReplanResult | null>(null);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  async function savePlan(): Promise<SavedAnalysis | null> {
    setFlow("saving");
    const response = await fetch("/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, operation, dataset }),
    });
    const body = await readJson(response);
    if (!response.ok || !body.analysis) {
      setFlow("error");
      setMessage("Não foi possível guardar este plano agora. Tente de novo em alguns instantes.");
      return null;
    }

    const saved = body.analysis as SavedAnalysis;
    setAnalysis(saved);
    setFlow("record");
    setMessage("Plano guardado. Agora toque no microfone e conte o que aconteceu.");
    return saved;
  }

  async function startReport() {
    setFlow("checking");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const body = (await readJson(response)) as SessionResponse;
      if (!response.ok || !body.authenticated) {
        setFlow("login");
        return;
      }

      setUsername(body.username ?? null);
      await savePlan();
    } catch {
      setFlow("error");
      setMessage("Não conseguimos abrir o acesso agora. Confira a conexão e tente novamente.");
    }
  }

  async function loginAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlow("checking");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const body = (await readJson(response)) as SessionResponse;
      if (!response.ok || !body.authenticated) {
        setFlow("login");
        setMessage("Usuário ou senha não conferem. Tente novamente.");
        return;
      }

      setUsername(body.username ?? email.trim());
      setPassword("");
      await savePlan();
    } catch {
      setFlow("login");
      setMessage("Não conseguimos entrar agora. Tente novamente em alguns instantes.");
    }
  }

  function toggleField(fieldId: string) {
    setBlockedFieldIds((current) =>
      current.includes(fieldId) ? current.filter((id) => id !== fieldId) : [...current, fieldId],
    );
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechUnavailable(true);
      setMessage("Este navegador não conseguiu ouvir sua fala. Você pode escrever o imprevisto logo abaixo.");
      return;
    }

    const recognition = new Recognition();
    const transcriptBeforeRecording = notes.trim();
    let finalTranscript = "";

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0].transcript.trim();
        if (event.results[index].isFinal) finalTranscript = `${finalTranscript} ${phrase}`.trim();
        else interimTranscript = `${interimTranscript} ${phrase}`.trim();
      }
      setNotes([transcriptBeforeRecording, finalTranscript, interimTranscript].filter(Boolean).join(" "));
    };
    recognition.onerror = () => {
      setIsListening(false);
      setMessage("Não conseguimos ouvir bem. Tente novamente ou escreva o que aconteceu.");
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setMessage("Pode falar. Conte o que aconteceu, quando começou e quais talhões foram afetados.");
    setIsListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function reviewRecording() {
    stopListening();
    const normalized = notes.toLocaleLowerCase("pt-BR");
    const mentionedFields = operation.fields
      .filter((field) => normalized.includes(field.id.toLocaleLowerCase("pt-BR")))
      .map((field) => field.id);

    if (!notes.trim()) {
      setMessage("Conte ou escreva o que aconteceu antes de continuar.");
      return;
    }
    if (blockedFieldIds.length === 0 && mentionedFields.length > 0) setBlockedFieldIds(mentionedFields);
    setMessage(null);
    setFlow("review");
  }

  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysis) return;
    if (blockedFieldIds.length === 0) {
      setMessage("Marque pelo menos um talhão que foi afetado para refazer o plano.");
      return;
    }

    setFlow("replanning");
    setMessage(null);
    const draftVersion = createBrowserId("event-draft");
    const fieldEvent = {
      effectiveDate,
      blockedFieldIds,
      seedDeltaAreaHaByCycle: {},
      notes: notes.trim() ? [notes.trim()] : ["imprevisto informado pelo produtor"],
    };

    try {
      const challengeResponse = await fetch("/api/confirmations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current, subject: "field_event", draftVersion }),
      });
      const challenge = await readJson(challengeResponse);
      if (!challengeResponse.ok || typeof challenge.confirmationToken !== "string") {
        throw new Error("confirmation unavailable");
      }

      const replanResponse = await fetch(`/api/analyses/${analysis.id}/replan`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId.current,
          draftVersion,
          confirmationToken: challenge.confirmationToken,
          affirmative: true,
          method: "button",
          event: fieldEvent,
        }),
      });
      const body = await readJson(replanResponse);
      if (!replanResponse.ok || !body.replan) throw new Error("replan failed");

      const replan = body.replan as ReplanResult;
      setLatestReplan(replan);
      setFlow("complete");
      setMessage("Pronto. Guardamos o imprevisto e refizemos o plano a partir do que você contou.");
      onReplan?.(replan);
    } catch {
      setFlow("review");
      setMessage("Não conseguimos refazer o plano agora. Seus dados continuam guardados; tente novamente.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUsername(null);
    setAnalysis(null);
    setLatestReplan(null);
    setNotes("");
    setBlockedFieldIds([]);
    setFlow("idle");
    setMessage("Você saiu deste acesso. O resultado calculado continua aberto nesta tela.");
  }

  const replanDelta = latestReplan
    ? latestReplan.after.metrics.secondCropAreaP20Ha - latestReplan.before.metrics.secondCropAreaP20Ha
    : null;

  return (
    <section className={styles.access} aria-labelledby={`${formId}-title`}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Se algo mudar no campo</p>
        <h3 id={`${formId}-title`}>Aconteceu um imprevisto?</h3>
        <p>
          Se a chuva, um talhão ou a semente mudarem o seu dia, entre para guardar este plano e refazer a ordem.
        </p>
      </div>

      {flow === "idle" || flow === "checking" || flow === "error" ? (
        <div className={styles.startCard}>
          <p>O plano que você acabou de calcular fica aberto aqui. O acesso só é pedido se quiser registrar um imprevisto.</p>
          <button type="button" className={styles.primaryAction} onClick={startReport} disabled={flow === "checking"}>
            {flow === "checking" ? "Abrindo acesso…" : "Registrar um imprevisto"}
          </button>
        </div>
      ) : null}

      {flow === "login" ? (
        <form className={styles.loginForm} onSubmit={loginAndSave}>
          <div>
            <p className={styles.formTitle}>Entre para guardar este plano</p>
            <p className={styles.formHint}>Assim você consegue contar o imprevisto e fazer outro plano sem perder este resultado.</p>
          </div>
          <label htmlFor={`${formId}-email`}>
            Usuário
            <input
              id={`${formId}-email`}
              type="text"
              autoComplete="username"
              placeholder="demo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label htmlFor={`${formId}-password`}>
            Senha
            <input
              id={`${formId}-password`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryAction}>Entrar e guardar plano</button>
            <button type="button" className={styles.quietAction} onClick={() => setFlow("idle")}>Agora não</button>
          </div>
          <p className={styles.demoNote}>Demonstração: este acesso é compartilhado e guarda os planos em um arquivo local.</p>
        </form>
      ) : null}

      {flow === "saving" ? <p className={styles.status}>Guardando seu plano…</p> : null}

      {analysis && (flow === "record" || flow === "review" || flow === "replanning" || flow === "complete") ? (
        <div className={styles.savedContext}>
          <div>
            <p className={styles.savedLabel}>Plano guardado</p>
            <p>{analysis.title}</p>
          </div>
          {username ? <button type="button" className={styles.quietAction} onClick={logout}>Sair</button> : null}
        </div>
      ) : null}

      {flow === "record" ? (
        <div className={styles.voiceReport}>
          <div>
            <p className={styles.formTitle}>Conte o que aconteceu</p>
            <p className={styles.formHint}>Fale do seu jeito. Se souber, diga quando começou e qual talhão foi afetado.</p>
          </div>
          <button
            type="button"
            className={styles.voiceAction}
            data-listening={isListening ? "true" : "false"}
            onClick={isListening ? stopListening : startListening}
          >
            <span className={styles.voiceActionIcon} aria-hidden="true">{isListening ? "■" : "●"}</span>
            <strong>{isListening ? "Parar gravação" : "Toque para falar"}</strong>
            <small>{isListening ? "Estamos ouvindo você" : "O áudio não será guardado"}</small>
          </button>
          <label htmlFor={`${formId}-transcript`}>
            {speechUnavailable ? "Escreva o que aconteceu" : "O que entendemos da sua fala"}
            <textarea
              id={`${formId}-transcript`}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex.: choveu forte hoje e não dá para entrar no talhão T-01."
            />
          </label>
          <button type="button" className={styles.primaryAction} onClick={reviewRecording}>
            Conferir o que foi entendido →
          </button>
        </div>
      ) : null}

      {flow === "review" || flow === "replanning" ? (
        <form className={styles.eventForm} onSubmit={submitEvent}>
          <div>
            <p className={styles.formTitle}>Confira o que entendemos</p>
            <p className={styles.formHint}>Ajuste se precisar. O plano só será refeito depois da sua confirmação.</p>
          </div>
          <div className={styles.spokenSummary}>
            <span>Seu relato</span>
            <p>{notes}</p>
          </div>
          <label htmlFor={`${formId}-date`}>
            Quando isso começou?
            <input id={`${formId}-date`} type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} required />
          </label>
          <fieldset>
            <legend>Qual talhão foi afetado?</legend>
            <div className={styles.fieldChoices}>
              {operation.fields.map((field) => (
                <label key={field.id} className={styles.fieldChoice}>
                  <input
                    type="checkbox"
                    checked={blockedFieldIds.includes(field.id)}
                    onChange={() => toggleField(field.id)}
                  />
                  <span>{field.id} · {field.areaHa} ha</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor={`${formId}-notes`}>
            Corrigir ou completar o relato
            <textarea
              id={`${formId}-notes`}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Conte o que precisa ser corrigido."
            />
          </label>
          <div className={styles.formActions}>
            <button type="button" className={styles.quietAction} onClick={() => setFlow("record")} disabled={flow === "replanning"}>
              Voltar e gravar de novo
            </button>
            <button type="submit" className={styles.primaryAction} disabled={flow === "replanning"}>
              {flow === "replanning" ? "Refazendo o plano…" : "Confirmar e refazer plano"}
            </button>
          </div>
        </form>
      ) : null}

      {flow === "complete" && latestReplan ? (
        <div className={styles.replanResult}>
          <p className={styles.formTitle}>Novo plano pronto</p>
          <p>
            No cenário mais cauteloso, a área de milho mudou de {latestReplan.before.metrics.secondCropAreaP20Ha} ha para {latestReplan.after.metrics.secondCropAreaP20Ha} ha.
            {replanDelta !== null ? ` Isso representa ${replanDelta >= 0 ? "+" : ""}${replanDelta} ha.` : ""}
          </p>
          <button type="button" className={styles.primaryAction} onClick={() => {
            setNotes("");
            setBlockedFieldIds([]);
            setFlow("record");
          }}>Registrar outro imprevisto</button>
        </div>
      ) : null}

      {message ? <p className={styles.message} role="status">{message}</p> : null}
    </section>
  );
}
