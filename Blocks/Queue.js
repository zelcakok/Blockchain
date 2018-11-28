class Queue {
  constructor(){
    this.memory = [];
    this.fptr = 0;
    this.lptr = 0;
  }

  push(data){
    this.memory[this.memory.length] = JSON.stringify(data);
    this.lptr = this.memory.length - 1;
    // this.lptr++;
  }

  pop(property = null){
    if(this.isEmpty()) return null;
    var data = this.memory[0];
    delete this.memory[0];
    this.trim();
    // var data = property? JSON.parse(this.memory[this.fptr])[property] : JSON.parse(this.memory[this.fptr]);
    // delete this.memory[this.fptr++];
    return data;
  }

  popLast(property = null){
    if(this.isEmpty()) return null;
    var data = this.memory[this.memory.length-1];
    delete this.memory[this.memory.length-1];
    this.trim();
    // var data = property? JSON.parse(this.memory[this.lptr])[property] : JSON.parse(this.memory[this.lptr]);
    // delete this.memory[this.lptr--];
    // var data = property? JSON.parse(this.memory[this.memory.length-1])[property] : JSON.parse(this.memory[this.memory.length-1]);
    // delete this.memory[this.memory.length-1];
    return data;
  }

  isEmpty(){
    return this.length() === 0;
    // return this.fptr > this.lptr || this.lptr < this.fptr;
  }

  trim(){
    this.memory = this.memory.filter((slot)=>{return slot!=null});
  }

  length(){
    return this.memory.filter((slot)=>{return slot!=null}).length;
  }
}
module.exports = Queue;
