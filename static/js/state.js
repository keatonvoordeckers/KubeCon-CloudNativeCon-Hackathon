// Central reactive state store with lightweight pub/sub

class StateManager {
  constructor() {
    this.state = {
      filters: {
        q: '',
        day: '',
        topic: '',
        audience: '',
        registration: '',
        wheelchair: false,
      },
      spatial: {
        venue: 'Salt Palace',
        level: 'Level 2',
        activeRoom: null,
      },
      data: {
        total: 0,
        talks: [],
        aggregations: {
          rooms: {},
          levels: {},
          venues: {}
        }
      },
      a11y: {
        highContrast: false,
        fontScale: 'normal', // normal, large, xl
      }
    };

    this.listeners = {};
  }

  get() {
    return this.state;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data, this.state);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }

  setFilters(newFilters) {
    this.state.filters = { ...this.state.filters, ...newFilters };
    this.emit('filters:changed', this.state.filters);
  }

  setSpatial(newSpatial) {
    this.state.spatial = { ...this.state.spatial, ...newSpatial };
    this.emit('spatial:changed', this.state.spatial);
  }

  setData(newData) {
    this.state.data = newData;
    this.emit('data:loaded', this.state.data);
  }

  setA11y(newA11y) {
    this.state.a11y = { ...this.state.a11y, ...newA11y };
    this.emit('a11y:changed', this.state.a11y);
  }
}

export const State = new StateManager();
