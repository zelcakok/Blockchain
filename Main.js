const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");
const IO = require("./IO");
const Shell = require('./Shell');
const Entry = require("./Entry");
const Web = require("./Web");

class Blockchain {
  constructor(dbPath, beaconSignalPort, transportPort, webPort, verbose){
    this.shell = new Shell(IO);
    Log.setVerbose(verbose);
    // Log.bind(this.shell);
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
          setInterval(()=>{
            this.transport.sendViaKey("WRITE", "This is " + NetAddr(), key)
          }, 5000);
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
    var operations = {
      MSG: (msg)=>Transport.dePacket(msg),
      WRITE: (data)=>Transport.execute(this.db, "append", "/data", data)
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
    this.web.listen(this);
  }

  startShell(operations){
    setTimeout(()=>{
      Log.out("Shell service is started.");
      this.shell.setOperation(operations);
      this.shell.prompt();
    }, 100);
  }
}

Zetabase.removeDB("./.zetabase.json").then(()=>{
  var blockchain = new Blockchain("./.zetabase.json", 3049, 3000, 8080, false);
})
