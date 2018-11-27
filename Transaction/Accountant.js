const threads = require("threads");
const spawn = threads.spawn;

const moment = require("moment");
const Wallet = require("../Wallet/Wallet");
const Ledger = require("./Ledger");

const BOOKKEEPING = "./Transaction/BookKeeping.js";
const EventEmitter = require("events");

const AddressBook = require("../OAuth/AddressBook");

var Log = null;
var instance = null;

class Accountant extends EventEmitter {
  constructor(database, logger){
    super();
    Log = logger;
    this.database = database;
    this.ledger = Ledger.getInstance(Wallet.WALLET_IDENTITY.getBitcoinAddress());
    this.addressBook = null;
    this.bookKeeping();
  }

  async getAddressBook(){
    if(this.addressBook === null)
      this.addressBook = await AddressBook.getInstance();
    return this.addressBook.addressBook;
  }

  static getInstance(database, logger){
    if(instance === null) instance = new Accountant(database, logger);
    return instance;
  }

  async bookKeeping(){
    var addressBook = await this.getAddressBook();
    var blocks = await this.database.read("/blocks", false);
    var task = spawn(BOOKKEEPING);

    var param = {
      blocks: blocks,
      addressBook: addressBook,
      lastBlockID: this.ledger.lastBlockID
    }

    task.send(param).on("message", (result)=>{
      task.kill();
      var payments = result.payments;
      for(var i in payments)
        this.ledger.addPayment(payments[i]);
      this.ledger.lastBlockID = result.lastBlockID;
      this.ledger.lastUpdate = moment().valueOf();
    })
  }
}
module.exports = Accountant;
