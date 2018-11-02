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

      if(parseInt(receivedLatest.key) > parseInt(latest.key)) {
        Log.out("The receivedLatest key is " + receivedLatest.key + " while I got " + latest.key);
        Log.out("I don't have the latest block, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_LATEST_KEY, latest.key, key);
      } else if (parseInt(receivedLatest.key) === parseInt(latest.key) && receivedLatest.hash !== latest.hash) {
        Log.out("I miss some blocks, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_BLOCKS, "", key);
      }
    })

    this.transport.addProtocol(PROTOCOLS_QUERY_LATEST_KEY, async (msg)=>{
      var latestKey = await this.database.read("/latest/key");
      Log.out("SEND the latest key to " + msg.ipAddr);
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      this.transport.sendViaKey(PROTOCOLS_ANSWER_LATEST_KEY, latestKey, key);
    });

    this.transport.addProtocol(PROTOCOLS_ANSWER_LATEST_KEY, async (msg)=>{
      var latestKey = msg.message;
      this.database.write("/latest/key", latestKey).then(()=>{
        Log.out("My latest key is updated:", latestKey);
      })
    });

    this.transport.addProtocol(PROTOCOLS_QUERY_BLOCKS, async (msg)=>{
      Log.out(msg.ipAddr, "is asking the blocks");
      var latestKey = await this.database.read("/latest/key");
      var blocks = await this.database.read("/blocks");
      var payload = JSON.stringify({key: latestKey, blocks: blocks});
      Log.out("SEND", payload, "to " + msg.ipAddr);
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      this.transport.sendViaKey(PROTOCOLS_ANSWER_BLOCKS, payload, key);
    });

    this.transport.addProtocol(PROTOCOLS_ANSWER_BLOCKS, async (msg)=>{
      Log.out(msg.ipAddr,"sends the blocks to me.");
      var latest = {key: null, hash: ""}
      var payload = JSON.parse(msg.message);
      latest.key = payload.key;
      var blocks = payload.blocks;
      Object.keys(blocks).map((key)=>latest.hash+=key);
      latest.hash = Cryptographic.sha256(latest.hash);
      console.log("BLK", blocks);
    });
  }

  stop(){
    clearInterval(this.worker);
  }
}
module.exports = Crawler;
