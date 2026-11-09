import { MOCK_TALKS } from './mockData.js';

const ALL_EXPO_HALLS = ['HALL-A', 'HALL-BC', 'HALL-1', 'HALL-2', 'HALL-3', 'HALL-4', 'HALL-5'];

/**
 * Map a room name from the data to the floor plan room(s) it occupies (SVG data-room ids).
 *   "255 BC"                                  → ["255"]
 *   "Hall DE"                                 → ["HALL-DE"]
 *   "Solutions Showcase | Hall B | ..."       → ["HALL-BC"]
 *   "Solutions Showcase | Hall 1 | ..."       → ["HALL-1"]
 *   "Solutions Showcase | Hall(s) 5 | ..."    → ["HALL-5"]
 *   "Halls A-C, Halls 1-5" (whole expo floor) → all seven expo halls
 *   "Grand Ballroom ACE"                      → ["BALLROOM"]
 * Returns [] for places the floor plan doesn't draw.
 */
export function toSvgRoomIds(roomName = '') {
  const name = String(roomName).trim();
  const num = name.match(/^(\d{3})/);
  if (num) return [num[1]];
  if (/^Hall DE\b/i.test(name)) return ['HALL-DE'];
  if (/^Halls A-C/i.test(name)) return ALL_EXPO_HALLS;
  if (/\|\s*Hall B\b/i.test(name)) return ['HALL-BC'];
  if (/\|\s*Hall 1\b/i.test(name)) return ['HALL-1'];
  if (/\|\s*Halls? 5\b/i.test(name)) return ['HALL-5'];
  if (/^Grand Ballroom/i.test(name)) return ['BALLROOM'];
  return [];
}

/** First floor plan room for a data room (used to highlight one room), or null. */
export function toSvgRoomId(roomName = '') {
  return toSvgRoomIds(roomName)[0] || null;
}

/** Reverse mapping for room clicks: data room-name prefixes that belong to an SVG room id. */
export function svgRoomPrefixes(svgId) {
  const map = {
    'HALL-DE': ['Hall DE'],
    'HALL-A': ['Halls A-C'],
    'HALL-BC': ['Solutions Showcase | Hall B', 'Halls A-C'],
    'HALL-1': ['Solutions Showcase | Hall 1', 'Halls A-C'],
    'HALL-2': ['Halls A-C'],
    'HALL-3': ['Halls A-C'],
    'HALL-4': ['Halls A-C'],
    'HALL-5': ['Solutions Showcase | Hall 5', 'Solutions Showcase | Halls 5', 'Halls A-C'],
    'BALLROOM': ['Grand Ballroom'],
  };
  return map[svgId] || [String(svgId)];
}

