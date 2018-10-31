const fs = require('fs');
const moment = require('moment');
const Crypto = require("crypto");
const NetAddr = require("network-address");
const EventEmitter = require("events").EventEmitter;
const Checksum = require("checksum");
const Auth = require('../OAuth/Auth');
const Entry = require('./Entry');
const Wallet = require("../Wallet/Wallet");
const Cryptographic = require("../Transaction/Cryptographic");
const Shell = require("../Shell/Shell");
const Block = require("../Blocks/Block");

var Log = null;

class Zetabase {
  constructor(dbPath, logger, wallet){
    Log = logger;
    this.structure = null;
    this.dbPath = dbPath;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on('onChanges', (path, value)=>this.onChanges(path, value));
    this.monitorList = [];
    this.wallet = wallet;
  }

  async prepare(){
    if(this.structure !== null) return Promise.resolve();
    if(fs.existsSync(this.dbPath)) return await this.sysResume() ? Promise.resolve() : Promise.reject();
    else return Promise.resolve(this.sysStart());
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
    return this._traverse(dir[url.ptr], url.remain, createMissing);
  }

  traverse(url, createMissing = true){
    if(url === '/') return this.structure.slot;
    return this._traverse(this.structure.slot, url, createMissing);
  }

  prev(url){
    if(url[0]==='/') return url.substr(1).split("/")[0];
    return url.split("/")[0];
  }

  async read(path, createMissing = true){
    return new Promise((resolve, reject)=>{
      this.prepare().then(async ()=>{
        var url = this.traverse(path, createMissing);
        return resolve(url.dir[url.ptr]);
      }).catch((err)=>{if(err) {console.log(err); this.wallet.emergency()}})
    });
  }

  write(path, data, fireEvent = true){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path);
        url.dir[url.ptr] = typeof(data) === "string"? data : JSON.stringify(data);
        if(fireEvent) this.eventEmitter.emit('onChanges', path, data);
        resolve();
      }).catch((err)=>{if(err) {console.log(err); this.wallet.emergency()}});
    });
  }

  append(path, data){
    return new Promise((resolve, reject)=>{
      this.prepare().then(()=>{
        var url = this.traverse(path);
        url.dir[url.ptr][this.genKey()] = data;
        this.eventEmitter.emit('onChanges', path, data);
        resolve();
      }).catch((err)=>{lo(err)});
    });
  }

  wipe(path){
    return new Promise(async (resolve, reject)=>{
      if(path === "/") {
        await Zetabase.removeDB(this.dbPath);
        return resolve(this.sysStart());
      }
      this.prepare().then(()=>{
        var url = this.traverse(path);
        url.dir[url.ptr] = "WIPED";
        delete url.dir[url.ptr];
        // this.eventEmitter.emit('onChanges', path, null);
        this.eventEmitter.emit('onChanges', path, "WIPE");
        resolve();
      }).catch((err)=>{if(err) {console.log(err); this.wallet.emergency()}});
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
      }).catch((err)=>{if(err) {console.log(err); this.wallet.emergency()}});
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
    this.structure.checksum = Cryptographic.sha256(JSON.stringify(this.structure.slot));
  }

  sortKey(path){
    this.read(path).then((data)=>{
      var sorted = new Object();
      var keys = Object.keys(data);
      keys.sort((a, b)=>{
        if(a <= b) return 0;
        else return 1;
      })
      for(var i in keys){
        sorted[keys[i]] = data[keys[i]];
        delete data[keys[i]];
      }
      for(var i in keys){
        data[keys[i]] = sorted[keys[i]];
        delete sorted[keys[i]];
      }
      sorted = null;
      this.invalidate();
    })
  }

  static hash(str, algorithm){
    return Crypto.createHash(algorithm).update(str).digest('hex');
  }

  invalidate(writeToFile = true){
    this.checksum();
    this.structure.lastUpdate = moment().valueOf();
    if(writeToFile) this.saveState();
  }

  async containsKey(key){
    var data = await this.read(key, false);
    if(typeof data === "undefined") return false;
    return true;
  }

  async sysStart(){
    this.structure = new Entry({
      peers: new Object(),
      blocks: new Object(),
      candidates: new Object()
    })._checksum();
    var genesisBlk = Block.genesisBlock();
    this.structure.slot.blocks["GENESIS"] = genesisBlk;
    this.invalidate();
  }

  async sysResume(){
    var auditing = await this.retrieveState();
    if(!auditing) throw "System failure: Wallet database is compromised.";
    return false;
  }

  prepareState(){
    return JSON.stringify(this.structure);
  }

  saveState(){
    var data = this.prepareState();
    console.log("SAVE DATA: ", JSON.stringify(data,null,2), '\n\n');
    fs.writeFile(this.dbPath, this.prepareState(), (err)=>{
      if(err) throw err;
    })
  }

  retrieveState(){
    return new Promise((resolve, reject)=>{
      fs.readFile(this.dbPath, async (err, json)=>{
        if(err) throw err;
        this.structure = JSON.parse(json);
        resolve(await this.auditing());
      })
    });
  }

  async auditing(){
    var oldCS = this.structure.checksum;
    var plaintext = JSON.stringify(this.structure.slot);
    return oldCS === Cryptographic.sha256(plaintext);
  }

  static removeDB(dbPath){
    return new Promise((resolve, reject)=>{
      fs.unlink(dbPath, ()=>resolve());
    });
  }
}
module.exports = Zetabase;
