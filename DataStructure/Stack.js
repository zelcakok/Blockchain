const Node = require("./Node");

class Stack {
  constructor(){
    this.front = null;
  }

  push(data){
    var n = new Node(data);
    if(this.front === null) this.front = n;
    else {
      n.next = this.front;
      this.front = n;
    }
    this.size++;
  }

  pop(){
    var n = this.front;
    this.front = this.front.next;
    return n.data;
  }

  peak(){
    return this.front.data;
  }

  isEmpty(){
    return this.front === null;
  }
}
module.exports = Stack;
