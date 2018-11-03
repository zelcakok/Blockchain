const Wallet = require("./Wallet/Wallet");

async function Main(){
  console.clear();
  var wallet = await new Wallet("./.zetabase.json", 3049, 3000, 8080, false);
  console.log("".padEnd(3)+"Wallet is starting, please wait...");
  setTimeout(function () {
    wallet.startShell();
  }, 2000);
}

Main();


// const moment = require("moment");
// const Block = require("./Blocks/Block");
// const MinerManager = require("./Blocks/MinerManager");
//
// function genBLK(){
//   var transaction = {
//     key: moment().valueOf().toString(),
//     scriptSig: {
//       sig: "SDKLFJSDLKFJSDL:KJ",
//       pubKey: "pubKey"
//     },
//     payment: "LKSDJFLSKDJFLSKDFJ",
//     scriptPubKey: "LSKDJFLSKDJFSLKDJF"
//   }
//   var blk = new Block("PREVHASH", transaction);
//   blk.setDifficulty(6);
//   return {key: transaction.key, blk: blk};
// }
//
// var minerMgr = new MinerManager();
// minerMgr.on("onMined", (transKey, block)=>{
//   console.log(transKey, "=>", block);
//   process.exit(0)
// })
//
// var task = genBLK();
//
// minerMgr.assign(task.key, task.blk);
