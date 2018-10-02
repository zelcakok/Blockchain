const app = require('express')();
const SocketServer = require('socket.io');
const SocketClient = require("socket.io-client");
const promise = require("promise");
const NetAddr = require("network-address");
const Log = require("./Log");
const Zetabase = require("./Zetabase");

/*
  Handshake protocol

  Case: hostA connect to hostB.

  1. hostA connect ==> hostB.
  2. hostB CONN_QUERY ==> hostA.
        hostB waiting for info.
  3. hostA CONN_INFO ==> hostB.
  4. hostB connect ==> hostA.
  5. hostA CONN_QUERY ==> hostB. (This part can be removed once the info can be found on socket.)
        hostA waiting for info.
  6. hostB CONN_INFO ==> hostA.
  7. hostA CONN_EST ==> hostB.
  Connection is established.
*/

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
      this.sessions[socket.id] = socket;
      var clientAddr = socket.request.connection.remoteAddress.replace("::ffff:","");
      var clientPort = socket.request.connection.remotePort;
      var key = Zetabase.hash((clientAddr + clientPort).split(".").join(""), 'md5');

      if(clientAddr.split(".").length === 4 && clientPort !== null){
        this.connect(key, clientAddr, clientPort);
      } else {
        Log.d("Peer", socket.id, "is trying to connect...");
        Log.d("Waiting for peer", socket.id, "information");
        this.send("CONN_QUERY", socket.id, socket.id);

        socket.on("CONN_INFO", (peer)=>{
          Log.d("Peer", socket.id, "information is received.");
          Log.d("Connecting to peer", socket.id, "...");
          var key = Zetabase.hash((peer.ipAddr + peer.port).split(".").join(""), 'md5');
          this.connect(key, peer.ipAddr, peer.port);
        });
      }

      socket.on("CONN_EST", (peer)=>{
        Log.d("Incoming channel is established on ", peer.ipAddr+":"+peer.port);
      })
    });

  }

  connect(key, addr, port){
    return new Promise((resolve, reject)=>{
      if(key in this.socketClients) {
        Log.d("Outgoing channel is established on ", addr+":"+port);
        this.sendViaSocket("CONN_EST", {ipAddr: NetAddr(), port: this.serPort}, this.socketClients[key].socket);
        resolve();
        return;
      }
      Log.d("Trying to connect", addr+":"+port);
      this.socketClients[key] = new Object();
      this.socketClients[key].socket = SocketClient.connect("http://"+addr+":"+port,{transports: ['websocket']});

      this.socketClients[key].socket.on("CONN_QUERY", (payload)=>{
        if(payload.message === this.socketClients[key].socket.id) {
          Log.d("Peer", payload.message, "accepted to connect.");
          Log.d("Sending information to peer", payload.message);
          this.sendViaSocket("CONN_INFO", {ipAddr: NetAddr(), port: this.serPort}, this.socketClients[key].socket);
          resolve();
        }
        else reject();
      })
    });
  }

  static dePacket(packet){
    Log.d("=>", packet.ipAddr+":"+packet.port, "\""+packet.message+"\"");
  }

  send(channel, msg, socketId = null){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    if(socketId) this.socketServer.to(socketId).emit(channel, payload);
    else this.socketServer.emit(channel, payload);
  }

  sendViaSocket(channel, msg, socket){
    var payload = {ipAddr: NetAddr(), port: this.serPort, message: msg};
    socket.emit(channel, msg);
  }
}

module.exports = Transport;
