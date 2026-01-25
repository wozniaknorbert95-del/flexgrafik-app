# SKILLS - Procedury i praktyki dla ADHD Accountability Assistant

## Skill: Nowy cel (Goal)

### Kiedy używać

Kiedy chcemy dodać nowy cel z pełnym kontekstem (typ, strategia, surowość AI, taski). Pamiętaj o limicie 3 aktywnych celów (DECISIONS.md D-003).

### Kroki

1. **Sprawdź obecny stan celów**
   - W AppContext sprawdź ile jest aktywnych celów
   - Jeśli 3 lub więcej, zdecyduj czy zamknąć/dezaktywować inny
2. **Zaktualizuj model danych (types.ts)**
   - Dodaj/zaktualizuj pola w `Pillar` (mapowany na Goal):
     - `type: 'main' | 'secondary' | 'lab'`
     - `strategy: string` (opcjonalne)
     - `context: 'military' | 'psychoeducation' | 'raw_facts'`
3. **Zaktualizuj migracje**
   - W `utils/dataMigration.ts` dodaj logikę dla nowych pól
   - Ustaw domyślne wartości dla istniejących celów
4. **Zaktualizuj AppContext**
   - Dodaj operacje: `addGoal`, `updateGoalType`, `setGoalContext`
   - Walidacja: sprawdzenie limitu 3 aktywnych
5. **UI dla tworzenia/edycji celu**
   - Formularz z polami: nazwa, typ, strategia, kontekst
   - Wyświetlanie ostrzeżenia przy przekroczeniu limitu
6. **Przetestuj**
   - `npm test` dla logiki AppContext i migracji
   - Manualne sprawdzenie: tworzenie, edycja, limit 3 celów
7. **Zaktualizuj dokumentację**
   - Jeśli zmienił się model danych: krótka notatka w DECISIONS.md

### Pułapki/ryzyka

- Nie łam kompatybilności z istniejącymi danymi w IndexedDB
- Sprawdź czy migracja działa dla różnych wersji danych
- Limit 3 celów może być frustrujący - UI musi to dobrze komunikować
- Typ celu wpływa na AI (kontekst) - sprawdź czy prompty są aktualne
- Nowe pola mogą być undefined dla starych celów - handle gracefully

## Skill: Nowy task z Definicją DONE

### Kiedy używać

Kiedy dodajemy task z jasnym kryterium zakończenia, który będzie używany w Finish Mode i statystykach.

### Kroki

1. **Zaktualizuj model Task**
   - W `types.ts` dodaj pole `definitionOfDone: string` do `Task`
   - Może być opcjonalne z fallbackiem na opis
2. **Zaktualizuj migracje**
   - W `utils/dataMigration.ts` dodaj logikę dla `definitionOfDone`
   - Dla starych tasków: użyj opisu jako domyślnej definicji
3. **Zaktualizuj operacje na taskach**
   - W AppContext: `addTask`, `updateTask` - obsługa nowego pola
   - W `utils/taskHelpers.ts` - funkcje pomocnicze dla definicji DONE
4. **UI dla tasków**
   - Formularz tworzenia/edycji: oddzielne pole na Definicję DONE
   - Lista tasków: opcjonalnie pokaż definicję (tooltip, expand)
5. **Integracja z Finish Mode**
   - W `components/FinishMode.tsx` wyświetl Definicję DONE prominentnie
   - Use case: "Żeby zakończyć ten task, musisz: [definicja]"
6. **Przetestuj**
   - `npm test` dla nowych funkcji w AppContext i taskHelpers
   - Manualne: tworzenie taska, Definicja DONE w Finish Mode
7. **Sprawdź statystyki**
   - Upewnij się, że nowe taski są poprawnie liczenia w metrykach

### Pułapki/ryzyka

- Definicja DONE może być pusta - UI musi to obsłużyć
- W Finish Mode definicja powinna być centralna, nie zagubiona w szczegółach
- Migracja starych tasków: nie rób definicji zbyt długich (opis może być długi)
- Task może być zakończony bez sprawdzenia definicji - edukuj użytkownika
- Przy dużej liczbie tasków loading może się wydłużyć - optymalizuj zapytania

## Skill: Sesja Finish Mode

### Kiedy używać

Kiedy wprowadzamy zmiany w głównym mechanizmie anti-porzuceniowym - logika sesji, UI, raportowanie.

### Kroki

