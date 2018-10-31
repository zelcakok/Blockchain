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

// const Cryptographic = require("./Transaction/Cryptographic");
// const moment = require("moment");
//
// var a = moment().valueOf();
// var b = moment().add(1, "hour").valueOf();
// var c = moment().add(2, "hour").valueOf();
//
// var ca = Cryptographic.encryptTimestamp(a);
// var cb = Cryptographic.encryptTimestamp(b);
// var cc = Cryptographic.encryptTimestamp(c);
//
// console.log(ca, Cryptographic.decryptTimestamp(ca));
// console.log(cb, Cryptographic.decryptTimestamp(cb));
// console.log(cc, Cryptographic.decryptTimestamp(cc));
//
// console.log(ca < cb, ca < cc, cb < cc);
