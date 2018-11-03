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
    console.log(trans.payment);
    var isToMySelf = Wallet.WALLET_IDENTITY.getBitcoinAddress() === trans.payment;
    console.log("To me ?? ", isToMySelf);
  }
}
module.exports = Ledger;
