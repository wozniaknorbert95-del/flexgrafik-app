# AUDYT STRUKTURY UI I FLOW UŻYTKOWNIKA

**Data:** 2026-01-26  
**Zakres:** Wszystkie komponenty, routing, interaktywne elementy

---

## 1. MAPA EKRANÓW

### Główne widoki (routowane przez `RouteManager.tsx`)

| View ID          | Komponent                                   | Opis                                                                     | Status    |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------ | --------- |
| `home`           | `DashboardPremium.tsx`                      | Główny ekran z celami, rekomendacjami finiszu, statystykami, Ideas Vault | ✅ DZIAŁA |
| `finish`         | `FinishMode.tsx`                            | Tryb domykania tasków - wybór taska, sesja, klasyfikacja                 | ✅ DZIAŁA |
| `pillar_detail`  | `PillarDetailPremium.tsx`                   | Szczegóły celu: taski, strategia, nagrody, Definition of DONE            | ✅ DZIAŁA |
| `today`          | `TodayPremium.tsx`                          | Dzisiejsze zadania i priorytet                                           | ✅ DZIAŁA |
| `timer`          | `TimerPremium.tsx` (w `RouteManager.tsx`)   | Pomodoro timer (25 min focus / 5 min break)                              | ✅ DZIAŁA |
| `sprint`         | `SprintViewPremium.tsx`                     | 7-dniowy sprint z progress tracking                                      | ✅ DZIAŁA |
| `ai_coach`       | `AICoachPremium.tsx`                        | Czat z asystentem AI                                                     | ✅ DZIAŁA |
| `accountability` | Inline w `RouteManager.tsx` (linie 111-228) | Historia powiadomień i statystyki streak                                 | ✅ DZIAŁA |
| `settings`       | `SettingsPremium.tsx`                       | Konfiguracja: voice, AI, cele, backup                                    | ✅ DZIAŁA |
| `rules`          | `RulesPremium.tsx`                          | Zarządzanie custom rules (powiadomienia)                                 | ✅ DZIAŁA |

### Komponenty pomocnicze (nie są ekranami)

- `Navigation.tsx` - dolna nawigacja (fixed bottom)
- `RouteManager.tsx` - router główny
- `TaskCard.tsx` - karta taska (używana w Finish Mode)
- `NotificationManager.tsx` - zarządzanie powiadomieniami
- `AIChatManager.tsx` - walidacja AI chat
- `InstallPrompt.tsx` - PWA install prompt
- `ErrorBoundary.tsx` - error boundary

---

## 2. FLOW NAWIGACJI

### Główne ścieżki użytkownika

#### Ścieżka 1: Dashboard → Goal → Task → Finish Mode

```
Dashboard (home)
  ↓ [kliknięcie w kartę celu]
Pillar Detail (pillar_detail)
  ↓ [kliknięcie "ENTER FINISH MODE" lub wybór taska]
Finish Mode (finish)
  ↓ [wybór taska z dropdown]
  ↓ [Start session]
  ↓ [End session → klasyfikacja]
  → Powrót do Dashboard lub Pillar Detail
```

#### Ścieżka 2: Dashboard → Finish Mode (bezpośrednio)

```
Dashboard (home)
  ↓ [kliknięcie "DOMKNIJ TERAZ" lub "🏁 Finish Mode"]
Finish Mode (finish)
  → (jak wyżej)
```

#### Ścieżka 3: Dashboard → AI Coach

```
Dashboard (home)
  ↓ [kliknięcie "🧠 Otwórz AI" lub nawigacja dolna]
AI Coach (ai_coach)
  ↓ [czat]
  → Powrót do Dashboard
```

#### Ścieżka 4: Nawigacja dolna (Navigation.tsx)

```
Primary items (zawsze widoczne):
  - Dashboard (home)
  - Finish (finish) - z badge stuckCount
  - AI (ai_coach)

Secondary items (po kliknięciu "Więcej"):
  - Dziś (today)
  - Timer (timer)
  - Sprint (sprint)
  - Account (accountability)
  - Zasady (rules)
  - Settings (settings)
```

