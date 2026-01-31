# PLAN v2 – ADHD Mission Control

## Anti-Porzuceniowy System Realizacji Celów

**Wersja:** 2.0  
**Data:** 2026-01-30  
**Status:** Po audycie, przed fazą implementacji zmian

---

## 1. Misja aplikacji

Aplikacja jest osobistym **systemem dowodzenia realizacją celów**, zaprojektowanym dla mózgu ADHD.

**Kluczowa metafora:** 3 Strategów AI + Wspólny Kalendarz

Każdy aktywny cel (max 3) ma przypisanego "stratega AI" który:

- zna pełną strategię celu
- pamięta całą historię realizacji
- pilnuje ukończenia (anty-90%)
- mówi w wybranym przez użytkownika tonie

Strategowie współdzielą kalendarz i mogą sugerować działania gdy wykryją lukę czasową.

---

## 2. Model danych - Cel i Strategia

### 2.1 Struktura celu (Goal/Pillar)

```typescript
interface Goal {
  id: string;
  name: string;
  type: 'main' | 'secondary' | 'lab';
  status: 'active' | 'completed' | 'abandoned' | 'paused';
  createdAt: Date;
  completedAt?: Date;

  // STRATEGIA (rozbudowana struktura)
  strategy: GoalStrategy;

  // POWIĄZANIA
  tasks: Task[];
  rewards: Reward[];

  // HISTORIA AI
  aiConversationHistory: AIMessage[];
}
```

### 2.2 Struktura strategii (GoalStrategy)

```typescript
interface GoalStrategy {
  // === WIZJA (DLACZEGO) ===
  vision: string;
  // "Dlaczego ten cel jest dla mnie ważny?"
  // "Co się zmieni gdy go osiągnę?"

  // === SUKCES (CO KONKRETNIE) ===
  successCriteria: SuccessCriterion[];
  // 3-5 mierzalnych, obiektywnych kryteriów
  // Każde kryterium ma status: not_met / partially_met / met

  // === KAMIENIE MILOWE (ETAPY) ===
  milestones: Milestone[];
  // Podział celu na mniejsze, osiągalne etapy
  // Każdy może mieć deadline i nagrodę

  // === PLANY IMPLEMENTACJI (JAK) ===
  ifThenPlans: IfThenPlan[];
  // "Jeśli [sytuacja], to zrobię [akcja]"
  // Automatyzują decyzje, oszczędzają energię

  // === PRZESZKODY (CO MOŻE PÓJŚĆ NIE TAK) ===
  obstacles: Obstacle[];
  // Przewidziane problemy + plan B
  // Przygotowanie = brak zaskoczenia = mniej porzuceń

  // === KONTEKST AI ===
  aiContext: AIContext;
}

interface SuccessCriterion {
  id: string;
  description: string;
  status: 'not_met' | 'partially_met' | 'met';
  evidence?: string; // dowód spełnienia
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  status: 'not_started' | 'in_progress' | 'done';
  reward?: string;
  completedAt?: Date;
}

interface IfThenPlan {
  id: string;
  trigger: string; // "Jeśli czuję opór przed zadaniem..."
  action: string; // "...to ustawiam timer na 5 minut i zaczynam"
  isActive: boolean;
}

interface Obstacle {
  id: string;
  description: string; // "Mogę stracić motywację po 2 tygodniach"
  countermeasure: string; // "Umówię się z kimś na weekly check-in"
  occurredCount: number; // ile razy wystąpiła
}

interface AIContext {
  tone: 'military' | 'psychoeducation' | 'raw_facts';
  customInstructions?: string;
  // np. "Nie używaj słowa 'musisz', zamiast tego 'możesz wybrać'"
}
```

### 2.3 Opisy tonów AI

| Ton               | Opis                                                                | Przykład komunikatu                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `military`        | Surowy, konkretny, bez owijania w bawełnę. Krótkie zdania. Rozkazy. | "Stop. Masz zadanie na 92%. Kończysz to dziś. Bez dyskusji. 25 minut - start."                                                                                                                                       |
| `psychoeducation` | Wyjaśniający mechanizmy, empatyczny ale stanowczy. Edukuje o ADHD.  | "Widzę, że utknąłeś na 90%. To klasyczny syndrom pseudo-finiszu - Twój mózg już poczuł nagrodę, mimo że zadanie nie jest skończone. Mały trick: wypisz 3 konkretne rzeczy do zrobienia i zacznij od najłatwiejszej." |
| `raw_facts`       | Minimalne emocje, maksimum danych. Statystyki i fakty.              | "Status: 92% ukończone. Czas od ostatniej sesji: 4 dni. Historycznie: 3/5 Twoich celów utknęło na tym etapie. Sugerowana akcja: sesja Finish Mode, szacowany czas: 45 min."                                          |

