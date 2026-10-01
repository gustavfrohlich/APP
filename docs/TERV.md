# Bázis – megvalósítási terv

Ez a dokumentum a kódolás előtt készült terv: mappaszerkezet, komponenslista és lépések.
A végleges döntések a README „Döntések” részében vannak.

## Mappaszerkezet

```
.
├── docs/                  terv, jegyzetek
├── public/                ikonok (svg + png), robots.txt, theme-init.js, _headers
├── scripts/               ikon-generálás (Playwright → PNG)
├── src/
│   ├── domain/            TISZTA TypeScript, React nélkül – minden számítás
│   │   ├── types.ts         DayEntry, PlanWeek, Settings, BaselineNight/Day
│   │   ├── dates.ts         ISO dátum-segédek (UTC-mentes, napalapú)
│   │   ├── weeks.ts         diéta-hét, alvás-hét
│   │   ├── metrics.ts       mutatók: irány, címke, mértékegység, mező
│   │   ├── stats.ts         átlag, minta-szórás
│   │   ├── baseline.ts      baseline statisztika
│   │   ├── deviation.ts     előjelezett z, jobb/semleges/rosszabb
│   │   ├── nightScore.ts    éjszaka-összkép
│   │   ├── weekly.ts        heti összesítő, színezés, romlás
│   │   ├── verdict.ts       hét-lezárási javaslat
│   │   ├── comparisons.ts   „Mi hat az alvásodra?”
│   │   ├── streak.ts        kimaradás, streak, check-in állapot
│   │   ├── explain.ts       magyar nyelvű visszajelző mondatok
│   │   ├── plan.ts          alapterv, engedélyezett ételek, csúsztatás
│   │   ├── suggest.ts       okos alapértékek (hely, koffein, …)
│   │   ├── format.ts        magyar formázás (ó:pp, tizedesvessző, dátum)
│   │   ├── parse/           időtartam, szám, okos beillesztés
│   │   ├── io/              baseline-import, Napló-oszlopok, csv, ics, mentés-séma
│   │   └── demo/            seedelt véletlen + demó-generátor
│   ├── data/              Dexie séma + migrációk, repository, mentés, automatikus mentés
│   ├── app/               shell: navigáció, fejléc, parancspaletta, téma, gyorsbillentyűk
│   ├── components/        UI primitívek: Card, Button, Scale, DurationField, NumberField,
│   │                      Stepper, Segmented, ChipGroup, Delta, Tooltip, Dialog, EmptyState
│   ├── features/
│   │   ├── today/         Ma képernyő
│   │   ├── checkin/       reggeli és esti panel, összegzés
│   │   ├── journal/       naptár-hőtérkép, lista, nap részletei, táblázat
│   │   ├── analysis/      heti kártya, összesítő, grafikonok, lezárás, összevetések, orvosi nézet
│   │   ├── plan/          idővonal, szerkesztés
│   │   ├── settings/      beállítások, súgó
│   │   └── onboarding/
│   └── styles/            Tailwind + design tokenek (CSS változók)
└── tests/
    ├── unit/              Vitest – domain modul (+ DEMO xlsx egyezés, ha a fájl megvan)
    └── e2e/               Playwright smoke – reggeli + esti check-in billentyűzettel
```

## Lépések (mérföldkövek)

1. Váz – Vite, TS strict, Tailwind v4 tokenek, Inter + Fraunces lokálisan, PWA, hash routing, bal oldali navigáció.
2. Domain + tesztek – a 6. pont minden szabálya, DEMO-egyezési teszt (kihagyva, ha nincs fájl).
3. Adatréteg – Dexie (valódi + külön demó adatbázis), repository interfész, import, JSON mentés.
4. Ma + check-inek – vezérlők, reggeli/esti panel, azonnali visszajelzés.
5. Napló – hőtérkép, lista, részletek, Excel-szerű táblázat.
6. Elemzés – heti kártya és táblázat, grafikonok (lusta betöltés), hét lezárása, összevetések, orvosi összefoglaló.
7. Terv – idővonal, szerkesztés, sorrend, csúsztatás.
8. Onboarding, Beállítások, demó mód, exportok, Súgó.
9. Csiszolás – animációk, üres állapotok, sötét mód, a11y, Lighthouse, README.
