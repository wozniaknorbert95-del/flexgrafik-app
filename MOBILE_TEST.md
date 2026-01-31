# Testy na telefonie (internet operatora, nie WiFi)

Aby testować aplikację na telefonie przez **dane komórkowe** (nie to samo WiFi), musisz wystawić lokalny serwer na zewnątrz przez **tunel**. Poniżej 3 sposoby.

---

## Wymagania

- Na PC: **`npm run dev`** musi działać (Vite na `http://localhost:5173`).
- Na telefonie: przeglądarka, dostęp do internetu (dane / inne WiFi).

---

## Opcja A: localtunnel (najprostsza)

**1. Zainstaluj (jednorazowo):**

```bash
npm install
```

(lub `npm install localtunnel --save-dev` jeśli w `package.json` już jest)

**2. Terminal 1 – serwer:**

```bash
npm run dev
```

Zostaw włączone.

**3. Terminal 2 – tunel:**

```bash
npm run tunnel
```

**4. W logach z `npm run tunnel`** pojawi się coś w stylu:

```
your url is: https://xyz-123.loca.lt
```

**5. Na telefonie** wejdź w ten adres (np. `https://xyz-123.loca.lt`).

- Przy pierwszym wejściu localtunnel może pokazać „Click to continue” – potwierdź i przejdź dalej.
- Adres zmienia się przy każdym uruchomieniu `npm run tunnel`.

---

## Opcja B: ngrok (stabilniejsze, wymaga konta)

**1. Zainstaluj:** https://ngrok.com/download  
**2. Załóż konto** i dodaj authtoken: https://dashboard.ngrok.com/get-started/your-authtoken

**3. Terminal 1:**

```bash
npm run dev
```

**4. Terminal 2:**

```bash
ngrok http 5173
```

**5. W oknie ngrok** skopiuj adres `https://xxxx.ngrok-free.app` i wpisz go w przeglądarce na telefonie.

---

## Opcja C: Cloudflare Tunnel (bez rejestracji w appce)

**1. Pobierz cloudflared:**  
https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

**2. Terminal 1:**

```bash
npm run dev
```

**3. Terminal 2:**

```bash
cloudflared tunnel --url http://localhost:5173
```

**4. W logach** będzie adres `https://xxx.trycloudflare.com` – wejdź w niego na telefonie.

---

## Uwagi

| Co                       | Uwaga                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| **Adres**                | Z localtunnel i darmowego ngrok URL **zmienia się** przy każdym starcie tunelu.    |
| **Stały adres**          | Trzeba wdrożyć aplikację (np. Vercel, Netlify) i testować na adresie produkcyjnym. |
| **PWA / Service Worker** | Działają w tunelu, ale scope/update może różnić się od localhost.                  |
| **HTTPS**                | localtunnel, ngrok i Cloudflare dają HTTPS – na mobile zwykle jest OK.             |

---

## Szybki start (localtunnel)

```bash
# Terminal 1
npm run dev

# Terminal 2 (w innym oknie)
npm run tunnel
```

Adres z `npm run tunnel` wpisuj na telefonie.  
Jeśli `npm run tunnel` nie działa, sprawdź czy w projekcie jest `localtunnel` w `devDependencies` i czy wykonałeś `npm install`.
