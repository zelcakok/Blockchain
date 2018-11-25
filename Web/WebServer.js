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
  constructor(serPort, wallet, logger){
    Log = logger;
    this.serPort = serPort;
    this.server = express();
    this.wallet = wallet;

    // this.httpsServer = https.createServer(options, (req, res)=>{
    //   res.writeHead(200);
    //   res.end('helloworld\n');
    // }).listen(this.serPort,'192.168.0.192');
  }

  listen(){
    this.server.use(pretty({ query: 'pretty' }));
    this.server.use(express.static(__dirname+"/public"));

    this.server.use("/portal", (req, res)=>{
      this.wallet.db.getStructure().then((structure)=>{
        var token = req.get('host').split(":");
        res.redirect("https://"+[token[0], "3000"].join(":"));
      })
    })

    this.server.use("/db", (req, res)=>{
      this.wallet.db.getStructure().then((structure)=>{
        res.send(structure);
      })
    })

    this.server.use("/profile", (req,res)=>{
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      var uid = req.query.uid;
      var profile = {
        walletAddr : Wallet.WALLET_IDENTITY.getBitcoinAddress(),
        ledger: this.wallet.getLedger()
      }
      res.json(profile);
    })

    this.server.use("/verify", (req,res)=>{
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
