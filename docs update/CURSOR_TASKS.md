# CURSOR_TASKS.md – Zadania do implementacji

## ADHD Mission Control - Refaktoring po audycie

**Wersja:** 1.0  
**Data:** 2026-01-30  
**Wykonawca:** Cursor AI (pod nadzorem Głównego Architekta)

---

## Zasady pracy z tym dokumentem

1. **Wykonuj zadania w kolejności priorytetów** (P1 → P2 → P3)
2. **Jedno zadanie = jeden commit** (lub logiczna grupa commitów)
3. **Po każdym zadaniu:** zgłoś co zrobiłeś i czy są problemy
4. **Przed zmianą typu:** przeczytaj `types.ts` i `DECISIONS.md`
5. **Język kodu:** angielski (zmienne, funkcje, komentarze)
6. **Język UI:** polski (wszystkie teksty widoczne dla użytkownika)

---

## FAZA 1: Rozszerzenie modelu danych (AI + Strategia)

### Priorytet: P1 (KRYTYCZNY)

---

### TASK-101: Rozszerzenie typu Pillar o GoalStrategy

**Plik:** `types.ts`  
**Typ:** Modyfikacja typu  
**Szacowany czas:** 30 min

**Co zrobić:**

1. Dodaj nowy interfejs `GoalStrategy`:

```typescript
interface SuccessCriterion {
  id: string;
  description: string;
  isMet: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO date string
  status: 'not_started' | 'in_progress' | 'done';
  reward?: string;
  completedAt?: string; // ISO date string
}

interface IfThenPlan {
  id: string;
  trigger: string; // "Jeśli [sytuacja]..."
  action: string; // "...to zrobię [akcja]"
  isActive: boolean;
}

interface Obstacle {
  id: string;
  description: string;
  countermeasure: string;
}

interface GoalStrategy {
  vision: string;
  successCriteria: SuccessCriterion[];
  milestones: Milestone[];
  ifThenPlans: IfThenPlan[];
  obstacles: Obstacle[];
}
```

2. Rozszerz typ `Pillar` o pole `strategy`:

```typescript
interface Pillar {
  // ... istniejące pola
  strategy?: GoalStrategy; // Opcjonalne dla kompatybilności wstecznej
}
```

**Ważne:** Pole `strategy` musi być opcjonalne (`?`) żeby nie łamać istniejących danych.

**Definition of DONE:**

- [ ] Typy dodane do `types.ts`
- [ ] Brak błędów TypeScript
- [ ] Eksportowane wszystkie nowe typy

---

### TASK-102: Rozszerzenie typu Pillar o GoalAIContext

**Plik:** `types.ts`  
**Typ:** Modyfikacja typu  
**Szacowany czas:** 20 min

**Co zrobić:**

1. Dodaj interfejs `AIMessage`:

```typescript
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO date string
}
```

2. Dodaj interfejs `GoalAIContext`:

```typescript
interface GoalAIContext {
  tone: 'military' | 'psychoeducation' | 'raw_facts';
  customInstructions?: string;
  conversationHistory: AIMessage[];
}
```

3. Rozszerz typ `Pillar`:

```typescript
interface Pillar {
  // ... istniejące pola
  strategy?: GoalStrategy;
  aiContext?: GoalAIContext; // Opcjonalne dla kompatybilności
}
```

**Definition of DONE:**

- [ ] Typy dodane do `types.ts`
- [ ] Brak błędów TypeScript
- [ ] Eksportowane wszystkie nowe typy

---

### TASK-103: Dodanie SharedCalendar do AppData

**Plik:** `types.ts`  
**Typ:** Modyfikacja typu  
**Szacowany czas:** 20 min

**Co zrobić:**

1. Dodaj interfejs `CalendarEntry`:

```typescript
interface CalendarEntry {
  id: string;
  type: 'finish_session' | 'blocked' | 'available' | 'declaration';
  goalId?: string;
  taskId?: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  title: string;
  notes?: string;
}
```

2. Dodaj interfejs `SharedCalendar`:

```typescript
interface SharedCalendar {
  entries: CalendarEntry[];
  defaultWorkingHours: {
    start: string; // "09:00"
    end: string; // "18:00"
  };
  blockedDays: string[]; // ISO dates
}
```

