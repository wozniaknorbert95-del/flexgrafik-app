# PLAN DZIAŁAŃ NAPRAWCZYCH – UI/UX Improvements

**Data utworzenia:** 2026-01-26  
**Status:** W trakcie implementacji  
**Zakres:** 5 faz naprawczych zidentyfikowanych w audycie UI/Flow

---

## FAZA 1: Martwe handlery (Sprint/Rules) ✅ DONE

### Status

**✅ UKOŃCZONE** (2026-01-26)

### Co zostało zrobione

- Zaimplementowano `handleSprintDayToggle` w `App.tsx`
- Zaimplementowano `handleUpdateRules` w `App.tsx`
- Zaimplementowano `resetSprint` w `App.tsx`
- Dodano `setData` do destructuringu z `useAppContext()`
- Handlery używają `setData` z funkcjonalnym update (immutable)
- Persistencja działa automatycznie przez `debouncedSaveAppData`
- **Dodano przycisk "Reset Sprint" w `SprintViewPremium.tsx`** (2026-01-26)

### Pliki zmienione

- `App.tsx` (linie 1, 3, 46, 91-141, 188-190)
- `components/SprintViewPremium.tsx` (dodano przycisk reset)
- `components/RouteManager.tsx` (przekazano `resetSprint` do SprintView)

### Weryfikacja

- ✅ Brak błędów TypeScript/linter
- ✅ Handlery są podłączone do RouteManager
- ✅ Przycisk reset działa z potwierdzeniem
- ⚠️ Build nie przeszedł z powodu błędu środowiska (EPERM), nie kodu

---

## FAZA 2: Done Criteria w głównym flow Finish Mode ✅ DONE

### Status

**✅ UKOŃCZONE** (2026-01-26)

### Problem

Komponent `DoneCriteria` istnieje (linia 1030-1224 w `FinishMode.tsx`), ale jest używany tylko w sekcji "Stuck Tasks List" (linia 940-947). Nie jest widoczny w głównym flow Finish Mode, gdzie użytkownik wybiera task i startuje sesję.

### Cel

Dodać `DoneCriteria` do głównego flow Finish Mode, żeby użytkownik widział checklistę DONE podczas sesji.

### Co zostało zrobione

- Dodano `DoneCriteria` do Session Header w głównym flow Finish Mode (linie 467-472)
- Komponent jest widoczny gdy `selectedTask` jest wybrany
- Umieszczony po Definition of DONE, przed Session controls
- Auto-update task progress już działa w komponencie (linia 1132-1146)

### Pliki zmienione

- `components/FinishMode.tsx` (linie 467-472: dodano render DoneCriteria w Session Header)

### Kroki implementacji

#### Krok 2.1: Analiza obecnego użycia DoneCriteria

- **Plik:** `components/FinishMode.tsx`
- **Linie:** 940-947 (użycie w Stuck Tasks List), 1030-1224 (definicja komponentu)
- **Akcja:** Sprawdzić, czy komponent jest gotowy do użycia w głównym flow

#### Krok 2.2: ✅ Dodanie DoneCriteria do Session Header

- **Plik:** `components/FinishMode.tsx`
- **Lokalizacja:** Sekcja "Session Header" (linia 467-472), po wyświetleniu Definition of DONE
- **Zrobione:**
  - Dodano `DoneCriteria` component render po `definitionOfDone` display
  - Warunek: pokazywać gdy `selectedTask` jest wybrany (niezależnie od sesji)
  - Umieszczony w sekcji z Strategy i Definition of DONE

#### Krok 2.3: ✅ Integracja z task progress

- **Plik:** `components/FinishMode.tsx`
- **Lokalizacja:** Komponent `DoneCriteria` (linia 1030-1224)
- **Status:**
  - Auto-update task progress już działa (linia 1132-1146)
  - `updateTask` jest wywoływany poprawnie
  - Wizualny feedback gdy wszystkie criteria są completed już istnieje (linia 1210-1221)

#### Krok 2.4: Testowanie

- **Testy manualne:**
  1. Wejść do Finish Mode
  2. Wybrać task z Definition of DONE
  3. Sprawdzić, czy DoneCriteria jest widoczne w Session Header
  4. Odznaczyć/zaznaczyć kryteria
  5. Sprawdzić, czy progress taska się aktualizuje

### Pliki zmienione

- `components/FinishMode.tsx` (linie 467-472: dodano render DoneCriteria w Session Header)

### Zależności

- Komponent `DoneCriteria` już istnieje i działa
- `updateTask` w AppContext już istnieje
- Brak zmian w typach