#### Ścieżka 5: Finish Mode → AI Coach (w trakcie sesji)

```
Finish Mode (finish)
  ↓ [kliknięcie "🧠 AI" w top bar]
AI Coach (ai_coach)
  → Powrót do Finish Mode (back button)
```

### Ukryte/nieoczywiste ścieżki

1. **Backlog goals** - dostępne przez przycisk "Show backlog" na Dashboard, ale nie ma bezpośredniego linku w nawigacji
2. **Ideas Vault** - dostępne tylko na Dashboard (scroll w dół), brak osobnego ekranu
3. **Rewards** - dostępne tylko w Pillar Detail, brak globalnego widoku nagród

---

## 3. MARTWE ELEMENTY

### Przyciski/linki bez handlera lub z pustą funkcją

#### `App.tsx`

- **Linia 134**: `handleSprintDayToggle={(idx) => console.log('Sprint day toggle:', idx)}` - tylko console.log, brak implementacji
- **Linia 135**: `handleUpdateRules={(rules) => console.log('Update rules:', rules)}` - tylko console.log, brak implementacji
- **Linia 136**: `resetSprint={() => console.log('Reset sprint')}` - tylko console.log, brak implementacji

#### `RouteManager.tsx`

- **Linia 134**: `handleSprintDayToggle` - przekazywane do `SprintView`, ale handler tylko loguje
- **Linia 135**: `handleUpdateRules` - przekazywane do `Rules`, ale handler tylko loguje
- **Linia 136**: `resetSprint` - przekazywane do `SprintView`, ale handler tylko loguje

#### `SprintViewPremium.tsx`

- **Linia 81**: `onClick={() => onToggleDay(index)}` - wywołuje handler, ale handler w App.tsx tylko loguje

#### `RulesPremium.tsx`

- **Linia 8**: `onUpdateRules` - wywołuje handler, ale handler w App.tsx tylko loguje (powinien aktualizować `data.customRules`)

#### `SettingsPremium.tsx`

- **Linia 386**: Przycisk "🔊 Test Audio System" - brak implementacji (tylko placeholder)
- **Linia 835**: Przycisk "🔄 Sync Data" - wywołuje `handleSyncData`, ale sync jest opcjonalny (local-first), może nie działać bez backendu

#### `FinishMode.tsx`

- **Linia 839**: `confirm()` dialog przy próbie startu sesji gdy inna jest aktywna - działa, ale może być niejasne dla użytkownika

### Ukryte elementy (istnieją w kodzie, ale nie są widoczne)

1. **Sprint Manager** - zakomentowany w `App.tsx` (linia 159-162):

   ```tsx
   {
     /* <SprintManager
     data={data}
     setData={setData}
   /> */
   }
   ```

2. **Normalized data** - Phase 2 jest wyłączona (komentarze w wielu komponentach):
   - `PillarDetailPremium.tsx` linia 61-76
   - `TodayPremium.tsx` linia 38-39
   - `AICoachPremium.tsx` linia 30-35

3. **Optimistic UI** - Phase 3 jest wyłączona (komentarze):
   - `PillarDetailPremium.tsx` linia 65-69
   - `TodayPremium.tsx` linia 20-24

### Elementy z niejasnym działaniem

1. **`accountability` view** - pokazuje `data.user.streak` i `data.notificationHistory`, ale:
   - Nie ma jasnego sposobu na aktualizację streak (powinien być automatyczny)
   - Notification history może być pusta jeśli brak powiadomień

2. **Timer** - działa lokalnie, ale:
   - Nie jest zsynchronizowany z Finish Mode sessions
   - Nie zapisuje historii sesji timerowych

3. **Ideas Vault** - dostępne tylko przez scroll na Dashboard:
   - Brak szybkiego dostępu z innych ekranów
   - Brak osobnego ekranu dla Ideas

---

## 4. NIEJASNE SEKCJE

### Placeholder teksty / niejasne komunikaty

#### `FinishMode.tsx`

