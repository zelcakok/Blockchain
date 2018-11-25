const threads = require("threads");
const spawn = threads.spawn;

const Wallet = require("../Wallet/Wallet");
const Ledger = require("./Ledger");

const BOOKKEEPING = "./Transaction/BookKeeping.js";
const EventEmitter = require("events");

var Log = null;
var instance = null;

class Accountant extends EventEmitter {
  constructor(database, logger){
    super();
    Log = logger;
    this.database = database;
    this.ledger = Ledger.getInstance(Wallet.WALLET_IDENTITY.getBitcoinAddress());
  }

  static getInstance(database, logger){
    if(instance === null) instance = new Accountant(database, logger);
    return instance;
  }

  async bookKeeping(){
    var blocks = await this.database.read("/blocks", false);
    var task = spawn(BOOKKEEPING);
    task.send(blocks, this.ledger.lastBlockID).on("message", (payments)=>{
      task.kill();
      for(var i in payments)
        this.ledger.addPayment(payments[i]);
    })
  }
}
module.exports = Accountant;