1. **Zaplanuj zakres zmiany**
   - Start/stop sesji vs logika raportu vs UI - rób osobno
   - Jedna funkcja na iterację
2. **Model sesji w AppContext**
   - Dodaj strukture: `currentSession: {taskId, goalId, startTime, notes}`
   - Dodaj `sessionHistory: SessionReport[]` - historia zakończonych sesji
3. **Operacje na sesjach**
   - `startFinishSession(taskId)` - start + zapisz timestamp
   - `stopFinishSession(userNotes, taskStatus)` - stop + utwórz raport
   - `updateSessionNotes(notes)` - robocze notatki w trakcie
4. **UI Finish Mode**
   - Wyświetl: nazwa celu, typ, strategia, Definicja DONE taska
   - Timer/wskaźnik sesji (start/stop, czas trwania)
   - Pole na notatki użytkownika
   - Na końcu: klasyfikacja (done/w trakcie/stuck)
5. **Integracja z AI**
   - Po zakończeniu sesji: wywołaj AI z kontekstem (cel, task, notatki)
   - Prompt: generuj raport + klasyfikuj status + zaproponuj następny krok
   - Zapisz raport do `sessionHistory`
6. **Aktualizacja statusu taska**
   - Na podstawie klasyfikacji AI: ustaw nowy status taska
   - Jeśli stuck: dodaj powód do task.notes
   - Jeśli done: czas na nagrodę (sprawdź system nagród)
7. **Przetestuj**
   - `npm test` dla logiki sesji w AppContext
   - Manualne: cała ścieżka start → notatki → stop → raport → status

### Pułapki/ryzyka

- Sesja może zostać nie zamknięta (browser crash) - handle orphaned sessions
- AI może być niedostępne podczas raportu - graceful fallback
- Klasyfikacja AI może być błędna - użytkownik powinien móc nadpisać
- Timer może działać w tle długo - optymalizuj performance
- Raport AI może być zbyt długi - ogranicz długość i token usage
- Stan sesji musi być zsynchronizowany z taskiem - unikaj race conditions

## Skill: Zmiana w storage/migracjach

### Kiedy używać

Kiedy zmieniamy strukturę AppData, dodajemy nowe pola, zmieniamy format danych w IndexedDB.

### Kroki

1. **Zaplanuj zmianę**
   - Napisz plan: co się zmienia, dlaczego, jak stare dane będą traktowane
   - Ogranicz zakres do 1-3 pól/struktur na iterację
2. **Backup aktualnych danych**
   - Przetestuj eksport/import na swoich danych
   - Sprawdź czy różne wersje danych się eksportują
3. **Zaktualizuj types.ts**
   - Zmień strukturę AppData, dodaj nowe pola
   - Oznacz opcjonalne pola as optional dla kompatybilności
4. **Zaktualizuj migracje**
   - W `utils/dataMigration.ts` dodaj nową wersję migracji
   - Increment wersji danych, dodaj logikę transformacji
   - Ustaw sensowne defaulty dla nowych pól
5. **Przetestuj migracje**
   - Stwórz test case ze starymi danymi
   - Uruchom `npm test` dla migracji
   - Manualne: załaduj stare dane, sprawdź czy migracja działa
6. **Zaktualizuj AppContext**
   - Dodaj/zmień operacje na nowych polach
   - Sprawdź czy wszystkie funkcje obsługują nową strukturę
7. **Zaktualizuj komponenty**
   - UI powinno gracefully handle nowe i stare pola
   - Fallbacki dla undefined/null wartości
8. **Test pełnej ścieżki**
   - Import starych danych → migracja → eksport → sprawdź poprawność

### Pułapki/ryzyka

- Migracja może być powolna dla dużych danych - dodaj progress indicator
- Stare dane w IndexedDB mogą być skorumpowane - handle errors gracefully
- Nowe pola mogą być undefined mimo migracji - zawsze sprawdzaj
- Migracja może się nie uruchomić przy błędzie - dodaj retry logic
- Backup może nie działać po zmianie struktury - testuj przed wydaniem
- Browser może mieć stare dane w cache - dodaj force refresh option
- IndexedDB może być pełna - handle storage quota exceeded

## Skill: Dodanie statystyk na dashboardzie

### Kiedy używać

Kiedy chcemy dodać nową metrykę pomocną w walce z syndromem porzucenia - np. streak, finishe, stuck→done.

### Kroki

