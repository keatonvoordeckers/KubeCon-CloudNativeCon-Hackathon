import assert from 'node:assert/strict';
import {
  formatLocalCompactDate,
  formatUtcCompactDate,
  escapeIcsText,
  foldIcsLine,
  formatTalkLocation,
  formatTalkDescription,
  generateGoogleCalendarUrl,
  generateIcsCalendar
} from '../static/js/calendarExport.js';

console.log('Running Calendar Export Unit Tests...');

// 1. Test Date Formatting
const testIso = '2026-11-08T09:00:00';
assert.equal(formatLocalCompactDate(testIso), '20261108T090000');
assert.equal(formatUtcCompactDate(testIso), '20261108T160000Z'); // MST is UTC-7 in November

// 2. Test RFC 5545 Escaping
const unescaped = 'Special, chars; with \\ backslash and\nnewline';
const escaped = escapeIcsText(unescaped);
assert.equal(escaped, 'Special\\, chars\\; with \\\\ backslash and\\nnewline');

// 3. Test RFC 5545 Line Folding (at 75 octets)
const longLine = 'SUMMARY:' + 'A'.repeat(80);
const folded = foldIcsLine(longLine);
assert(folded.includes('\r\n '));
assert(folded.split('\r\n ').every(part => part.length <= 75));

// 4. Test Google Calendar URL Generation
const mockTalk = {
  id: '1379082',
  title: 'From Disk to Defense: Kubernetes Admission Policies',
  abstract: 'Deep dive into admission policies and safety controls.',
  speakers: [{ name: 'Jordan Liggitt' }, 'Tim Hockin'],
  start: '2026-11-08T15:40:00',
  end: '2026-11-08T16:10:00',
  location: {
    venue: 'Hyatt Regency',
    room: 'Salt Lake Ballroom DE',
    room_full: 'Hyatt Regency | Salt Lake Ballroom DE',
    address: '170 S W Temple, Salt Lake City, UT'
  },
  url: 'https://kubecon.io/session/1379082'
};

const gcalUrl = generateGoogleCalendarUrl(mockTalk);
assert(gcalUrl.startsWith('https://calendar.google.com/calendar/render?'));
assert(gcalUrl.includes('action=TEMPLATE'));
assert(gcalUrl.includes('ctz=America%2FDenver'));
assert(gcalUrl.includes('20261108T224000Z%2F20261108T231000Z')); // 15:40 + 7h = 22:40 UTC
assert(gcalUrl.includes('From+Disk+to+Defense'));

// 5. Test iCalendar (.ics) Generation
const mockTalk2 = {
  id: '999999',
  title: 'Multicluster AMA: The Community Answers',
  abstract: 'Ask Maintainers anything about multicluster.',
  speakers: [],
  start: '2026-11-08T16:40:00',
  end: '2026-11-08T17:10:00',
  location: {
    venue: 'Hyatt Regency',
    room: 'Salt Lake Ballroom C',
    address: '170 S W Temple'
  }
};

const icsOutput = generateIcsCalendar([mockTalk, mockTalk2], 'My KubeCon Schedule');

assert(icsOutput.startsWith('BEGIN:VCALENDAR'));
assert(icsOutput.includes('VERSION:2.0'));
assert(icsOutput.includes('X-WR-CALNAME:My KubeCon Schedule'));
assert(icsOutput.includes('X-WR-TIMEZONE:America/Denver'));
assert(icsOutput.includes('BEGIN:VTIMEZONE'));
assert(icsOutput.includes('TZID:America/Denver'));

// Check talk 1 event
assert(icsOutput.includes('UID:kubecon-2026-1379082@kubecon.io'));
assert(icsOutput.includes('DTSTART;TZID=America/Denver:20261108T154000'));
assert(icsOutput.includes('DTEND;TZID=America/Denver:20261108T161000'));
assert(icsOutput.includes('SUMMARY:From Disk to Defense: Kubernetes Admission Policies'));
assert(icsOutput.includes('URL:https://kubecon.io/session/1379082'));

// Check talk 2 event
assert(icsOutput.includes('UID:kubecon-2026-999999@kubecon.io'));
assert(icsOutput.includes('DTSTART;TZID=America/Denver:20261108T164000'));
assert(icsOutput.includes('DTEND;TZID=America/Denver:20261108T171000'));
assert(icsOutput.includes('SUMMARY:Multicluster AMA: The Community Answers'));

assert(icsOutput.endsWith('END:VCALENDAR\r\n'));

console.log('✓ All 5 Calendar Export Unit Tests passed successfully!');
