const Zetabase = require("./Database/Zetabase");
const Entry = require("./Database/Entry");
const Beacon = require("./Network/Beacon");
const Transport = require("./Network/Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");
const Shell = require("./Shell/Shell");
const Web = require("./Web/WebServer");
const Protocols = require("./Network/Protocols");

const protocols = new Protocols();
var identity = null;

class Wallet {
  constructor(dbPath, beaconSignalPort, transportPort, webPort, verbose){
    this.shell = new Shell();
    Log.setVerbose(verbose);
    Log.bind(this.shell);
    this.db = new Zetabase(dbPath, Log);
    this.beacon = new Beacon(beaconSignalPort, transportPort, Log);
    this.transport = new Transport(transportPort, Log);
    this.web = new Web(webPort,this, Log);
    this.initialize();
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
          // this.transport.sendViaKey("WRITE", "This is " + NetAddr(), key)
          // setInterval(()=>{
          //   this.transport.sendViaKey("WRITE", "This is " + NetAddr(), key)
          // }, 10000);
        })
      }
    })
  }

  register(beaconInfo){
    var info = JSON.parse(beaconInfo);
    var key = Zetabase.hash((info.ipAddr + info.port).split(".").join(""), 'md5');
    this.db.containsKey("/peers/" + key).then((res)=>{
      if(!res) this.db.write("/peers/"+key, beaconInfo);
    });
  }

  initialize(){
    var pTrans = protocols.TRANSACTION;
    var operations = {
      MSG: (msg)=>Transport.dePacket(msg),
      WRITE: (data)=>this.db.append("/data", data),
      pTrans : (trans)=>Transport.dePacket(trans),
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
    this.web.listen(this);
  }

  startShell(){
    this.shell.prompt();
  }
}



Zetabase.removeDB("./.zetabase.json").then(()=>{
  console.clear();
  var wallet = new Wallet("./.zetabase.json", 3049, 3000, 8080, false);

  var debug = {
    Desc: "NULL | DEBUG",
    func: ()=>{
      console.log("HELLO");
      wallet.transport.broadcast(protocols.TRANSACTION, "HEY Wallet !!!")
    }
  }
  wallet.shell.addOperation("debug", debug);
  wallet.startShell();
})
