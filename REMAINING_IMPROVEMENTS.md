# POZOSTAŁE ULEPSZENIA - Evening Protocol & Declaration System

**Data:** 2026-01-26  
**Status:** Phase 3-4 Complete, poniżej lista ulepszeń przed finalizacją

---

## ✅ ZAIMPLEMENTOWANE

### Phase 1: Foundation & Data Model ✅

- ✅ Type system enhancement
- ✅ Migration system (v1 → v2)
- ✅ Domain services (DeclarationStatusCalculator, PenaltyCalculator)
- ✅ UUID generation utilities

### Phase 2: Evening Protocol UI ✅

- ✅ Main protocol screen
- ✅ Task selection
- ✅ Done Criteria editor
- ✅ Time Window selector
- ✅ Implementation Intentions form
- ✅ Rules selector
- ✅ Auto-save functionality

### Phase 3: Declaration Display & Agent Integration ✅

- ✅ DeclarationsDisplay component
- ✅ Real-time status calculation
- ✅ Goal Agent monitoring service
- ✅ Agent check scheduler
- ✅ Penalty notifications

### Phase 4: Completion Flow Improvements ✅

- ✅ Enhanced validation
- ✅ Progress indicators
- ✅ Success/error messages
- ✅ Duplicate prevention
- ✅ Better error handling

---

## 🔧 POZOSTAŁE ULEPSZENIA (Priority Order)

### 🔴 HIGH PRIORITY

#### 1. **Declaration Status Updates in Finish Mode**

**Problem:** Gdy użytkownik rozpoczyna Finish Mode session dla deklaracji, status powinien się automatycznie zmienić na `in_progress`.

**Rozwiązanie:**

- W `FinishMode.tsx`, gdy `startFinishSession` jest wywoływane dla zadania z deklaracją, zaktualizuj status deklaracji
- W `DeclarationsDisplay`, pokaż wizualnie że deklaracja jest "w trakcie" gdy Finish Mode jest aktywny

**Files:**

- `components/FinishMode.tsx`
- `components/DeclarationsDisplay.tsx`
- `contexts/AppContext.tsx` (może wymagać nowego handlera)

**Estimated Time:** 1-2h

---

#### 2. **Declaration Completion from Finish Mode**

**Problem:** Gdy użytkownik kończy zadanie w Finish Mode, odpowiednia deklaracja powinna być automatycznie oznaczona jako `completed`.

**Rozwiązanie:**

- W `endFinishSession`, sprawdź czy zadanie ma powiązaną deklarację
- Jeśli tak, zaktualizuj status deklaracji na `completed` i ustaw `completedAt`
- Sprawdź Done Criteria - jeśli wszystkie są spełnione, automatycznie ustaw `completed`

**Files:**

- `components/FinishMode.tsx`
- `contexts/AppContext.tsx`

**Estimated Time:** 1-2h

---

#### 3. **Agent Check Integration with Finish Mode**

**Problem:** Agent powinien wiedzieć, że deklaracja jest "w trakcie" gdy Finish Mode jest aktywny, i nie powinien karać w tym czasie.

**Rozwiązanie:**

- W `goalAgentService.ts`, `runAgentChecks` już przyjmuje `finishSessionActive` map
- Upewnij się, że `scheduleGoalAgentChecks` w `scheduler.ts` poprawnie przekazuje tę informację
- Sprawdź czy `DeclarationStatusCalculator` poprawnie obsługuje `finishSessionActive`

**Files:**

- `utils/goalAgentService.ts` (sprawdź)
- `utils/scheduler.ts` (sprawdź)
- `utils/declarationStatusCalculator.ts` (sprawdź)

**Estimated Time:** 30min-1h

---

### 🟡 MEDIUM PRIORITY

#### 4. **Declaration History & Analytics**

**Problem:** Brak widoku historii deklaracji i statystyk (ile ukończonych, ile niepowodzeń, etc.)

**Rozwiązanie:**

- Stwórz nowy widok `declaration_history` lub dodaj sekcję w Dashboard
- Pokaż:
  - Statystyki z ostatnich 7/30 dni
  - Wykres ukończonych vs niepowodzeń
  - Lista wszystkich deklaracji z statusami
  - Penalty history

**Files:**

- `components/DeclarationHistory.tsx` (NEW)
- `components/DashboardPremium.tsx` (dodaj link)
- `components/RouteManager.tsx` (dodaj route)

**Estimated Time:** 2-3h

---

#### 5. **Agent Configuration UI**

**Problem:** Użytkownik nie może skonfigurować agenta (check interval, penalty points, etc.)

**Rozwiązanie:**

- W `PillarDetailPremium.tsx`, dodaj sekcję "Agent Konfiguracja"
- Pozwól użytkownikowi:
  - Włączyć/wyłączyć agenta
  - Zmienić check interval (15, 30, 60 min)
  - Zmienić penalty points per failure
  - Zobaczyć historię sprawdzeń

**Files:**

- `components/PillarDetailPremium.tsx`
- `components/AgentConfigPanel.tsx` (NEW, optional)

**Estimated Time:** 2-3h

---

#### 6. **Better Penalty Visualization**

**Problem:** Kary są pokazywane w konsoli i notification history, ale brak wizualizacji w UI.

**Rozwiązanie:**

