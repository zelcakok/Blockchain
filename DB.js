const fs = require('fs');
const moment = require('moment');
const Auth = require('./Auth');
const Crypto = require("crypto");
const EventEmitter = require("events").EventEmitter;
class DB {
  constructor(dbPath){
    this.structure = null;
    this.dbPath = dbPath;
    // this.auth = Auth.getInstance();

    this.eventEmitter = new EventEmitter();
    this.eventEmitter.on('onChanges', (path, value)=>this.onChanges(path, value));

    this.init();
  }

  init(){
    if(fs.existsSync(this.dbPath)) this.sysResume();
    else this.sysStart();
  }

  onChanges(path, value){
    console.log("OnChanges", path, value);
  }

  pathParse(url){
    var ptr = url.split("/")[1];
    var remain = url.substr(ptr.length+1, url.length);
    return {ptr: ptr, remain: remain};
  }

  _traverse(dir, url){
    var url = this.pathParse(url);
    if(url.remain === '') {
      if(!dir.hasOwnProperty(url.ptr)) dir[url.ptr] = new Object();
      return {dir: dir, ptr: url.ptr};
    }
    return this._traverse(dir[url.ptr], url.remain)
  }

  traverse(url){
    if(url === '/') return this.structure;
    return this._traverse(this.structure, url);
  }

  read(path){
    var url = this.traverse(path);
    return url.dir[url.ptr];
  }

  write(path, data){
    var url = this.traverse(path);
    url.dir[url.ptr] = data;
    this.eventEmitter.emit('onChanges', path, data);
  }

  append(path, data){
    var url = this.traverse(path);
    url.dir[url.ptr][this.genKey()] = data;
  }

  wipe(path){
    var url = this.traverse(path);
    url.dir[url.ptr] = null;
    delete url.dir[url.ptr];
  }

  monitor(path){
    
  }

  genKey(){
    return Crypto.createHash('md5').update(moment().valueOf().toString()).digest('hex');
  }

  sysStart(){
    this.structure = {
      data: new Object(),
      peers: new Object(),
      lastUpdate: moment().valueOf()
    }
    this.write("/data/test", "A");
    // this.saveState();
  }

  sysResume(){
    this.retrieveState();
  }

  prepareState(){
    return JSON.stringify(this.structure);
  }

  saveState(){
    fs.writeFile(this.dbPath, this.prepareState(), (err)=>{
      if(err) throw err;
      console.log("State is saved");
    })
  }

  retrieveState(){
    fs.readFile(this.dbPath, (err, json)=>{
      if(err) throw err;
      this.structure = JSON.parse(json);
      console.log("State is restored", this.structure);
    })
  }
}
module.exports = DB;
