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
    var keys = Object.keys(this.miners);
    console.log(keys.includes(keys));
  }
}

module.exports = MinerManager;
