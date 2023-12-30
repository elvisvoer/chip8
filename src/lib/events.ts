export default class EventEmitter {
  private events = new Map<string, Function[]>();

  public clearListeners() {
    this.events = new Map<string, Function[]>();
  }

  public on(eventName: string, eventListener: Function) {
    const listeners = this.events.get(eventName) || [];
    listeners.push(eventListener);
    this.events.set(eventName, listeners);
  }

  public off(eventName: string, eventListener: Function) {
    let listeners = this.events.get(eventName) || [];
    listeners = listeners.filter((l) => l !== eventListener);
    this.events.set(eventName, listeners);
  }

  public once(eventName: string, eventListener: Function) {
    const temp = (...args: any[]) => {
      eventListener(...args);
      this.off(eventName, temp);
    };

    this.on(eventName, temp);
  }

  public emit(eventName: string, ...data: any[]) {
    const listeners = this.events.get(eventName) || [];
    listeners.forEach((l) => l(...data));
  }
}
