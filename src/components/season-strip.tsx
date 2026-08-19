import styles from "./season-strip.module.css";
import { percentile } from "@/domain/metrics";

// Illustrative default: percentage of totalAreaHa reachable for second crop
// per season. Zeroed entries stand in for a full washout that season.
const ILLUSTRATIVE_AREA_PCT_BY_SEASON = [
  62, 71, 55, 80, 44, 68, 73, 58, 36, 64, 77, 50, 0, 0, 0, 0, 60, 74, 66, 45,
  82, 69, 38, 57, 72, 64, 0, 0, 48, 61, 75, 58, 42, 67, 80, 53, 0, 63, 71, 59,
  46,
];

export type SeasonStripSeason = { label: string; areaHa: number };

type SeasonStripProps = {
  totalAreaHa: number;
  seasons?: SeasonStripSeason[];
  eyebrow?: string;
  heading?: string;
  tag?: string;
};

export function SeasonStrip({
  totalAreaHa,
  seasons,
  eyebrow = "Olhando para safras passadas",
  heading = "Veja em quais safras deu tempo de plantar milho.",
  tag = "dados de exemplo",
}: SeasonStripProps) {
  const resolvedSeasons =
    seasons ??
    ILLUSTRATIVE_AREA_PCT_BY_SEASON.map((pct, i) => ({
      label: String(i + 1),
      areaHa: Math.round((pct / 100) * totalAreaHa),
    }));

  const viableCount = resolvedSeasons.filter((s) => s.areaHa > 0).length;
  const areaValues = resolvedSeasons.map((s) => s.areaHa);
  const p20Ha = Math.round(percentile(areaValues, 20));
  const p20Pct = totalAreaHa > 0 ? Math.round((p20Ha / totalAreaHa) * 100) : 0;
  const maxAreaHa = Math.max(...areaValues, 1);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className={styles.heading}>{heading}</h2>
        </div>
        <span className={styles.tag}>{tag}</span>
      </div>

      <div
        className={styles.strip}
        role="img"
        aria-label={`Em ${viableCount} de ${resolvedSeasons.length} safras, deu tempo de plantar milho na segunda safra`}
      >
        {resolvedSeasons.map((s, i) => (
          <span
            key={`${s.label}-${i}`}
            className={styles.bar}
            data-viable={s.areaHa > 0}
            style={{ height: `${18 + (s.areaHa / maxAreaHa) * 70}px` }}
            title={`Safra ${s.label}: ${s.areaHa} ha onde deu tempo de plantar milho`}
          />
        ))}
      </div>

      <div className={styles.stats}>
        <div className={styles.statGroup}>
          <span className={styles.dot} data-tone="soy" />
          <span>deu tempo de plantar milho</span>
        </div>
        <div className={styles.statGroup}>
          <span className={styles.dot} data-tone="risk" />
          <span>não deu tempo de plantar milho</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            {viableCount}
            <span className={styles.metricOf}>/{resolvedSeasons.length}</span>
          </span>
          <span className={styles.metricLabel}>safras em que deu para plantar milho</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            {p20Ha}
            <span className={styles.metricOf}> ha</span>
          </span>
          <span className={styles.metricLabel}>área de milho no cenário mais cauteloso</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricValue}>
            {p20Pct}
            <span className={styles.metricOf}>%</span>
          </span>
          <span className={styles.metricLabel}>parte da área nesse cenário mais cauteloso</span>
        </div>
      </div>
    </div>
  );
}
