// Personal Schedule Manager with localStorage and Conflict Detection

const STORAGE_KEY = 'kubecon_my_schedule';
// Full talk objects, so talks from live search (not just mock data) can be shown later
const TALKS_KEY = 'kubecon_my_schedule_talks';

export const Schedule = {
  listeners: [],

  onChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  },

  notify() {
    const ids = this.getSavedIds();
    this.listeners.forEach(cb => cb(ids));
  },

  getSavedIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read schedule from localStorage', e);
      return [];
    }
  },

  getTalkCache() {
    try {
      return JSON.parse(localStorage.getItem(TALKS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  /** Saved talks as full objects; falls back to a lookup list (e.g. mock data) for older saves. */
  getSavedTalks(fallback = []) {
    const cache = this.getTalkCache();
    return this.getSavedIds()
      .map(id => cache[id] || fallback.find(t => String(t.id) === id))
      .filter(Boolean);
  },

  hasTalk(talkId) {
    const ids = this.getSavedIds();
    return ids.includes(String(talkId));
  },

  toggleTalk(talk) {
    if (this.hasTalk(talk.id)) {
      this.removeTalk(talk.id);
      return false;
    } else {
      this.addTalk(talk);
      return true;
    }
  },

  addTalk(talk) {
    const ids = this.getSavedIds();
    const idStr = String(talk.id);
    if (!ids.includes(idStr)) {
      ids.push(idStr);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      const cache = this.getTalkCache();
      cache[idStr] = talk;
      localStorage.setItem(TALKS_KEY, JSON.stringify(cache));
      this.notify();
    }
  },

  removeTalk(talkId) {
    let ids = this.getSavedIds();
    const idStr = String(talkId);
    ids = ids.filter(id => id !== idStr);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    this.notify();
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  },

  /**
   * Evaluates pairwise conflict between all saved talks.
   * Two talks conflict if they share the same day and their start/end intervals overlap:
   * (Start_A < End_B) && (End_A > Start_B)
   *
   * @param {Array} talks Array of talk objects
   * @returns {Object} Map of talkId -> Array of conflicting talk objects
   */
  findConflicts(talks) {
    const conflicts = {};

    for (let i = 0; i < talks.length; i++) {
      for (let j = i + 1; j < talks.length; j++) {
        const a = talks[i];
        const b = talks[j];

        if (!a || !b || !a.start || !a.end || !b.start || !b.end) continue;
        if (a.day !== b.day) continue;

        const startA = new Date(a.start).getTime();
        const endA = new Date(a.end).getTime();
        const startB = new Date(b.start).getTime();
        const endB = new Date(b.end).getTime();

        // Check time overlap
        if (startA < endB && endA > startB) {
          if (!conflicts[a.id]) conflicts[a.id] = [];
          if (!conflicts[b.id]) conflicts[b.id] = [];

          conflicts[a.id].push(b);
          conflicts[b.id].push(a);
        }
      }
    }

    return conflicts;
  }
};
