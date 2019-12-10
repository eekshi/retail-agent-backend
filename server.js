var express = require('express');
var app = express();
var cfEnv = require('cfenv');
var path = require('path');
var bodyParser = require('body-parser');
//var server = app.listen(8080)
var server = app.listen(process.env.PORT || 6000)
var io = require('socket.io').listen(server);
var request = require('request');
const crypto = require("crypto");
const userConversation = require('./database/userConversation');
const insightsModule = require('./database/insightsModule');
var insightPrototype = new insightsModule();
const updateAgent = require('./database/enableBot');
var mongoose = require('mongoose')
var cors=require('cors')
const updateuserChat=require('./database/updateuserChat')
//Body 
app.use(cors()) 	
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json())

var appEnv = cfEnv.getAppEnv();
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, content-type, Accept");
	next();
});
mongoose.connect('mongodb+srv://yagnes:mlab@cluster0-s1fce.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true }, function (err, resp) {
	if (err)
		console.log(err)
	else
		console.log("connected")
});
var requestSchema = new mongoose.Schema({
	'_id': String,
	'userid': String,
	'agent': Boolean,
	'sid': String

})
var agentdata=[],userlist = []
var requests = mongoose.model('retailusers', requestSchema);
app.use('/', express.static('public'))
var userchat
var name;
var agentname;
app.get('/test-agentBackend', (req, res) => {
	console.log(" This is Sample API");
	res.send(" Client Backend is successfully running");
})
io.on('connection', function (socket) {
	socket.on('connection', function (agent) {
		console.log("agent connected")
		var data = {
			'_id': agent,
			'userid': '',
			'agent': false,
			'sid': socket.id
		}
		
		requests.find({ '_id': agent }, function (err, resp) {
			if (resp.length == 0) {				
				requests.create(data, function (error, data1) {
					requests.find({'_id': agent}, function (err, resp1) {agentdata.push(resp1[0]);})
					console.log('created',error, data1)
				})
			}
			else {
				requests.update({ '_id': agent }, { 'sid': socket.id }, function (err, res) {
					if(res){
					requests.find({}, function (err, resp1) {
						if(resp1){
						agentdata=[];
						agentdata.push(resp1[0]);
						}
					})
					console.log("updated",agentdata)	
					}
				})
			}
		})
	})

	socket.on('logout', function (agent) {
		console.log("logout")
		requests.update({ '_id': agent },{'sid':''}, function (err, res) {
			console.log(err, res)
		})
	})
	
	console.log("id", socket.id);
	socket.emit('test', "hello");
	app.post('/getrequest', (req, res) => {
			requests.find({}, function (err, data) {
			console.log("agents available", data)
				agentdata=[]
			agentdata = data;
		})
		console.log("2222222222222222222222222")
		userInfo(req.body.fbId).then((userData) => {
			console.log("userData", userData);
			// insightUserRequestFunction({ "fbId": req.body.fbId, "msg": req.body.msg, "firstName": userData.first_name, "lastName": userData.last_name,})
			var i = userlist.findIndex(x => x.fbId === req.body.fbId);
			if (i == -1) {	
			
				// updateuserChat({'fbid':req.body.fbId}).then((conv)=>{
				// 	console.log('####user added',conv)			
				// 	userlist.push({ "fbId": req.body.fbId, "agentid": '' })
				// 	io.sockets.emit('message', { "body": req.body, "firstName": userData.first_name, "profilePic": userData.profile_pic,"agentid": false })				
				// })
				updateuserChat({'fbid':req.body.fbId}).then((conv)=>{
					console.log("***************************************************",conv);
					userlist.push({ "fbId": req.body.fbId, "agentid": '' })
					 	io.sockets.emit('message', { "body": req.body, "firstName": userData.first_name, "profilePic": userData.profile_pic,"agentid": false,"conversation":conv })				
					// })
				})
				
			}
			
			else {		
				console.log('####agent added')			
				io.to(userlist[i].agentid).emit('message', { "body": req.body, "firstName": userData.first_name, "profilePic": userData.profile_pic, "agentid": true })
			}
		
		

			setTimeout(() => {
				var i = userlist.findIndex(x => x.fbId === req.body.fbId);
				if (i >= 0 && userlist[i].agentid == '') {
					console.log("#############################auto emit")
					io.sockets.emit('autoend', userlist[i])					
					updateAgent.updateAgent({ "fbId": userlist[i].fbId },() => {
						loginSuccessMessage(userlist[i].fbId, "Our agents are busy at this moment, Please contact later.Thank you.")
						userlist.splice(i, 1)
					})
				}
			}, 20 * 1000);
		})
		res.send("success")
	
	})


	socket.on('sendMsg', function (msg, userid, cid) {
		console.log(msg, userid)
		userInfo(userid).then((userData) => {
			console.log("userData", userData);
			// insightBotResponseFunction({ "fbId": userid, "msg": msg, "firstName": userData.first_name, "lastName": userData.last_name, "conversationId": cid, })
		})
		typingOn(userid)
		loginSuccessMessage(userid, msg)
	})
	socket.on('status', function (id, sid, agent) {
		console.log("***************************************************",id)
			userConversation({'fbId':id})
			loginSuccessMessage(id, "You have been successfully connected with our Agent, " + agent + '.');			
			var i = userlist.findIndex(x => x.fbId === id);
			requests.update({ 'sid': sid }, { 'agent': true ,'userid':id}, function (err, res) {
				console.log("update")

			})
			console.log(userlist, i)
			userlist[i].agentid = sid;
			// io.to(sid).emit('conversation', response);
			io.sockets.emit('ack', { 'fbId': userlist[i].fbId, 'agentid': userlist[i].agentid 	 });
		
	})
	socket.on('end', function (id, agent) {
		updateAgent.updateAgent({ "fbId": id },() => {
		})
		requests.update({'userid':id},{'agent':false,'userid':''},function(err,res){console.log("agent available now",err,res)})
		var i = userlist.findIndex(x => x.fbId === id);
		loginSuccessMessage(id, "You have been disconnected from the Agent, " + agent + '.');
		console.log(i)
		userlist.splice(i, 1)

	})
})

