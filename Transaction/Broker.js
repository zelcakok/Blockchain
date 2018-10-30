const moment = require("moment");
const Wallet = require("../Wallet/Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Transaction = require("./Payment");
const Block = require("../Blocks/Block");

const PROTOCOLS_TRANSACTION = Cryptographic.md5("&ptrans;");

var Log = null;

class Broker {
  constructor(wallet, logger){
    Log = logger;
    this.wallet = wallet;
    this.fillProtocols();
  }

  fillProtocols(){
    this.fillTransportProtocols();
    this.fillShellProtocols();
    this.fillDBProtocols();
  }

  fillDBProtocols(){
    this.wallet.db.monitor("/blocks", async (newBlk)=>{
      var isTransExist = await this.wallet.db.containsKey("/candidates/"+newBlk.payload.key);
      if(isTransExist) {
        this.wallet.db.wipe("/candidates/"+newBlk.payload.key);
      }
    });
  }

  fillTransportProtocols(){
    this.wallet.transport.addProtocol(PROTOCOLS_TRANSACTION, async (msg)=>{
      var trans = msg.message;
      var scriptSig = trans.scriptSig;
      var payment = trans.payment;

      var isTransExist = await this.wallet.db.containsKey("/candidates/"+trans.key);
      if(!isTransExist){
        var verification = await Payment.verify(scriptSig.pubKey, scriptSig.sig, payment);
        Log.out("New transaction comes, verification: ", verification);
        if(verification) {
          Log.out("The transaction is valid, forwarding to peers.");
          this.negotiate(trans);

          Log.out("Start mining the new block");
          var blocks = await this.wallet.db.read("/blocks/GENESIS");
          var newBlk = new Block(blocks.hash, trans);
          newBlk.setDifficulty(4);
          await Block.mining(newBlk);

          this.wallet.db.write("/blocks/"+trans.key, newBlk).then(()=>{
            Log.out("A new block is added to /blocks");
          })

        } else {
          Log.out("Drop the invalid transaction.");
        }
      } else {
        Log.out("The transaction is exist in database.");
      }
    })
  }

  fillShellProtocols(){
    var pay = {
      Desc: "[Wallet Address]".padEnd(20) + "Transfer money to others.",
      func: (...param)=> {
        if(!this.wallet.shell.isLoggedIn()) return Log.out("Error: Please login first.");
        if(param.length < 2) return Log.out("Please specify the target address and the amount.");
        var tarAddr = param[1];
        var amount = param[2];
        if(tarAddr === Wallet.WALLET_IDENTITY.getBitcoinAddress())
          Log.out("Cannot transfer money to yourself.");
        else
          this.createPayment(tarAddr, amount);
      }
    }
    this.wallet.shell.addOperation("pay", pay);

    var resetWallet = {
      Desc: "NULL".padEnd(20) + "Reset to default.",
      func: async ()=>{
        await this.wallet.shell.logout();
        await this.wallet.emergency();
      }
    }

    this.wallet.shell.addOperation("resetWallet", resetWallet);
  }

  async createPayment(tarAddr, amount){
    tarAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
    var payment = new Payment(null, tarAddr, amount);
    var sig = await Wallet.WALLET_IDENTITY.sign(payment);

    var transaction = {
      key: Cryptographic.encryptTimestamp(moment().valueOf()),
      scriptSig: {
        sig: sig,
        pubKey: Wallet.WALLET_IDENTITY.getPublicKey()
      },
      payment: payment,
      scriptPubKey: Cryptographic.base58Decode(tarAddr).toString(16)
    }

    this.wallet.db.write("/candidates/"+transaction.key, transaction).then(()=>{
      Log.out("Tranaction", transaction.payment.id, "is added to /candidates");
      this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
    });
  }

  negotiate(transaction){
    this.wallet.db.write("/candidates/"+transaction.key, transaction).then(()=>{
      this.wallet.transport.broadcast(PROTOCOLS_TRANSACTION, transaction);
    })
  }
}

module.exports = Broker;
