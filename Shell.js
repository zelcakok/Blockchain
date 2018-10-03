var IO = null;
class Shell {
  constructor(io){
    IO = io;
    this.username = "Please login";
    this.msgQueue = [];
    this.operations = [];
  }

  setUsername(username){
    this.username = username;
  }

  queueMsg(msg){
    this.msgQueue.push(msg);
  }

  floodMsg(){
    return new Promise((resolve, reject)=>{
      var hasMsg = this.msgQueue.length > 0;
      this.msgQueue.forEach((msg)=>IO.println(msg));
      this.msgQueue = [];
      if(hasMsg) IO.println("")
      resolve();
    });
  }

  react(...cmd){
    Object.keys(this.operations).map((opt)=>{
      if(cmd[0] === opt) this.operations[opt](cmd);
    })
    this.prompt();
  }

  setPrompt(msg){
    IO.prompt = msg;
  }

  prompt(){
    this.floodMsg().then(()=>{
      IO.ask("Blockchain ["+this.username+"]>").then((cmd)=>{
        if(cmd.trim() === "exit") {
          IO.println("System exited.");
          process.exit(0);
        }
        else this.react(cmd.split(" "));
      })
    })
  }
}
module.exports = Shell;
