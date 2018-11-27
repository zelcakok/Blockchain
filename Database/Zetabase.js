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

const threads = require("threads");
const spawn = threads.spawn;
const WRITE_TO_FILE = "./Database/WriteToFile.js";

var CHANGES_THRESHOLD = 0; //0 is disabled
var Log = null;
const ACTION_CODE_WIPE = Cryptographic.md5("&actWipe;");

class Zetabase {
  constructor(dbPath, logger, wallet, changesThreshold = 0){
    Log = logger;
    this.structure = null;
    this.dbPath = dbPath;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on('onChanges', (path, value)=>this.onChanges(path, value));
    this.monitorList = [];
    this.wallet = wallet;
    this.isFileReady = true;
    this.hasChanges = false;
    this.changesCounter = 0;
    CHANGES_THRESHOLD = changesThreshold;
    this.writeService();
  }

  //Write the structure to file every 30 seconds
  writeService(){
    setInterval(()=>{
      if(this.hasChanges && this.changesCounter >= CHANGES_THRESHOLD) {
        var param = {
          path: this.dbPath,
          structure: this.prepareState()
        }
        var task = spawn(WRITE_TO_FILE);
        task.send(param)
            .on('message', ()=>{
              task.kill();
              this.hasChanges = false;
              this.changesCounter = 0;
            })
      }
    }, 1000 * 30);
  }

  async prepare(){
    if(this.structure !== null) return Promise.resolve();
    if(fs.existsSync(this.dbPath)) return await this.sysResume() ? Promise.resolve() : Promise.reject();
    else return Promise.resolve(this.sysStart());
  }

  onChanges(path, value){
    Object.keys(this.monitorList).map((monitorPath, index)=>{
      if(this.isSubset(monitorPath, path)) {
        this.monitorList[monitorPath](value);
      }
    })
    this.hasChanges = true;
    this.changesCounter++;
    this.invalidate(false);
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

  async wipe(path){
    if(path === "/") {
      await Zetabase.removeDB(this.dbPath);
      return Promise.resolve(this.sysStart());
    }
    this.prepare().then(()=>{
      var url = this.traverse(path);
      url.dir[url.ptr] = "";
      delete url.dir[url.ptr];
      this.eventEmitter.emit('onChanges', path, ACTION_CODE_WIPE);
    });
  }

  monitor(path, cb){
    return new Promise((resolve, reject)=>{
      this.monitorList[path] = cb;
      resolve();
    });
  }

  maintenance(func){
    return func(this.structure);
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
    var GENESIS_TIME = Cryptographic.encryptTimestamp(moment("1993-12-31T00:00:00").valueOf());
    this.structure = new Entry({
      peers: new Object(),
      blocks: new Object(),
      candidates: new Object(),
      ledger: new Object(),
      latest: {
        key: GENESIS_TIME,
        hash: Cryptographic.sha256(GENESIS_TIME)
      }
    })._checksum();
    var genesisBlk = Block.genesisBlock();
    this.structure.slot.blocks[GENESIS_TIME] = JSON.stringify(genesisBlk);
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

  async writeToFile(){
    var param = {
      path: this.dbPath,
      structure: this.prepareState()
    }
    var task = spawn(WRITE_TO_FILE);
    await task.send(param)
        .on('message', ()=>{
          task.kill();
          return Promise.resolve();
        })
  }

  saveState(){
    if(this.isFileReady) {
      this.isFileReady = false;
      this.writeToFile().then(()=>{this.isFileReady = true})
    } else console.log("BLOCKING");
  }

  saveStateImmediate(callback){
    this.writeToFile().then(()=>callback())
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

  static isWipe(str){
    return str === ACTION_CODE_WIPE;
  }
}
module.exports = Zetabase;