---

## 3. Architektura AI - "3 Strategów + Kalendarz"

### 3.1 Diagram architektury

```
┌─────────────────────────────────────────────────────────────┐
│                    WSPÓLNY KALENDARZ                        │
│  • Zaplanowane sesje Finish Mode                            │
│  • Bloki czasowe (praca/odpoczynek)                         │
│  • Luki do zagospodarowania                                 │
│  • Deadlines z milestones                                   │
└─────────────────────────────────────────────────────────────┘
              ▲                ▲                ▲
              │                │                │
   ┌──────────┴──────────┐ ┌──┴──────────┐ ┌───┴─────────────┐
   │    STRATEG MAIN     │ │  STRATEG    │ │   STRATEG LAB   │
   │    (cel główny)     │ │  SECONDARY  │ │ (eksperyment)   │
   │                     │ │             │ │                 │
   │ Kontekst:           │ │ Kontekst:   │ │ Kontekst:       │
   │ • pełna strategia   │ │ • strategia │ │ • strategia     │
   │ • historia rozmów   │ │ • historia  │ │ • historia      │
   │ • sesje Finish Mode │ │ • sesje     │ │ • sesje         │
   │ • postęp tasków     │ │ • taski     │ │ • taski         │
   │ • ton: military     │ │ • ton: ...  │ │ • ton: ...      │
   └─────────────────────┘ └─────────────┘ └─────────────────┘
```

### 3.2 Jak działa komunikacja z AI

**Scenariusz 1: Pytanie w kontekście konkretnego celu**

```
User wchodzi w cel "Aplikacja ADHD" → otwiera AI Chat
→ System ładuje kontekst tego celu (strategia + historia + taski)
→ AI odpowiada jako "Strateg tego celu" z właściwym tonem
```

**Scenariusz 2: Pytanie ogólne (Dashboard)**

```
User otwiera AI z Dashboard → pyta "Co powinienem dziś robić?"
→ System ładuje kontekst wszystkich 3 celów + kalendarz
→ AI widzi całość i sugeruje priorytety
```

**Scenariusz 3: Wykryta luka w kalendarzu**

```
AI analizuje kalendarz → widzi 2h wolnego we wtorek
→ Przy następnej interakcji: "Masz lukę we wtorek 14-16.
   Sugeruję sesję Finish Mode dla [cel główny] -
   jesteś 3 dni od deadline milestone."
```

### 3.3 Budowanie promptu dla AI

```typescript
function buildAIPrompt(goal: Goal, query: string): string {
  return `
## TWOJA ROLA
Jesteś Strategiem AI odpowiedzialnym za cel: "${goal.name}"
Typ celu: ${goal.type}
Ton komunikacji: ${getToneDescription(goal.strategy.aiContext.tone)}

## STRATEGIA CELU
### Wizja
${goal.strategy.vision}

### Kryteria sukcesu
${goal.strategy.successCriteria.map((c) => `- [${c.status}] ${c.description}`).join('\n')}

### Kamienie milowe
${goal.strategy.milestones.map((m) => `- [${m.status}] ${m.title} ${m.deadline ? `(deadline: ${m.deadline})` : ''}`).join('\n')}

### Plany If-Then
${goal.strategy.ifThenPlans
  .filter((p) => p.isActive)
  .map((p) => `- Jeśli ${p.trigger} → to ${p.action}`)
  .join('\n')}

### Znane przeszkody
${goal.strategy.obstacles.map((o) => `- ${o.description} → Plan B: ${o.countermeasure}`).join('\n')}

## AKTUALNY STAN
### Taski
${formatTasks(goal.tasks)}

### Ostatnie sesje Finish Mode
${formatRecentSessions(goal)}

### Statystyki
- Postęp ogólny: ${calculateProgress(goal)}%
- Dni od ostatniej sesji: ${daysSinceLastSession(goal)}
- Streak: ${calculateStreak(goal)} dni

## INSTRUKCJE DODATKOWE
${goal.strategy.aiContext.customInstructions || 'Brak'}

## PYTANIE UŻYTKOWNIKA
${query}

## ZASADY ODPOWIEDZI
1. Odpowiadaj po polsku
2. Trzymaj się wybranego tonu (${goal.strategy.aiContext.tone})
3. Odwołuj się do konkretnych elementów strategii
4. Jeśli wykryjesz syndrom 90% - zareaguj stanowczo
5. Proponuj konkretne, małe kroki
6. Pamiętaj o planach If-Then użytkownika
`;
}
```

---

## 4. Wspólny kalendarz

### 4.1 Model kalendarza

