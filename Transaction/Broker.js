const moment = require("moment");
const Wallet = require("../Wallet/Wallet");
const Cryptographic = require("./Cryptographic");
const Payment = require("./Payment");
const Transaction = require("./Payment");
const Block = require("../Blocks/Block");
const Zetabase = require("../Database/Zetabase");
const MinerManager = require("../Blocks/MinerManager");
const Accountant = require("./Accountant");

const PROTOCOLS_NEW_PENDING_TRANSACTION = Cryptographic.md5("&pnewpendingtrans;");
const PROTOCOLS_NEW_BLOCK_ADDRESS = Cryptographic.md5("&pnewblkarr;");
const PROTOCOLS_LATEST_TIMESTAMP = Cryptographic.md5("&ptimestamp;");
const PROTOCOLS_WIPE_CANDIDATE = Cryptographic.md5("&pwipecandidate;");

const threads = require("threads");
const spawn = threads.spawn;
const SELECT_CANDIDATES = "./Transaction/SelectCandidates.js";

var SELECT_CANDIDATES_TIME_RANGE = 5;
var SELECT_CANDIDATES_INTERVAL_SECOND = 60;
var Log = null;

class Broker {
  constructor(wallet, logger, timeRange = 5, intervalSecond = 60){
    Log = logger;
    this.pendingCandidate = 0;
    this.wallet = wallet;
    this.minerMgr = MinerManager.getInstance(Log);
    SELECT_CANDIDATES_TIME_RANGE = timeRange;
    SELECT_CANDIDATES_INTERVAL_SECOND = intervalSecond;
    this.fillProtocols();
  }

  /*
    Selection of candidate

    1. Grab the first candidate key.
    2. Decrypt candidate key ==> timestamp.
    3. Add threshold ==> targetRange_timestamp.
    4. Encrypt targetRange_timestamp ==> target_candidate_key.
    5. Candidate with key <= target_candidate_key will be selected.
  */
  async selectCandidateService(){
    var candidates = await this.wallet.db.read("/candidates");
    this.pendingCandidate = Object.keys(candidates).length;

    if(this.pendingCandidate < 1) {
      setTimeout(()=>{
        this.selectCandidateService();
      }, 1000 * SELECT_CANDIDATES_INTERVAL_SECOND);
      return;
    }

    var param = {
      candidates: candidates,
      timeRange: SELECT_CANDIDATES_TIME_RANGE
    }

    var task = spawn(SELECT_CANDIDATES);
    task.send(param).on("message", (param)=>{
      task.kill();
      this.prepareMining(param.selection, param.transKeys);
      this.pendingCandidate = 0;
      setTimeout(()=>{
        this.selectCandidateService();
      }, 1000 * SELECT_CANDIDATES_INTERVAL_SECOND);
    })
  }

  async prepareMining(selection, transKeys){
    var prevHash = await this.getLatestBlockHash();
    var newBlk = new Block(prevHash, selection);
    Log.out("Start mining, refer to prevHash " + prevHash.substr(0,10)+"...");
    this.minerMgr.assign(transKeys, newBlk);
  }

  enableSelectionService(){
    this.selectCandidateService();
    Log.out("Mining service is started");
  }

  enableAccountant(){
    this.accountant = Accountant.getInstance(this.wallet.db, Log);
    this.accountant.on("onLedgerUpdate", (ledger)=>{
      console.log(ledger);
    })
    setInterval(()=>{
      this.accountant.bookKeeping();
    }, 1000 * 10);
    Log.out("Accounting service is started");
  }

  ledger(){
    return this.accountant.ledger.balance();
  }

  fillProtocols(){
    this.fillTransportProtocols();
    this.fillDBProtocols();
    this.minerMgr.on("onMined", (transKey, block)=>{
      var transKeys = transKey.split("#");
      var lastTransKeys = transKeys[transKeys.length-1];
      var shortKeys = [];
      for(var i=0; i<transKeys.length; i++)
        shortKeys.push(transKeys[i].substr(0,10)+"...");
      Log.out("Block is mined for tranaction: " + shortKeys.join(", ") + " forward to peers.");

      this.wallet.transport.broadcast(PROTOCOLS_NEW_BLOCK_ADDRESS, transKey);

      //Remove candidates
      for(var i=0; i<transKeys.length; i++)
        this.eliminate(PROTOCOLS_WIPE_CANDIDATE, "/candidates/"+transKeys[i]);

      this.propagate(PROTOCOLS_LATEST_TIMESTAMP, "/latest/key", lastTransKeys);

      this.wallet.db.write("/blocks/"+lastTransKeys, block);
    })
  }

  //Add more trans here
  fillDBProtocols(){
    this.wallet.db.monitor("/candidates", async (trans)=>{
      if(Zetabase.isWipe(trans)) return;
      Log.out("Tranaction: " + trans.key.substr(0,10)+"..." + " is added /candidate.");
      this.pendingCandidate++;
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

  async createPayment(payerAddr, payeeAddr, amount){
    // payerAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
    var payment = new Payment(payerAddr, payeeAddr, amount);
    var sig = await Wallet.WALLET_IDENTITY.sign(payment);
    var transaction = {
      key: Cryptographic.encryptTimestamp(moment().valueOf()),
      scriptSig: {
        sig: sig,
        pubKey: Wallet.WALLET_IDENTITY.getPublicKey()
      },
      payment: payment,
      scriptPubKey: Cryptographic.base58Decode(payeeAddr).toString(16)
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
