## Import strategii celu (JSON / tekst) — instrukcja

Ten import służy do tego, żebyś **przygotował strategię poza aplikacją** (zewnętrzne narzędzie / AI), a potem **w jednym kroku wgrał ją do wybranego celu** w aplikacji.

### Gdzie to jest w UI

Cel → **Ustawienia celu** → **Edytuj** → sekcja **Import strategii (wklej)**.

### Jakie formaty wejścia są obsługiwane

Masz 2 opcje:

- **plik** `.json` / `.txt` (przycisk wyboru pliku w imporcie)
- **wklejka tekstu** do textarea

W treści możesz mieć:

- **czysty JSON** zaczynający się od `{` i kończący na `}`
- albo tekst zawierający blok delimitowany:

```text
---JSON_START---
{ ... }
---JSON_END---
```

### Wymagany schemat JSON (MVP)

Importer oczekuje obiektu z polami:

- `vision`: string
- `successCriteria`: string[]
- `milestones`: { title: string, description?: string, deadline?: string }[]
- `obstacles`: { description: string, countermeasure: string }[]
- `ifThenPlans`: { trigger: string, action: string, isActive?: boolean }[]
- `tasks`: { name: string, type: "build" | "close", definitionOfDone?: string, implementationIntention?: { trigger: string, action: string, active?: boolean } }[]

Uwagi:

- `deadline` traktuj jako tekst daty (np. `YYYY-MM-DD`) — importer zapisze jako string.
- `isActive` domyślnie jest `true`, jeśli nie podasz.
- `tasks[].type`: jeśli podasz coś innego niż `"close"`, importer przyjmie `"build"`.

### Tryby importu zadań (bardzo ważne)

W imporcie wybierasz, co robić z zadaniami:

- **nie zmieniaj**: aktualizuje tylko `Pillar.strategy`, nie dotyka `Pillar.tasks`
- **merge (bez utraty progresu)**: dodaje/aktualizuje zadania po nazwie (`name`), ale **zachowuje progress/status**
- **nadpisz**: usuwa obecne zadania i zastępuje je importem (wymaga potwierdzenia)

### Podgląd zmian (diff)

Przed zapisem kliknij **Podgląd zmian**:

- zobaczysz liczby (wizja/kryteria/milestones/if‑then/przeszkody + zadania)
- oraz (w zależności od trybu) listy nazw:
  - **Do dodania**
  - **Do aktualizacji**
  - albo **Znikną (nadpisz)** (lista obecnych zadań, które zostaną zastąpione)

### Częściowa strategia (opcjonalnie)

Domyślnie import wymaga: **wizja + min. 1 kryterium sukcesu**.
Jeśli chcesz wkleić strategię “na raty”, zaznacz:

**Pozwól zapisać częściową strategię**.

### Przepływ “Czat → Import” (opcjonalnie)

Jeśli asystent w aplikacji zwróci blok `---JSON_START--- ... ---JSON_END---`:

Asystent AI → kliknij przy wiadomości **Zapisz do importu** → potem w imporcie celu kliknij **Wczytaj z czatu (AI)**.

### Najczęstsze błędy i co robić

- **“Nie udało się sparsować JSON”**: najczęściej brak przecinka lub cudzysłowu.
- **“Nie widzę bloku JSON”**: wklej czysty `{...}` albo użyj delimiterów.
- **“Plik jest pusty”**: plik nie zawiera treści lub jest zaszyfrowany / binarny.

---

## Checklist testów manualnych (5–10 minut)

- **Import pliku**: wczytaj `.json` (czysty JSON) → preview liczy się automatycznie.
- **Import wklejki**: wklej tekst z delimiterami → preview działa.
- **Tryb: nie zmieniaj**: strategia się zmienia, zadania zostają.
- **Tryb: merge**: listy “do dodania / do aktualizacji” są sensowne, progres nie znika.
- **Tryb: nadpisz**: pokazuje “Znikną (nadpisz)”, pyta o potwierdzenie.
- **Błędny JSON**: dostajesz czytelny błąd i nic nie zapisuje.
