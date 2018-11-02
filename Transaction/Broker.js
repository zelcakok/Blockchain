const moment = require("moment");
const Wallet = require("../Wallet/Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Transaction = require("./Payment");
const Block = require("../Blocks/Block");
const Zetabase = require("../Database/Zetabase");

const PROTOCOLS_NEW_PENDING_TRANSACTION = Cryptographic.md5("&pnewpendingtrans;");
const PROTOCOLS_NEW_BLK = Cryptographic.md5("&pnewblk;");
const PROTOCOLS_LATEST_TIMESTAMP = Cryptographic.md5("&ptimestamp;");

var Log = null;

class Broker {
  constructor(wallet, logger){
    Log = logger;
    this.wallet = wallet;
    this.miners = []; //Use candidate key as key.
    this.fillProtocols();
  }

  fillProtocols(){
    this.fillTransportProtocols();
    this.fillShellProtocols();
    this.fillDBProtocols();
  }

  fillDBProtocols(){
    this.wallet.db.monitor("/candidates", async (trans)=>{
      if(Zetabase.isWipe(trans)) return;
      Log.out("Tranaction: " + trans.key + " is added /candidate.");
      var prevHash = await this.getLatestBlockHash();
      var newBlk = new Block(prevHash, trans);
      newBlk.setDifficulty(6);
      Log.out("Mining: " + trans.key + " refer to prevHash" + prevHash);
      Log.out("Difficulty is " + newBlk.target);
      Block.mining(newBlk, (newBlk)=>{
        newBlk.payload = JSON.parse(newBlk.payload);
        Log.out("Block is mined for tranaction: " + trans.key + " forward to peers.");
        this.propagate(PROTOCOLS_NEW_BLK, "/blocks/"+trans.key, newBlk);
        // Update the latest block timestamp
        this.propagate(PROTOCOLS_LATEST_TIMESTAMP, "/latest/key", trans.key);
      });
    });
  }

  fillTransportProtocols(){
    this.wallet.transport.addProtocol(PROTOCOLS_NEW_PENDING_TRANSACTION, async (msg)=>{
      var trans = msg.message;
      var scriptSig = trans.scriptSig;
      var payment = trans.payment;

      var isTransExist = await this.wallet.db.containsKey("/candidates/"+trans.key) ||
                         await this.wallet.db.containsKey("/blocks/"+trans.key);
      if(!isTransExist){
        var verification = await Payment.verify(scriptSig.pubKey, scriptSig.sig, payment);
        Log.out("New transaction comes, verification: ", verification);
        if(verification) {
          Log.out("Valid transaction: " + trans.key + " forward to peers.");
          this.propagate(PROTOCOLS_NEW_PENDING_TRANSACTION, "/candidates/"+trans.key, trans);
        } else {
          Log.out("Invalid transaction: " + trans.key);
        }
      } else {
        Log.out("Duplicate transaction: " + trans.key);
      }
    })

    this.wallet.transport.addProtocol(PROTOCOLS_LATEST_TIMESTAMP, async (msg)=>{
      var timestamp = msg.message;
      // console.log("The latest timestamp is ", timestamp);
    });
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
    this.propagate(PROTOCOLS_NEW_PENDING_TRANSACTION, "/candidates/"+transaction.key, transaction);
  }

  async getLatestBlockHash(){
    var latestTimestamp = await this.wallet.db.read("/latest/key");
    var latestBlk = await this.wallet.db.read("/blocks/"+latestTimestamp);
    latestBlk = JSON.parse(latestBlk);
    return latestBlk.hash;
  }

  propagate(protocol, key, payload){
    this.wallet.db.write(key, payload).then(()=>{
      this.wallet.transport.broadcast(protocol, payload);
    })
  }
}

module.exports = Broker;