export const API = {
  // Set to true for purely standalone/offline mode, or false to call live backend
  useMock: false,
  apiBaseUrl: '', // Relative URL for FastAPI or http://localhost:8000

  async search(params = {}) {
    if (!this.useMock) {
      try {
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') {
            // Arrays become repeated params: room=Hall%201&room=Halls%20A-C
            (Array.isArray(v) ? v : [v]).forEach(x => query.append(k, x));
          }
        }
        const endpoint = `${this.apiBaseUrl}/search?${query.toString()}`;
        const controller = new AbortController();
        // Hybrid search calls OpenAI for the query embedding, which can take a few seconds.
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          // Normalize response format
          return this.normalizeResponse(data);
        }
      } catch (err) {
        console.error('Backend /search unreachable, falling back to MOCK data:', err.message);
      }
    }

    return this.mockSearch(params);
  },

  normalizeResponse(data) {
    // If backend returns elasticsearch hits/aggregations
    let talks = [];
    if (Array.isArray(data.talks)) {
      talks = data.talks;
    } else if (data.hits && Array.isArray(data.hits.hits)) {
      talks = data.hits.hits.map(h => ({ ...h._source, id: h._id || h._source.id }));
    }

    let aggregations = data.aggregations || {};
    // Extract venue, level, room bucket counts into simple key-value objects
    const rooms = {};
    if (aggregations.rooms && aggregations.rooms.buckets) {
      aggregations.rooms.buckets.forEach(b => { rooms[b.key] = b.doc_count; });
    } else if (aggregations.rooms) {
      Object.assign(rooms, aggregations.rooms);
    }

    const levels = {};
    if (aggregations.levels && aggregations.levels.buckets) {
      aggregations.levels.buckets.forEach(b => { levels[b.key] = b.doc_count; });
    } else if (aggregations.levels) {
      Object.assign(levels, aggregations.levels);
    }

    const venues = {};
    if (aggregations.venues && aggregations.venues.buckets) {
      aggregations.venues.buckets.forEach(b => { venues[b.key] = b.doc_count; });
    } else if (aggregations.venues) {
      Object.assign(venues, aggregations.venues);
    }

    // Our FastAPI backend returns nested counts: venues → levels → rooms.
    // Flatten them; rooms/levels are for the Salt Palace floor plan only.
    if (Array.isArray(data.venues)) {
      data.venues.forEach(v => {
        venues[v.key] = v.count;
        if (v.key === 'Salt Palace') {
          v.levels.forEach(l => {
            levels[l.key] = l.count;
            l.rooms.forEach(r => {
              // "250 A-C" → "250"; "Halls A-C, Halls 1-5" counts toward every expo hall it spans
              toSvgRoomIds(r.key).forEach(id => { rooms[id] = (rooms[id] || 0) + r.count; });
            });
          });
        }
      });
    }

    const total = data.total ?? (data.hits?.total?.value ?? talks.length);

    return {
      total,
      talks,
      aggregations: {
        rooms,
        levels,
        venues
      }
    };
  },

  mockSearch(params = {}) {
    const q = (params.q || '').trim().toLowerCase();
    const day = params.day || '';
    const topic = params.topic || '';
    const audience = params.audience || '';
    const registration = params.registration || '';
    const wheelchair = params.wheelchair === true || params.wheelchair === 'true';
    const venue = params.venue || '';
    const level = params.level || '';
    const roomPrefixes = [].concat(params.room || []).filter(Boolean);

    // Filter talks
    const filtered = MOCK_TALKS.filter(talk => {
      // Keyword search (fuzzy/partial match title, abstract, speakers)
      if (q) {
        const titleMatch = (talk.title || '').toLowerCase().includes(q);
        const abstractMatch = (talk.abstract || '').toLowerCase().includes(q);
        const speakerMatch = (talk.speakers || []).some(s => (s.name || s || '').toLowerCase().includes(q));
        
        // Simple typo tolerance for common queries like "observabilty" -> "observability", "securty" -> "security"
        const cleanQ = q.replace(/[^a-z]/g, '');
        const fuzzyObserv = cleanQ.includes('observ') && ((talk.title + talk.abstract).toLowerCase().includes('observ'));
        const fuzzySec = cleanQ.includes('secur') && ((talk.title + talk.abstract).toLowerCase().includes('secur'));

        if (!titleMatch && !abstractMatch && !speakerMatch && !fuzzyObserv && !fuzzySec) {
          return false;
        }
      }

      // Day match
      if (day && talk.day !== day) {
        return false;
      }

      // Topic match (official topics or inferred)
      if (topic) {
        const hasTopic = (talk.topics || []).includes(topic) || (talk.topics_inferred || []).includes(topic);
        if (!hasTopic) return false;
      }

      // Audience level match
      if (audience && talk.audience_level !== audience) {
        return false;
      }

      // Registration match
      if (registration && talk.registration?.type !== registration) {
        return false;
      }

      // Wheelchair accessibility
      if (wheelchair && talk.accessibility?.wheelchair_accessible !== true) {
        return false;
      }

      // Venue filter
      if (venue === 'offsite' || venue === 'Other') {
        if (talk.location?.venue === 'Salt Palace') return false;
      } else if (venue && talk.location?.venue !== venue) {
        return false;
      }

      // Level filter
      if (level && talk.location?.level !== level) {
        return false;
      }

      // Room filter (prefix, same as backend: "250" matches "250 A-C")
      if (roomPrefixes.length && !roomPrefixes.some(r => (talk.location?.room || '').startsWith(r))) {
        return false;
      }

      return true;
    });

    // Compute aggregations across the filtered result set
    const rooms = {};
    const levels = {};
    const venues = {};

    filtered.forEach(talk => {
      const v = talk.location?.venue;
      if (v) venues[v] = (venues[v] || 0) + 1;

      // Levels/rooms are for the Salt Palace floor plan; rooms keyed like the SVG ("250")
      if (v === 'Salt Palace') {
        const l = talk.location?.level;
        if (l) levels[l] = (levels[l] || 0) + 1;

        toSvgRoomIds(talk.location?.room).forEach(r => { rooms[r] = (rooms[r] || 0) + 1; });
      }
    });

    return {
      total: filtered.length,
      talks: filtered,
      aggregations: {
        rooms,
        levels,
        venues
      }
    };
  }
};
