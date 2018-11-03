const Wallet = require("../Wallet/Wallet");

var Log = null;

class Ledger {
  constructor(database, logger){
    Log = logger;
    this.database = database;
  }

  process(trans){
    var isToMySelf = Wallet.WALLET_IDENTITY.getBitcoinAddress() === trans.tarAddr;
    console.log("To me ?? ", isToMySelf);
  }
}
module.exports = Ledger;
