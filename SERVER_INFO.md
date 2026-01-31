# SERVER INFORMATION

**Problem:** `http://localhost:5173/` nie działa

**Przyczyna:** W `vite.config.ts` port jest ustawiony na **3000**, nie 5173.

---

## ✅ ROZWIĄZANIE

### Opcja 1: Użyj właściwego portu

**Otwórz:** `http://localhost:3000/`

Serwer powinien być uruchomiony na porcie 3000 zgodnie z konfiguracją.

---

### Opcja 2: Zmień port na 5173

Jeśli chcesz używać portu 5173, zmień konfigurację w `vite.config.ts`:

```typescript
server: {
  port: 5173,  // Zmień z 3000 na 5173
  host: '0.0.0.0',
},
```

---

## 🔍 SPRAWDŹ CZY SERWER DZIAŁA

1. **Sprawdź terminal** - powinien być widoczny output z Vite:

   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3000/
   ```

2. **Sprawdź czy port jest zajęty:**
   - Jeśli port 3000 jest zajęty, Vite automatycznie użyje następnego dostępnego portu
   - Sprawdź terminal output dla właściwego portu

3. **Sprawdź firewall:**
   - Upewnij się, że firewall nie blokuje portu 3000

---

## 🚀 SERWER URUCHOMIONY

Serwer deweloperski został uruchomiony w tle.

**Otwórz w przeglądarce:**

- `http://localhost:3000/` (zgodnie z konfiguracją)
- Lub sprawdź terminal output dla dokładnego adresu

---

**Status:** Serwer uruchomiony, użyj portu 3000
