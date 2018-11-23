const Wallet = require("./Wallet/Wallet");

/*
  Wallet

  5000 ==> beacon signal
  5001 ==> transport
  5002 ==> web service
*/

async function Main(){
  console.clear();
  var wallet = await new Wallet("./.zetabase.json", 5000, 5001, 5002, false);
  console.log("".padEnd(3)+"Wallet is starting, please wait...");
  setTimeout(function () {
    wallet.startShell();
  }, 2000);
}

Main();
