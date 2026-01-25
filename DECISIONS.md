# DECISIONS – kluczowe decyzje produktowe i techniczne

Format:

- `D-XXX` – identyfikator decyzji,
- Status: `decided` / `proposed` / `deprecated`,
- Data: YYYY-MM-DD,
- Opis.

---

## 1. Produkt i domena

### D-001 – Fokus produktu: osobisty anti‑porzuceniowy asystent

- Status: decided
- Data: 2026-01-24
- Treść:
  - Aplikacja jest tworzona **głównie dla jednego użytkownika (właściciela)**.
  - Główny problem: **syndrom porzucenia przy 90%** i mózg oparty na dopaminie.
  - Misja: pomagać w **domykaniu ważnych rzeczy**, a nie w ogólnym „zarządzaniu zadaniami”.

### D-002 – Finish-first jako zasada nadrzędna

- Status: decided
- Data: 2026-01-24
- Treść:
  - Projekt i logika aplikacji **faworyzują domykanie** nad zaczynanie.
  - Nowe cele są ograniczane (max 3 aktywne); otwieranie kolejnych ma tarcie (ostrzeżenia/limity).

### D-003 – Limit 3 aktywnych celów

- Status: decided
- Data: 2026-01-24
- Treść:
  - Użytkownik może mieć naraz **max 3 aktywne cele**:
    - 1 główny (`main`),
    - 1 poboczny (`secondary`),
    - 1 laboratoryjny (`lab`).
  - Domyślnie limit jest **twardy** (blokada dodania 4. celu).
  - Limit jest **konfigurowalny** (w ustawieniach), ale UI i AI przypominają o konsekwencjach.
  - Nowe cele wymagają wybrania typu (main/secondary/lab).

### D-004 – Mapowanie pojęć Cel/Pillar

- Status: decided
- Data: 2026-01-24
- Treść:
  - Pojęcie **„Cel” w produkcie** jest mapowane na istniejący typ `Pillar` w `types.ts`.
  - W kodzie stopniowo dążymy do spójnego nazewnictwa (`Goal` zamiast `Pillar`), ale bez łamania migracji danych.
  - Na razie wszelkie zmiany w typach `Pillar` muszą być wykonywane ostrożnie z uwagi na migracje i istniejące dane.

---

## 2. Dane, storage i backend

### D-010 – Local-first i brak twardej zależności od backendu

- Status: decided
- Data: 2026-01-24
- Treść:
  - Źródło prawdy dla danych aplikacji jest **lokalne**:
    - `AppData` w `AppContext.tsx`,
    - zapis w IndexedDB (`utils/indexedDBStorage.ts`) z fallbackiem na localStorage.
  - Endpointy `/api/*` są traktowane jako opcjonalny sync/rozszerzenie.
  - Aplikacja musi działać poprawnie **w pełni offline**, bez działającego backendu.

### D-011 – Migracje danych i kompatybilność wsteczna

- Status: decided
- Data: 2026-01-24
- Treść:
  - Zmiany w strukturze danych (`types.ts`, `types/normalized.ts`) wymagają:
    - aktualizacji logiki migracji (`utils/dataMigration.ts`, `utils/migrateData.ts`),
    - przetestowania na przykładowych starych danych (backup/import).
  - Domyślnie nie zrywamy kompatybilności z istniejącymi danymi w IndexedDB/localStorage.

### D-012 – PWA i service worker – prostota ponad „magiczny” sync

- Status: decided
- Data: 2026-01-24
- Treść:
  - Service worker (`public/sw.js`) ma pełnić **głównie funkcję cache/offline**.
  - Złożona logika (AI, background sync, kolejki, dostęp do localStorage) nie powinna być realizowana z poziomu SW (z uwagi na stabilność, środowisko mobilne, CORS).
  - Ewentualny background sync jest planowany na później, w dobrze przemyślanej architekturze.

---

## 3. Finish Mode i anti‑porzuceniowa logika

### D-020 – Finish Mode jako główne narzędzie anti‑90%

- Status: decided
- Data: 2026-01-24
- Treść:
  - Finish Mode jest **centralnym modułem** do domykania zadań.
  - Wejście do Finish Mode:
    - odbywa się z poziomu konkretnego taska,
    - zawsze pokazuje **Definicję DONE** i kontekst celu.
  - Sesja Finish Mode:
    - ma kontrolki Start/Stop (bez sztywnego limitu),
    - na końcu zawsze generuje **raport sesji** (AI + użytkownik),
    - ustala nowy status taska: `done` / `w trakcie z następnym krokiem` / `stuck`.
  - Dane z Finish Mode są logowane do historii celu i statystyk.

### D-021 – Detekcja „stuck at 90%”

- Status: decided
- Data: 2026-01-24
- Treść:
  - Task jest traktowany jako kandydat na `stuck at 90%` jeśli:
    - ma wysoki progres (np. >= 70–80%),
    - od dłuższego czasu nie było zmiany,
    - powiązany cel jest ważny (szczególnie `main`).
  - Aplikacja:
    - podbija takie taski w Finish Mode i na dashboardzie,
    - może wyzwolić powiadomienia / sugestie sesji Finish Mode.

