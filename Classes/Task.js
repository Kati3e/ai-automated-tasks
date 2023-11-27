class Task {
  constructor(task) {
    this.id = task.id;
    this.name = task.name || '';
    this.type = task.type || '';
    this.status = task.status && task.status.toLowerCase() || '';
    this.refresh_time = task.refresh_time ? Number(task.refresh_time) : 0;
    this.countdown = task.countdown || 0;
    this.when = typeof task.when === 'string' ?JSON.parse(task.when) : [];
    this.events = typeof task.when === 'string' ? JSON.parse(task.events) : [];
    this.notes = task.notes || '';

    // Check refresh_time against current time
    if (this.status === 'done' && this.refresh_time) {
      const completedTasks = this.events && this.events.filter(event => event.type === 'completed') || [];
      const next_time = completedTasks.length && completedTasks[completedTasks.length - 1].timestamp + Number(this.refresh_time);
      if (this.getCurrentTime() > next_time) {
        this.status = '';
      };
    }
  }

  changeStatus(status) {
    this.status = status;
  }
  cancel() {
    
  }
  clearEvents() {
    this.events = [];
  }
  clearCompletion() {
    this.status = '';
  }
  // remove() {
      
  // }
  edit(task) {
    const properties = Object.keys(task);
    properties.forEach(property => {
      this[property] = task[property];
    });
  }
  calculateCertainty() {
      
  }
  saveChanges() {

  }
  addEvent(event) {
    this.event.push(event);
  }
  addWhen(when) {
    this.when.push(when);
  }
  getCurrentTime() {
    const date = new Date();
    return date.getTime();
  }
}

// export { Task };
module.exports = Task;