1. **Zdefiniuj metrykę**
   - Co liczymy: sesje Finish Mode, domknięte taski, streak dni?
   - Okres: 7 dni, 30 dni, all-time?
   - Format: liczba, procent, trend?
2. **Dodaj logowanie zdarzenia**
   - W AppContext dodaj funkcję logującą zdarzenie (np. `logTaskCompleted`, `logFinishSession`)
   - Zapisuj: timestamp, type, goalId, taskId, dodatkowe dane
3. **Model statystyk**
   - W AppData dodaj `statistics: {events: Event[], aggregated: AggregatedStats}`
   - AggregatedStats: prekalkulowane metryki (aktualizowane przy każdym zdarzeniu)
4. **Funkcje kalkulacji**
   - W `utils/` dodaj funkcje: `calculateStreak`, `getCompletedTasksLast7Days`
   - Mogą być wywołane on-demand lub pre-kalkulowane
5. **Aktualizuj AppContext**
   - Funkcja `updateStatistics()` - przelicz agregaty po nowym zdarzeniu
   - Wywołuj po operacjach: complete task, finish session, update goal
6. **UI na dashboardzie**
   - Dodaj sekcję ze statystykami: proste liczby + trend
   - Format: "X tasków ukończonych w ostatnich 7 dniach"
   - Użyj prostego layoutu, unikaj skomplikowanych wykresów
7. **Integracja z AI**
   - AI ma dostęp do statystyk w promptach
   - Może komentować: "Widzę, że masz streak 5 dni - świetnie!"
8. **Przetestuj**
   - `npm test` dla funkcji kalkulacji
   - Manualne: wykonaj akcje, sprawdź czy statystyki się aktualizują

### Pułapki/ryzyka

- Statystyki mogą być wolno kalkulowane dla dużej historii - cachuj lub ogranicz zakres
- Zdarzenia mogą być duplikowane - dodaj unique ID i deduplikację
- Dashboard może być przegadany statystykami - max 3-5 kluczowych metryk
- Statystyki mogą demotywować gdy są złe - dodaj pozytywny spin w AI komentarzu
- Browser może blokować long-running calculations - użyj requestIdleCallback
- Migracja może nie uwzględniać historycznych danych - decide czy backfill czy ignore

## Skill: Naprawa scheduler/notifications/SW

### Kiedy używać

Kiedy są problemy z powiadomieniami, service workerem lub schedulerem - często async bugs, localStorage w SW.

### Kroki

1. **Zdiagnozuj problem**
   - Sprawdź konsole browser: błędy SW, async/await issues
   - Sprawdź network: czy powiadomienia są wysyłane
   - Sprawdź localStorage vs IndexedDB access w różnych kontekstach
2. **Naprawa schedulera (utils/scheduler.ts)**
   - Problem: async funkcje używane jak sync
   - Rozwiązanie: przepisz na pure async/await lub przekaż dane z AppContext
   - Unikaj masowego wywoływania AI - maksymalnie 1 request na 10 sekund
3. **Naprawa SW (public/sw.js)**
   - Usuń dostęp do localStorage (nie działa w SW)
   - Ogranicz do: cache static files + offline.html
   - Usuń skomplikowaną logikę AI/powiadomień z SW - przenieś do main thread
4. **Naprawa notificationCenter**
   - Prostota: send notification, nie skomplikowane queue/retry logic
   - Graceful fallback gdy brak permission lub API
   - Powiadomienia oparte o proste triggery: stuck task, brak aktywności
5. **Przetestuj PWA**
   - `npm run build` i sprawdź działanie offline
   - Zainstaluj jako PWA, sprawdź czy notifikacje działają
   - Test na mobile (różne browsery)
6. **Cleanup kodu**
   - Usuń nieużywany kod z SW
   - Dodaj komentarze opisujące co robi SW
   - Upewnij się, że brak dependency na backend API
7. **Przetestuj w Jest**
   - `npm test` dla schedulera i notificationCenter
   - Mock browser APIs (Notification, IndexedDB)

### Pułapki/ryzyka

- SW ma inny kontekst niż main thread - nie wszystkie APIs dostępne
- Notifikacje wymagają HTTPS i user permission
- iOS ma ograniczone wsparcie dla PWA notifications
- Scheduler może být heavy na battery - ogranicz częstotliwość
- SW cache może być stale - add versioning/invalidation
- Notification permission może być odwołane przez użytkownika
- PWA może być odinstalowana a SW dalej działać

## Skill: Zmiana w AppContext (logika danych)

