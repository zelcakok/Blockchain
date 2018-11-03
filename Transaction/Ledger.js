var Log = null;

class Ledger {
  constructor(database, logger){
    Log = logger;
    this.database = database;
  }

  process(trans){
    console.log("\nNew Transaction: " + JSON.stringify(trans, null, 2) + "\n");
  }
}
module.exports = Ledger;
