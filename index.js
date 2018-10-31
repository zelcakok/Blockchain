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
// const Cryptographic = require("./Transaction/Cryptographic");
//
// var a = moment().valueOf();
// var b = moment().add(1,'year').valueOf();
//
// var ca = Cryptographic.encryptTimestamp(a);
// var cb = Cryptographic.encryptTimestamp(b);
//
// console.log(ca < cb);
