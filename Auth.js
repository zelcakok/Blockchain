const firebase = require('firebase');
const promise = require('promise');

var instance = null;
class Auth {
  constructor(){
    var config = {
      apiKey: "AIzaSyCffQlrQXqYcwOQZWLPsnsaeGHk6q8W6kw",
      authDomain: "blockchain-1077f.firebaseapp.com",
      projectId: "blockchain-1077f",
    };
    firebase.initializeApp(config);
    this.fbAuth = firebase.auth();
  }

  static getInstance(){
    if(instance === null) instance = new Auth();
    return instance;
  }

  getInput(label, masked = false){
    return new Promise((resolve, reject)=>{
      process.stdout.write(label+": ");
      var stdIn = process.openStdin();
      stdIn.addListener('data', (data)=>resolve(data.toString().trim()));
    });
  }

  startConsoleSignIn(){
    console.clear();
    return new Promise((resolve, reject)=>{
      var username = "", password = "";
      this.getInput("Username").then((username)=>{
        this.getInput("Password").then((password)=>{
          resolve({username: username, password: password});
        })
      })
    });
  }

  emailAuth(){
    return new Promise((resolve, reject)=>{
      this.startConsoleSignIn().then((cred)=>{
        this.fbAuth.signInWithEmailAndPassword(cred.username, cred.password)
        .then(()=>resolve(this.fbAuth.currentUser))
        .catch((error)=>reject(error));
      })
    });
  }
}

module.exports = Auth;
