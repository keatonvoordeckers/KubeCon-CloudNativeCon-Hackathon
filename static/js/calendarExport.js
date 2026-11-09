// Calendar Export Service: Apple Calendar / iCal (.ics) and Google Calendar

const DENVER_TZID = 'America/Denver';
const MST_OFFSET_HOURS = -7; // Mountain Standard Time in Nov 2026 (UTC-7)

/**
 * Strips dashes, colons, and seconds fractions to format YYYYMMDDTHHmmss
 * @param {string} isoString e.g. "2026-11-08T09:00:00"
 * @returns {string} e.g. "20261108T090000"
 */
export function formatLocalCompactDate(isoString) {
  if (!isoString) return '';
  return isoString.replace(/[-:]/g, '').slice(0, 15);
}

/**
 * Converts a Mountain Time ISO string (e.g. "2026-11-08T09:00:00") into compact UTC (e.g. "20261108T160000Z")
 * @param {string} isoString 
 * @returns {string} e.g. "20261108T160000Z"
 */
export function formatUtcCompactDate(isoString) {
  if (!isoString) return '';
  const hasTz = isoString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(isoString);
  const withTz = hasTz ? isoString : `${isoString}-07:00`;
  const d = new Date(withTz);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escapes special characters for iCalendar RFC 5545 text fields
 * Backslash, semicolon, comma, and newlines must be escaped.
 * @param {string} text 
 * @returns {string}
 */
export function escapeIcsText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Folds iCalendar lines at 75 octets per RFC 5545 §3.1
 * @param {string} line 
 * @returns {string}
 */
export function foldIcsLine(line) {
  const MAX_LEN = 75;
  if (line.length <= MAX_LEN) return line;
  let folded = '';
  let curr = line;
  while (curr.length > MAX_LEN) {
    folded += curr.slice(0, MAX_LEN) + '\r\n ';
    curr = curr.slice(MAX_LEN);
  }
  folded += curr;
  return folded;
}

/**
 * Formats talk location into human-friendly string
 * @param {Object} talk 
 * @returns {string}
 */
export function formatTalkLocation(talk) {
  if (!talk || !talk.location) return 'Salt Palace Convention Center, Salt Lake City, UT';
  const parts = [];
  if (talk.location.room_full) {
    parts.push(talk.location.room_full);
  } else {
    if (talk.location.venue) parts.push(talk.location.venue);
    if (talk.location.level) parts.push(talk.location.level);
    if (talk.location.room) parts.push(`Room ${talk.location.room}`);
  }
  if (talk.location.address) {
    parts.push(talk.location.address);
  } else {
    parts.push('Salt Lake City, UT');
  }
  return parts.join(', ');
}

/**
 * Formats talk description for calendar details
 * @param {Object} talk 
 * @returns {string}
 */
export function formatTalkDescription(talk) {
  if (!talk) return '';
  const lines = [];

  if (talk.title) {
    lines.push(talk.title);
    lines.push('----------------------------------------');
  }

  const speakers = Array.isArray(talk.speakers) && talk.speakers.length > 0
    ? talk.speakers.map(s => typeof s === 'string' ? s : (s.name || '')).filter(Boolean).join(', ')
    : null;
  if (speakers) {
    lines.push(`🎤 Speaker(s): ${speakers}`);
  }

  if (talk.format) {
    lines.push(`📋 Format: ${talk.format}`);
  }

  if (talk.audience_level) {
    lines.push(`🎯 Audience Level: ${talk.audience_level}`);
  }

  if (talk.location) {
    lines.push(`📍 Location: ${formatTalkLocation(talk)}`);
  }

  if (talk.url) {
    lines.push(`🔗 Official Session Link: ${talk.url}`);
  }

  if (talk.abstract) {
    lines.push('');
    lines.push('Description:');
    lines.push(talk.abstract.trim());
  }

  return lines.join('\n');
}

/**
 * Generates direct Google Calendar URL for a single session
 * Format: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...&ctz=America/Denver
 * @param {Object} talk 
 * @returns {string} Google Calendar event URL
 */
export function generateGoogleCalendarUrl(talk) {
  if (!talk || !talk.start || !talk.end) return '';

  const startUtc = formatUtcCompactDate(talk.start);
  const endUtc = formatUtcCompactDate(talk.end);
  const title = talk.title || 'KubeCon NA 2026 Session';
  const details = formatTalkDescription(talk);
  const location = formatTalkLocation(talk);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startUtc}/${endUtc}`,
    details: details,
    location: location,
    ctz: DENVER_TZID
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an RFC 5545 compliant iCalendar string (.ics) for Apple Calendar / iPhone / Outlook
 * @param {Array<Object>} talks List of talk objects
 * @param {string} [calendarName="KubeCon NA 2026 Schedule"]
 * @returns {string}
 */
export function generateIcsCalendar(talks, calendarName = 'KubeCon NA 2026 Schedule') {
  const safeTalks = Array.isArray(talks) ? talks.filter(Boolean) : [];
  const nowUtc = formatUtcCompactDate(new Date().toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KubeCon + CloudNativeCon NA 2026//Schedule Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    `X-WR-TIMEZONE:${DENVER_TZID}`,
    'BEGIN:VTIMEZONE',
    `TZID:${DENVER_TZID}`,
    `X-LIC-LOCATION:${DENVER_TZID}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0700',
    'TZNAME:MST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0600',
    'TZNAME:MDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  ];

  for (const talk of safeTalks) {
    if (!talk.start || !talk.end) continue;

    const uid = `kubecon-2026-${talk.id || Math.random().toString(36).slice(2)}@kubecon.io`;
    const dtstart = formatLocalCompactDate(talk.start);
    const dtend = formatLocalCompactDate(talk.end);
    const summary = escapeIcsText(talk.title || 'KubeCon Session');
    const description = escapeIcsText(formatTalkDescription(talk));
    const location = escapeIcsText(formatTalkLocation(talk));

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART;TZID=${DENVER_TZID}:${dtstart}`);
    lines.push(`DTEND;TZID=${DENVER_TZID}:${dtend}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    if (talk.url) {
      lines.push(`URL:${talk.url}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // Fold lines and join with standard CRLF
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/**
 * Triggers a browser file download of the generated .ics calendar
 * @param {Array<Object>} talks 
 * @param {string} [filename="kubecon-schedule.ics"] 
 */
export function downloadIcsFile(talks, filename = 'kubecon-schedule.ics') {
  const icsData = generateIcsCalendar(talks);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Opens Google Calendar event creation in a new browser tab
 * @param {Object} talk 
 */
export function openGoogleCalendar(talk) {
  const url = generateGoogleCalendarUrl(talk);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
