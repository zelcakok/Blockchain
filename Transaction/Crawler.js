const Cryptographic = require("./Cryptographic");
const Transport = require("../Network/Transport");

var Log = null;
const PROTOCOLS_BROADCAST_LATEST_KEY = Cryptographic.md5("&pbroadcastlatestkey");
const PROTOCOLS_QUERY_LATEST_KEY = Cryptographic.md5("&pquerylatestkey");
const PROTOCOLS_QUERY_BLOCKS = Cryptographic.md5("&pqueryblocks");
const PROTOCOLS_ANSWER_LATEST_KEY = Cryptographic.md5("&panswerlatestkey");
const PROTOCOLS_ANSWER_BLOCKS = Cryptographic.md5("&panswerblocks");

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
    await this.database.write("/latest/hash", latest.hash);

    latest.key = await this.database.read("/latest/key");
    this.transport.broadcast(PROTOCOLS_BROADCAST_LATEST_KEY, latest);
  }

  fillProtocols(){
    this.transport.addProtocol(PROTOCOLS_BROADCAST_LATEST_KEY, async (msg)=>{
      var receivedLatest = msg.message;
      var latest = await this.database.read("/latest");
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));

      if(receivedLatest.key > latest.key) {
        console.log("The receivedLatest key is " + receivedLatest.key);
        console.log("I don't have the latest block, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_LATEST_KEY, latest.key, key);
      } else if (receivedLatest.hash !== latest.hash) {
        console.log("I miss some blocks, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_BLOCKS, "", key);
      }
    })

    this.transport.addProtocol(PROTOCOLS_ANSWER_LATEST_KEY, async (msg)=>{
      var blocks = await this.database.read("/blocks");
      var sendBlks = [];
      Object.keys(blocks).map((key)=>sendBlks.push(blocks[key]));
      console.log("SEND",sendBlks, "to " + msg.ipAddr);
      // var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      // this.transport.sendViaKey(PROTOCOLS_ANSWER_LATEST_KEY, , key);
    });

    this.transport.addProtocol(PROTOCOLS_QUERY_BLOCKS, async (msg)=>{
      // var blocks = JSON.stringify(await this.database.read("/blocks"));
      // var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      // this.transport.sendViaKey(PROTOCOLS_ANSWER_BLOCKS, blocks, key);
    });
  }

  stop(){
    clearInterval(this.worker);
  }
}
module.exports = Crawler;