```typescript
interface SharedCalendar {
  // Zaplanowane bloki
  scheduledBlocks: CalendarBlock[];

  // Automatycznie wykryte luki (> 30 min)
  availableSlots: TimeSlot[];

  // Deadlines z milestones
  upcomingDeadlines: Deadline[];
}

interface CalendarBlock {
  id: string;
  goalId?: string; // powiązany cel (opcjonalnie)
  taskId?: string; // powiązany task (opcjonalnie)
  type: 'finish_session' | 'deep_work' | 'break' | 'other';
  title: string;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  suggestedGoalId?: string; // AI może zasugerować cel
}

interface Deadline {
  date: Date;
  goalId: string;
  milestoneId: string;
  title: string;
  daysRemaining: number;
}
```

### 4.2 Integracja z AI

AI przy każdej interakcji otrzymuje:

```typescript
interface CalendarContext {
  today: TimeSlot[]; // wolne sloty dziś
  thisWeek: TimeSlot[]; // wolne sloty ten tydzień
  upcomingDeadlines: Deadline[]; // najbliższe 7 dni
  recentSessions: {
    goalId: string;
    date: Date;
    duration: number;
  }[];
}
```

---

## 5. Finish Mode - doprecyzowanie

### 5.1 Flow sesji (3 fazy)

```
FAZA 1: WYBÓR (30 sek)
┌────────────────────────────────────┐
│  Wybierz zadanie do domknięcia    │
│                                    │
│  [Task 1 - 92% - cel główny]  ←   │
│  [Task 2 - 78% - cel secondary]   │
│  [Task 3 - 45% - cel lab]         │
│                                    │
│  Sugestia AI: "Task 1 jest        │
│  najbliżej końca. Skończ go."     │
└────────────────────────────────────┘

FAZA 2: SETUP (1-2 min)
┌────────────────────────────────────┐
│  Task: [nazwa]                     │
│  Cel: [nazwa celu]                 │
│                                    │
│  Definicja DONE:                   │
│  ☐ [kryterium 1]                   │
│  ☐ [kryterium 2]                   │
│  + Dodaj kryterium                 │
│                                    │
│  Twój mikro-krok na tę sesję:      │
│  [________________] (1 zdanie)     │
│                                    │
│  ┌─────────────────────────────┐   │
│  │     ROZPOCZNIJ SESJĘ        │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘

FAZA 3: SESJA (czas pracy)
┌────────────────────────────────────┐
│         ⏱️ 00:23:45                │
│                                    │
│  Mikro-krok:                       │
│  "[to co wpisał user]"             │
│                                    │
│  ────────────────────────────────  │
│                                    │
│  [DONE ✓]  [JESZCZE NIE]  [STUCK]  │
│                                    │
│  💬 Zapytaj AI o pomoc             │
└────────────────────────────────────┘
```

### 5.2 Klasyfikacja końcowa

Po każdej sesji użytkownik wybiera:

| Status     | Opis                        | Efekt                                  |
| ---------- | --------------------------- | -------------------------------------- |
| **DONE**   | Zadanie ukończone           | Task → 100%, completedAt = now         |
| **POSTĘP** | Zrobiłem część, kontynuuję  | Task progress +X%, notatka             |
| **STUCK**  | Utknąłem, potrzebuję pomocy | Task → stuck, AI proponuje interwencję |

---

## 6. System nagród - powiązanie ze strategią

Nagrody są definiowane na dwóch poziomach:

### 6.1 Nagrody za milestones (w strategii)

```typescript
// Każdy milestone może mieć nagrodę
milestone: {
  title: "MVP aplikacji gotowe",
  reward: "Weekend bez pracy nad projektem"
}
```

### 6.2 Nagrody procesowe (per cel)

```typescript
interface ProcessReward {
  id: string;
  goalId: string;
  type: 'streak' | 'sessions_count' | 'stuck_resolved';
  threshold: number; // np. 7 dni streak
  reward: string; // "Nowa gra na Steam"
  isEarned: boolean;
  earnedAt?: Date;
}
```

### 6.3 Walidacja nagród

AI + system sprawdzają czy nagroda jest **zasłużona**:

- Nie nagradzamy za 90% (syndrom pseudo-finiszu)
- Nagradzamy za DONE, streak, przebicie stuck
- AI może zakwestionować: "Czy na pewno to zadanie jest DONE? Sprawdźmy kryteria sukcesu."

---

## 7. Fazy implementacji

### FAZA 1: Model danych i strategia (priorytet: KRYTYCZNY)

**Cel:** Rozbudowa modelu Goal o pełną strukturę strategii

- [ ] Rozszerzenie typu `Pillar` → `Goal` z `GoalStrategy`
- [ ] Migracja danych (kompatybilność wsteczna)
- [ ] UI edycji strategii (formularz krok po kroku)
- [ ] UI wyboru tonu AI per cel
- [ ] Walidacja: strategia musi mieć min. vision + 1 kryterium sukcesu

