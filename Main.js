const Zetabase = require("./Zetabase");
const Beacon = require("./Beacon");
const Transport = require("./Transport");
const NetAddr = require("network-address");
const Crypto = require("crypto");
const Log = require("./Log");
const IO = require("./IO");
const Shell = require('./Shell');
const Entry = require("./Entry");

class Blockchain {
  constructor(dbPath, beaconSignalPort, transportPort, verbose){
    this.shell = new Shell(IO);
    Log.setVerbose(verbose);
    // Log.bind(this.shell);
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
          Log.d("Connection is established to peer", peer.ipAddr+":"+peer.port);
          // this.transport.sendViaKey("MSG", "This is " + NetAddr(), key)
          // this.db.sortKey("/peers");
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
      MSG: (msg)=>Transport.dePacket(msg)
    }
    this.register(this.beacon.getSelfMsg());
    this.setMonitors();
    this.transport.listen(operations);
    this.broadcast();
  }

  startShell(operations){
    setTimeout(()=>{
      Log.out("Shell service is started.");
      this.shell.setOperation(operations);
      this.shell.prompt();
    }, 100);
  }
}

// Zetabase.removeDB("./.zetabase.json").then(()=>{
  // var db = new Zetabase("./.zetabase.json", Log);
  // db.write("/data/Students/koktshozelca", {name: "ZelcaKok", age:10}).then(()=>{
    // db.read("/data/Students").then((data)=>{
    //   Object.keys(data).map((key)=>{
    //     var entry = Entry.parse(data[key]);
    //     console.log(entry);
    //   })
    // })
  // })
// });

Zetabase.removeDB("./.zetabase.json").then(()=>{
  var blockchain = new Blockchain("./.zetabase.json", 3049, 3000, false);
  // var opts = {
  //   gitpull: ()=>Shell.system("git pull"),
  //   gitpush: ()=>Shell.system("gitpush")
  // }
  // blockchain.startShell(opts);
})
