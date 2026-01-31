# RAPORT AUDYTU - FlexGrafik ADHD OS (Mission Control)

Data: 2026-01-30

## 1. PODSUMOWANIE WYKONAWCZE

Aplikacja jest **local-first PWA** (Vite + React + TypeScript) z mocnym naciskiem na „finish-first” i mechanikę anti‑90% (Finish Mode, Definition of DONE, insights, deklaracje). Największe ryzyka to **rozjazd architektury** (dwie równoległe struktury UI: `components/` i `src/`), **dług/dokumentacja niezgodna z kodem**, oraz kilka miejsc o podwyższonym ryzyku (przechowywanie API key w danych użytkownika, potencjalnie martwy/niebezpieczny kod w `notificationCenter`).

## 2. STACK TECHNOLOGICZNY

- **Build/Dev**: Vite 6 (`vite.config.ts`)
- **Frontend**: React 19 + TypeScript (`package.json`, `index.tsx`, `App.tsx`)
- **UI/animacje**: Tailwind CSS 4 + custom CSS tokens (`src/styles/**`), Framer Motion, lucide-react
- **Testy**: Jest (`jest.config.js`, `tests/**`, `utils/__tests__/**`)
- **PWA**: `public/sw.js`, `public/manifest.json`, `public/offline.html`, rejestracja w `index.html`
- **State management**: React Context API (`contexts/AppContext.tsx`)
- **Persistence**: IndexedDB (preferowane) + fallback localStorage (`utils/indexedDBStorage.ts`, `utils/storageManager.ts`)
- **AI**:
  - Provider OpenAI‑compatible (domyślnie Groq) przez `fetch` (`utils/aiProvider.ts`, `constants.ts: AI_CONFIG.endpoint`)
  - Opcjonalnie lokalna Ollama (`utils/config.ts: OLLAMA_BASE_URL`, `utils/aiPrompts.ts: ollamaGenerateText`)
- **Deploy/hosting**: Firebase Hosting (konfiguracja + skrypty), opcjonalnie Vercel (`firebase.json`, `DEPLOYMENT.md`, `package.json`)

## 3. STRUKTURA PROJEKTU

Poniżej drzewo katalogów (bez wypisywania wszystkich plików `.md` w root – jest ich dużo, ale nie wpływają na runtime).

```
/
├── .cursor/                      # reguły pracy agenta (Cursor)
├── .firebase/                    # cache Firebase
├── .github/                      # templates issue
├── components/                   # GŁÓWNY zestaw ekranów i komponentów używany w runtime
│   ├── common/                   # wspólne UI (EmptyState, LoadingSpinner, CollapsibleAIAssistant)
│   ├── onboarding/               # onboarding flow
│   ├── screens/                  # ekrany „screens/*”
│   └── *.tsx                     # Premium UI: Dashboard/Finish/Settings/Sprint/Timer/Ideas/EveningProtocol…
├── contexts/
│   └── AppContext.tsx            # single source of truth (AppData) + akcje + persistence
├── docs/                         # dokumentacja (AI_KNOWLEDGE, SKILLS)
├── hooks/                        # legacy hooks (accessibility, focus trap, keyboard shortcuts…)
├── migrations/                   # pliki SQL (dokumentacja/plan backendu)
├── public/                       # PWA assets: sw.js, offline.html, manifest.json
├── scripts/                      # narzędzia build/verify
├── src/                          # „nowa” warstwa design systemu (atomic design) + style
│   ├── components/               # atoms/molecules/organisms/templates + responsive + accessible
│   ├── hooks/                    # hooki DS (useNavigation, useTaskActions…)
│   ├── styles/                   # tokens/components/utilities/mobile-optimizations
│   ├── types/                    # typy komponentów DS
│   └── utils/                    # utils DS (np. accessibility)
├── tests/                        # testy JS (Jest)
├── types/                        # typy pomocnicze (normalized)
├── utils/                        # logika domenowa + storage + AI + scheduler + walidacje
├── App.tsx                       # root UI wiring: RouteManager + Navigation + managers
├── index.html                    # PWA bootstrap + SW registration + install prompt
├── index.tsx                     # entry React, AppProvider
├── types.ts                      # model domeny (AppData, Task, Pillar, ViewState…)
└── vite.config.ts                # konfiguracja bundlingu/code splitting
```

