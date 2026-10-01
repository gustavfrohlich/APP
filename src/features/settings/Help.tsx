// Súgó: rutin, skálák, színek, „miért kedd–hétfő az alvás hete”, billentyűparancsok, okos beillesztés
// (iOS Parancsok), adatvédelem, telepítés.

import type { ReactNode } from 'react';
import { modKey } from '@/lib/platform';

function H({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 mb-2 text-[16px] font-semibold first:mt-0">{children}</h3>;
}

function K({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}

const FIELDS: [string, string, string][] = [
  ['Hol aludtál?', 'reggel', 'Budapest / Otthon (SK) / Máshol. Hétvégén a javaslat: Otthon (SK).'],
  ['Barátnő itt aludt?', 'reggel', 'Az előző éjszakára vonatkozik.'],
  [
    'Alvásminőség (1–10)',
    'reggel',
    'Érzésre, az óra nélkül: 1 = borzalmas, 10 = teljesen kipihent.',
  ],
  [
    'Alvásidő',
    'reggel',
    'Óra:perc. Ugyanaz a „Sleep” szám, mint az exportodban – ebben az ébren töltött percek is benne vannak. Ha csak a tényleges alvást írnád be, minden éjszaka rosszabbnak tűnne.',
  ],
  ['Ébren éjjel', 'reggel', '11 perc = 0:11 (vagy csak „11”).'],
  ['Mélyalvás, REM', 'reggel', 'Óra:perc, pl. 0:42, 2:05 (vagy „42”, „205”).'],
  [
    'HRV, pulzus',
    'reggel',
    'Az alvás alatti HRV (ms) és nyugalmi pulzus (bpm), mint az exportod „HRV (ms)” és „RHR (bpm)” oszlopa.',
  ],
  ['Orr / légzés (0–10)', 'este', '0 = teljesen szabad, 10 = teljesen eldugult. A nap egészére.'],
  ['Fáradtság (0–10)', 'este', '0 = friss egész nap, 10 = alig bírtam fennmaradni.'],
  ['Evés utáni fáradtság (0–10)', 'este', '0 = semmi, 10 = muszáj volt ledőlnöm.'],
  [
    'Puffadás (0–10)',
    'este',
    '0 = semmi, 10 = fájdalmas, feszülő has. 3-tól azt is kérdezi, mikor.',
  ],
  ['Diéta betartva?', 'este', 'Igen / Részben / Nem – „Részben” vagy „Nem” esetén: mi volt?'],
  ['Koffein, alkohol', 'este', '1 kávé vagy energiaital = 1 adag; alkoholnál az italok száma.'],
  [
    'Mozgás, stressz',
    'este',
    'Nincs / Könnyű / Közepes / Intenzív; stressz 0 = nyugodt, 10 = extrém.',
  ],
];

export function Help() {
  const mod = modKey();
  return (
    <div className="text-[15px] leading-relaxed">
      <H>Rutin</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Egyszer, induláskor:</strong> kezdés dátuma, a két óra-export behúzása (baseline)
          és öt szám arról, milyen volt eddig egy átlagos nap.
        </li>
        <li>
          <strong>Reggel (30 mp):</strong> hol és kivel aludtál, milyen volt érzésre, plusz az óra
          adatai. Az alvásadat annak a napnak a sorába kerül, amikor felkeltél.
        </li>
        <li>
          <strong>Este (30 mp):</strong> orr, fáradtság, evés utáni fáradtság, puffadás, és a nap
          röviden.
        </li>
        <li>
          <strong>Hétfőn:</strong> új étel – a fejlécben és a Ma képernyőn mindig látod, mi az.
        </li>
        <li>
          <strong>Vasárnap este:</strong> a hét lezárása az Elemzésben – javaslatot kapsz, te
          döntesz.
        </li>
      </ul>

      <H>Mezők és skálák</H>
      <table className="w-full text-[14px]">
        <tbody>
          {FIELDS.map(([f, when, what]) => (
            <tr key={f} className="border-t border-line align-top">
              <td className="py-2 pr-3 font-medium whitespace-nowrap">{f}</td>
              <td className="py-2 pr-3 text-muted">{when}</td>
              <td className="py-2">{what}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H>Színek és jelek</H>
      <ul className="space-y-1.5">
        <li>
          <span className="rounded-full bg-good-fill px-2 py-0.5 font-semibold text-good">
            ▲ jobb
          </span>{' '}
          – az óraadatoknál egy éjszaka több mint fél szórással jobb a baseline átlagánál (heti
          átlagnál ±0,25 a határ).
        </li>
        <li>
          <span className="rounded-full bg-bad-fill px-2 py-0.5 font-semibold text-bad">
            ▼ rosszabb
          </span>{' '}
          – több mint fél szórással rosszabb.
        </li>
        <li>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold text-muted">
            ● átlagos
          </span>{' '}
          – a szokásos ingadozáson belül. Az „éjszaka-összkép” a 6 óraadat átlagos eltérése a
          baseline-tól.
        </li>
        <li>
          <span
            className="inline-block h-2.5 w-20 rounded-full align-middle"
            style={{
              background: 'linear-gradient(90deg, var(--scale-0), var(--scale-5), var(--scale-10))',
            }}
          />{' '}
          Tünetek: zöld → sárga → piros, ahogy rosszabb. Az alvásminőségnél fordítva: a 10 a zöld.
        </li>
        <li>
          <strong>Romlás az előző héthez:</strong> ami legalább 1 ponttal (az óraadatoknál az
          összkép 0,3-mal) rosszabb lett. Az 1. hetet a baseline-hoz (összkép = 0, tünetek = a
          becslésed) méri.
        </li>
        <li>
          <strong>Javaslat a lezáráshoz:</strong> Reakció, ha legalább 2 mutató romlott, vagy egy
          tünet legalább 2 ponttal nőtt; Bizonytalan, ha pontosan 1 romlott; egyébként Átment.
        </li>
      </ul>

      <H>Miért kedd–hétfő az alvás hete?</H>
      <p>
        Az éjszakai adat a felkelés napjához tartozik, de az előző nap ételét tükrözi: a hétfői új
        étel hatása kedd reggel látszik először, és a vasárnapi vacsoráé hétfő reggel. Ezért a heti
        alvásátlag keddtől a következő hétfő reggelig számol, a tünetek (orr, fáradtság, puffadás)
        pedig hétfőtől vasárnapig. Az első hétfő reggele még a diéta előtti éjszaka, így kimarad a
        heti átlagokból.
      </p>

      <H>Billentyűparancsok</H>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        <li>
          <K>{`${mod} K`}</K> parancspaletta
        </li>
        <li>
          <K>{`${mod} 1–4`}</K> Ma / Napló / Elemzés / Terv (böngészőfülön: <K>Alt 1–4</K>)
        </li>
        <li>
          <K>R</K> / <K>E</K> reggeli / esti check-in (a Ma képernyőn)
        </li>
        <li>
          <K>{`${mod} B`}</K> navigáció összecsukása
        </li>
        <li>
          <K>0–10</K> skála; az <K>1</K> után fél mp-ig vár a <K>0</K>-ra (10)
        </li>
        <li>
          <K>←</K> <K>→</K> léptetés, <K>Enter</K> javaslat elfogadása, <K>Tab</K> tovább,{' '}
          <K>Esc</K> bezár
        </li>
        <li>
          Időtartam: <K>756</K> → 7:56, <K>11</K> → 0:11, <K>7h56</K>, <K>7,9</K>
        </li>
        <li>
          Táblázat: nyilak, <K>Enter</K>/<K>F2</K> szerkesztés, <K>Delete</K> törlés
        </li>
      </ul>

      <H>Okos beillesztés és iOS Parancsok</H>
      <p>
        A reggeli óraadat-rácson a <K>{`${mod} V`}</K> egy szövegből kitölti a hat mezőt,
        előnézettel. Ilyen sort ismer fel:{' '}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
          Alvás 476 perc, Ébren 11 perc, Mély 42 perc, REM 125 perc, HRV 84, Pulzus 51,5
        </code>{' '}
        (az „7:56” alak is jó), és az óra exportjából másolt fejléc + adatsort is.
      </p>
      <p className="mt-2">
        Egy iPhone-os Parancsok (Shortcuts) automatizmus, ami ezt a sort a vágólapra teszi:
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Parancsok app → új parancs, neve pl. „Bázis éjszaka”.</li>
        <li>
          „Egészségügyi minták keresése”: <em>Alvás</em>, kezdete az elmúlt 16 órában, érték ={' '}
          <em>Mag</em>, <em>Mély</em>, <em>REM</em>, <em>Ébren</em> – mindegyikre külön, utána
          „Statisztika számítása → Összeg” az időtartamra (percben). Az alvásidő a négy összege (az
          ébrenléttel együtt, mint az export „Sleep” oszlopa).
        </li>
        <li>„Egészségügyi minták keresése”: Szívritmus-változékonyság, elmúlt 12 óra → „Átlag”.</li>
        <li>„Egészségügyi minták keresése”: Nyugalmi pulzus, a legutóbbi 1 minta.</li>
        <li>
          „Szöveg” művelet:{' '}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
            Alvás [összeg] perc, Ébren [ébren] perc, Mély [mély] perc, REM [rem] perc, HRV [hrv],
            Pulzus [pulzus]
          </code>
        </li>
        <li>„Másolás vágólapra”.</li>
        <li>
          Automatizálás → Személyes → „Ébresztő leállítva” (vagy egy időpont) → a parancs futtatása,
          megerősítés nélkül.
        </li>
      </ol>
      <p className="mt-2">
        Mac-en az univerzális vágólappal ez rögtön beilleszthető: nyisd meg a reggeli check-int,
        kattints az óraadat-rácsba, és nyomd meg a <K>{`${mod} V`}</K>-t. Windows alatt a szöveget
        üzenetben vagy jegyzetben is átküldheted magadnak.
      </p>

      <H>Adatvédelem</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Minden adat a böngésződ IndexedDB-jében, ezen a gépen marad. Nincs szerver, fiók,
          analitika vagy külső szkript.
        </li>
        <li>
          A betűtípusok és minden más az app része – futás közben semmit nem tölt le idegen helyről.
        </li>
        <li>
          A böngészőadatok törlése mindent vihet: kapcsold be az automatikus mentést egy mappába
          (pl. OneDrive), vagy töltsd le hetente a JSON-mentést. Asztali appként telepítve és
          „tartós tárolással” a böngésző sem takarít magától.
        </li>
        <li>
          Az exportok (xlsx, csv, JSON) a te fájljaid – egészségügyi adatok, kezeld őket ennek
          megfelelően.
        </li>
      </ul>

      <H>Telepítés asztali appként</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Chrome:</strong> a címsor jobb oldalán a telepítés ikon (monitor lefelé nyíllal),
          vagy ⋮ menü → „Átküldés, mentés és megosztás” → „Oldal telepítése alkalmazásként”.
        </li>
        <li>
          <strong>Edge:</strong> ⋯ menü → „Alkalmazások” → „A webhely telepítése alkalmazásként”.
        </li>
        <li>Telepítés után saját ablakban, net nélkül is fut; a frissítéseket az app jelzi.</li>
      </ul>
    </div>
  );
}
