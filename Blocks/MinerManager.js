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
  }

  static getInstance(logger){
    if(instance === null) instance = new MinerManager(logger);
    return instance;
  }

  assign(transKeys, block){
    var transKey = transKeys.join("#");
    console.log("MinerMgr new key", transKey);
    this.miners[transKey] = spawn(PROOF_OF_WORK);
    this.miners[transKey].send(block).on("message", (block)=>{
      this.result[transKey] = block;
      this.emit("onMined", transKey, block);
    })
  }

  dismiss(transKey){
    if(Object.keys(this.miners).includes(transKey)) {
      this.miners[transKey].kill();
      Log.out("Miner on " + transKey + " is dismissed");
    }
  }
}

module.exports = MinerManager;