- **Linia 339-341**: "Showing active goals only. If you don't see a task, move its goal from backlog → active." - dobry komunikat, ale może być niejasne jak przenieść do backlogu
- **Linia 469**: "Select a stuck task to start Finish Mode." - ale można wybrać dowolny task (nie tylko stuck), co jest zgodne z PLAN 5.3, ale tekst wprowadza w błąd

#### `DashboardPremium.tsx`

- **Linia 628**: "Brak tasków bliskich finiszu (≥50%). Popracuj nad postępem albo wybierz task ręcznie w Finish Mode." - jasne
- **Linia 662**: Podobny komunikat - może być redundantny

#### `PillarDetailPremium.tsx`

- **Linia 692**: "Optional but recommended: define when this task is objectively DONE." - jasne
- **Linia 754**: "Tip: write a concrete checklist in one sentence (no vagueness)." - dobry hint

#### `AICoachPremium.tsx`

- **Linia 89**: "Strategic analysis powered by artificial intelligence" - może być mylące (AI może być offline/disabled)
- **Linia 155**: "Ask strategic questions, analyze mission progress, or get priority recommendations" - jasne

#### `SettingsPremium.tsx`

- **Linia 597**: "Finish-first: mniej aktywnych celów = większy fokus na domykanie." - jasne
- **Linia 633**: "Uwaga: limit dotyczy celów oznaczonych jako aktywne (backlog jest poza głównym loopem)." - jasne

### Niespójne elementy

1. **Nazewnictwo**:
   - W kodzie: `Pillar` / `pillar`
   - W UI: "Goal" / "Cel"
   - W PLAN.md: "Goal"
   - **Problem**: Mieszanka terminów może mylić

2. **Przyciski "Back"**:
   - Większość ekranów ma przycisk "← Back" w lewym górnym rogu
   - `FinishMode.tsx` ma top bar z "← Dashboard" i "🧠 AI" (linia 277-291)
   - `AICoachPremium.tsx` ma "← Back to Command Center" (linia 79)
   - **Problem**: Różne teksty, brak spójności

3. **Status AI**:
   - W `AICoachPremium.tsx` jest banner statusu (linia 93-109)
   - W `FinishMode.tsx` brak wizualnego wskaźnika statusu AI (tylko komunikaty w przyciskach)
   - **Problem**: Niespójne UX dla statusu AI

---

## 5. BRAKUJĄCE POŁĄCZENIA

### Zgodnie z PLAN.md

#### PLAN 5.2 - Dashboard powinien eksponować max 3 aktywne cele

- ✅ **Zaimplementowane**: `DashboardPremium.tsx` linia 74-105 (`goalBuckets`)
- ✅ **Działa**: Pokazuje max 3 aktywne, reszta w backlogu

#### PLAN 5.3 - Finish Mode: allow selecting ANY task (not only stuck)

- ✅ **Zaimplementowane**: `FinishMode.tsx` linia 80-107 (`selectableTasks`)
- ✅ **Działa**: Można wybrać dowolny task z aktywnych celów

#### PLAN 5.4 - Asystent AI powinien znać strategię celu, kontekst surowości

- ✅ **Zaimplementowane**: `utils/aiPrompts.ts` (sprawdzono w kodzie)
- ⚠️ **Częściowo**: AI Coach nie pokazuje wizualnie, który cel jest "active" w kontekście

#### PLAN 5.7 - Statystyki na dashboardzie

- ✅ **Zaimplementowane**: `DashboardPremium.tsx` linia 736-820 (accordion stats)
- ✅ **Działa**: Pokazuje Stuck→Done rate, sessions, minutes, tasks done

#### PLAN 5.8 - Baza pomysłów (Ideas Vault)

- ✅ **Zaimplementowane**: `DashboardPremium.tsx` linia 823-1057
- ⚠️ **Częściowo**: Brak osobnego ekranu, tylko scroll na Dashboard

### Zgodnie z BACKLOG.md

#### Post-MVP: Powiadomienia push

- ❌ **Brakuje**: Implementacja push notifications (tylko placeholder w `SettingsPremium.tsx` linia 818-825)

#### Post-MVP: Raport tygodniowy

- ❌ **Brakuje**: Osobny ekran/komponent dla raportu tygodniowego