---

## 4. Asystent AI, styl i wiedza

### D-030 – AI jako kontekstowy, „pamiętający” asystent

- Status: decided
- Data: 2026-01-24
- Treść:
  - Asystent AI ma pełny dostęp do:
    - aktywnych celów, tasków, ich statusów i historii,
    - strategii i kontekstu surowości każdego celu,
    - raportów z Finish Mode,
    - bazy pomysłów,
    - bazy wiedzy o dopaminie i syndromie porzucenia (aktualizowanej ręcznie).
  - AI **pamięta wcześniejsze deklaracje** użytkownika (np. limity, zasady) i może się do nich odwoływać.

### D-031 – Styl asystenta per cel

- Status: decided
- Data: 2026-01-24
- Treść:
  - Każdy cel ma ustawiony **styl komunikacji** asystenta:
    - `military` – wojskowy, surowy, konkretny,
    - `psychoeducation` – tłumaczący mechanizmy, empatyczny,
    - `raw_facts` – suche fakty, minimum emocji.
  - Styl wpływa na ton, ale **nie na szczerość**:
    - asystent zawsze komunikuje obiektywny stan (np. czy nagroda jest zasłużona).

### D-032 – Narracja o dopaminie i syndromie porzucenia

- Status: decided
- Data: 2026-01-24
- Treść:
  - Asystent może wprost mówić o:
    - dopaminie,
    - syndromie porzucenia przy 90%,
    - „pseudofiniszu” (poczuciu ukończenia przed realnym końcem),
    - mechanizmach nawyku i samokontroli.
  - AI opiera się na **bazie wiedzy** (dostarczanej do niego) i unika „coachingowej waty”.

---

## 5. System nagród

### D-040 – Nagrody powiązane z procesem i etapami, nie z samą deklaracją

- Status: decided
- Data: 2026-01-24
- Treść:
  - Użytkownik definiuje nagrody:
    - **etapowe** (np. po kluczowych kamieniach milowych),
    - **procesowe** (np. ilość sesji Finish Mode, streak dni pracy nad celem).
  - AI ocenia „zasłużenie” na nagrodę na podstawie:
    - faktycznych danych (taski, sesje, statystyki),
    - zasad anti‑porzuceniowych (brak nagrody za samo 90%, bez faktycznego DONE).
  - Komunikacja:
    - asystent mówi „jak człowiek” – może powiedzieć, że nagroda jeszcze nie jest obiektywnie zasłużona, ale uwzględnia kontekst celu i trudne tygodnie.

---

## 6. Architektura i technikalia

### D-050 – Stack techniczny

- Status: decided
- Data: 2026-01-24
- Treść:
  - Frontend: **Vite + React + TypeScript**.
  - UI: **Tailwind CSS 4**, Framer Motion do animacji.
  - Testy: Jest + `jest-environment-jsdom`.
  - PWA: service worker (`public/sw.js`), `manifest.json`, `offline.html`.
  - Hosting: Firebase Hosting (SPA) + opcjonalnie Vercel (build statyczny).

### D-051 – Struktura katalogów (docelowo)

- Status: proposed
- Data: 2026-01-24
- Treść:
  - Docelowo chcemy mieć **jedną, spójną strukturę** pod `src/`:
    - `src/components/`,
    - `src/contexts/`,
    - `src/utils/`,
    - `src/hooks/`,
    - `src/styles/`.
  - Obecny rozjazd (`components/` + `src/components/`, itd.) będzie usuwany etapami, z minimalnymi zmianami w jednym kroku.

### D-052 – ESLint i Prettier

- Status: decided
- Data: 2026-01-24
- Treść:
  - Do projektu zostanie dodany:
    - ESLint (TS/React),
    - Prettier.
  - Zostaną dodane skrypty:
    - `lint`,
    - `lint:fix`,
    - `format`.
  - Wymagane przed większymi refaktorami.

---

## 7. Scheduler, powiadomienia i SW

### D-060 – Scheduler bez agresywnego AI w tle

- Status: decided
- Data: 2026-01-24
- Treść:
  - `utils/scheduler.ts` nie powinien używać async funkcji jak sync (np. `loadAppData()`).
  - Scheduler ma być:
    - prosty,
    - odporny na brak backendu,
    - nie wywoływać masowo AI bez potrzeby.
  - Logika przypomnień ma być powiązana z:
    - statusem tasków (`stuck`),
    - ważnością celów.

### D-061 – Service worker bez localStorage i bez agresywnego AI

- Status: decided
- Data: 2026-01-24
- Treść:
  - `public/sw.js` nie może korzystać z `localStorage`.
  - Komunikacja z lokalną Ollamą z poziomu SW jest traktowana jako **antywzorzec** (problemy na mobile, CORS).
  - Ewentualne AI/queue zostaną przeniesione do logiki aplikacji (w AppContext / utils).

---