### Ryzyka

- ⚠️ DoneCriteria może być zbyt duże dla mobile (sprawdzić responsive)
- ⚠️ Może być mylące, jeśli task nie ma `doneCriteria` (sprawdzić fallback)

### Szacowany czas

**1-2 godziny** (mała zmiana, komponent już istnieje)

---

## FAZA 3: Wizualny feedback sesji Finish Mode ✅ DONE

### Status

**✅ UKOŃCZONE** (2026-01-26)

### Problem

Sesja Finish Mode pokazuje tylko czas trwania (minuty) w tekście (linia 492-495), ale brakuje:

- Progress bara pokazującego postęp sesji
- Wizualnego wskaźnika, że sesja jest aktywna
- Feedbacku dla użytkownika, że coś się dzieje

### Cel

Dodać wizualny progress bar i wskaźniki aktywności sesji.

### Co zostało zrobione

- Dodano pulsujący wskaźnik aktywności na przycisku "End session" (motion.span z animacją)
- Dodano progress bar pokazujący czas w sesji (0-25 min jako 100%)
- Progress bar pokazuje "X min / 25 min" z rekomendacją
- Użyto Framer Motion do animacji (już zaimportowany)

### Kroki implementacji

#### Krok 3.1: Analiza obecnego wyświetlania sesji

- **Plik:** `components/FinishMode.tsx`
- **Linie:** 483-495 (status aktywnej sesji), 232-254 (obliczanie czasu trwania)
- **Akcja:** Zrozumieć, jakie dane są dostępne (startTime, nowTick, sessionDurationMinutes)

#### Krok 3.2: Dodanie progress bara dla sesji

- **Plik:** `components/FinishMode.tsx`
- **Lokalizacja:** Sekcja "Session controls" (linia 478-864), po wyświetleniu czasu trwania (linia 492-495)
- **Akcja:**
  - Dodać progress bar pokazujący "czas w sesji" (np. 0-25 min jako 100%)
  - Opcjonalnie: pokazać rekomendowany czas (25 min Pomodoro)
  - Użyć istniejących klas CSS (np. `glass-card`, progress bar z Dashboard)

#### Krok 3.3: Dodanie wizualnego wskaźnika aktywności

- **Plik:** `components/FinishMode.tsx`
- **Lokalizacja:** Przy przycisku "End session" (linia 485-490)
- **Akcja:**
  - Dodać pulsujący wskaźnik (np. kropka) gdy sesja jest aktywna
  - Dodać animację "breathing" dla wskaźnika aktywności
  - Użyć Framer Motion (już zaimportowany)

#### Krok 3.4: Dodanie wskaźnika postępu w czasie rzeczywistym

- **Plik:** `components/FinishMode.tsx`
- **Lokalizacja:** W sekcji Session Header
- **Akcja:**
  - Dodać timer wizualny (circular progress lub linear bar)
  - Aktualizować co 30 sekund (już jest `setInterval` w linii 235)
  - Pokazać "X min / 25 min" lub podobny format

#### Krok 3.5: Testowanie

- **Testy manualne:**
  1. Startować sesję Finish Mode
  2. Sprawdzić, czy progress bar się pojawia
  3. Poczekać 1-2 minuty, sprawdzić czy się aktualizuje
  4. Sprawdzić na mobile (responsive)

### Pliki do zmiany

- `components/FinishMode.tsx` (dodanie progress bar i wskaźników)

### Zależności

- Framer Motion już zaimportowany
- CSS classes już istnieją (sprawdzić `src/styles/`)
- Timer logic już istnieje (linia 232-254)

### Ryzyka

- ⚠️ Zbyt częste aktualizacje mogą spowolnić UI (użyć debounce/throttle)
- ⚠️ Progress bar może być mylący jeśli nie ma limitu czasu (sesja jest bez limitu)

### Szacowany czas

**2-3 godziny** (dodanie UI elementów + animacje)

---

## FAZA 4: Ujednolicenie nazewnictwa (Pillar → Goal w UI) ✅ DONE

### Status

**✅ UKOŃCZONE** (2026-01-26)

### Problem

W kodzie używane są różne terminy:

- W kodzie: `Pillar` / `pillar`
- W UI: "Goal" / "Cel" / "Pillar"
- W PLAN.md: "Goal"
- W types.ts: `Pillar` (typ)

To powoduje niespójność i może mylić użytkownika.

### Cel

Ujednolicić nazewnictwo w UI na "Goal" / "Cel", zachowując kompatybilność z typami (nie zmieniać `Pillar` w types.ts na razie).

