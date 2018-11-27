module.exports = (param)=>{
  const moment = require("moment");
  const Cryptographic = require("./Cryptographic");

  var candidates = param.candidates;
  var timeRange = param.timeRange;

  var candidateKeys = Object.keys(candidates);
  var strTimestamp = Cryptographic.decryptTimestamp(candidateKeys[0]);
  var targetRange_timestamp = moment(parseInt(strTimestamp)).add(timeRange, 'minute').valueOf();
  var target_candidate_key = Cryptographic.encryptTimestamp(targetRange_timestamp);
  var selection = [], transKeys = [];
  for(var i in candidateKeys){
    if(candidateKeys[i] <= target_candidate_key){
      selection.push(candidates[candidateKeys[i]])
      transKeys.push(candidateKeys[i]);
    }
  }  
  return Promise.resolve({
    selection: selection,
    transKeys: transKeys
  });
};
