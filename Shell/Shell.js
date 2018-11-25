const { spawn } = require('child_process');
const IO = require("./IO");
const Auth = require("../OAuth/Auth");
const fs = require('fs');
const crypto = require("crypto");

const Block = require("../Blocks/Block");
const Wallet = require("../Wallet/Wallet");
const Identity = require("../OAuth/Identity");
const CREDENTIAL_FILE = "./.credential.json";

const moment = require("moment");

var Log = null;
var CREDENTIAL_STATE = false;

class Shell {
  constructor(wallet, broker, logger){
    Log = logger;
    this.io = new IO();
    this.operations = new Object();
    this.auth = Auth.getInstance();
    this.label = "Wallet [Login required]";
    this.wallet = wallet;
    this.broker = broker;
    this.loadStandardOpt();
  }

  addOperation(key, func){
    this.operations[key] = func;
  }

  addOperations(operations){
    Object.keys(operations).map((key)=>{
      this.operations[key] = operations[key];
    })
  }

  loadStandardOpt(){
    var operations = {
      echo: {
        Desc: "[msg]".padEnd(20) + "Print message.",
        func: (...msg)=>{
          msg = msg.slice(1);
          console.log(msg.join(" "));
        }
      },
      clear: {
        Desc: "NULL".padEnd(20) + "Clear the console.",
        func: ()=>console.clear(),
      },
      help: {
        Desc: "NULL".padEnd(20) + "List all commands.",
        func: ()=>{
          console.log("Command".padEnd(18) + "Argument(s)".padEnd(20) + "Description\n");
          Object.keys(operations).map((cmd)=>{
            console.log(cmd.padEnd(18) + operations[cmd].Desc);
          })
        }
      },
      exit: {
        Desc: "NULL".padEnd(20) + "Exit Wallet system.",
        func: ()=>process.exit(0)
      },
      login: {
        Desc: "NULL".padEnd(20) + "Login to Wallet system.",
        func: async ()=>await this.login()
      },
      logout: {
        Desc: "NULL".padEnd(20) + "Logout from Wallet system.",
        func: async ()=>await this.logout()
      },
      upgrade: {
        Desc: "NULL".padEnd(20) + "Upgrade Wallet system",
        func: async ()=>await this.upgrade()
      },
      wallet: {
        Desc: "NULL".padEnd(20) + "Get the wallet information.",
        func: ()=>this.showWallet()
      },
      setDifficulty: {
        Desc: "Integer".padEnd(20) + "Adjust the difficulty for proof of work.",
        func: (...param)=>{
          Block.setDifficulty(param[1]);
          Log.out("The difficulty is changed to ", Block.getDifficulty());
        }
      },
      showDifficulty: {
        Desc: "NULL".padEnd(20) + "Show the current difficulty for proof of work.",
        func: ()=>{
          Log.out("The current difficulty is ", Block.getDifficulty());
        }
      },
      pay : {
        Desc: "[Wallet Address]".padEnd(20) + "Transfer money to others.",
        func: (...param)=> {
          if(!this.isLoggedIn()) return Log.out("Error: Please login first.");
          if(param.length < 2) return Log.out("Please specify the target address and the amount.");
          var payeeAddr = param[1];
          var amount = param[2];
          var payerAddr = Wallet.WALLET_IDENTITY.getBitcoinAddress();
          if(payeeAddr === payerAddr)
            Log.out("Cannot transfer money to yourself.");
          else
            this.broker.createPayment(payerAddr, payeeAddr, amount);
        }
      },
      resetWallet : {
        Desc: "NULL".padEnd(20) + "Reset Wallet to default.",
        func: async ()=>{
          await this.logout();
          await this.wallet.emergency();
        }
      },
      showAllUsers: {
        Desc: "NULL".padEnd(20) + "Show all onilne users.",
        func: async ()=>{
          try {
            var curTime = moment();
            var index = 0;
            console.log();
            console.log("".padEnd(4) + "Index".padEnd(8) + "IP Address".padEnd(18) + "Port".padEnd(6) + "Last online");
            var peers = await this.wallet.db.read("/peers");
            Object.keys(peers).map((key)=>{
              var entry = JSON.parse(peers[key]);
              var duration = moment.duration(curTime.diff(entry.timestamp)).asMinutes();
              duration = duration < 1 ? "NOW" : duration.toFixed(2);
              console.log("".padEnd(4) + (index++).toString().padEnd(8) + entry.ipAddr.padEnd(18) + entry.port.toString().padEnd(6) + duration);
            });
          } catch(err) {
            console.log(err);
          } finally {
            return Promise.resolve();
          }
        }
      },
      getBlocks: {
        Desc: "NULL".padEnd(20) + "Get the blocks from the other nodes.",
        func: async ()=>{
          this.operations["showAllUsers"].func();
          var ans = await this.io.ask("peer", "Please select a peer: ");
          console.log("You've choose: ", ans.peer);
        }
      },
      inv: {
        Desc: "NULL".padEnd(20) + "Inform the other nodes what blocks or transactions it has",
        func: ()=>{

        }
      }
    }
    this.addOperations(operations);
  }

  isLoggedIn(){
    return CREDENTIAL_STATE;
  }

