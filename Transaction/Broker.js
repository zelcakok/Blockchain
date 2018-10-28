const PROTOCOLS_TRANSACTION = "&ptrans;";

const Wallet = require("../Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");

class Broker {
  constructor(wallet){
    this.wallet = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.wallet.transport.addProtocol(PROTOCOLS_TRANSACTION, (msg)=>{
      console.log("TRNAS: ", msg);
    })
  }

  async createPayment(tarAddr, amount){
    tarAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
    console.log(tarAddr);

    var payment = new Payment(null, tarAddr, amount);
    var sig = await Wallet.WALLET_IDENTITY.sign(payment);
    var transaction = {
      scriptSig: {
        sig: sig,
        pubKey: Wallet.WALLET_IDENTITY.getPublicKey()
      },
      payment: payment,
      scriptPubKey: Cryptographic.base58Decode(tarAddr)
    }
    transaction = JSON.stringify(transaction);
    this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
  }
}

module.exports = Broker;
