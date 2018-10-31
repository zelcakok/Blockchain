const Cryptographic = require("./Cryptographic");
const Transport = require("../Network/Transport");

var Log = null;
const PROTOCOLS_QUERY_LATEST_KEY = Cryptographic.md5("&pquerylatestkey");
const PROTOCOLS_ANSWER_LATEST_KEY = Cryptographic.md5("&panswerlatestkey");

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
    return (this.worker = setInterval(()=>this._scout(), this.interval));
  }

  /*
    Broadcast the latest key.
    If the received latest key is outdated:
      Broadcast the most new latest key.
    Else
      Ask a peer to transfer the blocks after that key.
  */
  async _scout(){
    var latest = {key: null, hash: ""}
    var blocks = await this.database.read("/blocks");
    Object.keys(blocks).map((key)=>latest.hash+=key);
    latest.hash = Cryptographic.sha256(latest.hash);

    latest.key = await this.database.read("/latest/key");
    this.transport.broadcast(PROTOCOLS_QUERY_LATEST_KEY, latest);
  }

  fillProtocols(){
    this.transport.addProtocol(PROTOCOLS_QUERY_LATEST_KEY, async (msg)=>{
      var receivedLatest = msg.message;
      var latest = await this.database.read("/latest");

      console.log("RECEIVE: ", receivedLatest);
      console.log("Latest:", latest);

      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      this.transport.sendViaKey(PROTOCOLS_ANSWER_LATEST_KEY, "ANSWER KEY", key);
    })

    this.transport.addProtocol(PROTOCOLS_ANSWER_LATEST_KEY, async (msg)=>{
      Transport.dePacket(msg);
    });
  }

  stop(){
    clearInterval(this.worker);
  }
}
module.exports = Crawler;
