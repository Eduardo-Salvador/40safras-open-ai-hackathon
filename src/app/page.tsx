import styles from "./page.module.css";
import { SeasonStrip } from "@/components/season-strip";
import { OperationForm } from "@/components/operation-form";

const TOTAL_AREA_HA = 850;

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <span className={styles.wordmark}>
            <span>40</span>SAFRAS
          </span>
          <span className={styles.navTag}>protótipo · hackathon</span>
        </nav>

        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>Safra 2025/26 · soja → milho segunda safra</p>
          <h1 className={styles.heroTitle}>
            Fale sua operação. <em>Prove com 41 safras.</em>
          </h1>
          <p className={styles.heroSub}>
            Descreva o município, a área e a plantadeira em português. O agente confirma
            o que entendeu — e um motor determinístico testa a sequência contra 41 safras
            climáticas reais antes de qualquer número aparecer na tela.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="#operation-input">
              <span className={styles.micDot} aria-hidden="true" />
              Começar briefing
            </a>
            <a className={styles.ctaSecondary} href="#historical-proof">
              Ver prova histórica
            </a>
          </div>
          <p className={styles.heroNote}>
            Isto é decisão de apoio, não orientação ZARC, agronômica, financeira,
            de crédito ou de seguro.
          </p>
        </header>

        <section className={styles.section} id="historical-proof">
          <SeasonStrip totalAreaHa={TOTAL_AREA_HA} />
        </section>

        <section className={styles.section} id="operation-input">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Briefing da operação</p>
            <h2 className={styles.sectionTitle}>O que a IA confirma antes de calcular.</h2>
            <p className={styles.sectionSub}>
              Escolha voz, texto natural ou formulário. Os três modos chegam ao mesmo
              rascunho editável e exigem confirmação antes do cálculo determinístico.
            </p>
          </div>

          <OperationForm />
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerBoundary}>
            Quarenta Safras é um protótipo de apoio à decisão. Não substitui o ZARC nem
            constitui orientação agronômica, financeira, de crédito ou de seguro. A
            resolução climática é regional (ERA5/Open-Meteo), não medição de campo.
          </p>
          <p className={styles.footerMeta}>
            OpenAI Hackathon Brasil · Clima, Cidades e Agricultura
          </p>
        </footer>
      </div>
    </div>
  );
}
