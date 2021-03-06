const Zetabase = require("../Database/Zetabase");
const Entry = require("../Database/Entry");
const Beacon = require("../Network/Beacon");
const Transport = require("../Network/Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");
const Shell = require("../Shell/Shell");
const Web = require("../Web/WebServer");
const Broker = require("../Transaction/Broker");
const Crawler = require("../Transaction/Crawler");
const moment = require("moment");
var WALLET_IDENTITY = null;

class Wallet {
  constructor(dbPath, beaconSignalPort, transportPort, webPort, verbose){
    this.ipAddr = NetAddr();
    this.sysHealth = true;
    this.db = new Zetabase(dbPath, Log, this, 10); //10 is for the changes threshold.
    this.beacon = new Beacon(beaconSignalPort, transportPort, Log);
    this.transport = new Transport(transportPort, Log);
    this.web = new Web(webPort,this, Log);
    this.broker = new Broker(this, Log);
    this.crawler = new Crawler(this.transport, this.db, 5000, Log);
    this.shell = new Shell(this, this.broker, Log);
    Log.setVerbose(verbose);
    Log.bind(this.shell);
    this.initialize()
  }

  getLedger(){
    return this.broker.ledger();
  }

  broadcast(){
    this.beacon.setAction((signal)=>{
      var msg = JSON.parse(signal);
      if(msg.message === Zetabase.hash("BLK_Client", "md5"))
        this.register(signal);
    })
    this.beacon.listen();
    this.beacon.broadcast(10000);
  }

  setMonitors(){
    this.db.monitor("/peers", (peer)=>{
      if(Zetabase.isWipe(peer)) return;
      peer = JSON.parse(peer);
      var key = Zetabase.hash((peer.ipAddr + peer.port).split(".").join(""), 'md5');
      if(peer.ipAddr !== this.ipAddr) {
        this.transport.connect(key, peer.ipAddr, peer.port).then((socket)=>{
          Log.d("Connection is established to peer", peer.ipAddr+":"+peer.port);
        })
      }
    })
  }

  isOffline(curTime, timestamp){
    return moment.duration(curTime.diff(timestamp)).asMinutes() >= 1;
  }

  async removeOffline(){
    var curTime = moment();
    var wipeList = [];
    var peers = await this.db.read("/peers");
    Object.keys(peers).map((key)=>{
      if(this.isOffline(curTime, JSON.parse(peers[key]).timestamp))
        this.db.wipe("/peers/" + key);
    })
  }

  async register(beaconInfo){
    var info = JSON.parse(beaconInfo);
    var key = Zetabase.hash((info.ipAddr + info.port).split(".").join(""), 'md5');
    delete info.message;
    beaconInfo = JSON.stringify(info);
    // var isExist = await this.db.containsKey("/peers/" + key);
    // if(!isExist) this.db.write("/peers/"+key, beaconInfo);
    this.db.write("/peers/"+key, beaconInfo);
  }

  enableWebService(){
    this.web.listen(this);
  }

  initialize(){
    // this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen();
    this.broadcast();
    // this.web.listen(this);
    setTimeout(()=>{
      this.crawler.scout(); //Delay 500 milliseconds to start
    }, 500);
    setInterval(()=>{
      this.removeOffline()
    }, 1000 * 60 * 5); //Wipe the offline users.
  }

  resetDatabase(){
    this.db.wipe("/");
  }

  startShell(){
    this.shell.prompt();
  }

  async emergency(){
    try{
      clearInterval(this.shell.io.msgControl);
      var ans = await this.shell.io.ask("EMERGENCY", "Do you want to wipe the whole database now [y/N]");
      if(Object.keys(ans).includes("EMERGENCY") && ans.EMERGENCY.toUpperCase() === "Y") {
        await Zetabase.removeDB("./.zetabase.json");
        console.log("Database is wiped.");
      }
    } catch(err){
      console.log(err);
    } finally {
      console.log("Wallet exit");
      process.exit(1);
    }
  }
}

module.exports = Wallet;
