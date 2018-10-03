const Readline = require("readline");
var io = Readline.createInterface({
  input : process.stdin,
  output : process.stdout,
  terminal: true
});

class IO {
  static ask(question){
    return new Promise((resolve, reject)=>{
      io.question(question, (answer)=>{
        resolve(answer);
      })
    });
  }

  static print(str){
    io.terminal = true;
    io.write(str);
    io.terminal = false;
  }

  static println(str){
    io.terminal = true;
    io.write(str+"\r\n");
    io.terminal = false;
  }
}

module.exports = IO;
