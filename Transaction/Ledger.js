const Wallet = require("../Wallet/Wallet");

var instance = null;

class Ledger {
  constructor(database){
    this.database = database;
  }

  static getInstance(database){
    if(instance === null) instance = new Ledger(database);
    return instance;
  }

  process(trans){
    console.log("ADDR: ", Wallet.WALLET_IDENTITY.getBitcoinAddress(), trans.tarAddr);
    var isToMySelf = Wallet.WALLET_IDENTITY.getBitcoinAddress() === trans.tarAddr;
    console.log("To me ?? ", isToMySelf);
  }
}
module.exports = Ledger;