### Kiedy używać

Kiedy dodajemy nowe operacje na danych, nowe pola AppData, integrujemy nowe moduły.

### Kroki

1. **Zaplanuj zmianę**
   - Określ: jakie operacje dodać/zmienić
   - Czy wymagane migracje? Czy breaking changes?
   - Ogranicz do 1-3 operacji na iterację
2. **Zaktualizuj AppData interface**
   - W types.ts dodaj nowe pola
   - Oznacz jako optional jeśli potrzebna kompatybilność
3. **Dodaj nowe operacje w AppContext**
   - Pattern: `const newOperation = (params) => { setAppData(prev => { ... }); }`
   - Zawsze używaj functional update: `setAppData(prev => ...)`
   - Walidacja: sprawdzaj czy operacja ma sens w obecnym stanie
4. **Zaktualizuj default data**
   - W AppContext sprawdź `defaultAppData`
   - Dodaj sensowne defaulty dla nowych pól
5. **Hook useAppData**
   - Sprawdź czy hook eksportuje potrzebne operacje
   - Dodaj nowe operacje do return value
6. **Przetestuj operacje**
   - `npm test` dla logiki w AppContext
   - Ręczne: różne scenariusze, edge cases
   - Sprawdź czy UI się aktualizuje po operacjach
7. **Sprawdź komponenty**
   - Które komponenty używają zmienione operacje?
   - Czy wszystkie obsługują nowe pola?
   - Czy gracefully handle undefined values?
8. **Performance check**
   - Czy nowe operacje nie powodują lzbyt częstych re-renderów?
   - Czy duże dane są poprawnie cachowane?

### Pułapki/ryzyka

- setAppData z object mutation zamiast functional update - łamie React
- Operacje mogą mieć race conditions przy async operations
- Duże AppData może powodować slow renders - rozważ split context
- Nowe pola mogą być undefined mimo defaultów - zawsze sprawdzaj
- Operations mogą być wywołane z niewłaściwym stanem - walidacja
- Storage może nie nadążyć za częstymi zmianami - debounce save
- Browser memory może być przepełniona przy dużych danych

## Skill: Dodanie/zmiana logiki AI

### Kiedy używać

Kiedy zmieniamy/dodajemy prompty, integrujemy AI z nowymi częściami aplikacji (cele, Finish Mode).

### Kroki

1. **Zdefiniuj kontekst AI**
   - Co AI powinno wiedzieć: strategia celu, definicja DONE, context surowości
   - Jakie dane z AppContext są potrzebne
   - Jaki output oczekujemy: raport, klasyfikacja, porada
2. **Stwórz/zaktualizuj prompt template**
   - W utils/ stwórz funkcję `buildPromptForFinishMode(goal, task, session)`
   - Include: strategia celu, context surowości, wiedza o dopaminie
   - Jasno określ expected output format
3. **Dodaj bazę wiedzy**
   - Stwórz stały tekst o dopaminie i syndromie porzucenia
   - Include w promptach jako context
   - Aktualizuj ręcznie na podstawie research/experience
4. **Integracja z Ollama**
   - Używaj istniejących funkcji w `utils/` (progressionInsights?)
   - Graceful fallback gdy Ollama niedostępna
   - Limit token usage - krótkie, konkretne odpowiedzi
5. **Testuj prompt**
   - Ręcznie: różne scenariusze (różne cele, stuck tasks)
   - Sprawdź czy AI trzyma się kontekstu (styl surowości)
   - Sprawdź czy output ma dobry format
6. **Integruj z UI**
   - Gdzie pokazać AI response: chat, raport sesji, notification?
   - Loading states, error handling
   - Możliwość retry jeśli odpowiedź nie zadowala
7. **Performance i UX**
   - AI response nie może blokować UI - async z loading
   - Cache odpowiedzi na podobne zapytania
   - Ograniczona częstotliwość - nie więcej niż 1 request na 30 sekund

### Pułapki/ryzyka

- AI może generować błędne/szkodliwe porady - human oversight potrzebny
- Ollama może być wolna - timeout po 30 sekundach
- Prompt może być za długi - limit tokens w LLM
- AI może nie być dostępna - fallback na pre-defined responses
- Odpowiedzi mogą być niespójne - używaj structured output gdy możliwe
- Context może być za duży dla słabszych modeli - priority na kluczowe info
- AI może hallucinate data - zawsze pass faktyczne dane z AppContext, not invented
