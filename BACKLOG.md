# BACKLOG – ADHD Accountability Assistant

Format:

- `[MVP]` – wymagane do pierwszej stabilnej wersji,
- `[Post-MVP]` – po MVP,
- `[Bug]`, `[Tech Debt]`, `[Feature]`, `[Docs]` – typ zadania.

Kolumny:

- TODO – nie zaczęte,
- In Progress – w trakcie,
- Done – zakończone.

---

## TODO

MVP jest shipped – nowe zadania lądują w sekcji **Post‑MVP** niżej.

---

## In Progress

Brak – MVP jest shipped.

---

## Done

- **MVP shipped (2026-01-24)**: kluczowe funkcje działają local‑first/offline, build/test green, dokumentacja utrzymywana jako źródło prawdy.

- [MVP][Docs] Wprowadzić pliki PLAN.md, DECISIONS.md, BACKLOG.md jako źródło prawdy (2026-01-24).
- [MVP][Docs] Dodać `docs/SKILLS.md` + `docs/AI_KNOWLEDGE.md` (2026-01-24).
- [MVP][Tech] Dodać `.cursor/rules` z zasadami pracy (2026-01-24).

- [MVP][Bug] Naprawić `utils/scheduler.ts` (async bug + local-first) + testy scheduler (2026-01-24).
- [MVP][Bug] Uprościć i ustabilizować service worker `public/sw.js` (cache/offline, bez localStorage/AI) (2026-01-24).
- [MVP][Bug] **Local-first (D-010): brak twardych zależności od `/api/*`** (2026-01-24).

- [Tech Debt][Bug] Naprawa regresji `utils/inputValidation.ts` (10 failing testów → green) (2026-01-24).

- [MVP][Tech] **ESLint + Prettier** (konfiguracja + skrypty + D-052 → decided) (2026-01-24).

- [MVP][Feature] Definicja DONE per task (model + migracje + minimalna ścieżka UI) (2026-01-24).
- [MVP][Feature] Model sesji Finish Mode (AppData + AppContext, historia sesji) (2026-01-24).
- [MVP][Feature] UI Finish Mode: start/stop sesji + notatka użytkownika (2026-01-24).
- [MVP][Feature] Finish Mode: klasyfikacja taska (DONE/W TRAKCIE/STUCK) + zapis do historii + `aiSummary` z fallbackiem + update `Task.finishStatus` (2026-01-24).
- [MVP][Feature] Statystyki Finish Mode (7 dni) + main-goal streak (MVP) na dashboardzie (2026-01-24).
- [MVP][Feature] **Stuck→Done rate (7 dni)**: event log na bazie historii sesji + metryka na dashboardzie (2026-01-24).

- [MVP][Feature] **Model celów + UI edycji**: `type` / `strategy` / `aiTone` + wymuszenie maks. 1 `main` (2026-01-24).
- [MVP][Feature] **Limit 3 aktywnych celów** (logika + UI + komunikaty) (2026-01-24).

- [MVP][Feature] System nagród: model + UI + ocena earned/not_yet na podstawie statystyk Finish Mode (2026-01-24).

- [MVP][Feature] **Osobista baza pomysłów**: model + UI (Ideas Vault) + filtrowanie/powiązania z celami (2026-01-24).
- [MVP][Feature] **Integracja pomysłów z AI** (kontekst promptów: planowanie celu + Finish Mode) (2026-01-24).
- [MVP][Tech] **Centralizacja promptów AI** (`utils/aiPrompts.ts` + wspólny wrapper do Ollamy) (2026-01-24).

---

## Post‑MVP

### Produkt / UX

- [Post-MVP][Feature] **Powiadomienia push** (PWA) z inteligentną deduplikacją i “najlepszym momentem” (anti‑spam).
- [Post-MVP][Feature] **Raport tygodniowy** (statystyki + AI): “co domknąłeś, gdzie utknąłeś, 1–2 next steps”.
- [Post-MVP][Feature] **Finish Mode: osobny “następny mikrokrok” dla `in_progress`/`stuck`** + przycisk “wklej do taska/notatki”.
- [Post-MVP][Feature] **Głosowe powiadomienia / voice nudges** (po stabilizacji i testach na mobile).
- [Post-MVP][Feature] Rozbudowa “Historia zwycięstw” (timeline ważnych finiszy, szczególnie `stuck→done`).

### AI / wiedza

- [Post-MVP][Feature] **Loader wiedzy AI** z `docs/AI_KNOWLEDGE.md` (zamiast tylko excerpt) + wersjonowanie/krótki edytor.
- [Post-MVP][Feature] Twardsze guardrails na prompt‑injection (zwłaszcza w notatkach/ideas) + logowanie decyzji AI.

### Tech / utrzymanie

- [Post-MVP][Docs] Utrzymywać PLAN.md / DECISIONS.md / BACKLOG.md jako źródło prawdy (ciągła praktyka).
- [Post-MVP][Tech Debt] **Ujednolicenie struktury katalogów** (`components/` → `src/components/`, `utils/` → `src/utils/`) małymi krokami (D-051).
- [Post-MVP][Tech] Migracja ESLint do **flat config** (`eslint.config.js`) i uporządkowanie warningów (bez blokowania dev).
- [Post-MVP][Tech] CI (GitHub Actions): `lint` + `test` + `build` na PR.
- [Post-MVP][Tech Debt] Naprawa/wycofanie “Phase 2 normalized data” w AI Coach (obecnie TODO w kodzie).

### Rozszerzenia produktu

- [Post-MVP][Feature] Multi‑user / sync (opcjonalny backend), z zachowaniem local‑first.
- [Post-MVP][Feature] Backup/sync do chmury (dla właściciela) + eksport/import wersjonowany.
