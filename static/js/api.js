import { MOCK_TALKS } from './mockData.js';

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
            query.append(k, v);
          }
        }
        const endpoint = `${this.apiBaseUrl}/search?${query.toString()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          // Normalize response format
          return this.normalizeResponse(data);
        }
      } catch (err) {
        console.warn('Backend /search unreachable, seamlessly falling back to Mock API:', err.message);
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

      return true;
    });

    // Compute aggregations across the filtered result set
    const rooms = {};
    const levels = {};
    const venues = {};

    filtered.forEach(talk => {
      const v = talk.location?.venue;
      if (v) venues[v] = (venues[v] || 0) + 1;

      const l = talk.location?.level;
      if (l) levels[l] = (levels[l] || 0) + 1;

      const r = talk.location?.room;
      if (r) rooms[r] = (rooms[r] || 0) + 1;
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
