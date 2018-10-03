const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");

class Blockchain {
  constructor(dbPath, beaconSignalPort, transportPort, verbose){
    Log.setVerbose(verbose);
    this.db = new Zetabase(dbPath, Log);
    this.beacon = new Beacon(beaconSignalPort, transportPort, Log);
    this.transport = new Transport(transportPort, Log);
    this.initialize(transportPort);
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
          // this.transport.sendViaSocket("MSG", "This is " + NetAddr(), socket)
          this.transport.sendViaKey("MSG", "This is " + NetAddr(), key)



        })
      }
    })
  }

  register(beaconInfo){
    var info = JSON.parse(beaconInfo);
    var key = Zetabase.hash((info.ipAddr + info.port).split(".").join(""), 'md5');
    this.db.containsKey("/peers/" + key).then((res)=>{
      if(!res) {
        this.db.write("/peers/"+key, beaconInfo);
      }
    });
  }

  initialize(){
    var operations = {
      MSG: (msg)=>console.log("Incoming message: ", msg)
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
  }

}
Zetabase.removeDB("./.zetabase.json").then(()=>{
  var blockchain = new Blockchain("./.zetabase.json", 3049, 3000, false);
})