**Wniosek architektoniczny**: repo ma **dwie równoległe „warstwy UI”**:

- aktualnie używana: `components/**` + `contexts/**` + `utils/**` w root,
- docelowa (wg decyzji D‑051 i `ARCHITECTURE_README.md`): `src/**` (atomic design).

To powoduje DRY violations, trudność w nawigacji po projekcie i ryzyko martwego kodu.

## 4. MAPA FUNKCJONALNOŚCI

| Funkcja                                            |                              Status | Plik/Lokalizacja                                                                                                |
| -------------------------------------------------- | ----------------------------------: | --------------------------------------------------------------------------------------------------------------- |
| Boot aplikacji (React root + provider)             |                                  ✅ | `index.tsx`, `App.tsx`, `contexts/AppContext.tsx`                                                               |
| Routing (stanowy, bez react-router)                |                                  ✅ | `types.ts: ViewState`, `components/RouteManager.tsx`                                                            |
| Nawigacja dolna + „More”                           |                                  ✅ | `components/Navigation.tsx`                                                                                     |
| Dashboard (priorytety, cele aktywne/backlog, CTA)  |                                  ✅ | `components/DashboardPremium.tsx`                                                                               |
| Goal/Pillar: tworzenie/edycja, limit aktywnych     |                                  ✅ | `contexts/AppContext.tsx`, `utils/goalHelpers.ts`, `DECISIONS.md (D-003)`                                       |
| Pillar detail (widok celu + taski)                 |                                  ✅ | `components/PillarDetailPremium.tsx`                                                                            |
| Task lifecycle (progress/status/history)           |                                  ✅ | `types.ts`, `utils/taskHelpers.ts`, `contexts/AppContext.tsx`                                                   |
| Finish Mode (sesje, klasyfikacja, DONE, AI helper) |                                  ✅ | `components/FinishMode.tsx`, `contexts/AppContext.tsx`                                                          |
| Timer (Pomodoro)                                   |                                  ✅ | `components/TimerPremium.tsx`, `types.ts: TimerState`                                                           |
| Sprint (weekly view)                               |                                  ✅ | `components/SprintViewPremium.tsx`                                                                              |
| „Today” (check-in / dzisiejsze)                    |                                  ✅ | `components/TodayPremium.tsx`                                                                                   |
| AI Coach (chat)                                    |                                  ✅ | `components/screens/AICoachPremium.tsx`, `contexts/AppContext.tsx`, `utils/aiProvider.ts`, `utils/aiPrompts.ts` |
| AI nudges przy utknięciu                           |                    ✅ (best-effort) | `contexts/AppContext.tsx: triggerOllamaNudge`, `utils/aiProvider.ts`                                            |
| Ideas Vault (baza pomysłów)                        |                                  ✅ | `components/IdeasVaultPremium.tsx`, `contexts/AppContext.tsx`                                                   |
| Evening Protocol (planowanie + deklaracje)         |                                  ✅ | `components/EveningProtocolPremium.tsx`, `types.ts`                                                             |
| Declarations Display / Done Criteria editor        |                                  ✅ | `components/DeclarationsDisplay.tsx`, `components/DeclarationDoneCriteriaEditor.tsx`                            |
| Goal Agent (kary, checki deklaracji)               |         ⚠️ częściowo / ryzyko bugów | `utils/goalAgentService.ts`, `utils/scheduler.ts`                                                               |
| Custom rules (parser + akcje)                      |                               ✅/⚠️ | `utils/ruleConditionParser.ts`, `utils/errorHandler.ts:safeEvalCondition`                                       |
| In-app notifications (toast + historia)            |                               ✅/⚠️ | `components/ToastProvider.tsx`, `utils/toastService.ts`, `utils/notificationCenter.ts`                          |
| Scheduler „stuck audit”                            |                      ⚠️ ograniczone | `utils/scheduler.ts` (działa tylko gdy karta otwarta)                                                           |
| Import/Export danych użytkownika                   |                                  ✅ | `utils/storageManager.ts`, `components/SettingsPremium.tsx`                                                     |
| Backup/restore (IndexedDB)                         |                                  ✅ | `utils/indexedDBStorage.ts`, `utils/storageManager.ts`                                                          |
| PWA offline shell + cache                          |                                  ✅ | `public/sw.js`, `index.html`, `public/offline.html`                                                             |
| Deploy na hosting                                  |                                  ✅ | `firebase.json`, `DEPLOYMENT.md`, `package.json`                                                                |
| Nowy design system (atomic design)                 | ⚠️ w trakcie migracji / małe użycie | `src/components/**`, `src/styles/**`, `ARCHITECTURE_README.md`                                                  |

