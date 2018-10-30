const moment = require("moment");
var verbose = false;
var shell = null;
class Log {
  static d(...msg){
    if(!verbose) return;
    var m = Log.record(msg);
    Log.serve(m);
  }

  static out(...msg){
    var m = Log.record(msg);
    Log.serve(m);
  }

  static setVerbose(action){
    verbose = action;
  }

  static bind(Shell){
    shell = Shell;
  }

  static record(msg){
    return msg.join("\t")+"".padStart(15)+"["+moment().format("HH:mm:ss") + "]";
  }

  static serve(m){
    if(shell) shell.queueMsg(m);
    else console.log(m);
  }
}

module.exports = Log;
