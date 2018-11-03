const threads = require("threads");
const spawn = threads.spawn;

const PROOF_OF_WORK = "./Blocks/Worker.js";

const EventEmitter = require("events");

class MinerManager extends EventEmitter{
  constructor(){
    super();
    this.miners = [];
  }

  assign(transKey, block){
    var miner = spawn(PROOF_OF_WORK);
    miner.send(block).on("message", (block)=>{
      this.miners[transKey] = block;
      this.emit("onMined", transKey, block);
    })
  }
}

module.exports = MinerManager;