## 5. FLOW UŻYTKOWNIKA

### Główne ścieżki

- **Pierwsze uruchomienie**
  - `App.tsx` sprawdza `localStorage: flexgrafik_onboarding_completed` → pokazuje `components/onboarding/OnboardingFlow.tsx`.
  - Po onboardingu użytkownik trafia na **Dashboard** (`ViewState: home`).

- **Daily loop (najważniejszy)**
  - Dashboard → wybór celu/tasków → przejście do **Finish Mode**.
  - W Finish Mode użytkownik:
    - wybiera task (preferowane: close + wysoki progress),
    - uruchamia sesję (`startFinishSession`) i kończy ją klasyfikacją (done/in_progress/stuck),
    - domyka task do 100% i aktualizuje status.

- **Nawigacja**
  - Dolny pasek: `Dashboard` → `Finish` → `AI` oraz „Więcej” (Today/Sprint/Ideas/Account/Rules/Settings).
  - Routing jest realizowany przez `currentView: ViewState` w `AppContext`.

- **Evening Protocol**
  - CTA na Dashboard prowadzi do `ViewState: evening_protocol` (planowanie, deklaracje na jutro).

### Ekrany (ViewState → komponent)

- `home` → `components/DashboardPremium.tsx`
- `today` → `components/TodayPremium.tsx`
- `finish` → `components/FinishMode.tsx`
- `sprint` → `components/SprintViewPremium.tsx`
- `pillar_detail` → `components/PillarDetailPremium.tsx`
- `timer` → `components/TimerPremium.tsx` (w osłonie RouteManager)
- `ai_coach` → `components/screens/AICoachPremium.tsx`
- `ideas` → `components/IdeasVaultPremium.tsx`
- `evening_protocol` → `components/EveningProtocolPremium.tsx`
- `rules` → `components/RulesPremium.tsx`
- `settings` → `components/SettingsPremium.tsx`
- `accountability` → widok inline w `components/RouteManager.tsx`

## 6. OCENA JAKOŚCI KODU

**Ocena: 7/10**

**Mocne strony**

- **Local-first** realnie wdrożone: IndexedDB + fallback localStorage, backup/restore, migracje (`utils/storageManager.ts`, `utils/storageUtils.ts`, `utils/migrateData.ts`).
- Spójny model domeny w `types.ts` (Pillar/Task/FinishSession/EveningProtocol/GoalAgent).
- PWA zaprojektowane „stability-first”: SW bez /api cache, bez localStorage, bez ciężkiej logiki (`public/sw.js`).
- Sensowne code splitting w `RouteManager` (lazy imports) + stabilny build (Vite build przechodzi).

