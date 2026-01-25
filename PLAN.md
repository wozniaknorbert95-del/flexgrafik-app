# PLAN – ADHD Accountability Assistant / Anti‑Porzuceniowy Asystent Celów

## 1. Misja aplikacji

Aplikacja jest osobistym, zaawansowanym **asystentem do kończenia ważnych rzeczy**, zaprojektowanym dla mózgu opartego na dopaminie (ADHD / skłonność do porzucania projektów przy ~90%).

Cel:  
**maksimum efektu przy minimum złożoności** – zamiast tysiąca funkcji, kilka mocnych mechanizmów, które:

- wykrywają, gdzie realnie utknąłem,
- pomagają mi domknąć to, co zaczęte,
- chronią przed rozpraszaniem się na kolejne „fajne początki”.

Aplikacja jest tworzona **głównie dla jednego użytkownika (właściciela)**, ale architektura nie blokuje późniejszego rozszerzenia.

---

## 2. Dla kogo / jaki problem rozwiązujemy

Docelowy użytkownik:

- ma dużo pomysłów i zaczętych projektów,
- często odpala nowy projekt, zanim domknie stary,
- przy ~70–90% postępu czuje **pseudofinisz** („jakby już było zrobione”) i traci napęd,
- ma skłonność do szukania mocnych bodźców dopaminowych (nowość, social media, nowe zadania) zamiast kończyć „nudne resztki”.

Problemy, które atakujemy:

- **Syndrom porzucenia przy 90%** – zadania/projekty dochodzą prawie do końca i gniją.
- Brak jasnego obrazu: „gdzie jestem, co jest naprawdę ważne”.
- Brak systemu nagród powiązanego z **procesem i finiszem**, a nie tylko z ekscytującym startem.
- Brak „zewnętrznego mózgu” (asystenta), który pamięta:
  - strategię celu,
  - kontekst (czy mam być dla siebie surowy, czy łagodny),
  - historię prób i notatek,
  - pomysły, które mogą pomóc.

---

## 3. Zasady projektowe

1. **Finish-first, nie start-first**
   - Interfejs i logika faworyzują domykanie istniejących rzeczy nad tworzenie nowych.
   - Nowe cele są ograniczane (max 3 aktywne), dodawanie kolejnych wymaga świadomej decyzji.

2. **Projekt dopaminowy, nie „silnowolowy”**
   - Wykorzystujemy wiedzę o dopaminie:
     - małe, częste zwycięstwa,
     - jasne kryteria DONE,
     - nagrody powiązane z procesem i finiszem.
   - System nie liczy na „więcej motywacji”, tylko **pomaga obchodzić słabości** (syndrom 90%, ucieczka w nowość).

3. **Maksimum efektu przy minimum złożoności**
   - Mało ekranów, ale każdy ma jasny cel.
   - Jedno źródło prawdy o stanie danych (AppContext + storage).
   - Unikamy nadmiarowych opcji, jeśli nie wnoszą realnej wartości.

4. **Local‑first z opcjonalnym backendem**
   - Źródło prawdy jest lokalne (IndexedDB + backup/import).
   - API `/api/*` jest dodatkiem (sync, raporty), ale aplikacja musi działać bez niego.

5. **AI jako świadomy, kontekstowy asystent**
   - Asystent AI:
     - zna strategię celu,
     - zna kontekst (jak surowy ma być przy danym celu),
     - zna historię tasków i Finish Mode,
     - ma dostęp do bazy wiedzy o dopaminie i syndromie porzucenia (aktualizowanej ręcznie).
   - AI **nie wymyśla z kosmosu**, tylko pracuje na danych z systemu.

---

## 4. Mapowanie pojęć na obecną strukturę

- **Cel (Goal)** = obecnie zbliżone do `Pillar` w `types.ts`.
- **Task** = `Task` w `types.ts`.
- **Finish Mode** = istniejący ekran `finish` (`components/FinishMode.tsx`) + nowa logika sesji.
- **Dashboard** = `home` / `DashboardPremium`.
- **Asystent AI** = istniejące integracje z Ollamą (`AppContext`, `progressionInsights`, `scheduler`), które trzeba uporządkować.

Docelowo nazewnictwo kodu może być doprowadzone do spójności (Goal/Task), ale na razie pracujemy ostrożnie na obecnych typach.

