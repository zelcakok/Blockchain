const threads = require("threads");
const spawn = threads.spawn;

const AUDIT = "./Transaction/Audit.js";
const EventEmitter = require("events");
var instance = null;

class Auditor extends EventEmitter {
  constructor(database){
    this.database = database;
    this.ledger = null;
    this.task = spawn(AUDIT);
  }

  static getInstance(database){
    if(instance === null) instance = new Auditor(database);
    return instance;
  }

  async audit(){
    var blocks = await this.database.read("/blocks");
    this.task.send(blocks).on("message", (ledger)=>{
      this.ledger = ledger;
      this.emit("onLedgerUpdate", ledger);
    })
  }
}
module.exports = Auditor;
