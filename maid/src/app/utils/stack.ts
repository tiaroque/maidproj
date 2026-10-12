export class Stack<T> {
  items: Array<T>;

  constructor() {
    this.items = [];
  }

  // add element to the stack
  push(element: T) {
    return this.items.push(element);
  }

  // remove element from the stack
  pop() {
    if (this.items.length > 0) {
      return this.items.pop() as T;
    }

    return 0;
  }

  // view the last element
  peek() {
    return this.items[this.items.length - 1];
  }

  // check if the stack is empty
  isEmpty() {
    return this.items.length == 0;
  }

  // the size of the stack
  size() {
    return this.items.length;
  }

  // empty the stack
  clear() {
    this.items = [];
  }
}
