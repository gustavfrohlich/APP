// .ics naptárfájl két ismétlődő napi emlékeztetővel (reggeli és esti check-in).
// Lebegő helyi időt használ (időzóna nélkül), így a naptár mindig a gép helyi idejében jelez.

import type { ISODate } from '../types';

function icsDate(date: ISODate, time: string): string {
  const [h = '07', m = '30'] = time.split(':');
  return `${date.replace(/-/g, '')}T${h.padStart(2, '0')}${m.padStart(2, '0')}00`;
}

function stamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function fold(line: string): string {
  // RFC 5545: max. 75 oktett soronként; egyszerűsítve karakterre.
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs(
  reminders: { morning: string; evening: string },
  startDate: ISODate,
  appUrl?: string,
  now = new Date(),
): string {
  const events = [
    {
      uid: 'bazis-reggel@bazis.local',
      time: reminders.morning,
      summary: 'Bázis – reggeli check-in',
      description: 'Hogy aludtál? 30 másodperc: hely, alvásminőség, óraadatok.',
    },
    {
      uid: 'bazis-este@bazis.local',
      time: reminders.evening,
      summary: 'Bázis – esti check-in',
      description: 'Milyen volt a napod? Orr, fáradtság, puffadás, a nap röviden.',
    },
  ];
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bazis//Eliminacios dieta naplo//HU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Bázis emlékeztetők',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${icsDate(startDate, e.time)}`,
      'DURATION:PT5M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${e.summary}`,
      `DESCRIPTION:${e.description}${appUrl ? `\\n${appUrl}` : ''}`,
      ...(appUrl ? [`URL:${appUrl}`] : []),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${e.summary}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