**Słabe strony / ryzyka**

- **Monolityczny `AppContext.tsx`** (~1600+ linii) miesza domenę, persistence, AI i akcje UI → trudniejsza utrzymywalność/testowanie.
- **Rozjazd architektury**: `components/` (runtime) vs `src/` (docelowy DS) + dokumentacja sugerująca inne pliki (`ARCHITECTURE_README.md`) niż istnieją w repo.
- Niespójny error/UX: miejscami toasty, miejscami `alert()`, miejscami `console.*`.
- Potencjalnie martwy lub ryzykowny kod (np. `notificationCenter.ts` z odwołaniem do nieistniejącej funkcji).

## 7. ZIDENTYFIKOWANE PROBLEMY

| Problem                                                                                     | Lokalizacja                                                                         | Priorytet (1-5) | Opis                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notificationCenter.ts` odwołuje się do `generateMotivation` bez importu                    | `utils/notificationCenter.ts`                                                       |               5 | Kod w `executeRuleAction` może wywołać runtime error jeśli kiedykolwiek zostanie użyty; wygląda na martwy/legacy fragment.                               |
| API key AI jest przechowywany w danych użytkownika (IndexedDB/localStorage) i eksportowalny | `types.ts: AISettings`, `utils/storageManager.ts`, `components/SettingsPremium.tsx` |               5 | Ryzyko bezpieczeństwa (key w plaintext w backup/export). W PWA na urządzeniu mobilnym to szczególnie wrażliwe.                                           |
| `index.html` zawiera importmap do `https://esm.sh`                                          | `index.html`                                                                        |               4 | Dodatkowa zależność sieciowa i potencjalna kolizja z bundlingiem Vite; pogarsza offline-first i może tworzyć nieprzewidywalne zachowanie.                |
| Wyłączanie `console.error` w produkcji                                                      | `App.tsx`                                                                           |               4 | Utrudnia diagnostykę błędów i integrację z error tracking (Sentry itp.).                                                                                 |
| `window.appContext` wystawiane globalnie                                                    | `contexts/AppContext.tsx`, `index.tsx`                                              |               4 | Ułatwia debug, ale stan (w tym API key) jest dostępny dla dowolnych skryptów na stronie.                                                                 |
| Scheduler działa tylko gdy karta jest otwarta                                               | `utils/scheduler.ts`                                                                |               4 | Na mobile PWA scheduler będzie niestabilny; komentarze mówią o SW/backend cron, ale implementacja jest window‑based.                                     |
| Niespójna dokumentacja architektury (opisuje pliki, których nie ma)                         | `ARCHITECTURE_README.md` vs realny `contexts/`                                      |               3 | Wprowadza w błąd kolejnych devów/agentów; zwiększa koszt zmian.                                                                                          |
| Duplikacja komponentów i wzorców (dwie warstwy UI)                                          | `components/**` vs `src/components/**`                                              |               3 | DRY violations, ryzyko „kodu widma”, wolniejsze wdrażanie zmian.                                                                                         |
| Brak mechanizmu otwierania ekranu z `manifest.json` shortcut `/?view=...`                   | `public/manifest.json` + brak parsera query                                         |               3 | Shortcuts sugerują routing parametrem, ale nie ma kodu który mapuje `?view=` na `currentView`.                                                           |
| `SettingsPremium` używa `alert()` i `console.log` w UI krytycznym                           | `components/SettingsPremium.tsx`                                                    |               2 | UX niespójny; utrudnia testy i dostępność (alerty).                                                                                                      |
| Komentarze „PostgreSQL/REST API” nie mają pokrycia w kodzie runtime                         | `README.md`, `utils/scheduler.ts`, `migrations/**`                                  |               2 | Dług dokumentacyjny: wygląda jak plan backendu bez implementacji; może mylić o prawdziwych integracjach.                                                 |
| Background Sync w Settings może nie działać                                                 | `components/SettingsPremium.tsx` + `public/sw.js`                                   |               2 | UI próbuje `registration.sync.register`, ale SW nie implementuje kolejki sync; zachowanie zależy od przeglądarki i może dawać fałszywe poczucie „syncu”. |
| `App.tsx` trzyma onboarding poza storageManager                                             | `App.tsx`                                                                           |               2 | Drobna niespójność: część stanu w localStorage poza kontrolą migracji/backup.                                                                            |
| Mixed language w UI (PL/EN) i copywriting                                                   | wiele plików UI                                                                     |               2 | Na mobile może pogarszać czytelność i spójność produktu.                                                                                                 |
| Brak dedykowanego „typecheck” w skryptach                                                   | `package.json`                                                                      |               2 | TypeScript błędy nie są weryfikowane w pipeline (przy refaktorach ryzyko regresji).                                                                      |
| Ostrzeżenie bundlera: moduł AI ładowany dynamicznie i statycznie                            | `utils/aiProvider.ts`, `utils/scheduler.ts`                                         |               1 | Wpływ: code-splitting mniej skuteczny; nie jest krytyczne funkcjonalnie.                                                                                 |

