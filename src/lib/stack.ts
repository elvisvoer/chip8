export class Stack<T> {
  private data: T[] = [];
  constructor(private name: string) {}

  get length() {
    return this.data.length;
  }

  public push(element: T) {
    this.data.push(element);
  }

  public pop() {
    if (this.data.length > 0) return this.data.pop();
    else {
      throw "Stack empty: " + this.name;
    }
  }

  public peek(offset?: number) {
    var index = this.data.length - (offset ?? 1);
    if (0 <= index && index < this.data.length) return this.data[index];
    else
      throw (
        "Attempted to peek at invalid stack index " + index + ": " + this.name
      );
  }

  public roll(num: number) {
    if (num === 0) return;

    var index = this.data.length - num - 1;
    if (0 <= index && index < this.data.length) {
      var newTop = this.data.splice(index, 1)[0];
      this.data.push(newTop);
    } else
      throw (
        "Attempted to roll more elements than in stack " + num + ": " + this.name
      );
  }

  public clear() {
    this.data = [];
  }

  public toString() {
    return this.data.toString();
  }
}
