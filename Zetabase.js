const fs = require('fs');
const moment = require('moment');
const Auth = require('./Auth');
const Crypto = require("crypto");
const NetAddr = require("network-address");
const EventEmitter = require("events").EventEmitter;
const Checksum = require("checksum");
var Log = null;

class Zetabase {
  constructor(dbPath, logger){
    Log = logger;
    this.structure = null;
    this.dbPath = dbPath;
    // this.auth = Auth.getInstance();

    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on('onChanges', (path, value)=>this.onChanges(path, value));

    this.monitorList = [];
    this.prepare();
  }

  prepare(){
    return new Promise((resolve, reject)=>{
      if(this.structure !== null) return resolve();
      if(fs.existsSync(this.dbPath)) return resolve(this.sysResume());
      else return resolve(this.sysStart());
    });
  }

  onChanges(path, value){
    Object.keys(this.monitorList).map((monitorPath, index)=>{
      if(this.isSubset(monitorPath, path))
        this.monitorList[monitorPath](value);
    })
    this.invalidate();
  }

  pathParse(url){
    if(url[url.length-1] === "/") url = url.substr(0, url.length-1);
    var ptr = url.split("/")[1];
    var remain = url.substr(ptr.length+1, url.length);
    return {ptr: ptr, remain: remain};
  }

  _traverse(dir, url, createMissing = true){
    var rawUrl = url;
    var url = this.pathParse(url);
    if(createMissing && !dir.hasOwnProperty(url.ptr)) dir[url.ptr] = new Object();
    if(url.remain === '') return {dir: dir, ptr: url.ptr};
    return this._traverse(dir[url.ptr], url.remain);
  }

  traverse(url, createMissing = true){
    if(url === '/') return this.structure;
    return this._traverse(this.structure, url, createMissing);
  }

  prev(url){
    if(url[0]==='/') return url.substr(1).split("/")[0];
    return url.split("/")[0];
  }

  read(path, createMissing = true){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path, createMissing);
        return resolve(url.dir[url.ptr]);
      });
    });
  }

  write(path, data){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path);
        url.dir[url.ptr] = typeof(data) === "string"? data : JSON.stringify(data);
        this.eventEmitter.emit('onChanges', path, data);
        resolve();
      });
    });
  }

  append(path, data){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path);
        Log.d("URL:",url);
        url.dir[url.ptr][this.genKey()] = data;
        this.eventEmitter.emit('onChanges', path, data);
        resolve();
      });
    });
  }

  wipe(path){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path);
        url.dir[url.ptr] = null;
        delete url.dir[url.ptr];
        this.eventEmitter.emit('onChanges', path, null);
        resolve();
      });
    });
  }

  monitor(path, cb){
    return new Promise((resolve, reject)=>{
      this.monitorList[path] = cb;
      resolve();
    });
  }

  getStructure(){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        resolve(this.structure);
      })
    });
  }

  isSubset(pathA, pathB){
    if(pathA === '/' || pathB === '/') return true;
    var arrA = pathA.substr(1).split("/");
    var arrB = pathB.substr(1).split("/");
    var same = [];
    arrA.map((item, index)=>{
      if(arrB.indexOf(item) > -1)
        same.push(arrB.splice(arrB.indexOf(item), 1));
    })
    same.map((item, index)=>arrA.splice(arrA.indexOf(item),1));
    return arrA.length === 0 || arrB.length === 0;
  }

  genKey(){
    return Crypto.createHash('md5').update(Math.random() + moment().valueOf().toString()).digest('hex');
  }

  checksum(){
    this.structure.checksum = Checksum(JSON.stringify(this.structure));
  }

  sortKey(path){
    this.read(path).then((peers)=>{
      var sorted = new Object();
      var keys = Object.keys(peers);
      keys.sort((a, b)=>{
        if(a <= b) return 0;
        else return 1;
      })
      for(var i in keys) {
        this.write("/peers/"+keys[i], peers[keys[i]]).then(()=>this.structure);
        delete peers[keys[i]];
      }
    })
  }

  static hash(str, algorithm){
    return Crypto.createHash(algorithm).update(str).digest('hex');
  }

  invalidate(writeToFile = true){
    this.checksum();
    this.structure.lastUpdate = moment().valueOf();
    if(writeToFile) this.saveState();
    // Log.d(this.structure);
  }

  containsKey(key){
    return new Promise((resolve, reject)=>{
      this.read(key, false).then((dir)=>resolve(Object.keys(dir).length>0));
    });
  }

  sysStart(){
    this.structure = {
      data: new Object(),
      peers: new Object(),
      lastUpdate: null,
      checksum: null
    }
    this.invalidate();
  }

  sysResume(){
    return this.retrieveState();
  }

  prepareState(){
    return JSON.stringify(this.structure);
  }

  saveState(){
    fs.writeFile(this.dbPath, this.prepareState(), (err)=>{
      if(err) throw err;
      // Log.d("State is saved");
    })
  }

  retrieveState(){
    return new Promise((resolve, reject)=>{
      fs.readFile(this.dbPath, (err, json)=>{
        if(err) throw err;
        Log.d(json.toString());
        this.structure = JSON.parse(json);
        resolve();
      })
    });
  }

  static removeDB(dbPath){
    return new Promise((resolve, reject)=>{
      fs.unlink(dbPath, ()=>resolve());
    });
  }
}
module.exports = Zetabase;