## 8. REKOMENDACJE

1. **Ujednolicić strukturę katalogów** (D‑051): migrować etapami do `src/` albo jasno oznaczyć `src/` jako „future/experimental”; ograniczyć duplikację.
2. **Usunąć importmap z `index.html`** (albo zabezpieczyć warunkowo tylko do specyficznych trybów), żeby nie psuć offline-first i bundlingu.
3. **Zabezpieczyć AI API key**:
   - minimum: ostrzeżenie przy eksporcie, opcja „exclude secrets”, rozdzielić „user data” od „secrets”.
   - docelowo: trzymać key poza eksportem/backupem lub szyfrować (zrozumieć trade-offy w PWA).
4. **Naprawić/wyciąć martwy kod**:
   - `utils/notificationCenter.ts`: usunąć lub poprawić `generateMotivation` i jasno określić czy AI w powiadomieniach ma wrócić.
5. **Dodać obsługę `?view=`** (jeśli ma to działać): na starcie aplikacji mapować query → `currentView`, zgodnie z `manifest.json` shortcuts.
6. **Nie wyłączać `console.error` w produkcji**: zamiast tego podpiąć error tracking lub zostawić minimalne logowanie krytyczne.
7. **Stabilny scheduler na mobile**: jeśli to wymaganie produktowe, przenieść na:
   - push/notifications (jeśli uprawnienia),
   - albo prosty „audit on app resume” zamiast pseudo-cron w otwartej karcie.
8. **Dodać `npm run typecheck` + CI**: minimalna bramka jakości (TS + lint + testy kluczowych utils).

## 9. PYTANIA DO PRODUCT OWNERA

1. Czy docelowa aplikacja to wyłącznie **PWA**, czy planowana jest **React Native** / natywna aplikacja mobilna?
2. Czy AI (Groq/Ollama) ma być funkcją „premium” i czy użytkownik ma wklejać swój klucz? Jeśli tak: jakie są wymagania dot. **bezpieczeństwa klucza** i export/backup?
3. Czy „backend /api/\*” jest realnym planem (sync/multi-device), czy pozostaje tylko jako „może kiedyś”? (w kodzie obecnie local-first).
4. Jak „twardo” ma działać Goal Agent (kary) i jak ma wyglądać UX: czy kara to tylko licznik, czy realne blokady/nagrody?
5. Czy wymagamy pełnego działania offline bez internetu (w tym fontów/assetów z CDN)?
6. Jaki jest docelowy język UI (PL, EN, mieszany) i czy potrzebujemy i18n?
7. Czy `manifest.json` shortcuts (`/?view=...`) są requirementem produktu (np. szybki start do AI/Timer), czy tylko eksperyment?