- W `DeclarationsDisplay`, pokaż kary bardziej widocznie (czerwony badge, tooltip)
- W `PillarDetailPremium`, dodaj sekcję "Penalty History"
- Pokaż wykres kar z ostatnich dni

**Files:**

- `components/DeclarationsDisplay.tsx`
- `components/PillarDetailPremium.tsx`

**Estimated Time:** 1-2h

---

### 🟢 LOW PRIORITY (Nice to Have)

#### 7. **Declaration Templates**

**Problem:** Użytkownik musi za każdym razem definiować Done Criteria od zera.

**Rozwiązanie:**

- Pozwól zapisać Done Criteria jako template dla zadania
- Przy wyborze zadania w Evening Protocol, automatycznie załaduj template
- Możliwość edycji template

**Files:**

- `types.ts` (dodaj `Task.doneCriteriaTemplate?`)
- `components/EveningProtocolPremium.tsx`
- `components/DeclarationDoneCriteriaEditor.tsx`

**Estimated Time:** 2-3h

---

#### 8. **Protocol Templates**

**Problem:** Użytkownik może chcieć zapisać cały protokół jako template (zadania + intentions + rules).

**Rozwiązanie:**

- Dodaj możliwość zapisania protokołu jako template
- Przy tworzeniu nowego protokołu, pozwól wybrać template
- Możliwość edycji template

**Files:**

- `types.ts` (dodaj `ProtocolTemplate`)
- `components/EveningProtocolPremium.tsx`
- `components/ProtocolTemplateSelector.tsx` (NEW)

**Estimated Time:** 3-4h

---

#### 9. **Declaration Reminders**

**Problem:** Brak przypomnień przed rozpoczęciem okna czasowego deklaracji.

**Rozwiązanie:**

- 15 minut przed startem okna czasowego, pokaż powiadomienie
- Integracja z `utils/scheduler.ts`
- Możliwość konfiguracji czasu przypomnienia

**Files:**

- `utils/scheduler.ts`
- `components/NotificationManager.tsx`

**Estimated Time:** 2-3h

---

#### 10. **Export/Import Protocols**

**Problem:** Brak możliwości eksportu/importu protokołów (backup, sharing).

**Rozwiązanie:**

- Dodaj przycisk "Export Protocol" w `EveningProtocolPremium`
- Format: JSON
- Import z walidacją

**Files:**

- `components/EveningProtocolPremium.tsx`
- `utils/protocolExport.ts` (NEW)

**Estimated Time:** 1-2h

---

## 🐛 POTENCJALNE BUGI DO SPRAWDZENIA

1. **Time Window Midnight Crossover**
   - Sprawdź czy `TimeWindowSelector` poprawnie obsługuje okna czasowe przechodzące przez północ (np. 22:00 - 02:00)

2. **Declaration Status Race Condition**
   - Sprawdź czy nie ma race condition gdy agent sprawdza deklarację w tym samym czasie co użytkownik kończy Finish Mode

3. **Duplicate Declarations**
   - Sprawdź czy nie ma możliwości utworzenia duplikatów deklaracji (już naprawione, ale warto przetestować)

4. **Agent Check Performance**
   - Sprawdź czy agent check nie spowalnia aplikacji przy dużej liczbie deklaracji

5. **Migration Edge Cases**
   - Sprawdź czy migracja v1 → v2 działa poprawnie dla wszystkich możliwych stanów danych

---

## 📋 TESTING CHECKLIST

### Manual Testing

- [ ] Utworzenie protokołu wieczornego
- [ ] Wybór zadań
- [ ] Definiowanie Done Criteria
- [ ] Ustawienie okien czasowych
- [ ] Dodanie Implementation Intentions (min 3)
- [ ] Dodanie Rules (min 1)
- [ ] Ukończenie protokołu
- [ ] Wyświetlanie deklaracji na Dashboard
- [ ] Rozpoczęcie Finish Mode dla deklaracji
- [ ] Zakończenie zadania w Finish Mode
- [ ] Sprawdzenie czy deklaracja jest automatycznie ukończona
- [ ] Sprawdzenie czy agent nie karze podczas Finish Mode
- [ ] Sprawdzenie kar za nieprzestrzeganie deklaracji

### Edge Cases

- [ ] Protokół bez zadań
- [ ] Protokół z duplikatami zadań
- [ ] Deklaracja bez Done Criteria
- [ ] Deklaracja bez okna czasowego
- [ ] Okno czasowe przechodzące przez północ
- [ ] Wiele deklaracji dla tego samego zadania
- [ ] Agent check podczas aktywnego Finish Mode
- [ ] Ukończenie protokołu dwa razy

---

## 🎯 REKOMENDACJA

**Przed finalizacją etapu, zaimplementuj:**

1. ✅ **Declaration Status Updates in Finish Mode** (HIGH)
2. ✅ **Declaration Completion from Finish Mode** (HIGH)
3. ✅ **Agent Check Integration verification** (HIGH)

Te trzy ulepszenia są kluczowe dla poprawnego działania systemu deklaracji i agenta.

**Następnie:**

- Przetestuj wszystkie scenariusze z checklisty
- Napraw znalezione bugi
- Zaimplementuj medium priority ulepszenia jeśli czas pozwala

---

**Status:** Ready for High Priority Improvements  
**Next Step:** Implementacja integracji Finish Mode z deklaracjami
