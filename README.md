# Spejz 🧺

Családi bevásárló webapp: **globál lista + boltonkénti lista**, összepakolós checklist,
otthoni leltár (van/nincs) és egyszerű költésnapló.
Mobile first, de desktopon is rendesen kinéz. Telefonra kitehető a kezdőképernyőre (PWA).

**Nincs regisztráció**: mindenki csak beírja a nevét, és egy 6 jegyű kóddal lép be ugyanabba a Spejzbe.

---

## 1. Supabase (kb. 5 perc)

1. Nyisd meg a projektet a [supabase.com](https://supabase.com) oldalon.
2. **SQL Editor → New query** → másold be a `supabase/schema.sql` teljes tartalmát → **Run**.
   Ez létrehozza a táblákat, a jogosultságokat (RLS) és az alap boltokat (LIDL, TESCO, SPAR, PIAC, PÉKSÉG).
3. **Authentication → Sign In / Providers → Anonymous sign-ins** → kapcsold **be**.
   (Ettől lesz regisztráció nélküli a belépés. Enélkül a app hibát ír.)
4. **Project Settings → API** → másold ki a *Project URL*-t és az *anon public* kulcsot.
5. Írd be őket a `js/config.js` fájlba.

> Az anon kulcs szándékosan nyilvános, mehet a GitHubra. A `service_role` kulcsot soha ne tedd bele.

Opcionális, de ajánlott az élő frissítéshez (ha az egyik telefonon felkerül valami, a másikon is látszik):
**Database → Replication → `supabase_realtime`** → add hozzá a `list_items` és `inventory` táblát.

## 2. GitHub + hosting

Nincs build, nincs npm. Sima statikus fájlok.

```bash
git add .
git commit -m "Spejz"
git push
```

Aztán **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Pár perc múlva él a `https://<felhasznalo>.github.io/<repo>/` cím.

## 3. Telefonra

- iPhone: nyisd meg Safariban a linket → **Megosztás → Főképernyőhöz adás**. Ezután úgy indul, mint egy app.
- A többi családtagnak küldd el a linket + a **Beállítások** fülön látható 6 jegyű kódot.

---

## Mit tud

| Fül | Mit csinál |
|---|---|
| **Lista** | Gyors hozzáadás, boltonkénti szűrés (Globál / LIDL / TESCO / SPAR / PIAC / PÉKSÉG), javaslatok a korábbi vásárlások alapján |
| **Vásárlás** | Bolt választás → összepakolós checklist → vásárlás mód (csak az adott bolt + globál tételek) → lezárás összeggel |
| **Leltár** | Kamra / Hűtő / Fagyasztó / Egyéb, van–nincs kapcsoló, az elfogyott dolgok egy gombbal a listára |
| **Költés** | Havi összeg, boltonkénti bontás, vásárlások listája, kézi rögzítés |
| **Beállítás** | Meghívó kód, nevek, boltok, checklist sablon, tagok |

A „szokások” maguktól épülnek: amit egyszer megvettél, az bekerül a katalógusba, és legközelebb
egy koppintással felteheted a listára, automatikusan abba a boltba, ahol lenni szokott.

## Fájlszerkezet

```
index.html            váz
css/app.css           teljes design (sötétzöld / citromsárga / fehér)
js/config.js          IDE KELL a Supabase URL + anon kulcs
js/db.js              Supabase kapcsolat, lekérdezések
js/app.js             az alkalmazás logikája és a nézetek
js/icons.js           ikonok
icons/                app ikonok (bevásárlókosár)
manifest.webmanifest  PWA
sw.js                 offline váz
supabase/schema.sql   adatbázis séma + RLS + függvények
```

## Ha valami nem megy

- **„Nem sikerült csatlakozni”** → rossz URL/kulcs a `config.js`-ben, vagy nincs bekapcsolva az Anonymous sign-ins.
- **Üres lista, de mentettél** → nem futott le a teljes `schema.sql` (az RLS policy-k a végén vannak).
- **Egy telefonon eltűnt a Spejz** (böngésző adattörlés) → Beállítás nélkül is vissza lehet lépni:
  nyisd meg a linket, „Csatlakozom kóddal”, írd be a 6 jegyű kódot.
