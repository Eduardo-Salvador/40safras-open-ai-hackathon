# Source reconciliation

This document records planning inputs without copying private event access details or
presenting reference implementation as hackathon work.

## Inputs reviewed

- Participant guide PDF: authoritative for schedule, rules, prohibited categories,
  submission, judging, and prizes.
- Attack-plan PDF: useful timebox, pitch, offline, and rubric strategy; advisory.
- `quarenta-safras-doc-tecnico.md`: v1 analytical method and deterministic/LLM boundary.
- `quarentasafras-v2_1.html`: v2 product/UX hypothesis with synthetic demonstration values.
- `quarenta-safras-glossario.md`: domain vocabulary and v2 operational framing.
- `quarenta-safras-guia-implementacao.md`: v1 implementation reference and known traps.
- Obsidian notes under “Inteligencia Artificial em Software”: harness, agent loops,
  memory, context, sandboxes, verification, orchestration, graph engineering, prompting,
  subagents, worktrees, permissions, and skills.
- Official OpenAI documentation for current model and Responses API guidance.

The source files remain outside the repository. This repo contains a condensed,
sanitized interpretation suitable for a public project.

## Conflicts resolved

| Source tension | Resolution in this harness |
|---|---|
| v1 diagnoses a season; v2 creates an operational planting order | Adopt v2 slim; keep the historical strip as proof |
| Full v2 includes planning, money, replan, artifacts, IBGE, NASA, multiple crops | Keep any municipality, simple money, plan/replan, WhatsApp output; order the rest as extensions |
| Implementation guide suggests Streamlit fallback | Reject it because the event explicitly prohibits Streamlit |
| Older demo script assumes four minutes | Redesign for the official approximately three-minute live demo |
| Technical doc promises any municipality | Implement live geocoding/climate plus prepared municipality caches |
| Vault recommends deep hooks/memory/coverage for mature systems | Use one fast check, compact plan memory, critical-engine tests, independent review |
| Multi-agent parallelism can collide on a shared tree | Freeze schemas, assign exclusive paths, dispatch only DAG-ready disjoint tasks |
| Reference HTML contains working mock behavior | Treat as hypothesis/reference only; ask organizers and rebuild authorized code |

## Claims requiring caution

- “End of rains” is a project-defined operational threshold, not an official published
  agronomic variable.
- Monetary results depend on declared assumptions and should be cut if not validated.
- IBGE analog ranges are historical evidence and must not be presented as point forecasts.
- ERA5/Open-Meteo resolution does not support true field-level precision.
- The prototype does not replace ZARC or professional agronomic advice.