---

## 5. Moduły produktu

### 5.1. System celów i zadań

**Założenia:**

- Jednocześnie można mieć **max 3 aktywne cele**:
  - 1 główny (najważniejszy),
  - 1 poboczny,
  - 1 laboratoryjny (eksperymentalny).
- Limit jest domyślnie **twardy** (blokuje dodanie 4.), ale **konfigurowalny**.
- Każdy cel ma:
  - nazwę,
  - typ: `main` / `secondary` / `lab`,
  - **strategię** – opis „jak do tego dojść”,
  - **kontekst surowości** – jak asystent ma mówić (wojskowy/psychoedukacyjny/łagodny),
  - listę **zadań (tasków)**,
  - przewidziane **nagrody** (powiązane z etapami i/lub procesem).

**Stan implementacji (2026-01-24):**

- Status: **✅ DONE (MVP shipped)**.
- Model danych: `Pillar` ma pola typu celu + kontekst AI:
  - `type` = `main` / `secondary` / `lab` (D-003),
  - `strategy` (opis strategii),
  - `aiTone` = `military` / `psychoeducation` / `raw_facts` (D-031).
- Kompatybilność wsteczna: przy wczytywaniu danych brakujące pola dostają domyślne wartości (bez łamania starych danych).
- UI do ustawiania/edycji typu/strategii/tonu celu: **✅ DONE** (inline “Goal settings” w widoku celu).
- Reguły celów: **✅ DONE**
  - max 3 aktywne cele (logika + UI + komunikaty),
  - max 1 cel typu `main` (automatyczne “degrade” poprzedniego `main` + komunikat).
- System nagród per cel: **✅ DONE** (model + UI + ocena earned/not_yet na podstawie danych).

**Task:**

- Ma:
  - opis,
  - powiązany cel,
  - aktualny progres (np. 0–100%),
  - **Definicję DONE** – krótki, konkretny opis kiedy zadanie jest **obiektywnie** zakończone,
  - status logiczny: `active` / `stuck` / `done` / `abandoned`.

---

### 5.2. Dashboard

Główny ekran, który odpowiada na pytanie:  
**„Na czym dziś powinniśmy się skupić, żeby realnie domknąć rzeczy?”**

- Pokazuje:
  - 3 aktywne cele (z wyróżnieniem głównego),
  - podsumowanie postępu każdego celu,
  - **kluczowe statystyki (patrz sekcja 5.7)**,
  - listę rekomendowanych „finiszy” na dziś:
    - taski `stuck at 90%`,
    - taski o dużym wpływie,
    - taski z długą historią odwlekania.

---

### 5.3. Finish Mode (tryb domykania)

To główny mechanizm **anti‑porzuceniowy**.

**Stan implementacji (2026-01-24):**

- Status: **✅ DONE (MVP shipped)**.

**Flow sesji:**

1. Użytkownik wybiera task i przechodzi do Finish Mode.
2. System:
   - przypomina **Definicję DONE** tego tasku,
   - pokazuje, **dlaczego ten finish jest ważny** (kontekst celu),
   - startuje **sesję** (Start/Stop, bez sztywnego limitu czasu).
3. W trakcie sesji:
   - asystent przypomina „tu i teraz” co jest do zrobienia,
   - może zasugerować **mikrokrok** lub wykorzystać pomysł z bazy pomysłów.
4. Na końcu sesji:
   - UI prosi użytkownika o krótką notatkę + wybór klasyfikacji: **DONE / W TRAKCIE / STUCK**,
   - sesja jest kończona i zapisywana do historii z:
     - `classification` (status + krótka notatka),
     - `aiSummary` (2–4 zdania) generowanym z kontekstu celu/tasku/DONE i narracji anti‑90%,
     - fallbackiem, gdy AI jest niedostępne (offline / brak Ollamy).
   - task jest aktualizowany:
     - `Task.finishStatus` = wynik klasyfikacji,
     - przy `DONE`: ustawiamy `progress = 100` i `completedAt`.

Każda sesja jest logowana (czas, typ celu, task, wynik) i zasila statystyki.

---

### 5.4. Asystent AI (czat)

Jeden główny asystent, który:

