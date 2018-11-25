const moment = require("moment");
const Wallet = require("../Wallet/Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Transaction = require("./Payment");
const Block = require("../Blocks/Block");
const Zetabase = require("../Database/Zetabase");
const MinerManager = require("../Blocks/MinerManager");
const Auditor = require("./Auditor");

const PROTOCOLS_NEW_PENDING_TRANSACTION = Cryptographic.md5("&pnewpendingtrans;");
const PROTOCOLS_NEW_BLOCK_ADDRESS = Cryptographic.md5("&pnewblkarr;");
const PROTOCOLS_LATEST_TIMESTAMP = Cryptographic.md5("&ptimestamp;");
const PROTOCOLS_WIPE_CANDIDATE = Cryptographic.md5("&pwipecandidate;");

var Log = null;

class Broker {
  constructor(wallet, logger){
    Log = logger;
    this.wallet = wallet;
    this.minerMgr = MinerManager.getInstance(Log);
    this.auditor = Auditor.getInstance(this.wallet.db);
    this.fillProtocols();
  }

  fillProtocols(){
    this.fillTransportProtocols();
    this.fillDBProtocols();
    this.minerMgr.on("onMined", (transKey, block)=>{
      Log.out("Block is mined for tranaction: " + transKey.substr(0,10)+"..." + " forward to peers.");
      this.wallet.transport.broadcast(PROTOCOLS_NEW_BLOCK_ADDRESS, transKey);

      this.eliminate(PROTOCOLS_WIPE_CANDIDATE, "/candidates/"+transKey);
      this.propagate(PROTOCOLS_LATEST_TIMESTAMP, "/latest/key", transKey);

      this.wallet.db.write("/blocks/"+transKey, block).then(()=>{
        this.auditor.audit();
      });
    })

    this.auditor.on("onLedgerUpdate", (ledger)=>{
      // console.log("Ledger: ", ledger);
    })
  }

  fillDBProtocols(){
    this.wallet.db.monitor("/candidates", async (trans)=>{
      if(Zetabase.isWipe(trans)) return;
      Log.out("Tranaction: " + trans.key.substr(0,10)+"..." + " is added /candidate.");
      var prevHash = await this.getLatestBlockHash();
      var newBlk = new Block(prevHash, trans);
      Log.out("Mining: " + trans.key.substr(0,10)+"..." + " refer to prevHash " + prevHash.substr(0,10)+"...");
      this.minerMgr.assign(trans.key, newBlk);
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
          Log.out("Valid transaction: " + trans.key.substr(0,10)+"..." + " forward to peers.");
          this.propagate(PROTOCOLS_NEW_PENDING_TRANSACTION, "/candidates/"+trans.key, trans);
        } else {
          Log.out("Invalid transaction: " + trans.key.substr(0,10)+"...");
        }
      } else {
        Log.out("Ignore transaction broadcast for : " + trans.key.substr(0,10)+"...");
      }
    })

    this.wallet.transport.addProtocol(PROTOCOLS_NEW_BLOCK_ADDRESS, async (msg)=>{
      this.minerMgr.dismiss(msg.message);
    });

    this.wallet.transport.addProtocol(PROTOCOLS_WIPE_CANDIDATE, async (msg)=>{
      this.wallet.db.wipe(msg.message);
    });
  }

  async createPayment(tarAddr, amount){
    tarAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
    var payment = new Payment(tarAddr, amount);
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
    this.wallet.transport.broadcast(protocol, payload);
    this.wallet.db.write(key, payload);
  }

  eliminate(protocol, key){
    this.wallet.transport.broadcast(protocol, key);
    this.wallet.db.wipe(key);
  }
}

module.exports = Broker;
