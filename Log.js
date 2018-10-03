const moment = require("moment");
var verbose = false;
class Log {
  static d(...msg){
    if(!verbose) return;
    console.log(msg.join("  "), "\t["+moment().format("HH:mm:ss") + "]");
  }

  static out(...msg){
    console.log(msg.join("  "), "\t["+moment().format("HH:mm:ss") + "]");
  }

  static setVerbose(action){
    verbose = action;
  }
}

module.exports = Log;
