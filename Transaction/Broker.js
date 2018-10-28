const Wallet = require("../Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");

const PROTOCOLS_TRANSACTION = Cryptographic.md5("&ptrans;");

var Log = null;

class Broker {
  constructor(wallet, logger){
    Log = logger;
    this.wallet = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.wallet.transport.addProtocol(PROTOCOLS_TRANSACTION, (msg)=>{
      Log.out("Transaction generated by", msg.ipAddr, msg.port);
      var trans = JSON.parse(msg.message);
      var scriptSig = trans.scriptSig;
      var payment = trans.payment;
      var scriptPubKey = trans.scriptPubKey;
      Log.out(scriptSig);
      Log.out(payment);
      Log.out(scriptPubKey);
    })
    var pay = {
      Desc: "[email address]".padEnd(20) + "Pay to other user.",
      func: (...param)=> {
        var tarAddr = param[1];
        var amount = param[2];
        this.createPayment(tarAddr, amount);
      }
    }
    this.wallet.shell.addOperation("pay", pay);
  }

  async createPayment(tarAddr, amount){
    tarAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
    console.log(tarAddr);
    console.log(Cryptographic.base58Decode(tarAddr).toString(16));

    var payment = new Payment(null, tarAddr, amount);
    var sig = await Wallet.WALLET_IDENTITY.sign(payment);
    var transaction = {
      scriptSig: {
        sig: sig,
        pubKey: Wallet.WALLET_IDENTITY.getPublicKey()
      },
      payment: payment,
      scriptPubKey: Cryptographic.base58Decode(tarAddr).toString(16)
    }
    transaction = JSON.stringify(transaction);
    this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
  }
}

module.exports = Broker;
