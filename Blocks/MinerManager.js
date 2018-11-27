const threads = require("threads");
const spawn = threads.spawn;

const PROOF_OF_WORK = "./Blocks/ProofOfWork.js";
const EventEmitter = require("events");

var Log = null;
var instance = null;

class MinerManager extends EventEmitter{
  constructor(logger){
    super();
    Log = logger;
    this.result = [];
    this.miners = [];
    this.miningTrans = null;
    this.isMining = false;
  }

  static getInstance(logger){
    if(instance === null) instance = new MinerManager(logger);
    return instance;
  }

  assign(transKeys, block, prevHash){
    var transKey = transKeys.join("#");
    if(this.isMining) return;
    this.isMining = true;
    this.miningTrans = block.payload;
    Log.out("Start mining, refer to prevHash " + prevHash.substr(0,10)+"...");
    this.miners[transKey] = spawn(PROOF_OF_WORK);
    this.miners[transKey].send(block).on("message", (block)=>{
      this.miningTrans = null;
      this.result[transKey] = block;
      this.emit("onMined", transKey, block);
      this.isMining = false;
    })
  }

  getMining() {
    return this.miningTrans;
  }

  dismiss(transKey){
    if(Object.keys(this.miners).includes(transKey)) {
      this.miningTrans = null;
      this.miners[transKey].kill();
      Log.out("Miner on " + transKey + " is dismissed");
    }
  }
}

module.exports = MinerManager;
