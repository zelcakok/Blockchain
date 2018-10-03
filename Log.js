const moment = require("moment");
var verbose = false;
var shell = null;
class Log {
  static d(...msg){
    if(!verbose) return;
    if(shell === null)
      console.log(msg.join("  "), "\t["+moment().format("HH:mm:ss") + "]");
    else
      shell.queueMsg(msg.join("  ")+"\t\t["+moment().format("HH:mm:ss") + "]");
  }

  static out(...msg){
    if(shell === null)
      console.log(msg.join("  "), "\t["+moment().format("HH:mm:ss") + "]");
    else
      shell.queueMsg(msg.join("  ")+"\t\t["+moment().format("HH:mm:ss") + "]");
  }

  static setVerbose(action){
    verbose = action;
  }

  static bind(Shell){
    shell = Shell;
  }
}

module.exports = Log;
