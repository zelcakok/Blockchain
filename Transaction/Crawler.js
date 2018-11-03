const Cryptographic = require("./Cryptographic");
const Transport = require("../Network/Transport");
const MinerManager = require("../Blocks/MinerManager");
const Ledger = require("./Ledger");

var Log = null;
const PROTOCOLS_BROADCAST_LATEST_KEY = Cryptographic.md5("&pbroadcastlatestkey");
const PROTOCOLS_QUERY_LATEST_KEY = Cryptographic.md5("&pquerylatestkey");
const PROTOCOLS_QUERY_BLOCKS = Cryptographic.md5("&pqueryblocks");
const PROTOCOLS_ANSWER_LATEST_KEY = Cryptographic.md5("&panswerlatestkey");
const PROTOCOLS_ANSWER_BLOCKS = Cryptographic.md5("&panswerblocks");
const PROTOCOLS_ANSWER_MISSING_BLOCKS = Cryptographic.md5("&panswermissingblocks");
const PROTOCOLS_WIPE_CANDIDATE = Cryptographic.md5("&pwipecandidate");

class Crawler {
  constructor(transport, database, interval, logger){
    Log = logger;
    this.transport = transport;
    this.database = database;
    this.worker = null;
    this.interval = interval;
    this.isTransportEnabled = false;
    this.minerMgr = MinerManager.getInstance();
    this.ledger = Ledger.getInstance(database);
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
    await this.enableTransport();
    this.transport.broadcast(PROTOCOLS_BROADCAST_LATEST_KEY, latest);
  }

  disableTransport(){
    this.isTransportEnabled = false;
  }

  async enableTransport(){
    await setTimeout(()=>{
      this.isTransportEnabled = true;
    }, 1000);
  }

  fillProtocols(){
    this.transport.addProtocol(PROTOCOLS_BROADCAST_LATEST_KEY, async (msg)=>{
      if(!this.isTransportEnabled) return;
      var receivedLatest = msg.message;
      var latest = await this.database.read("/latest");
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));

      if(parseInt(receivedLatest.key) > parseInt(latest.key)) {
        Log.out("The receivedLatest key is " + receivedLatest.key.substr(0,10)+"..." + " while I got " + latest.key.substr(0,10)+"...");
        Log.out("I don't have the latest block, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_LATEST_KEY, latest.key, key);
      } else if (parseInt(receivedLatest.key) === parseInt(latest.key) && receivedLatest.hash !== latest.hash) {
        console.log(receivedLatest.hash);
        console.log(latest.hash);
        Log.out("I miss some blocks, asking " + msg.ipAddr + "...");
        this.transport.sendViaKey(PROTOCOLS_QUERY_BLOCKS, "", key);
      }
    })

    this.transport.addProtocol(PROTOCOLS_QUERY_LATEST_KEY, async (msg)=>{
      if(!this.isTransportEnabled) return;
      var outdatedKey = msg.message;

      var latestKey = await this.database.read("/latest/key");
      Log.out("The blocks of " + msg.ipAddr + " is outdated, sending the missing blocks to it.");
      var blocks = await this.database.read("/blocks");
      var missingBlk = [];
      Object.keys(blocks).map((key)=>{if(key > outdatedKey) missingBlk.push(blocks[key])});

      var payload = {key: latestKey, blocks: missingBlk};
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      this.transport.sendViaKey(PROTOCOLS_ANSWER_MISSING_BLOCKS, payload, key);
    });

    this.transport.addProtocol(PROTOCOLS_ANSWER_MISSING_BLOCKS, async (msg)=>{
      Log.out(msg.ipAddr + " sent the missing blocks to me.");
      // this.stop();
      var payload = msg.message;
      var blocks = payload.blocks;
      var key = payload.key;
      this.database.maintenance((structure)=>{
        var latest = {key: key,hash: ""}
        Object.keys(blocks).map((key)=>structure.slot.blocks[key] = blocks[key])
        Object.keys(blocks).map((key)=>latest.hash+=key);

        console.log(Object.keys(blocks));

        latest.hash = Cryptographic.sha256(latest.hash);
        structure.slot.latest = latest;
        Log.out("PAMB: Defination is updated");
        structure.slot.blocks = blocks;
        Log.out("PAMB: Blocks are updated");
        // this.enableTransport();
      })
    })

    this.transport.addProtocol(PROTOCOLS_QUERY_BLOCKS, async (msg)=>{
      if(!this.isTransportEnabled) return;
      Log.out(msg.ipAddr, "is asking the blocks");
      var latestKey = await this.database.read("/latest/key");
      var blocks = await this.database.read("/blocks");
      var payload = {key: latestKey, blocks: blocks};
      var latestHash = await this.database.read("/latest/hash");
      Log.out("SEND blocks to " + msg.ipAddr + " blk hash: " + latestHash);
      var key = Cryptographic.md5((msg.ipAddr + msg.port).split(".").join(""));
      this.transport.sendViaKey(PROTOCOLS_ANSWER_BLOCKS, payload, key);
    });

    this.transport.addProtocol(PROTOCOLS_ANSWER_BLOCKS, async (msg)=>{
      // this.stop();
      Log.out(msg.ipAddr,"sends the blocks to me.");
      var payload = msg.message;
      var blocks = payload.blocks;
      var blockHash = "";
      Object.keys(blocks).map((key)=>blockHash+=key);
      var blockHash = Cryptographic.sha256(blockHash);
      var latest = await this.database.read("/latest");
      if(parseInt(latest.key)===parseInt(payload.key) && latest.hash === blockHash){
        Log.out("I already have the latest defination.");
        this.enableTransport();
        return;
      }
      latest.hash = blockHash;
      latest.key = payload.key;
      Log.out("Calculate the blk hash: " + latest.hash.substr(0,10)+"...");
      this.database.maintenance((structure)=>{
        structure.slot.latest = latest;
        Log.out("PAB: Defination is updated");
        structure.slot.blocks = blocks;
        Log.out("PAB: Blocks are updated");
        // this.enableTransport();
      })
    });


  }

  stop(){
    clearInterval(this.worker);
    this.disableTransport();
  }
}
module.exports = Crawler;
