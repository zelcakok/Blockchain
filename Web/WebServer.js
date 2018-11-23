const express = require("express");
const pretty = require('express-prettify');
const fs = require("fs");
const crypto = require("crypto");
const https = require("https");

const options = {
  key: fs.readFileSync("./Web/HTTPS/keys/server-key.pem"),
  ca:  [fs.readFileSync("./Web/HTTPS/keys/cert.pem")],
  cert: fs.readFileSync("./Web/HTTPS/keys/server-cert.pem")
}

const Wallet = require("../Wallet/Wallet");

var Log = null;
class Web {
  constructor(serPort, blockchain, logger){
    Log = logger;
    this.serPort = serPort;
    this.server = express();
    this.blockchain = blockchain;

    // this.httpsServer = https.createServer(options, (req, res)=>{
    //   res.writeHead(200);
    //   res.end('helloworld\n');
    // }).listen(this.serPort,'192.168.0.192');
  }

  listen(){
    this.server.get(pretty({ query: 'pretty' }));
    this.server.get(express.static(__dirname+"/public"));
    this.server.get("/db", (req, res)=>{
      this.blockchain.db.getStructure().then((structure)=>{
        res.json(structure);
      })
    })

    this.server.get("/profile", (req,res)=>{
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      var uid = req.query.uid;
      var profile = {
        walletAddr : Wallet.WALLET_IDENTITY.getBitcoinAddress(),
        balance: 0
      }
      res.json(profile);
    })

    this.server.get("/verify", (req,res)=>{
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      var privateKey = crypto.createHash("sha256").update(req.query.digest).digest();
      res.send(privateKey.toString('hex') === Wallet.WALLET_IDENTITY.privateKey.toString('hex'));
    })

    // this.server.listen(this.serPort, ()=>{
    //   Log.out("Web service is started", this.serPort);
    // })
    this.httpsServer = https.createServer(options, this.server);
    this.httpsServer.listen(this.serPort, ()=>{
      Log.out("Web service is started", this.serPort);
    });
  }
}
module.exports = Web;
