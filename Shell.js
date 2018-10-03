const { spawn } = require('child_process');
var IO = null;
var msgQueue = [];
class Shell {
  constructor(io){
    IO = io;
    this.username = "Please login";
    msgQueue = [];
    this.operations = [];
  }

  setOperation(operations){
    this.operations = operations;
  }

  setUsername(username){
    this.username = username;
  }

  queueMsg(msg){
    msgQueue.push(msg);
  }

  floodMsg(){
    return new Promise((resolve, reject)=>{
      var hasMsg = msgQueue.length > 0;
      msgQueue.forEach((msg)=>{
        IO.println(msg)
      });
      msgQueue = [];
      if(hasMsg) IO.println("")
      resolve();
    });
  }

  static system(cmd){
    cmd = cmd.split(" ");
    var command = cmd[0];
    cmd.shift();
    var result = spawn(command, cmd);
    result.stdout.on('data', (data)=>{
      msgQueue.push(data.toString())
    });
  }

  react(...cmd){
    Object.keys(this.operations).map((opt)=>{
      if(cmd[0] === opt) this.operations[opt](cmd);
    })
    this.prompt();
  }

  prompt(){
    this.floodMsg().then(()=>{
      IO.ask("Blockchain ["+this.username+"]>").then((cmd)=>{
        if(cmd.trim() === "exit") {
          IO.println("System exited.");
          process.exit(0);
        }
        else this.react(cmd);
      })
    })
  }
}
module.exports = Shell;