### Strategia

**Zachować `Pillar` w types.ts i AppContext** (kompatybilność wsteczna), ale **wszystkie teksty w UI zmienić na "Goal" / "Cel"**.

### Co zostało zrobione

- Zmieniono komentarz w FinishMode: "pillar detail" → "goal detail"
- Zmieniono tekst: "Select a stuck task" → "Select a task" (FinishMode)
- Zmieniono: "Stuck project detected" → "Stuck goal detected" (Settings)
- Zmieniono: "Project archived properly" → "Goal archived properly" (DoneCriteria default)
- Zmieniono: "complex projects" → "complex goals" (Settings example)

### Kroki implementacji

#### Krok 4.1: Inwentaryzacja tekstów w UI

- **Pliki do sprawdzenia:**
  - `components/DashboardPremium.tsx`
  - `components/PillarDetailPremium.tsx`
  - `components/FinishMode.tsx`
  - `components/Navigation.tsx`
  - `components/RouteManager.tsx`
  - `components/screens/AICoachPremium.tsx`
- **Akcja:** Znaleźć wszystkie wystąpienia "Pillar", "pillar", "projekt", "project" w tekstach użytkownika

#### Krok 4.2: Utworzenie mapy zmian

- **Akcja:** Stworzyć listę wszystkich miejsc, gdzie trzeba zmienić tekst:
  - "Pillar" → "Goal"
  - "pillar" → "goal" (w tekstach)
  - "projekt" → "cel" (w polskich tekstach)
  - "project" → "goal" (w angielskich tekstach)

#### Krok 4.3: Zmiana tekstów w DashboardPremium

- **Plik:** `components/DashboardPremium.tsx`
- **Linie do sprawdzenia:**
  - Linia 307: "Twoje cele" (już OK)
  - Linia 310: "Cele:" (już OK)
  - Sprawdzić wszystkie komentarze i aria-labels
- **Akcja:** Zmienić wszystkie "pillar" → "goal" w tekstach użytkownika

#### Krok 4.4: Zmiana tekstów w PillarDetailPremium

- **Plik:** `components/PillarDetailPremium.tsx`
- **Linie do sprawdzenia:**
  - Wszystkie teksty wyświetlane użytkownikowi
  - Komentarze mogą zostać (są dla devów)
- **Akcja:** Zmienić "pillar" → "goal" w tekstach

#### Krok 4.5: Zmiana tekstów w FinishMode

- **Plik:** `components/FinishMode.tsx`
- **Linie do sprawdzenia:**
  - Linia 400: "Goal:" (już OK)
  - Wszystkie teksty związane z "pillar" → "goal"
- **Akcja:** Zmienić teksty, zachować zmienne (są z types.ts)

#### Krok 4.6: Zmiana tekstów w Navigation

- **Plik:** `components/Navigation.tsx`
- **Akcja:** Sprawdzić aria-labels i tooltips

#### Krok 4.7: Zmiana tekstów w AICoach

- **Plik:** `components/screens/AICoachPremium.tsx`
- **Akcja:** Sprawdzić wszystkie teksty wyświetlane użytkownikowi

#### Krok 4.8: Testowanie

- **Testy manualne:**
  1. Przejść przez wszystkie ekrany
  2. Sprawdzić, czy wszystkie teksty używają "Goal" / "Cel"
  3. Sprawdzić, czy nie ma mieszanki terminów
  4. Sprawdzić, czy aplikacja działa poprawnie (typy nie zmienione)

### Pliki do zmiany

- `components/DashboardPremium.tsx`
- `components/PillarDetailPremium.tsx`
- `components/FinishMode.tsx`
- `components/Navigation.tsx`
- `components/screens/AICoachPremium.tsx`
- `components/RouteManager.tsx` (jeśli są teksty)

### Zależności

- **NIE zmieniać:** `types.ts` (zachować `Pillar` dla kompatybilności)
- **NIE zmieniać:** `AppContext.tsx` (zmienne wewnętrzne mogą zostać)
- **Zmienić tylko:** Teksty wyświetlane użytkownikowi

### Ryzyka

- ⚠️ Łatwo przegapić jakieś miejsce (trzeba dokładnej inwentaryzacji)
- ⚠️ Komentarze w kodzie mogą być mylące (ale to mniej ważne)
- ✅ Brak ryzyka dla danych (typy nie zmienione)

### Szacowany czas

**2-3 godziny** (głównie find & replace + weryfikacja)

---

