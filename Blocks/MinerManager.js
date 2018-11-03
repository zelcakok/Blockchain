const threads = require("threads");
const spawn = threads.spawn;

const PROOF_OF_WORK = "./Blocks/Worker.js";
const EventEmitter = require("events");

var instance = null;

class MinerManager extends EventEmitter{
  constructor(){
    super();
    this.result = [];
    this.miners = [];
  }

  static getInstance(){
    if(instance === null) instance = new MinerManager();
    return instance;
  }

  assign(transKey, block){
    this.miners[transKey] = spawn(PROOF_OF_WORK);
    this.miners[transKey].send(block).on("message", (block)=>{
      this.result[transKey] = block;
      this.emit("onMined", transKey, block);
    })
    this.miners[transKey].kill();
  }

  dismiss(transKey){
    if(Object.keys(this.miners).includes(transKey) >= 0) {
      this.miners[transKey].kill();
      console.log("Miner on " + transKey + " is dismissed.");
    }
  }
}

module.exports = MinerManager;