#### Post-MVP: Finish Mode: osobny "następny mikrokrok" dla in_progress/stuck

- ⚠️ **Częściowo**: W Finish Mode są przyciski "💡 Co robić teraz?" i "🧩 Mikrokrok (5–10 min)" (linia 503-601), ale nie są dedykowane dla in_progress/stuck

#### Post-MVP: Głosowe powiadomienia

- ⚠️ **Częściowo**: Settings mają konfigurację voice (linia 202-393), ale brak implementacji głosowych powiadomień w aplikacji

### Brakujące połączenia między ekranami

1. **Ideas Vault → Goal**:
   - ✅ Można przypiąć idea do goal (w formularzu)
   - ❌ Brak szybkiego linku z Idea do Goal Detail

2. **Rewards → Finish Mode**:
   - ✅ Rewards są w Pillar Detail
   - ❌ Brak wizualnego połączenia między earned rewards a Finish Mode sessions

3. **Stats → History**:
   - ✅ Stats pokazują 7d metryki
   - ❌ Brak linku do szczegółowej historii (np. lista wszystkich sesji Finish Mode)

4. **Timer → Finish Mode**:
   - ❌ Timer działa niezależnie od Finish Mode
   - ❌ Brak integracji: timer nie może automatycznie startować Finish Mode session

---

## 6. STAN FINISH MODE

### Jak wejść do Finish Mode

**Sposoby wejścia:**

1. **Z Dashboard**:
   - Przycisk "🏁 Finish Mode" (linia 286, 653, 664 w `DashboardPremium.tsx`)
   - Przycisk "DOMKNIJ TERAZ" (linia 600-632) - automatycznie startuje sesję dla rekomendowanego taska
   - Nawigacja dolna: ikona "Finish" (linia 86-91 w `Navigation.tsx`)

2. **Z Pillar Detail**:
   - Przycisk "🔥 ENTER FINISH MODE" (linia 887-891 w `PillarDetailPremium.tsx`)

3. **Bezpośrednio**:
   - Nawigacja dolna → "Finish" (zawsze dostępne)

### Co działa

#### ✅ Wybór taska

- **Linia 318-338**: Dropdown z wszystkimi taskami z aktywnych celów
- **Linia 80-107**: Logika `selectableTasks` - preferuje stuck tasks, ale pozwala na dowolny task
- **Linia 137-198**: Auto-selekcja taska przy wejściu (priorytet: active session → pillar context → stuck tasks)

#### ✅ Sesja Finish Mode

- **Linia 719-763** (`AppContext.tsx`): `startFinishSession` - tworzy sesję, kończy poprzednią jeśli aktywna
- **Linia 835-856** (`FinishMode.tsx`): Przycisk "Start session" - startuje sesję dla wybranego taska
- **Linia 483-495**: Wyświetlanie statusu aktywnej sesji (czas trwania, start time)

#### ✅ Wsparcie w sesji (PLAN 5.3)

- **Linia 498-620**: Dwa przyciski AI:
  - "💡 Co robić teraz?" - `request: 'what_now'`
  - "🧩 Mikrokrok (5–10 min)" - `request: 'micro_step'`
- **Linia 524-535**: Używa `buildFinishSessionInSessionPrompt` z kontekstem sesji

#### ✅ Klasyfikacja po sesji

- **Linia 622-824**: Formularz kończenia sesji:
  - Wybór statusu: DONE / W TRAKCIE / ZABLOKOWANE
  - Notatka użytkownika (max 500 znaków)
  - AI idea suggestion (opcjonalnie)
- **Linia 765-809**: Przycisk "Zapisz" - wywołuje `endFinishSession` z klasyfikacją

#### ✅ Aktualizacja taska

- **Linia 809-852** (`AppContext.tsx`): `endFinishSession` aktualizuje task:
  - `DONE` → `progress = 100`, `status = 'done'`, `completedAt`
  - `stuck` → `status = 'stuck'`
  - `in_progress` → `status = 'active'`

#### ✅ Historia sesji

