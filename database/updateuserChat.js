module.exports=  (params) =>{
    console.log("params", params)
      var Cloudant = require('cloudant');
        //var nodemailer = require('nodemailer');
      require('dotenv').config();
     // var cloudant = new Cloudant({ url: process.env.Cloudant_Url, maxAttempt: 5, plugins: [ 'iamauth', { retry: { retryDelayMultiplier: 4, retryErrors: true, retryInitialDelayMsecs:1000, retryStatusCodes: [ 429 ] } } ]});
     var me = '40417e08-f02f-4c68-9e7d-167845250c06-bluemix'; // Set this to your own account.
     var password = "c856fe7d49a3842263dd6b3c6576a163ccb17c1a784808e3694eb394ab443688";
     return new Promise(function(resolve,reject){
     // Initialize the library with my account.
     var cloudant = Cloudant({ account: me, password: password },function(err,db){
         if(err){
              console.log("$$$$$$$$$$$$$$$$$$$$$$$$$")
              console.log(err)
          }
          else{
              console.log("Database connected in updateUserChat file")
          }
     
     var agentDB = cloudant.db.use('user_conversation');

          //console.log(params);
          var query={
              selector: {
                 _id: {
                    "$eq": params.fbid
                 }
              }
            }
            agentDB.find(query,(err,body)=>{
                              if(err){
                  console.log('err getting cloudant')
                  reject({resData:err.message});
                }
                else{
                    //console.log(body.docs[0].conversation)

                             resolve({"resData":body.docs[0].conversation})
                             
                }
      })
    })
})
}