3. Rozszerz `AppData`:

```typescript
interface AppData {
  // ... istniejące pola
  calendar?: SharedCalendar; // Opcjonalne dla kompatybilności
}
```

**Definition of DONE:**

- [ ] Typy dodane do `types.ts`
- [ ] Brak błędów TypeScript
- [ ] Eksportowane wszystkie nowe typy

---

### TASK-104: Migracja danych - domyślne wartości

**Plik:** `utils/dataMigration.ts` lub nowy plik  
**Typ:** Nowa funkcja  
**Szacowany czas:** 45 min

**Co zrobić:**

1. Stwórz funkcję `migrateToV2` która:
   - Sprawdza czy `Pillar` ma `strategy` - jeśli nie, dodaje domyślną:

```typescript
const defaultStrategy: GoalStrategy = {
  vision: '',
  successCriteria: [],
  milestones: [],
  ifThenPlans: [],
  obstacles: [],
};
```

- Sprawdza czy `Pillar` ma `aiContext` - jeśli nie, dodaje domyślny:

```typescript
const defaultAIContext: GoalAIContext = {
  tone: 'psychoeducation', // Domyślny ton
  conversationHistory: [],
};
```

- Sprawdza czy `AppData` ma `calendar` - jeśli nie, dodaje domyślny:

```typescript
const defaultCalendar: SharedCalendar = {
  entries: [],
  defaultWorkingHours: { start: '09:00', end: '18:00' },
  blockedDays: [],
};
```

2. Zintegruj migrację z `storageManager.ts` (przy wczytywaniu danych)

**Definition of DONE:**

- [ ] Funkcja migracji utworzona
- [ ] Integracja ze storageManager
- [ ] Istniejące dane nie są tracone
- [ ] Nowe pola mają domyślne wartości

---

## FAZA 2: UI Strategii celu

### Priorytet: P1 (KRYTYCZNY)

---

### TASK-201: Komponent GoalStrategyEditor

**Plik:** `components/GoalStrategyEditor.tsx` (nowy)  
**Typ:** Nowy komponent  
**Szacowany czas:** 2h

**Co zrobić:**

Stwórz komponent do edycji strategii celu z sekcjami:

1. **Wizja** - textarea
2. **Kryteria sukcesu** - lista z checkbox + add/remove
3. **Kamienie milowe** - lista kart z: tytuł, deadline, status, nagroda
4. **Plany If-Then** - lista: "Jeśli... to..." z toggle on/off
5. **Przeszkody** - lista: opis + kontrmiar

**Wymagania mobile-first:**

- Każda sekcja jako rozwijany akordeon
- Touch-friendly inputs (min 44px)
- Pełna szerokość na mobile
- Przycisk "Zapisz" sticky na dole

**Props:**

```typescript
interface GoalStrategyEditorProps {
  strategy: GoalStrategy;
  onChange: (strategy: GoalStrategy) => void;
  onSave: () => void;
}
```

**Definition of DONE:**

- [ ] Komponent renderuje wszystkie sekcje
- [ ] Edycja działa (onChange wywoływane)
- [ ] Mobile-first (testowane na 375px viewport)
- [ ] Polskie teksty

---

### TASK-202: Komponent AIToneSelector

**Plik:** `components/AIToneSelector.tsx` (nowy)  
**Typ:** Nowy komponent  
**Szacowany czas:** 30 min

**Co zrobić:**

Stwórz selector tonu AI z trzema opcjami:

```typescript
const tones = [
  {
    value: 'military',
    label: 'Wojskowy',
    description: 'Surowy, konkretny, bez owijania w bawełnę',
  },
  {
    value: 'psychoeducation',
    label: 'Psychoedukacyjny',
    description: 'Wyjaśnia mechanizmy, wspiera, tłumaczy',
  },
  {
    value: 'raw_facts',
    label: 'Surowe fakty',
    description: 'Minimum emocji, maksimum danych',
  },
];
```

**Wymagania:**

- Radio buttons lub cards do wyboru
- Aktualny wybór wyróżniony
- Opis pod każdą opcją
- Mobile-friendly (karty w kolumnie)