- zna:
  - wszystkie aktywne cele, zadania i ich historię,
  - strategię każdego celu,
  - kontekst surowości dla danego celu,
  - ostatnie sesje Finish Mode,
  - osobistą bazę pomysłów,
  - bazę wiedzy o dopaminie i syndromie porzucenia (ręcznie aktualizowaną).
- działa:
  - **po ludzku**, ale pilnując **faktów** i deklaracji użytkownika,
  - **odwołuje się do dopaminy i syndromu porzucenia** („to klasyczny moment 90%, Twój mózg czuje już nagrodę bez faktycznego finiszu…”),
  - przypomina użytkownikowi jego własne słowa/zasady („sam pisałeś, że max 3 cele aktywne…”).

Asystent ma styl per cel (konfiguracja celu):

- wojskowy (surowy, konkret, bez owijki),
- psychoedukacyjny (wyjaśniający mechanizmy, łagodniejszy),
- surowe fakty (minimalne emocje, maksimum konkretu).

---

### 5.5. System nagród

Użytkownik definiuje:

- **Nagrody powiązane z etapami celu**:
  - np. po każdym dużym kamieniu milowym,
  - po zakończeniu całego celu.
- **Nagrody powiązane z procesem**:
  - za serię dni z rzędu,
  - za liczbę sesji Finish Mode w tygodniu,
  - za domykanie `stuck` tasków.

System:

- na podstawie danych (history of wins, sesje, taski) i zasad (dopamina + anti 90%) ocenia:
  - czy dana nagroda jest „obiektywnie” zasłużona,
  - komunikuje to szczerze, jak człowiek (z uwzględnieniem kontekstu celu).
- unika:
  - nagradzania samych „90%”,
  - sytuacji, w których sama deklaracja celu już daje nagrodę.

**Stan implementacji (2026-01-24):**

- Status: **✅ DONE (MVP shipped)**.
- Nagrody są przypisane per cel, a ich status (earned/not_yet) jest wyliczany na podstawie realnych danych (sesje Finish Mode / taski / statystyki).

---

### 5.6. Powiadomienia (tekstowe i głosowe)

**Stan implementacji (2026-01-24):**

- Status: **⏭️ Post‑MVP** (w PLAN jako kierunek, nie wymagane do shipped MVP).

Typy powiadomień:

- **Czasowe** (np. przypomnienie o sesji Finish Mode, końcówce dnia pracy nad celem),
- **Zdarzeniowe** (wykrycie taska `stuck at 90%`, dłuższa przerwa w pracy nad głównym celem),
- **Głosowe** – komunikaty od asystenta (na późniejszy etap, po stabilizacji podstaw).

Zasady:

- mało, ale **mądre** powiadomienia:
  - lepiej rzadziej, ale trafnie (dopaminowo sensowny moment),
  - brak spamu.
- powiadomienia respektują:
  - ważność celu,
  - kontekst surowości (w ważnych celach komunikaty mogą być bardziej bezpośrednie).

---

### 5.7. Statystyki i raporty

Mierzymy przede wszystkim to, co jest krytyczne dla **syndromu porzucenia** i pracy z dopaminą:

Przykładowe kluczowe metryki (MVP):

- liczba domkniętych tasków w ostatnich 7 dniach,
- liczba i łączny czas sesji Finish Mode,
- liczba tasków zaklasyfikowanych jako `stuck` oraz ile z nich domknięto,
- streak: ile dni z rzędu pracowałeś nad **głównym celem**,
- udział tasków zakończonych vs. porzuconych/odłożonych.

**Już zaimplementowane (2026-01-24, MVP statystyk):**

- Status: **✅ DONE (MVP shipped)**.
- Źródło danych: `finishSessionsHistory` (historia sesji Finish Mode) + stan tasków.
- Finish Mode (ostatnie 7 dni):
  - liczba zakończonych sesji,
  - łączny czas (min),
  - średnia i mediana długości sesji,
  - liczba unikalnych tasków „dokończonych przez Finish Mode”.
- Streak głównego celu:
  - definicja MVP: dzień zaliczony, jeśli zakończono min. 1 sesję Finish Mode (`completed`) dla celu typu `main`,
  - streak liczony jako kolejne dni do dziś (w lokalnym czasie).
