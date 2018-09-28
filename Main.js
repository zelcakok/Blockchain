const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");

class Blockchain {
  constructor(dbPath, beaconSignalPort, transportPort){
    this.db = new Zetabase(dbPath);
    this.beacon = new Beacon(beaconSignalPort, transportPort);
    this.transport = new Transport(transportPort);
    this.initialize();
  }

  broadcast(){
    this.beacon.setAction((signal)=>{
      var msg = JSON.parse(signal);
      console.log("Received: ", signal)
    })
    this.beacon.listen();
    this.beacon.broadcast(1000);
  }

  initialize(){
    var operations = {
      "MSG": (msg)=>console.log("Receive: ", msg)
    }
    this.transport.listen(operations);
    this.transport.connect("localhost", 3000).then((socketId)=>{
      this.db.write("/peers/"+socketId, this.beacon.getSelfMsg());
      this.db.getStructure().then((structure)=>console.log("Struct: ", structure))
    });
    this.broadcast();
  }

}

var blockchain = new Blockchain("./zetabase.db", 36490, 3000);


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
