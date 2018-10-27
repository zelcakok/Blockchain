const Enquirer = require("enquirer");

class IO {
  constructor(){
    this.enquirer = new Enquirer();
    this.enquirer.register('password', require('prompt-password'));

    this.msgQueue = [];
    this.msgControl = setInterval(()=>{
      this.floodMsg();
    }, 1000);
  }

  set(key, question, isMasked = false){
    return this.enquirer.set({
      type: isMasked? 'password' : 'input',
      message: question,
      name: key
    })
  }

  ask(key, question, isMasked = false){
    return this.enquirer.ask({
      type: isMasked? 'password' : 'input',
      message: question,
      name: key
    })
  }

  asks(questions, index = 0, responses = null){
   return new Promise((resolve, reject)=>{
     var resList = responses? responses : new Object();
     var key = Object.keys(questions)[index];
     if(!questions.hasOwnProperty(key)) return resolve(responses);
     this.enquirer.ask({
       type: questions[key].isMasked? 'password' : 'input',
       message: questions[key].question,
       name: key
     }).then((res)=>{
       resList[key] = res[key];
       resolve(this.asks(questions, ++index, resList))
     })
   });
  }

  queueMsg(msg){
    this.msgQueue.push(msg);
  }

  floodMsg(){
    if(this.msgQueue.length>0)
      console.log();
    this.msgQueue.forEach((msg)=>{
      console.log("".padEnd(3)+msg);
    })
    this.msgQueue = [];
  }

  print(msg){
    console.log(msg);
  }

  init(){
    this.enquirer = new Enquirer();
    this.enquirer.register('password', require('prompt-password'));
  }

  reset(){
    delete this.enquirer;
    this.init();
  }
}
module.exports = IO;