**Props:**

```typescript
interface AIToneSelectorProps {
  value: 'military' | 'psychoeducation' | 'raw_facts';
  onChange: (tone: 'military' | 'psychoeducation' | 'raw_facts') => void;
}
```

**Definition of DONE:**

- [ ] Komponent renderuje 3 opcje
- [ ] Wybór działa
- [ ] Polskie teksty
- [ ] Mobile-first

---

### TASK-203: Integracja strategii w PillarDetailPremium

**Plik:** `components/PillarDetailPremium.tsx`  
**Typ:** Modyfikacja  
**Szacowany czas:** 1h

**Co zrobić:**

1. Dodaj sekcję "Strategia" w widoku celu
2. Użyj `GoalStrategyEditor` (akordeon, domyślnie zwinięty)
3. Dodaj sekcję "Ustawienia AI" z `AIToneSelector`
4. Zapis zmian do `AppContext`

**Layout (mobile-first):**

```
┌─────────────────────────────┐
│ [←] Nazwa celu              │
│ Typ: main | Postęp: 75%     │
├─────────────────────────────┤
│ ▼ Strategia                 │  <- akordeon
│   [GoalStrategyEditor]      │
├─────────────────────────────┤
│ ▼ Ustawienia AI             │  <- akordeon
│   [AIToneSelector]          │
│   [Custom instructions]     │
├─────────────────────────────┤
│ ▼ Zadania (5)               │  <- akordeon, domyślnie otwarty
│   [Lista tasków]            │
├─────────────────────────────┤
│ [WEJDŹ W FINISH MODE]       │  <- sticky CTA
└─────────────────────────────┘
```

**Definition of DONE:**

- [ ] Strategia widoczna i edytowalna
- [ ] Ton AI wybieralny
- [ ] Zmiany zapisywane do AppContext
- [ ] Mobile-first layout

---

## FAZA 3: Integracja AI z kontekstem

### Priorytet: P1 (KRYTYCZNY)

---

### TASK-301: Refaktoring aiPrompts.ts - kontekst celu

**Plik:** `utils/aiPrompts.ts`  
**Typ:** Modyfikacja  
**Szacowany czas:** 1.5h

**Co zrobić:**

1. Dodaj funkcję `buildGoalContext`:

```typescript
function buildGoalContext(goal: Pillar): string {
  const { strategy, aiContext, name, type } = goal;

  let context = `
## Cel: ${name}
Typ: ${type}
`;

  if (strategy) {
    context += `
### Wizja
${strategy.vision || 'Nie zdefiniowana'}

### Kryteria sukcesu
${strategy.successCriteria.map((c) => `- [${c.isMet ? 'x' : ' '}] ${c.description}`).join('\n')}

### Kamienie milowe
${strategy.milestones.map((m) => `- ${m.title} (${m.status})`).join('\n')}

### Plany If-Then (aktywne)
${strategy.ifThenPlans
  .filter((p) => p.isActive)
  .map((p) => `- Jeśli ${p.trigger}, to ${p.action}`)
  .join('\n')}

### Znane przeszkody
${strategy.obstacles.map((o) => `- ${o.description} → Kontrmiar: ${o.countermeasure}`).join('\n')}
`;
  }

  return context;
}
```

2. Dodaj funkcję `buildToneInstructions`:

```typescript
function buildToneInstructions(tone: GoalAIContext['tone']): string {
  const instructions = {
    military: `
Mów krótko, konkretnie, bez owijania w bawełnę.
Nie pocieszaj - stawiaj fakty.
Używaj rozkazów: "Zrób X", "Skup się na Y".
Jeśli użytkownik się wymiguje - nazwij to wprost.
`,
    psychoeducation: `
Wyjaśniaj mechanizmy (dopamina, syndrom 90%, Zeigarnik).
Bądź wspierający ale szczery.
Pomagaj zrozumieć DLACZEGO coś jest trudne.
Proponuj techniki i strategie.
`,
    raw_facts: `
Podawaj tylko fakty i liczby.
Minimum emocji i ocen.
Format: status, co zostało, sugerowana akcja.
Bez motywacyjnych przemów.
`,
  };

  return instructions[tone];
}
```

