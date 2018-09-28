const app = require('express')();
const SocketServer = require('socket.io');
const SocketClient = require("socket.io-client");
const promise = require("promise");
const NetAddr = require("network-address");

class Transport {
  constructor(serPort){
    this.serPort = serPort;

    this.server = require('http').Server(app);
    this.socketServer = null;
    this.sessions = [];

    this.socketClients = [];
  }

  listen(operations){
    this.server.listen(this.serPort);
    this.socketServer = SocketServer(this.server);
    this.socketServer.on("connection", (socket)=>{
      console.log("A new connection is established");
      this.sessions[socket.id] = socket;
      this.send("ACK", socket.id, null);
      for(var opt in operations)
        socket.on(opt, (data)=>operations[opt].action(data));
    });
  }

  connect(key, addr, port){
    return new Promise((resolve, reject)=>{
      this.socketClients[key] = new Object();
      this.socketClients[key].socket = SocketClient.connect("http://"+addr+":"+port,{transports: ['websocket']});
      this.socketClients[key].socket.on("ACK", (payload)=>{
        if(payload.message === this.socketClients[key].socket.id) //ACK
          resolve();
        else reject();
      })
    });
  }

  send(channel, msg, socketId = null){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    if(socketId) this.socketServer.to(socketId).emit(channel, payload);
    else this.socketServer.emit(channel, payload);
  }
}

module.exports = Transport;
