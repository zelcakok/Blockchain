const DB = require("./DB");
const Beacon = require('./Beacon');
const Transport = require("./Transport");

//Keep broadcasting the beacon signal for updating the Peers.

var db = new DB("./db.data");
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
