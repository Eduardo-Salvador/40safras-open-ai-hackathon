"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import { OperationForm } from "@/components/operation-form";

export default function Home() {
  const wizardRef = useRef<HTMLDivElement>(null);
  const [wizardEngaged, setWizardEngaged] = useState(false);

  const moveToWizard = useCallback((behavior: ScrollBehavior) => {
    const wizard = wizardRef.current;

    if (!wizard) {
      return;
    }

    wizard.scrollIntoView({ behavior, block: "center", inline: "nearest" });
    window.setTimeout(
      () => wizard.focus({ preventScroll: true }),
      behavior === "smooth" ? 420 : 0,
    );
  }, []);

  const openWizard = useCallback(() => {
    setWizardEngaged(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.requestAnimationFrame(() => {
      moveToWizard(reducedMotion ? "auto" : "smooth");
    });
  }, [moveToWizard]);

  useEffect(() => {
    if (window.location.hash !== "#operation-input") {
      return;
    }

    window.requestAnimationFrame(() => {
      setWizardEngaged(true);
      moveToWizard("auto");
    });
  }, [moveToWizard]);

  const handleCtaClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    window.history.pushState(null, "", "#operation-input");
    openWizard();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.nav}>
          <span className={styles.wordmark}>
            <span>40</span>SAFRAS
          </span>
          <span className={styles.navTag}>protótipo para demonstração</span>
        </nav>

        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>Safra 2025/26 · soja e milho de segunda safra</p>
          <h1 className={styles.heroTitle}>
            Conte sobre sua lavoura. <em>Vamos juntos, passo a passo.</em>
          </h1>
          <p className={styles.heroSub}>
            Conte o município, a área e a plantadeira do seu jeito. Primeiro organizamos
            as informações; depois você confere e autoriza o cálculo. O plano só aparece
            no final, depois de tudo confirmado.
          </p>
          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="#operation-input" onClick={handleCtaClick}>
              <span className={styles.micDot} aria-hidden="true" />
              Começar agora
            </a>
          </div>
          <p className={styles.heroNote}>
            Esta ferramenta ajuda a organizar a decisão. Ela não substitui orientação de
            agrônomo, ZARC, crédito ou seguro.
          </p>
        </header>

        <section
          className={`${styles.section} ${wizardEngaged ? styles.sectionEngaged : ""}`}
          id="operation-input"
        >
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Sua lavoura</p>
            <h2 className={styles.sectionTitle}>Comece contando sobre o seu plantio.</h2>
            <p className={styles.sectionSub}>
              Você pode falar ou digitar. Vamos preencher uma etapa de cada vez. Antes de
              calcular, você confere tudo e confirma.
            </p>
          </div>
          <div
            aria-label="Etapa para contar sobre a lavoura"
            className={styles.wizardFocusTarget}
            ref={wizardRef}
            tabIndex={-1}
          >
            <OperationForm />
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerBoundary}>
            Quarenta Safras é um protótipo para ajudar na decisão. Não substitui o ZARC,
            o agrônomo, crédito ou seguro. As informações de clima são da região, não são
            uma medição feita dentro da sua fazenda.
          </p>
          <p className={styles.footerMeta}>
            OpenAI Hackathon Brasil · Clima, Cidades e Agricultura
          </p>
        </footer>
      </div>
    </div>
  );
}