function userInfo(id) {
	return new Promise(function (resolve, reject) {
		request('https://graph.facebook.com/v3.2/' + id + '?fields=id,first_name,last_name,profile_pic&access_token=EAAT4lt4AZBBkBAIvvbYZClsoWpUfdhuEdrGnpW2xyT0byhUIONT1ABu5KsezdqhVQrWwOuoxGta33OCJ1QPAKSDcOqF3zV27ifrTgDflPntv8SOQ03M8MZAZC8t4XomaofP5p48QUUC5vzJZBkwv5TAyJbBAgB18N0s0IHU0lBXuaCdbblJbw',
			async function (err, response, body) {
				if (err) {
					reject({ "error": err })
				}
				else {
					var res = JSON.parse(body)
					resolve({ "first_name": res.first_name, "profile_pic": res.profile_pic })
				}
			})

	});
}
function loginSuccessMessage(id, text) {
	console.log("***************************************************")
	var dataPost = {
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: 'EAAT4lt4AZBBkBAIvvbYZClsoWpUfdhuEdrGnpW2xyT0byhUIONT1ABu5KsezdqhVQrWwOuoxGta33OCJ1QPAKSDcOqF3zV27ifrTgDflPntv8SOQ03M8MZAZC8t4XomaofP5p48QUUC5vzJZBkwv5TAyJbBAgB18N0s0IHU0lBXuaCdbblJbw' },
		method: 'POST',
		json: {
			recipient: { id: id },
			message: {
				text: text
			}
		}
	};
	requestFun(dataPost)
}
function typingOn(id) {
	var dataPost = {
		url: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: 'EAAT4lt4AZBBkBAIvvbYZClsoWpUfdhuEdrGnpW2xyT0byhUIONT1ABu5KsezdqhVQrWwOuoxGta33OCJ1QPAKSDcOqF3zV27ifrTgDflPntv8SOQ03M8MZAZC8t4XomaofP5p48QUUC5vzJZBkwv5TAyJbBAgB18N0s0IHU0lBXuaCdbblJbw' },
		method: 'POST',
		json: {
			recipient: { id: id },
			sender_action: "typing_on"
		}
	};
	requestFun(dataPost)
}
function requestFun(dataPost) {

	request(dataPost, (error, response, body) => {
		if (error) {
			console.log('Error when we try to sending message: ', error);
		} else if (response.body.error) {
			console.log('Error: ', response.body.error);
		}
	});

}


app.get('/endchat',function(req,res){
	updateAgent.updateAgent({ "fbId": id },() => {
	})
	requests.update({'userid':id},{'agent':false,'userid':''},function(err,res){console.log("agent available now",err,res)})
	var i = userlist.findIndex(x => x.fbId === id);
	loginSuccessMessage(id, "You have been disconnected from the Agent, " + agent + '.');
	console.log(i)
	userlist.splice(i, 1)
	})
