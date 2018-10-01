const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");

class Blockchain {
  constructor(dbPath, beaconSignalPort, transportPort){
    this.db = new Zetabase(dbPath);
    this.beacon = new Beacon(beaconSignalPort, transportPort);
    this.transport = new Transport(transportPort);
    this.initialize(transportPort);
  }

  broadcast(){
    this.beacon.setAction((signal)=>{
      var msg = JSON.parse(signal);
      if(msg.message === "BLK_Client"){
        this.register(signal);
      }
    })
    this.beacon.listen();
    this.beacon.broadcast(1000);
  }

  setMonitors(){
    this.db.monitor("/peers", (peer)=>{
      peer = JSON.parse(peer);
      var key = Zetabase.hash((peer.ipAddr + peer.port).split(".").join(""), 'md5');
      if(peer.ipAddr !== NetAddr()) {
        Log.d("New peer", key);
        this.transport.connect(key, peer.ipAddr, peer.port).then((socket)=>{
          Log.d("Connected to ", peer.ipAddr, "on", peer.port);
          Log.d("Start to exchange the peer information.");
          Log.d("Sending info to ID: ", socket.id);
          this.transport.sendViaSocket("MSG", "This is the message.", socket)
          // this.db.sortKey("/peers");
          // this.transport.send("[PEER]", )
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
      MSG: (msg)=>Log.d("Receive: ", msg)
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
  }

}
Zetabase.removeDB("./.zetabase.json").then(()=>{
  var blockchain = new Blockchain("./.zetabase.json", 3049, 3000);
})