3. Zmodyfikuj główne funkcje promptów żeby używały kontekstu celu

**Definition of DONE:**

- [ ] Funkcje pomocnicze utworzone
- [ ] Prompty uwzględniają strategię celu
- [ ] Prompty uwzględniają ton AI
- [ ] Testy manualne z różnymi tonami

---

### TASK-302: Historia rozmów per cel

**Plik:** `contexts/AppContext.tsx`  
**Typ:** Modyfikacja  
**Szacowany czas:** 1h

**Co zrobić:**

1. Dodaj akcję `addAIMessage`:

```typescript
const addAIMessage = (goalId: string, message: AIMessage) => {
  setAppData((prev) => ({
    ...prev,
    pillars: prev.pillars.map((p) =>
      p.id === goalId
        ? {
            ...p,
            aiContext: {
              ...p.aiContext,
              conversationHistory: [...(p.aiContext?.conversationHistory || []), message],
            },
          }
        : p
    ),
  }));
};
```

2. Dodaj akcję `clearAIHistory`:

```typescript
const clearAIHistory = (goalId: string) => {
  // ... wyczyść conversationHistory dla danego celu
};
```

3. Udostępnij akcje w kontekście

**Definition of DONE:**

- [ ] Akcje dodane do AppContext
- [ ] Wiadomości zapisywane per cel
- [ ] Możliwość wyczyszczenia historii

---

### TASK-303: AI Coach z kontekstem celu

**Plik:** `components/screens/AICoachPremium.tsx`  
**Typ:** Modyfikacja  
**Szacowany czas:** 1.5h

**Co zrobić:**

1. Dodaj selektor aktywnego celu na górze:

```
┌─────────────────────────────┐
│ Rozmawiasz o: [▼ Wybierz cel]│
├─────────────────────────────┤
│ [Historia rozmów...]        │
│                             │
├─────────────────────────────┤
│ Quick actions:              │
│ [Co dziś domykamy?]         │
│ [Daj mi mikrokrok]          │
│ [Co mnie blokuje?]          │
│ [Przebij 90%]               │
├─────────────────────────────┤
│ [________________] [Wyślij] │
└─────────────────────────────┘
```

2. Quick actions = klikalne buttony które wypełniają prompt i wysyłają

3. Historia rozmów ładowana z `goal.aiContext.conversationHistory`

4. Każda wiadomość zapisywana przez `addAIMessage`

**Definition of DONE:**

- [ ] Selektor celu działa
- [ ] Historia per cel
- [ ] Quick actions klikalne
- [ ] Polskie teksty

---

## FAZA 4: Stabilizacja techniczna

### Priorytet: P2 (WYSOKI)

---

### TASK-401: Usunięcie martwego kodu

**Pliki:** `utils/notificationCenter.ts`, inne  
**Typ:** Cleanup  
**Szacowany czas:** 30 min

**Co zrobić:**

1. Usuń lub napraw `utils/notificationCenter.ts`:
   - `generateMotivation` jest wywoływane ale nie zaimportowane
   - Decyzja: usuń cały plik jeśli nie jest używany, lub napraw import

2. Sprawdź inne pliki z audytu pod kątem dead code

**Definition of DONE:**

- [ ] Brak wywołań nieistniejących funkcji
- [ ] Brak nieużywanych plików
- [ ] Build przechodzi bez błędów

---

### TASK-402: Naprawa Invalid Date w Sprint

**Plik:** `components/SprintViewPremium.tsx`  
**Typ:** Bugfix  
**Szacowany czas:** 30 min

**Co zrobić:**

1. Znajdź gdzie wyświetlane są daty
2. Napraw formatowanie (użyj `date-fns` lub natywnego `toLocaleDateString`)
3. Format docelowy: "Pn 26.01" z badge "Dziś" dla dzisiejszego dnia

**Definition of DONE:**

- [ ] Daty wyświetlają się poprawnie
- [ ] Format: "Pn 26.01", "Wt 27.01" etc.
- [ ] Badge "Dziś" dla aktualnego dnia

---

### TASK-403: Separacja API key

