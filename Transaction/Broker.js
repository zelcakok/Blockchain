const Wallet = require("../Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Transaction = require("./Payment");

const PROTOCOLS_TRANSACTION = Cryptographic.md5("&ptrans;");

var Log = null;

class Broker {
  constructor(wallet, logger){
    Log = logger;
    this.wallet = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.wallet.transport.addProtocol(PROTOCOLS_TRANSACTION, async (msg)=>{
      var trans = msg.message;
      var scriptSig = trans.scriptSig;
      var payment = trans.payment;

      var isTransExist = await this.wallet.db.containsKey("/blocks/"+payment.id);
      if(!isTransExist){
        var verification = await Payment.verify(scriptSig.pubKey, scriptSig.sig, payment);
        Log.out("New transaction comes, verification: ", verification);
        if(verification) {
          Log.out("Broadcasting the valid transaction.");
          this.negotiate(trans);
        } else {
          Log.out("Drop the invalid transaction.");
        }
      } else {
        Log.out("The transaction is exist in database.");
      }
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

    this.wallet.db.write("/blocks/"+transaction.payment.id, transaction).then(()=>{
      Log.out("Tranaction", transaction.payment.id, "is added to /blocks");
      this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
    });
  }

  negotiate(transaction){
    this.wallet.db.write("/blocks/"+transaction.payment.id, transaction).then(()=>{
      this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
    })
  }
}

module.exports = Broker;
