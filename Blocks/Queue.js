class Queue {
  constructor(){
    this.memory = [];
    this.fptr = 0;
    this.lptr = 0;
  }

  push(data){
    this.memory[this.memory.length] = JSON.stringify(data);
    this.lptr = this.memory.length - 1;
  }

  pop(property = null){
    if(this.isEmpty()) return null;
    var data = property? JSON.parse(this.memory[this.fptr])[property] : JSON.parse(this.memory[this.fptr]);
    delete this.memory[this.fptr++];
    return data;
  }

  popLast(property = null){
    if(this.isEmpty()) return null;
    var data = property? JSON.parse(this.memory[this.lptr])[property] : JSON.parse(this.memory[this.lptr]);
    delete this.memory[this.lptr--];
    return data;
  }

  isEmpty(){
    return this.fptr > this.lptr || this.lptr < this.fptr;
  }


}
module.exports = Queue;
