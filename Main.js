const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");

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
        console.log("New peer", key);
        this.transport.connect(key, peer.ipAddr, peer.port).then((id)=>{
          console.log("Connected to ", peer.ipAddr, "on", peer.port);
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

  reconnect(){
    this.db.getStructure().then((structure)=>{
      // console.log(structure.peers);
    })
  }

  initialize(){
    var operations = {
      "MSG": (msg)=>console.log("Receive: ", msg)
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
    this.reconnect();
  }

}

var blockchain = new Blockchain("./.zetabase.db", 36490, 3000);


//Keep broadcasting the beacon signal for updating the Peers.

// var zetabase = new Zetabase("./zetabase.db");

// zetabase.monitor("/peers", (value)=>console.log("new client found: ", value));





// var transport = new Transport();
// transport.startServer();

// var b = new Beacon(15011, 3000, (msg)=>{
//   console.log("R: ", msg);
// });
// b.listen();
// b.broadcast(1000);

// var trans = new Transport(3000);
// trans.listen()
// trans.connect("localhost", 3000).then((id)=>{
//   console.log("ID: ", id);
// })
