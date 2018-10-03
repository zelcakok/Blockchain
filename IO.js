const readline = require("readline");
var io = readline.createInterface({
  input : process.stdin,
  output : process.stdout
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
    io.write(str);
  }

  static println(str){
    io.write(str+"\r\n");
  }
}

module.exports = IO;
