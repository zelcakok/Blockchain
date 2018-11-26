const firebase = require('firebase');

var instance = null;
class Auth {
  constructor(){
    var config = {
      apiKey: "AIzaSyCffQlrQXqYcwOQZWLPsnsaeGHk6q8W6kw",
      authDomain: "blockchain-1077f.firebaseapp.com",
      databaseURL: "https://blockchain-1077f.firebaseio.com",
      projectId: "blockchain-1077f",
      storageBucket: "blockchain-1077f.appspot.com",
      messagingSenderId: "650452753735"
    };
    firebase.initializeApp(config);
    this.fbAuth = firebase.auth();
    this.dbClient = firebase.database();
  }

  static getInstance(){
    if(instance === null) instance = new Auth();
    return instance;
  }

  registerWalletAddress(email, walletAddr){
    this.dbClient.ref("/AddressBook/"+walletAddr).set({
      email: email
    }).catch((err)=>console.log(err))
  }

  emailAuth(email, password){
    return this.fbAuth.signInWithEmailAndPassword(email, password);
  }
}

module.exports = Auth;