## FAZA 5: Dostępność Ideas Vault + spójne Back buttons ✅ DONE

### Status

**✅ UKOŃCZONE** (2026-01-26)

### Problem

1. **Ideas Vault** jest dostępne tylko przez scroll na Dashboard (linia 823-1057), brak szybkiego dostępu z innych ekranów
2. **Back buttons** mają różne teksty:
   - `FinishMode.tsx`: "← Dashboard" (linia 282)
   - `AICoachPremium.tsx`: "← Back to Command Center" (linia 79)
   - `PillarDetailPremium.tsx`: "← Back" (linia 248)
   - `TodayPremium.tsx`: "← Back" (linia 72)
   - Inne: "← Back"

### Cel

1. Dodać szybki dostęp do Ideas Vault (np. z nawigacji lub osobny ekran)
2. Ujednolicić teksty przycisków "Back" w całej aplikacji

### Co zostało zrobione

- Dodano `'ideas'` do `ViewState` w `types.ts`
- Dodano ikonę `Lightbulb` do Navigation
- Dodano "Ideas" do secondary items w Navigation
- Utworzono komponent `IdeasVaultPremium.tsx` (osobny ekran)
- Dodano routing dla `'ideas'` w `RouteManager.tsx`
- Dodano link "Open →" z Idea do Goal Detail (w Dashboard i IdeasVault)
- Ujednolicono wszystkie Back buttons na "← Back":
  - `AICoachPremium.tsx`: "← Back to Command Center" → "← Back"
  - `SettingsPremium.tsx`: "← Back to Mission Control" → "← Back"
  - `FinishMode.tsx`: "← Back to Dashboard" → "← Back" (dolny przycisk)

### Kroki implementacji

#### Krok 5.1: Analiza obecnego dostępu do Ideas Vault

- **Plik:** `components/DashboardPremium.tsx`
- **Linie:** 823-1057 (Ideas Vault section)
- **Akcja:** Zrozumieć, jak działa Ideas Vault (filtrowanie, dodawanie, usuwanie)

#### Krok 5.2: Opcja A: Dodanie Ideas do nawigacji dolnej

- **Plik:** `components/Navigation.tsx`
- **Lokalizacja:** Secondary items (linia 102-112)
- **Akcja:**
  - Dodać "Ideas" do `secondaryItems` (linia 102-112)
  - Dodać ikonę (np. `Lightbulb` z lucide-react)
  - Dodać `ViewState` 'ideas' do types.ts
  - Dodać routing w `RouteManager.tsx`

#### Krok 5.2: Opcja B: Osobny ekran Ideas Vault

- **Plik:** Nowy `components/IdeasVaultPremium.tsx`
- **Akcja:**
  - Przenieść logikę Ideas Vault z Dashboard do osobnego komponentu
  - Dodać routing w `RouteManager.tsx`
  - Dodać link w nawigacji (jak Opcja A)

**Rekomendacja:** Opcja A (szybsza, mniej zmian)

#### Krok 5.3: Ujednolicenie tekstów Back buttons

- **Standard:** "← Back" (krótki, spójny)
- **Wyjątek:** Finish Mode może mieć "← Dashboard" (bo nawigacja dolna jest ukryta)

#### Krok 5.4: Zmiana w FinishMode

- **Plik:** `components/FinishMode.tsx`
- **Linia:** 282
- **Akcja:** Zmienić "← Dashboard" na "← Back" (lub zostawić jeśli to celowe)

#### Krok 5.5: Zmiana w AICoachPremium

- **Plik:** `components/screens/AICoachPremium.tsx`
- **Linia:** 79
- **Akcja:** Zmienić "← Back to Command Center" na "← Back"

#### Krok 5.6: Weryfikacja wszystkich Back buttons

- **Pliki do sprawdzenia:**
  - `components/FinishMode.tsx`
  - `components/PillarDetailPremium.tsx`
  - `components/TodayPremium.tsx`
  - `components/TimerPremium.tsx` (jeśli ma)
  - `components/SprintViewPremium.tsx`
  - `components/SettingsPremium.tsx`
  - `components/RulesPremium.tsx`
  - `components/screens/AICoachPremium.tsx`
- **Akcja:** Ujednolicić wszystkie na "← Back"

#### Krok 5.7: Dodanie linku Ideas → Goal (opcjonalnie)

- **Plik:** `components/DashboardPremium.tsx` lub nowy `IdeasVaultPremium.tsx`
- **Lokalizacja:** W liście ideas (linia 1004-1048)
- **Akcja:**
  - Dodać przycisk/link "Otwórz cel" obok każdego idea, który ma `goalId`
  - Wywołać `handlePillarClick(idea.goalId)` i `setCurrentView('pillar_detail')`