  showWallet(){
    if(!CREDENTIAL_STATE) return Log.out("Error: Please login first.");
    console.log("\n");
    console.log("".padEnd(3)+"Available balance".padEnd(20)+ this.broker.ledger().balance +" HKD");
    console.log("".padEnd(3)+"Last update".padEnd(20)+ moment(this.broker.accountant.ledger.lastUpdate).format("DD/MM/YY hh:mm:ss A"));
    console.log("".padEnd(3)+"Wallet Address".padEnd(20)+Wallet.WALLET_IDENTITY.getBitcoinAddress());
    console.log("\n");
  }

  async login(){
    var questions = {
      email: {
        question: "Email"
      },
      password: {
        question: "Password",
        isMasked: true
      }
    }
    return new Promise((resolve, reject)=>{
      this.io.asks(questions).then((res)=>{
        this.auth.emailAuth(res.email, res.password).then((cred)=>{
          this.queueMsg("Login successful");
          this.setLabel("Wallet [" + cred.user.email.split("@")[0]+"]");
          this.registerCredential(cred.user.email, res.password).then(()=>{
            setTimeout(()=>{
              resolve();
            }, 1500);
          })
        }).catch((err)=>{
          console.log(err);
          this.queueMsg("Login failure");
          setTimeout(()=>{
            resolve();
          }, 1500);
        })
      })
    });
  }

  async logout(){
    if(!CREDENTIAL_STATE) return Log.out("Error: You are not logged in.");
    return new Promise((resolve, reject)=>{
      this.setLabel("Wallet [Login required]");
      this.queueMsg("Logout successfully");
      setTimeout(()=>{
        resolve();
      }, 1500);
      return this.unregisterCredential();
    });
  }

  async upgrade(){
    this.queueMsg("Checking with Git Lab, please wait...");
    return new Promise((resolve, reject)=>{
      const gitpull = spawn('git', ['pull', '-f']);
      gitpull.stdout.on('data', (data) => {
        this.queueMsg(data.toString());
      });
      gitpull.on('close', (code) => {
        this.queueMsg("Wallet upgrade ended with code " + code);
        setTimeout(()=>{
          resolve();
        }, 1500);
      });
    });
  }

  /*
    Create a file contains email and hash(email, password)

    Users are required to login before all the transactions.
    Once the user is logged in, the system will create the credential file,
    which contains the email and the digest of (email, password).

    Verification step

    1. Read the email from the email file.
    2. Ask user to enter password.
    3. Create a digest (email, enteredPassword).
    4. Compare 2 digests, match (proceed), fail (terminate).
  */
  registerCredential(email, password){
    return new Promise((resolve, reject)=>{
      var digest = crypto.createHash("sha256").update(email+password).digest("hex");
      var credential = {
        email: email,
        signature: digest
      }
      //Generate the private key using digest
      Wallet.WALLET_IDENTITY = new Identity(digest);
      fs.writeFile(CREDENTIAL_FILE, JSON.stringify(credential), (err)=>{
        if(err) reject(err);
        else resolve();
      });
      this.broker.enableAccountant();
    });
  }

  unregisterCredential(){
    return new Promise((resolve, reject)=>{
      fs.unlink(CREDENTIAL_FILE, ()=>resolve());
    });
  }

  restoreCredential(){
    if(CREDENTIAL_STATE) return Promise.resolve();
    if(!fs.existsSync(CREDENTIAL_FILE)) return Promise.resolve();
    return new Promise((resolve, reject)=>{
      try {
        fs.readFile(CREDENTIAL_FILE, (err, json)=>{
          var credential = JSON.parse(json);
          this.setLabel("Wallet [" + credential.email.split("@")[0]+"]");
          CREDENTIAL_STATE = true;
          //Generate the private key using digest
          Wallet.WALLET_IDENTITY = new Identity(credential.signature);
          this.broker.enableAccountant();
          resolve()
        })
      } catch (err){
        CREDENTIAL_STATE = false;
        resolve();
      }
    });
  }

  async authentication(){
    return new Promise((resolve, reject)=>{
      if(!CREDENTIAL_STATE) {
        this.queueMsg("Please login first.");
        setTimeout(function () {
          resolve();
        }, 1500);
      } else {
        this.io.ask("password", "Password", true).then((res)=>{
          fs.readFile(CREDENTIAL_FILE, (err, json)=>{
            var credential = JSON.parse(json);
            var d = crypto.createHash("sha256").update(credential.email+res.password).digest("hex");
            resolve(d === credential.signature);
          })
        });
      }
    });
  }

  react(cmd){
    return new Promise((resolve, reject)=>{
      try {
        if(Array.isArray(cmd)) resolve(this.operations[cmd[0]].func(...cmd));
        else resolve(this.operations[cmd].func());
      } catch(err) {
        console.log(err);
        console.log("Command not found");
        resolve();
      }
    });
  }

  prompt(){
    this.restoreCredential().then(()=>{
      this.io.reset();
      this.io.ask("CMD", this.label + ">").then((res)=>{
        try {
          var cmd = res["CMD"].includes(" ") ? res["CMD"].split(" ") : res["CMD"];
          this.react(cmd).then(()=>this.prompt());
        } catch(err) {
          this.prompt();
        }
      }).catch((err)=>console.log(err))
    });
  }

  setLabel(label){
    this.label = label;
  }

  queueMsg(msg){
    this.io.queueMsg(msg);
  }
}
module.exports = Shell;
