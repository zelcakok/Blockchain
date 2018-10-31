const Cryptographic = require("./Cryptographic");

var Log = null;
var PROTOCOLS_QUERY_LATEST_KEY = Cryptographic.md5("&pquerylatestkey");

class Crawler {
  constructor(transport, database, interval, logger){
    Log = logger;
    this.transport = transport;
    this.database = database;
    this.worker = null;
    this.interval = interval;
    this.fillProtocols();
  }

  scout(){
    if(!this.worker) Log.out("Crawler service is started","");
    this.worker = this._scout();
    return (this.worker = setInterval(this._scout, this.interval));
  }

  /*
    Broadcast the latest key.
    If the received latest key is outdated:
      Broadcast the most new latest key.
    Else
      Ask a peer to transfer the blocks after that key.
  */
  async _scout(){
    var latestKey = await this.database.read("/latest");
    Log.out("Crawler latestKey: ", latestKey);
    this.transport.broadcast(PROTOCOLS_QUERY_LATEST_KEY, latestKey);
  }

  fillProtocols(){
    this.transport.addProtocol(PROTOCOLS_QUERY_LATEST_KEY, async (msg)=>{
      console.log("Crawler receives msg: ", msg);
    })
  }

  stop(){
    clearInterval(this.worker);
  }
}
module.exports = Crawler;