#### Krok 5.8: Testowanie

- **Testy manualne:**
  1. Sprawdzić dostęp do Ideas Vault z nawigacji
  2. Przejść przez wszystkie ekrany, sprawdzić Back buttons
  3. Sprawdzić, czy link Ideas → Goal działa
  4. Sprawdzić na mobile (responsive)

### Pliki do zmiany

- `components/Navigation.tsx` (dodanie Ideas do nawigacji)
- `types.ts` (dodanie 'ideas' do ViewState, jeśli Opcja A)
- `components/RouteManager.tsx` (dodanie routingu dla Ideas, jeśli Opcja A)
- `components/screens/AICoachPremium.tsx` (zmiana tekstu Back)
- `components/DashboardPremium.tsx` (dodanie linku Ideas → Goal, opcjonalnie)
- Wszystkie komponenty z Back buttons (ujednolicenie tekstów)

### Zależności

- Ideas Vault już istnieje w Dashboard
- Routing już istnieje w RouteManager
- `handlePillarClick` już istnieje w AppContext

### Ryzyka

- ⚠️ Jeśli dodamy Ideas do nawigacji, może być za dużo pozycji (sprawdzić UX)
- ⚠️ Przeniesienie Ideas Vault do osobnego ekranu wymaga więcej pracy (Opcja B)
- ✅ Ujednolicenie Back buttons jest bezpieczne (tylko teksty)

### Szacowany czas

**2-4 godziny** (zależnie od wybranej opcji dla Ideas Vault)

---

## PRIORYTETYZACJA I KOLEJNOŚĆ

### Rekomendowana kolejność

1. **FAZA 1** ✅ - **DONE** (już zrobione)
2. **FAZA 2** - **Następna** (mała zmiana, duży wpływ na UX)
3. **FAZA 3** - **Po FAZIE 2** (wizualny feedback uzupełnia Done Criteria)
4. **FAZA 4** - **Równolegle z FAZĄ 5** (niezależne zmiany)
5. **FAZA 5** - **Równolegle z FAZĄ 4** (niezależne zmiany)

### Zależności między fazami

```
FAZA 1 (DONE)
   ↓
FAZA 2 (Done Criteria)
   ↓
FAZA 3 (Wizualny feedback) - może użyć Done Criteria z FAZY 2
   ↓
FAZA 4 (Nazewnictwo) - niezależna
FAZA 5 (Ideas + Back) - niezależna
```

### Szacowany czas całkowity

**8-12 godzin** (2-3 dni pracy)

---

## ZASADY IMPLEMENTACJI

### Dla każdej fazy

1. **Przed rozpoczęciem:**
   - Przeczytać odpowiednią sekcję w `AUDYT_UI_FLOW.md`
   - Sprawdzić zależności
   - Upewnić się, że rozumiesz strukturę danych

2. **Podczas implementacji:**
   - Pracuj małymi iteracjami (1-2 pliki na raz)
   - Testuj po każdej zmianie
   - Sprawdzaj linter errors

3. **Po zakończeniu:**
   - Uruchom `npm test` (jeśli są testy)
   - Uruchom `npm run build` (weryfikacja TypeScript)
   - Przetestuj manualnie na różnych ekranach
   - Zaktualizuj status w tym pliku

### Checklist przed commit

- [ ] Brak błędów TypeScript/linter
- [ ] Build przechodzi (`npm run build`)
- [ ] Testy manualne wykonane
- [ ] Zmiany zgodne z PLAN.md i DECISIONS.md
- [ ] Komentarze w kodzie zaktualizowane (jeśli potrzeba)

---

## NOTATKI

### FAZA 1

- ✅ Zakończona 2026-01-26
- Handlery działają, dane są persystowane

### FAZA 2

- Komponent `DoneCriteria` już istnieje i działa
- Trzeba tylko dodać render w głównym flow

### FAZA 3

- Framer Motion już zaimportowany
- Timer logic już istnieje
- Trzeba tylko dodać UI elementy

### FAZA 4

- **WAŻNE:** Nie zmieniać typów w `types.ts` (kompatybilność wsteczna)
- Zmieniać tylko teksty wyświetlane użytkownikowi

### FAZA 5

- Ideas Vault już ma pełną funkcjonalność
- Trzeba tylko dodać dostęp z nawigacji
- Back buttons to głównie find & replace

---

**Koniec planu**
