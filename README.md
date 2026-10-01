# Bázis

Eliminációs diéta napló asztali gépre – 8–9 hét alatt kiderül, melyik étel rontja az alvásodat, a
légzésedet és az emésztésedet. Naponta két rövid check-in (reggel az éjszakáról, este a napról),
hetente egy kiértékelés. Telepíthető webapp (PWA): saját ablakban, net nélkül is fut.

**Minden adat a te gépeden marad.** Nincs szerver, nincs fiók, nincs analitika; futás közben az app
semmit nem tölt le idegen helyről (szigorú tartalombiztonsági szabály, CSP), a betűtípusok is a
csomagban vannak.

- **Ma** – reggeli és esti check-in kártya, „Ezen a héten” (mit ehetsz), az éjszakád eredménye
  magyarázattal, a hét napjai, pótlás, sorozat.
- **Check-in panel** – csak billentyűzettel, automatikus továbblépéssel, minden válasz azonnal
  mentődik; egy check-in kevesebb mint 30 másodperc.
- **Napló** – naptár-hőtérkép, időrendi lista, nap részletei, Excel-szerű táblázat.
- **Elemzés** – aktuális hét és lezárása, heti összesítő, grafikonok, „Mi hat az alvásodra?”
  összevetések, összefoglaló, nyomtatható orvosi összefoglaló.
- **Terv** – idővonal, ételek szerkesztése, átrendezés, tartalék hét, csúsztatás.
- **Beállítások** – kezdés, baseline-import, óraadat-import, mentés/visszaállítás, exportok,
  emlékeztetők, megjelenés, telepítés, súgó.

## Gyors kezdés

Kell hozzá: **Node.js 22** (legalább 20.19) és npm.

```bash
npm ci          # függőségek
npm run dev     # fejlesztői szerver: http://localhost:5173
```

Első indításkor egy ötlépéses, kihagyható varázsló fogad. A **„Kipróbálom demó adatokkal”** gomb
(vagy később a parancspalettán: <kbd>Ctrl</kbd>+<kbd>K</kbd> → „demó”) egy külön, kitalált
adatokkal feltöltött adatbázisra vált – a valódi adataidhoz nem nyúl.

