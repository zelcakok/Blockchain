const app = require('express')();
const SocketServer = require('socket.io');
const SocketClient = require("socket.io-client");
const promise = require("promise");
const NetAddr = require("network-address");
const Zetabase = require("../Database/Zetabase");
var Log = null;

class Transport {
  constructor(serPort, logger){
    Log = logger;
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
      Log.d("A new connection is established");
      Object.keys(operations).map((key)=>{
        socket.on(key, (payload)=>operations[key](payload))
      })
    });
  }

  connect(key, addr, port){
    return new Promise((resolve, reject)=>{
      Log.d("Trying to connect", addr+":"+port);
      this.socketClients[key] = SocketClient.connect("http://"+addr+":"+port,{transports: ['websocket']});
      resolve(this.socketClients[key]);
    });
  }

  static dePacket(packet){
    Log.out("=>", packet.ipAddr+":"+packet.port, "\""+packet.message+"\"");
  }

  send(channel, msg, socketId = null){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    if(socketId) this.socketServer.to(socketId).emit(channel, payload);
    else this.socketServer.emit(channel, payload);
  }

  sendViaSocket(channel, msg, socket){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    socket.emit(channel, payload);
  }

  sendViaKey(channel, msg, key){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    this.socketClients[key].emit(channel, payload);
  }

  broadcast(channel, msg){
    Object.keys(this.socketClients).map((key)=>{
      this.sendViaKey(channel, msg, key);
    })
  }
}

module.exports = Transport;
