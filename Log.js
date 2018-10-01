const moment = require("moment");

class Log {
  static d(...msg){
    console.log(msg.join("\t"), "\t["+moment().format("HH:mm:ss") + "]");
  }
}

module.exports = Log;