**Pliki:** `utils/storageManager.ts`, `utils/secureStorage.ts` (nowy)  
**Typ:** Refaktoring  
**Szacowany czas:** 1h

**Co zrobić:**

1. Stwórz `utils/secureStorage.ts`:

```typescript
const SECURE_KEY = 'flexgrafik_secure_settings';

interface SecureSettings {
  aiApiKey?: string;
}

export const secureStorage = {
  get: (): SecureSettings => {
    const data = localStorage.getItem(SECURE_KEY);
    return data ? JSON.parse(data) : {};
  },

  set: (settings: SecureSettings) => {
    localStorage.setItem(SECURE_KEY, JSON.stringify(settings));
  },

  getApiKey: (): string | undefined => {
    return secureStorage.get().aiApiKey;
  },

  setApiKey: (key: string) => {
    secureStorage.set({ ...secureStorage.get(), aiApiKey: key });
  },
};
```

2. Zmodyfikuj eksport danych - domyślnie BEZ api key

3. Dodaj checkbox w UI: "Eksportuj z kluczem API (niezalecane)"

**Definition of DONE:**

- [ ] API key w osobnym storage
- [ ] Eksport domyślnie bez klucza
- [ ] Opcja eksportu z kluczem + ostrzeżenie

---

### TASK-404: Ujednolicenie języka UI na polski

**Pliki:** Wszystkie komponenty w `components/`  
**Typ:** Content  
**Szacowany czas:** 1.5h

**Co zrobić:**

1. Przejdź przez wszystkie komponenty
2. Zamień angielskie teksty na polskie
3. Użyj słownika terminów:

| EN            | PL               |
| ------------- | ---------------- |
| Goal          | Cel              |
| Task          | Zadanie          |
| Finish Mode   | Tryb Domykania   |
| Dashboard     | Pulpit           |
| Settings      | Ustawienia       |
| Save          | Zapisz           |
| Cancel        | Anuluj           |
| Delete        | Usuń             |
| Edit          | Edytuj           |
| Add           | Dodaj            |
| Done          | Zrobione         |
| In Progress   | W trakcie        |
| Stuck         | Utknięty         |
| Start Session | Rozpocznij sesję |
| End Session   | Zakończ sesję    |

**Definition of DONE:**

- [ ] Wszystkie teksty UI po polsku
- [ ] Spójna terminologia
- [ ] Brak mieszanki PL/EN

---

### TASK-405: Zamiana alert() na toasty

**Pliki:** `components/SettingsPremium.tsx`, inne  
**Typ:** UX improvement  
**Szacowany czas:** 45 min

**Co zrobić:**

1. Znajdź wszystkie `alert()` w kodzie
2. Zamień na `toast` (używając istniejącego `ToastProvider`)
3. Typy toastów:
   - Sukces: zielony
   - Błąd: czerwony
   - Info: niebieski
   - Warning: żółty

**Definition of DONE:**

- [ ] Brak `alert()` w kodzie
- [ ] Wszystkie komunikaty przez toast
- [ ] Spójny wygląd

---

## FAZA 5: UX/Flow improvements

### Priorytet: P3 (ŚREDNI)

---

### TASK-501: Dashboard - jeden Next Action

**Plik:** `components/DashboardPremium.tsx`  
**Typ:** Redesign  
**Szacowany czas:** 1.5h

**Co zrobić:**

1. Na górze dashboardu dodaj blok "Co teraz?":

```
┌─────────────────────────────┐
│ 🎯 CO TERAZ?                │
│                             │
│ [Nazwa taska]               │
│ Cel: [nazwa celu] • 87%     │
│                             │
│ [====== WEJDŹ W TRYB =====] │
│ [====== DOMYKANIA ========] │
└─────────────────────────────┘
```

2. Algorytm wyboru "Next Action":
   - Priorytet 1: Task `stuck` z najwyższym progressem
   - Priorytet 2: Task z deklaracji na dziś
   - Priorytet 3: Task z głównego celu (`main`) z najwyższym progressem

3. Usuń debug teksty z UI

**Definition of DONE:**

- [ ] Blok "Co teraz?" na górze
- [ ] Algorytm wyboru działa
- [ ] CTA prowadzi do Finish Mode
- [ ] Brak debug tekstów

