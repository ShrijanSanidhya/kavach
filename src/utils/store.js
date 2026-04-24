// Global shared state using a simple event system
const listeners = [];
export const incidentStore = {
  incidents: [],
  addIncident(incident) {
    this.incidents.push(incident);
    listeners.forEach(fn => fn([...this.incidents]));
  },
  subscribe(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) {
        listeners.splice(i, 1);
      }
    };
  }
};