### FAZA 2: Integracja AI z kontekstem (priorytet: KRYTYCZNY)

**Cel:** AI rozumie strategię i historię celu

- [ ] Nowy system budowania promptów
- [ ] Historia rozmów per cel (persystencja)
- [ ] Kontekstowe wejście do AI (z celu/taska)
- [ ] Quick actions (klikalne) w AI Coach
- [ ] Fallback gdy AI niedostępne

### FAZA 3: Wspólny kalendarz (priorytet: WYSOKI)

**Cel:** AI widzi dostępność czasową

- [ ] Model kalendarza w AppData
- [ ] UI prostego kalendarza (widok tygodnia)
- [ ] Automatyczne wykrywanie luk
- [ ] Integracja kalendarza z promptami AI
- [ ] Sugestie AI w lukach czasowych

### FAZA 4: Stabilizacja techniczna (priorytet: WYSOKI)

**Cel:** Usunięcie długu technicznego

- [ ] Usunięcie martwego kodu (notificationCenter)
- [ ] Naprawa bugów (Invalid Date w Sprint)
- [ ] Separacja API key (bezpieczeństwo)
- [ ] Ujednolicenie error handling
- [ ] Język UI → tylko polski

### FAZA 5: UX/Flow (priorytet: ŚREDNI)

**Cel:** Płynniejsze użytkowanie

- [ ] Dashboard: jeden "Next action"
- [ ] Finish Mode: 3 fazy
- [ ] Today: priorytetowy task → Finish Mode
- [ ] Usunięcie debug elementów
- [ ] Spójność wizualna

### FAZA 6: Polish (priorytet: NISKI)

**Cel:** Dopieszczenie detali

- [ ] Testy manualne całego flow
- [ ] Optymalizacja wydajności
- [ ] Dokumentacja końcowa
- [ ] Onboarding ze strategią

---

## 8. Metryki sukcesu (dla aplikacji)

| Metryka            | Cel                                 | Jak mierzymy                          |
| ------------------ | ----------------------------------- | ------------------------------------- |
| Finish Rate        | >70% tasków DONE (nie porzuconych)  | tasks.done / tasks.total              |
| Stuck Recovery     | >50% tasków stuck → done            | stuck_resolved / stuck_total          |
| Streak Main Goal   | Średnio >5 dni                      | średnia z ostatnich 4 tygodni         |
| AI Helpfulness     | User używa AI min. 3x/tydzień       | ai_interactions / week                |
| Session Completion | >80% sesji Finish Mode zakończonych | completed_sessions / started_sessions |

---

## 9. Ryzyka i mitygacje

| Ryzyko                                   | Prawdopodobieństwo | Wpływ     | Mitygacja                                                |
| ---------------------------------------- | ------------------ | --------- | -------------------------------------------------------- |
| Złożoność strategii odstrasza            | Wysokie            | Wysoki    | Kreator krok-po-kroku, templates, AI pomaga wypełnić     |
| AI halucynuje / daje złe rady            | Średnie            | Średni    | Kontekst ze strategii, nie z kosmosu; user może poprawić |
| Kalendarz staje się kolejnym obciążeniem | Średnie            | Średni    | Prosty UI, AI sugeruje (nie wymusza), opcjonalny         |
| Migracja danych łamie aplikację          | Niskie             | Krytyczny | Backup przed migracją, fallback na stare dane            |

---

## 10. Słownik pojęć

| Termin           | Definicja                                                                     |
| ---------------- | ----------------------------------------------------------------------------- |
| **Cel (Goal)**   | Duży, ważny projekt do ukończenia. Max 3 aktywne.                             |
| **Strategia**    | Plan realizacji celu: wizja, kryteria, milestones, plany If-Then, przeszkody. |
| **Strateg AI**   | "Osobowość" AI przypisana do celu, zna jego kontekst i historię.              |
| **Ton AI**       | Styl komunikacji: wojskowy / psychoedukacyjny / surowe fakty.                 |
| **Finish Mode**  | Tryb sesji skupionej na domknięciu konkretnego taska.                         |
| **Syndrom 90%**  | Zjawisko porzucania zadań/projektów gdy są prawie ukończone.                  |
| **If-Then Plan** | Predefiniowana reguła: "Jeśli X, to zrobię Y". Automatyzuje decyzje.          |
| **Milestone**    | Kamień milowy - mniejszy cel w drodze do głównego.                            |
| **Stuck**        | Task, przy którym użytkownik utknął i potrzebuje pomocy.                      |

---

_Dokument aktualizowany: 2026-01-30_
_Wersja: 2.0_
