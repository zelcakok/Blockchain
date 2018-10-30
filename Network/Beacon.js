const dgram = require('dgram');
const NetAddr = require('network-address');
const Zetabase = require('../Database/Zetabase');
var Log = null;
class Beacon {
  constructor(listenPort, socketPort, logger){
    Log = logger;
    this.listenPort = listenPort;
    this.listener = dgram.createSocket('udp4');
    this.listener.bind(listenPort);

    this.sender = dgram.createSocket('udp4');
    this.sender.bind(null,
      ()=>this.sender.setBroadcast(true)
    );

    this.socketPort = socketPort;
    this.action = null;
  }

  setAction(action){
    this.action = action;
  }

  listen(){
    if(this.action === null) throw("Please setup the action first.");
    this.listener.on('listening',
      ()=>Log.out("Beacon service is started", this.listenPort)
    );
    this.listener.on('message',
      (msg)=>{
        if(!this.isSelf(msg))
          this.action(msg.toString())
      }
    );
  }

  isSelf(msg){
    msg = JSON.parse(msg);
    return msg.ipAddr === NetAddr() && msg.port === this.socketPort;
  }

  getSelfMsg(){
    return JSON.stringify({
      ipAddr: NetAddr(),
      port: this.socketPort,
      message: Zetabase.hash("BLK_Client", "md5")
    });
  }

  broadcast(interval = 10000){
    setInterval(()=>{
      var msg = JSON.stringify({
        ipAddr: NetAddr(),
        port: this.socketPort,
        message: Zetabase.hash("BLK_Client", "md5")
      });
      this.sender.send(msg,
                       0, msg.length,
                       this.listenPort,
                       "255.255.255.255");
    }, interval);
  }
}

module.exports = Beacon;