module.exports=(params)=> {
    var Cloudant = require('cloudant');
    require('dotenv').config();
    
 var me = '40417e08-f02f-4c68-9e7d-167845250c06-bluemix'; // Set this to your own account.
 var password = "c856fe7d49a3842263dd6b3c6576a163ccb17c1a784808e3694eb394ab443688";
  
 // Initialize the library with my account.
 var cloudant = Cloudant({ account: me, password: password },function(err,db){
    var userDB = cloudant.db.use('user_conversation');
      return new Promise(function(resolve,reject){
        console.log(params);
        var query={
            "selector": {
               "fbId": {
                  "$eq": params.fbId
               }
            }
          }
            userDB.find(query,(err,body)=>{
              if(err){
                console.log('err getting cloudant')
                reject ({resData:'error'})
              }else{
                console.log("body",body.docs);
                resolve({"conversation":body.docs[0]})
              }
            })
      })
  })
}

  //exports.main({fbId:"12345"})
