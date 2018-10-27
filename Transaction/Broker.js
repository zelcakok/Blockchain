const PROTOCOLS_TRANSACTION = "&ptrans;";

const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");

class Broker {
  constructor(wallet){
    console.log(PROTOCOLS_TRANSACTION);
    this.account = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.account.transport.addProtocol(PROTOCOLS_TRANSACTION, (msg)=>{
      console.log("TRNAS: ", msg);
    })
  }

  async createPayment(tarAddr, amount){
    var payment = new Payment(null, tarAddr, amount);
    var sig = await this.account.identity.sign(payment);
    var transaction = {
      scriptSig: {
        sig: sig,
        pubKey: this.account.identity.getPublicKey()
      },
      payment: payment,
      scriptPubKey: Cryptographic.base58Decode(tarAddr)
    }
    this.account.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
  }
}

module.exports = Broker;
