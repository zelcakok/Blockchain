const express = require("express");
const pretty = require('express-prettify');

var Log = null;
class Web {
  constructor(serPort, blockchain, logger){
    Log = logger;
    this.serPort = serPort;
    this.server = express();
    this.blockchain = blockchain;
  }

  listen(){
    this.server.use(pretty({ query: 'pretty' }));
    this.server.use(express.static(__dirname+"/public"));
    this.server.use("/db", (req, res)=>{
      this.blockchain.db.getStructure().then((structure)=>{
        res.json(structure);
      })
    })

    this.server.listen(this.serPort, ()=>{
      Log.out("Web service is started", this.serPort);
    })
  }
}
module.exports = Web;