---

### TASK-502: Finish Mode - 3 fazy

**Plik:** `components/FinishMode.tsx`  
**Typ:** Major refaktoring  
**Szacowany czas:** 3h

**Co zrobić:**

1. Dodaj state: `phase: 1 | 2 | 3`

2. **Faza 1 - Wybór:**

```
┌─────────────────────────────┐
│ TRYB DOMYKANIA              │
│ Wybierz zadanie:            │
├─────────────────────────────┤
│ [Task 1] 92% - Cel X    [→] │
│ [Task 2] 78% - Cel Y    [→] │
│ [Task 3] 65% - Cel X    [→] │
└─────────────────────────────┘
```

3. **Faza 2 - Przygotowanie:**

```
┌─────────────────────────────┐
│ ← [Nazwa taska]             │
├─────────────────────────────┤
│ Kiedy to jest ZROBIONE?     │
│ [textarea - Definition DONE]│
├─────────────────────────────┤
│ Co teraz zrobisz? (1 krok)  │
│ [textarea - mikrokrok]      │
├─────────────────────────────┤
│ [Nie wiem - pomóż AI]       │
├─────────────────────────────┤
│ [====== START SESJI ======] │
└─────────────────────────────┘
```

4. **Faza 3 - Sesja:**

```
┌─────────────────────────────┐
│         ⏱ 00:12:34          │
├─────────────────────────────┤
│ [Nazwa taska]               │
│                             │
│ Mikrokrok:                  │
│ "[treść mikrokroku]"        │
├─────────────────────────────┤
│ [ZROBIONE] [W TRAKCIE]      │
│        [UTKNĄŁEM]           │
└─────────────────────────────┘
```

5. Psychoedukacja (Zeigarnik, etc.) w rozwijanym "Dlaczego to działa?" w Fazie 2

**Definition of DONE:**

- [ ] 3 fazy działają
- [ ] Nawigacja między fazami
- [ ] Minimalistyczna Faza 3
- [ ] Mobile-first layout
- [ ] Polskie teksty

---

### TASK-503: Today - priorytetowy task

**Plik:** `components/TodayPremium.tsx`  
**Typ:** UX improvement  
**Szacowany czas:** 1h

**Co zrobić:**

1. Sekcja "Priorytet na dziś" na górze:
   - Jeden task z deklaracji lub algorytmu
   - Duży CTA "Wejdź w Tryb Domykania"
   - Tekst: "Jeśli zrobisz tylko to jedno, dzień jest wygrany"

2. Badge "Z deklaracji" przy taskach z Evening Protocol

3. Sortowanie: deklaracje → quick wins → reszta

**Definition of DONE:**

- [ ] Priorytetowy task na górze
- [ ] CTA do Finish Mode
- [ ] Badge "Z deklaracji"
- [ ] Polskie teksty

---

## Checklist końcowy

Po zakończeniu wszystkich tasków:

- [ ] `npm run build` przechodzi bez błędów
- [ ] `npm run typecheck` (jeśli jest) przechodzi
- [ ] Testy manualne na mobile viewport (375px)
- [ ] Wszystkie teksty UI po polsku
- [ ] Brak `console.log` w produkcji (poza error handling)
- [ ] Brak `alert()` w kodzie
- [ ] Dokumentacja zaktualizowana (PLAN_v2.md)

---

## Notatki dla Cursora

### Nie rób:

- Nie modyfikuj `src/components/` (deprecated)
- Nie usuwaj istniejącej funkcjonalności bez pytania
- Nie zmieniaj struktury `types.ts` bez kompatybilności wstecznej
- Nie dodawaj nowych bibliotek bez uzasadnienia

### Zawsze rób:

- Testuj na mobile viewport przed zgłoszeniem DONE
- Używaj polskich tekstów w UI
- Komentuj skomplikowaną logikę (po angielsku)
- Raportuj problemy i blokery

### Pytaj gdy:

- Nie jesteś pewien jak coś zaimplementować
- Widzisz konflikt z istniejącym kodem
- Potrzebujesz dodać nową bibliotekę
- Coś z dokumentacji jest niejasne