| Parancs             | Mit csinál                                                            |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | fejlesztői szerver                                                    |
| `npm run build`     | típusellenőrzés + éles build a `dist/` mappába                        |
| `npm run preview`   | a `dist/` kiszolgálása helyben (http://localhost:4173) – PWA-teszthez |
| `npm run typecheck` | TypeScript ellenőrzés                                                 |
| `npm run lint`      | ESLint                                                                |
| `npm run format`    | Prettier (írás); `format:check` csak ellenőriz                        |
| `npm test`          | Vitest egységtesztek (`test:watch`, `test:coverage`)                  |
| `npm run e2e`       | Playwright végponttól végpontig tesztek (1440×900 és 1280×800)        |
| `npm run icons`     | PWA-ikonok újragenerálása a `public/icon.svg`-ből                     |

### Tesztek

- **Egységtesztek** (`tests/unit`): a teljes számítási logika (`src/domain`) – diéta-hét,
  alvás-hét, baseline, eltérés, éjszaka-összkép, heti összesítő, romlás, javaslat, összevetések,
  sorozat, importok, exportok, mentés.
- **Excel-egyezési teszt** (`tests/unit/excelParity.test.ts`): a DEMO Excel-tracker minden hetére
  ellenőrzi, hogy az app ugyanazt számolja (kitöltött napok, óraadat-átlagok, éjszaka-összkép,
  alvásminőség, tünetek, romlás-lista), és a valódi tracker Baseline lapját is. A fájlok
  **személyes adatok**, ezért nincsenek a repóban: tedd őket a projekt gyökerébe
  (`Eliminacios_dieta_tracker_DEMO.xlsx`, `Eliminacios_dieta_tracker.xlsx` – a `.gitignore`
  kizárja őket), vagy add meg az útvonalukat a `BAZIS_DEMO_XLSX` / `BAZIS_TRACKER_XLSX`
  környezeti változóban. Ha nincsenek meg, a teszt kihagyódik.
- **E2E** (`tests/e2e`): reggeli és esti check-in csak billentyűzettel, Esc-kel bezárt panel,
  napló-táblázat szerkesztése, terv (tartalék hét, átrendezés), varázsló, JSON-mentés → minden
  törlése → visszaállítás, minden képernyő demóval és üresen konzolhiba nélkül, offline indulás.
  A tesztek maguk buildelnek és indítják a `preview` szervert. Ha még nincs böngésző:
  `npx playwright install chromium`.

## Közzététel (deploy) lépésről lépésre

A build egy sima statikus mappa (`dist/`), bármilyen statikus tárhely jó. Két dolog fontos:

1. **HTTPS kell** – service worker és telepítés csak biztonságos kapcsolaton megy (kivétel a
   `localhost`). Az alábbi szolgáltatók ezt maguktól adják.
2. **Az adat a címhez kötődik.** A böngésző a domainhez kötve tárolja az adatbázist. Ha később
   másik címre költözteted az appot, az adatok nem jönnek magukkal: előtte készíts JSON-mentést
   (Beállítások → Adatok), és az új címen állítsd vissza.

A hash-alapú útvonalak (`#/naplo`) miatt nem kell átirányítási szabály, és relatív útvonalak miatt
alkönyvtárban is működik.

### Vercel

1. Töltsd fel a repót GitHubra (a személyes fájlokat a `.gitignore` kizárja).
2. [vercel.com](https://vercel.com) → **Add New… → Project** → válaszd ki a repót → **Import**.
3. A Framework Preset legyen **Vite** (felismeri). Build Command: `npm run build`, Output
   Directory: `dist`.
4. **Deploy**. Pár perc múlva kész a `https://<név>.vercel.app` cím.
5. A `vercel.json` biztonsági fejléceket ad, és a service workert nem engedi gyorsítótárazni,
   így a frissítések gyorsan megérkeznek.

### Netlify

1. Töltsd fel a repót GitHubra.
2. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project** →
   GitHub → válaszd ki a repót.
3. A beállításokat a `netlify.toml` megadja (`npm run build`, `dist`, Node 22) – csak
   **Deploy**.
4. Git nélkül is megy: `npm run build`, majd húzd a `dist` mappát az
   [app.netlify.com/drop](https://app.netlify.com/drop) oldalra.
5. A `public/_headers` fájl (a buildben `dist/_headers`) adja a biztonsági fejléceket.

### Cloudflare Pages

1. Töltsd fel a repót GitHubra.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → válaszd ki a
   repót.
3. Framework preset: **Vite** (vagy None), Build command: `npm run build`, Build output
   directory: `dist`. Ha kéri, a környezeti változók közé: `NODE_VERSION` = `22`.
4. **Save and Deploy** → `https://<név>.pages.dev`. A `_headers` fájlt itt is figyelembe veszi.

### Saját gépen, tárhely nélkül

`npm run build && npm run preview` – a `http://localhost:4173` címen telepíthető is. Ilyenkor a
gépnek futtatnia kell a preview szervert, amíg először megnyitod; telepítés után a service worker
miatt szerver nélkül is indul.

## Telepítés asztali appként

Telepítve saját ablakban, a tálcáról/Dockból indul, net nélkül is fut, és a böngésző
„előzmények törlése” nem viszi el olyan könnyen az adatokat.

**Chrome (Windows, macOS, Linux)**

1. Nyisd meg az app címét.
2. A címsor jobb szélén kattints a **telepítés ikonra** (monitor lefelé mutató nyíllal) →
   **Telepítés**. Ha nem látod: **⋮ menü → Átküldés, mentés és megosztás → Oldal telepítése
   alkalmazásként…**
3. Az app saját ablakban nyílik. Windows alatt jobb klikk a tálcán → **Rögzítés a tálcára**;
   macOS alatt a Dockban jobb klikk → **Beállítások → Megtartás a Dockban**.

**Microsoft Edge (Windows, macOS)**

1. Nyisd meg az app címét.
2. A címsorban kattints az **„Alkalmazás elérhető. Telepítés”** ikonra, vagy **… menü →
   Alkalmazások → Webhely telepítése alkalmazásként**.
3. A felugró ablakban válaszd, hogy a tálcára / Start menübe / asztalra kerüljön-e.

Az appon belül is telepíthetsz: a varázsló utolsó lépésén vagy a **Beállítások → Telepítés**
részben megjelenik a **Telepítés** gomb, ha a böngésző engedi.

**Frissítés:** új verziónál a jobb alsó sarokban megjelenik az „Új verzió érhető el.” értesítés
– egy kattintás, és újratölt. Az adatok megmaradnak.

**Eltávolítás előtt** készíts JSON-mentést: Chrome-ban az eltávolításkor bejelölhető „adatok
törlése” az adatbázist is törli.

**Tipp:** a Beállítások → Adatok részben (Chrome/Edge alatt) kiválaszthatsz egy mappát –
például egy felhőbe szinkronizáltat –, ahová az app naponta egyszer automatikusan JSON-mentést ír
(`bazis-mentes-ÉÉÉÉ-HH-NN.json` és `bazis-mentes-legujabb.json`).

## Gyorsbillentyűk

| Billentyű                                                   | Mit csinál                                            |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd>                   | parancspaletta (ugrás, dátum, export, demó, téma…)    |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>1–4</kbd>                 | Ma / Napló / Elemzés / Terv (böngészőfülben: Alt+1–4) |
| <kbd>R</kbd> / <kbd>E</kbd>                                 | reggeli / esti check-in (a Ma képernyőn)              |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>B</kbd>                   | oldalsáv összecsukása                                 |
| <kbd>0</kbd>–<kbd>9</kbd>, <kbd>1</kbd><kbd>0</kbd>         | skálaérték (az 1 után fél mp-ig vár a 0-ra)           |
| <kbd>Enter</kbd> / <kbd>Tab</kbd> / <kbd>Esc</kbd>          | javaslat elfogadása / tovább / bezárás                |
| `756` → 7:56, `11` → 0:11, `7h56`, `7,9`                    | időtartam beírása                                     |
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>V</kbd> az óraadat-rácson | a hat óraadat egy szövegből (okos beillesztés)        |

A teljes leírás az appban: **Beállítások → Súgó**.

## Adatok

- **Tárolás:** IndexedDB (Dexie), verziózott migrációkkal; a demó külön adatbázisban
  (`bazis-demo`) él. Indításkor az app tartós tárolást kér (`navigator.storage.persist()`).
- **Mentés:** JSON (Beállítások → Adatok), visszaállításkor **összefésülés** vagy **csere**.
- **Exportok:** xlsx (a Napló lap oszlopai egyeznek az Excel-tracker Napló lapjával, mellette
  Áttekintés, Terv és Baseline lap), csv, és naptár-emlékeztető (.ics).
- **Importok:** az óra két exportja (éjszakai és nappali) baseline-nak vagy a kísérlet alatti
  napokba, a régi Excel-tracker, illetve szövegből okos beillesztés.
- **Személyes adat soha nem kerül a repóba vagy a buildbe.** A `.gitignore` kizár minden
  táblázat-, csv-, ics- és mentésfájlt; a demó adatok kitaláltak, véletlenszám-generátorral
  készülnek.

## Projektszerkezet

```
src/
  domain/      tiszta TypeScript, React nélkül – minden számítás, import/export, demó-generátor
  data/        Dexie séma + migrációk, repository, mentés, automatikus mentés
  app/         keret: navigáció, fejléc, parancspaletta, téma, frissítés
  components/  UI-elemek: Button, Scale, Segmented, Stepper, MetricField, Tip, EmptyState…
  features/    today, checkin, journal, analysis (+charts), plan, settings, onboarding
  styles/      Tailwind v4 + design tokenek, betűtípusok
tests/unit, tests/e2e
docs/TERV.md   a kezdeti terv
```

## Döntések

A specifikáció mellett hozott döntések és az okaik.

**Technika**

- **Hash-alapú útvonalak** (`#/naplo`). Bármilyen statikus tárhelyen és alkönyvtárban is
  működik átirányítási szabály nélkül, a telepített PWA pedig offline is mindig az
  `index.html`-ből indul.
- **SheetJS (`xlsx` 0.18.5) az npm-ről.** A SheetJS a frissebb verziókat a saját CDN-jéről
  terjeszti, de az a fejlesztői környezetből nem volt elérhető, és a „futás közben nincs CDN”
  szabály miatt amúgy is a csomagba kell kerülnie. A 0.18.5-ös npm-verzióhoz ismert biztonsági
  figyelmeztetések tartoznak (prototype pollution, ReDoS) **megbízhatatlan** fájlok
  feldolgozásakor; itt csak a felhasználó saját fájljait olvassa, helyben. Csak importnál és
  xlsx-exportnál töltődik be (külön csomagrész). Ha elérhető, érdemes a SheetJS saját
  tárhelyéről a legújabb verzióra cserélni.
- **Grafikonok: `@visx/scale` + kézzel írt SVG.** Kicsi, jól animálható, és pontosan a design
  szerint rajzol (szín + ▲▼● + szöveg). A grafikonok külön csomagrészben, lustán töltődnek.
- **Saját tooltip** a Radix Tooltip helyett – kisebb csomag, és a navigációs linkekkel is
  rendesen működik.
- **Lusta betöltés:** a Ma képernyő kivételével minden oldal, a grafikonok, a varázsló, a
  demó-generátor, az animációs funkciók, a mentés-séma (zod) és az xlsx külön töltődik. A
  kezdeti JS az előre betöltött darabokkal együtt ≈ 181 kB gzip (cél: < 200 kB). Lighthouse
  desktop: 99–100 minden kategóriában.
- **Szigorú CSP** a buildelt HTML-ben (`script-src 'self'`, `connect-src 'self'`…). Ezért a
  téma beállítása az első festés előtt külön fájlban van (`public/theme-init.js`), nem a
  HTML-be ágyazva. A `style-src` engedi az inline stílust (a színskálák így kapják a hátterüket).
- **Gyorsbillentyűk:** a Ctrl+1–4 böngészőfülben a fülváltásé, ezt a böngésző nem engedi
  elvenni – telepített appban működik, fülben az Alt+1–4 a tartalék.
- **Színek:** a `--muted` a specifikációs értéknél kicsit sötétebb (`#646b78`), hogy apró
  szövegnél is meglegyen a WCAG AA kontraszt; a fehér szövegű zöld gombok a sötétebb
  `--plan-ink` színt kapják. A szín sehol nem az egyetlen jel: mindig szín + ▲▼● + szöveg.
- **Animáció:** Framer Motion `LazyMotion`-nel; a `prefers-reduced-motion` beállítást az app
  követi (az animációk és a görgetés is kikapcsolnak).

**Számítások (az Excel-trackerrel egyezően)**

- **Diéta-hét és alvás-hét:** a hétfőtől vasárnapig tartó diéta-hét; az éjszakai adat a
  felkelés napjához tartozik, de az előző nap ételét tükrözi, ezért az alvás-hét = a hét(nap − 1)
  – azaz keddtől a következő hétfő reggelig.
- **Baseline:** átlag és **minta**szórás (Excel `STDEV.S`), a kísérlet előtti óraadatokból.
- **Romlás az előző héthez:** alvásminőség ≤ −1, éjszaka-összkép ≤ −0,3, tünet ≥ +1 pont.
  Lebegőpontos tűréssel (1e-9), hogy a határon ne „csússzon” el.
- **Üres és nem összevethető hét:** ahogy az Excel Áttekintés lapja – ha a hétnek nincs
  kitöltött napja, a cella üres; ha az előző hétnek nincs, „–”.
- **Lezárási javaslat:** reakció, ha legalább két mutató romlott, vagy egy tünet legalább
  2 ponttal nőtt (alvásminőség 2 ponttal csökkent); bizonytalan, ha egy mutató romlott kissé;
  egyébként „átment”. A javaslat csak javaslat, a döntés a tiéd.
- **Hét lezárása vasárnaptól** lehetséges (az utolsó nap is számít); korábbi, lezáratlan hetek
  bármikor lezárhatók.
- **Reakció-hét után** az összevetés a legutóbbi „átment” héthez is megtörténik, nem csak az
  előzőhöz – különben egy reakció után minden javulásnak látszana.
- **„Mi hat az alvásodra?”** – barát(nő) és alvás helye: minden olyan éjszaka számít, ahol ez
  ki van töltve; alkohol és mozgás: az **előző nap** értéke a mért éjszakákon.
- **Színezési küszöbök:** napi óraadat ±0,5 szórás, heti átlag ±0,25 szórás, szubjektív
  mutatók ±1 pont a saját becsléshez képest.

**Működés**

- **Alapterv:** a hetek ételei, szövegei és tippjei az Excel-tracker Terv lapjáról jönnek;
  szerkeszthetők. Átrendezéskor az alaphetek (bázis) a helyükön maradnak, csak a tesztelt
  ételek sorrendje változik.
- **Csúsztatás:** reakció után a „csúsztatás” egy visszaálló (kimosó) hetet szúr be, és minden
  későbbi ételt egy héttel hátrébb tol. Ha a terv végén még fel nem használt tartalék hét van,
  az fogy el; különben a terv egy héttel hosszabb lesz.
- **Kezdés alapértéke:** 2026. október 5. (hétfő); ha ez már elmúlt, a következő hétfő.
- **Esti alapértékek:** diéta „igen”, alkohol 0 – a leggyakoribb válasz egy Enterrel elfogadható.
  A reggeli alvás helye az előző válaszokból javasolt.
- **Óraadat forrása (`deviceSource`):** `manual` = kézzel beírt, `import` = fájlból
  beolvasott, `shortcut` = szövegből okos beillesztéssel. Óraadat-importnál a kézzel beírt
  értéket az app kérdés nélkül nem írja felül – az ütközéseknél te döntesz.
- **Napló-export:** az xlsx Napló lapja és a csv oszlopai pontosan az Excel-tracker Napló
  lapjáét követik (B–AA), plusz két oszlop a végén: „Mi volt?” (diétahiba) és „Címkék”. A
  Baseline lap nyers adatai egymás mellett állnak, mint az Excelben – így a régi tracker
  importja a saját exportot is be tudja olvasni.
- **CSV:** pontosvesszővel és tizedesvesszővel, UTF-8 BOM-mal – a magyar Excel így egyből
  helyesen nyitja meg.
- **Excel-tracker import:** a régi trackerből a Napló, a Terv és a Baseline is átjön, így az
  addigi adatok nem vesznek el.
- **Demó:** a kitalált adatsor mindig a mostani hét hétfője előtt 8 héttel indul, így minden
  képernyőn „élő” állapotot mutat; naponta egyszer újragenerálódik. A heti romlás-mintázat
  ugyanaz, mint a DEMO Excelben.
- **Emlékeztetők:** a böngésző bezárt állapotban nem tud értesíteni, ezért az app .ics fájlt ad,
  amit a naptárad emlékeztetőként kezel.
