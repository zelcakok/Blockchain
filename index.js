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

// const MinerManager = require("./Blocks/MinerManager");
// var mgr = MinerManager.getInstance();
// console.log(mgr);
