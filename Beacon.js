const dgram = require('dgram');
const myAddr = require('network-address');
class Beacon {
  constructor(listenPort, socketPort, action){
    this.listenPort = listenPort;
    this.listener = dgram.createSocket('udp4');
    this.listener.bind(listenPort);

    this.sender = dgram.createSocket('udp4');
    this.sender.bind(null,
      ()=>this.sender.setBroadcast(true)
    );

    this.socketPort = socketPort;
    this.action = action;
  }

  listen(){
    this.listener.on('listening',
      ()=>console.log("listen:", this.listenPort)
    );
    this.listener.on('message',
      (msg)=>this.action(msg.toString())
    );
  }

  broadcast(interval = 10000){
    setInterval(()=>{
      var msg = JSON.stringify({
        ipAddr: myAddr(),
        port: this.socketPort,
        message: "BLK_Client"
      });
      this.sender.send(msg,
                       0, msg.length,
                       this.listenPort,
                       "255.255.255.255");
    }, interval);
  }
}

module.exports = Beacon;