- Stuck→Done (7 dni):
  - metryka “stuck→done rate” liczona na podstawie historii sesji Finish Mode (event log na bazie klasyfikacji),
  - pokazywana na dashboardzie jako prosty wskaźnik anti‑90%.

Dashboard pokazuje te metryki w prosty, czytelny sposób (bez „BI‑pulpitu”), a asystent AI wykorzystuje je do feedbacku.

Dodatkowo:

- **Historia zwycięstw** – lista ważnych finiszy (szczególnie domknięte `stuck` przy 90%).

---

### 5.8. Baza pomysłów

Osobista baza pomysłów, do której:

- AI ma dostęp,
- można:
  - przypinać pomysły do konkretnych celów,
  - zostawiać luźne „laboratoryjne” koncepcje.

AI:

- proponuje użycie konkretnego pomysłu przy planowaniu celu/tasku,
- może w Finish Mode zasugerować: „Masz zapisany pomysł X, może pomoże w tym zadaniu?”.

**Stan implementacji (2026-01-24):**

- Status: **✅ DONE (MVP shipped)**.
- Model `Idea` + CRUD + UI “Ideas Vault” (dodawanie, przegląd, filtrowanie, powiązanie z celem).
- Integracja z AI: pomysły są włączane do promptów (planowanie strategii + wsparcie w Finish Mode).

---

### 5.9. Dane, storage i PWA

- Źródło prawdy:
  - **AppContext** + `AppData` (`types.ts`).
- Persistencja:
  - `utils/storageManager.ts` (IndexedDB preferowane, localStorage jako fallback),
  - eksport/import, backup/restore.
- Migrations:
  - `utils/dataMigration.ts`, `utils/migrateData.ts`, `utils/storageUtils.ts`.
- PWA:
  - aplikacja działa jako PWA (service worker, offline.html, manifest),
  - SW ma być prosty i stabilny (cache + offline); cięższa logika (AI, sync) w aplikacji.

**Stan implementacji (2026-01-24):**

- Status: **✅ DONE (MVP shipped)**.
- Local‑first: aplikacja działa w pełni offline, bez twardych zależności od `/api/*`.

---

## 6. MVP (co musi działać w pierwszej stabilnej wersji)

MVP = minimalny zestaw, który już realnie pomaga kończyć rzeczy:

**Status (2026-01-24):** **✅ MVP shipped** (punkty 1–7 działają w produkcyjnym zakresie, local‑first/offline).

1. System celów i zadań:
   - max 3 aktywne cele (główny/poboczny/lab),
   - strategia i kontekst „surowości” per cel,
   - zadania z definicją DONE i statusem.

2. Dashboard:
   - czytelny obraz 3 celów,
   - podstawowe metryki anti‑porzuceniowe.

3. Finish Mode:
   - start/stop sesji dla taska,
   - przypomnienie Definicji DONE i kontekstu celu,
   - raport po sesji (AI + użytkownik),
   - aktualizacja statusu taska (done/w trakcie/stuck) + logowanie sesji.

4. Asystent AI (tekstowy):
   - zna cele, taski, strategię, kontekst surowości,
   - wie o dopaminie i syndromie porzucenia (bazuje na wgranej wiedzy),
   - potrafi prostym językiem tłumaczyć, co się dzieje i proponować kolejne kroki.

5. System nagród (podstawowy):
   - konfiguracja nagród per cel,
   - decyzja „zasłużone / nie” na podstawie realnego progressu i sesji.

6. Statystyki na dashboardzie:
   - min. 3–5 kluczowych metryk (jak w 5.7).

7. Stabilizacja techniczna:
   - brak krytycznych błędów w schedulerze, SW, storage,
   - aplikacja działa offline bez backendu `/api/*`.

Reszta (powiadomienia głosowe, zaawansowane raporty, pełna integracja z backendem) – po MVP.

---

## 7. Kierunki rozwoju po MVP (wysoki poziom)

- Stabilne powiadomienia push + głosowe, zsynchronizowane z Finish Mode i schedulerem.
- Rozbudowane raporty tygodniowe (AI + statystyki) oparte na danych z sesji i historii.
- Integracja z backendem (Postgres, `/api/*`) jako sync i analityka, z zachowaniem local‑first.
- Dopracowanie UX dla „produkt dla innych” (nie tylko właściciela).
