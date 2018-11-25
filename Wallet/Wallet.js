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

var WALLET_IDENTITY = null;

class Wallet {
  constructor(dbPath, beaconSignalPort, transportPort, webPort, verbose){
    this.sysHealth = true;
    this.db = new Zetabase(dbPath, Log, this);
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

  broadcast(){
    this.beacon.setAction((signal)=>{
      var msg = JSON.parse(signal);
      if(msg.message === Zetabase.hash("BLK_Client", "md5"))
        this.register(signal);
    })
    this.beacon.listen();
    this.beacon.broadcast(1000);
  }

  setMonitors(){
    this.db.monitor("/peers", (peer)=>{
      peer = JSON.parse(peer);
      var key = Zetabase.hash((peer.ipAddr + peer.port).split(".").join(""), 'md5');
      if(peer.ipAddr !== NetAddr()) {
        this.transport.connect(key, peer.ipAddr, peer.port).then((socket)=>{
          Log.d("Connection is established to peer", peer.ipAddr+":"+peer.port);
        })
      }
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

  initialize(){
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen();
    this.broadcast();
    this.web.listen(this);
    setTimeout(()=>{
      this.crawler.scout();
    }, 500);
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