- **Linia 1462-1463** (`AppContext.tsx`): `finishSessionsHistory` - lista wszystkich sesji
- **Linia 750-753**: Ograniczenie do 500 sesji (ochrona przed przepełnieniem storage)

### Co nie działa / problemy

#### ❌ Brak wizualnego wskaźnika postępu w sesji

- **Problem**: Sesja pokazuje tylko czas trwania (minuty), ale nie ma progress bara ani wizualnego feedbacku
- **Lokalizacja**: `FinishMode.tsx` linia 492-495

#### ⚠️ AI idea suggestion może być puste

- **Problem**: Jeśli AI jest offline/disabled, `ideaSuggestion` może być puste, ale formularz nadal działa
- **Lokalizacja**: `FinishMode.tsx` linia 688-763

#### ⚠️ Brak walidacji przed startem sesji

- **Problem**: Można startować sesję bez wybranego taska (chociaż UI wymusza wybór przez dropdown)
- **Lokalizacja**: `FinishMode.tsx` linia 835-852

#### ⚠️ Done Criteria Component (linia 1030-1224)

- **Problem**: Komponent `DoneCriteria` jest zdefiniowany, ale używany tylko gdy task jest selected w stuck tasks list (linia 940-947)
- **Problem**: Nie jest widoczny w głównym flow Finish Mode (tylko w sekcji "Stuck Tasks List")

#### ❌ Brak integracji z Timer

- **Problem**: Timer działa niezależnie, nie może automatycznie startować Finish Mode session
- **Lokalizacja**: `TimerPremium.tsx` - brak połączenia z `FinishMode`

### Jakie dane są przekazywane

#### Start sesji (`startFinishSession`)

```typescript
{
  taskId: number,      // ID wybranego taska
  pillarId: number     // ID celu, do którego należy task
}
```

#### Koniec sesji (`endFinishSession`)

```typescript
{
  sessionId: string,
  payload: {
    status: 'completed' | 'aborted',
    userNote?: string,              // Notatka użytkownika (max 500 znaków)
    aiSummary?: string,             // AI-generated summary (opcjonalnie)
    classification?: {
      status: 'done' | 'in_progress' | 'stuck',
      note?: string                 // Krótka notatka (max 500 znaków)
    }
  }
}
```

#### Dane w sesji (dla AI prompts)

- `pillar` - pełny obiekt celu (strategia, aiTone, type)
- `task` - pełny obiekt taska (name, progress, definitionOfDone)
- `sessionStartTime` - ISO timestamp
- `sessionMinutes` - obliczony czas trwania
- `ideas` - lista relevant ideas (max 8)

### Problemy z przepływem danych

1. **Auto-selekcja taska** (linia 137-198):
   - Może być mylące - użytkownik może nie zauważyć, że task został auto-wybrany
   - Brak wizualnego feedbacku "auto-selected"

2. **In-session support** (linia 498-620):
   - AI support jest resetowany przy zmianie taska (linia 257-262)
   - Może być frustrujące jeśli użytkownik przypadkowo zmieni task

3. **End session form** (linia 622-824):
   - Formularz jest ukryty domyślnie (linia 486: `setShowEndForm`)
   - Może być niejasne, że trzeba kliknąć "End session" aby zobaczyć formularz

---

## PODSUMOWANIE I REKOMENDACJE

### Krytyczne problemy (wymagają naprawy)

1. **Sprint/Rules handlers** - tylko console.log, brak implementacji
2. **Done Criteria** - komponent istnieje, ale nie jest używany w głównym flow Finish Mode
3. **Niespójne nazewnictwo** - Pillar vs Goal vs Cel

### Ważne ulepszenia (post-MVP)

1. **Ideas Vault** - osobny ekran lub szybki dostęp
2. **Timer → Finish Mode** - integracja
3. **Stats → History** - link do szczegółowej historii
4. **Wizualny progress** w Finish Mode session

### Drobne ulepszenia UX

1. **Spójne przyciski "Back"** - ujednolicić teksty
2. **Status AI** - wizualny wskaźnik w Finish Mode
3. **Auto-selected task** - wizualny feedback
4. **End session form** - może być widoczny domyślnie lub lepszy hint

---

**Koniec raportu**
