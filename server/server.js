var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var mongoose = require('mongoose');
// var bcrypt = require('bcrypt'),
var functions = [];

//schemas
var User = require('./schemas/User.js');
var Session = require('./schemas/Session.js');

mongoose.connect('mongodb://localhost:27017/expressiment');

function send404(response) {
  response.writeHead(404, {
    "Content-Type": "text/plain"
  });
  response.end("404: Page Not Found");
}

function requestHandler(request, response) {

  var requrl = url.parse(request.url).pathname;
  var query = url.parse(request.url).query;
  var get = qs.parse(query);

  if (requrl.indexOf("/f/") == -1) {
    if (request.method == "GET" && requrl == "/") {
      fs.createReadStream("../website/index.html").pipe(response);
    } else {
      if (requrl.indexOf(".") > -1) {
        fs.readFile("../website" + requrl, function(error, data) {
          if (error) {
            send404(response);
          } else {
            response.end(data);
          }
        });
      } else {
        fs.readFile("../website" + requrl + ".html", function(error, data) {
          if (error) {
            send404(response);
          } else {
            response.end(data);
          }
        });
      }
    }
  } else {
    for (var i = 0; i < functions.length; i++) {
      if (requrl.toLowerCase() == "/f/" + functions[i].url.toLowerCase()) {
        if (functions[i].method.toLowerCase() == "post") {
          (function() {
            var func = functions[i];
            var data = new Buffer(0);
            request.on("data", function(chunk) {
              data = Buffer.concat([data, chunk]);
            });
            request.on("end", function() {
              func.callback(request, response, get, data);
            });
          })();
        } else if (functions[i].method.toLowerCase() == "get") {
          functions[i].callback(request, response, get);
        }
        break;
      }
    }
  }
}

function parseJSON(str) {
  try {
    return JSON.parse(String(str));
  } catch (ex) {}
}
function getToken(size) {
	var token = "";
	for(var i = 0; i < size; i++) {
		var rand = Math.floor(Math.random() * 62);
		token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
	}
	return token;
}
// function verifySession(user_id, token){
//   var verified = false;
//   Session.findOne({user_id: user_id, token: token, isActive: true}, function(err, session){
//     if(err){
//       console.error(err);
//     } else if(session != null){
//       verified = true;
//     }
//   });
// }
function newFunc(url, method, callback) {
  functions.push({
    url: url,
    method: method,
    callback: callback
  });
}

var port = process.argv[2] || 8080;
http.createServer(requestHandler).listen(port);
console.log("Server is now running on port " + port);

newFunc("createUser", "POST", function(request, response, get, post) {
  var data = parseJSON(post);

  User.find( { $or: [ { username: data.username }, { email: data.email }, { phone: data.phone } ] }, function(err, users){ //see if user exists
    if( users.length != 0 ){
      response.end("exists");
    }else{
      User.find({id: data.id}, function(err, users){ //see if id exists
        if (err) {
          console.error(err);
        }
        if(users.length == 0){
          User.create({
            id: data.id,
            username: data.username,
            password: data.password,
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            phone: data.phone
          }, function(err, user) {
            if(err){
              response.end("fail");
              console.error(err);
            }else{
              console.log("User " + data.id + ", " + data.firstname + " " + data.lastname + " was saved!");
              response.end("success");
            }
          });
        }else{
          User.create({
            id: Math.floor(Math.random() * (100000000000 - 10000000000)) + 10000000000, //create new id
            username: data.username,
            password: data.password,
            firstname: data.firstname,
            lastname: data.lastname,
            email: data.email,
            phone: data.phone
          }, function(err, user) {
            if(err){
              response.end("fail");
              console.error(err);
            }else{
              console.log("User " + data.id + ", " + data.firstname + " " + data.lastname + " was saved!");
              response.end("success");
            }
          });
        }
      })
    }
  });
});
newFunc("getUsers", "POST", function(request, response, get, post) {
  User.find({}, function(err, users) {
    if(err){
      response.end("fail");
      console.error(err);
    }else{
      response.end(JSON.stringify(users));
    }
  })
});
newFunc("deleteUser", "POST", function(request, response, get, post) {
  var data = parseJSON(post);
  User.findOneAndRemove({id: data.id}, function(err){
    if(err){
      response.end("fail");
      console.error(err);
    }else{
      console.log("User deleted");
      response.end("success");
    }
  });
});
newFunc("login", "POST", function(request, response, get, post) {
  var data = parseJSON(post);

  User.findOne({username: data.username}, function(err, user){
    if(user){
      user.comparePassword(data.password, function(err, isMatch){
        if(err){
          console.error(err);
        }else{
          if(isMatch){
            var generatedToken = getToken(32);
            Session.create({user_id: user.id, token: generatedToken, isActive: true}, function(err, session){
              if(err){
                console.error(err);
              }else{
                var objarr = [user, session];
                response.end(JSON.stringify(objarr));
              }
            });
          }else{
            response.end("inc/password");
          }
        }
      })
    }else{
      response.end("inc/username")
    }

  });
});
newFunc("logout", "POST", function(request, response, get, post) {
  var data = parseJSON(post);

  Session.findOne({user_id: data.id, token: data.token, isActive: true}, function(err, session){
    session.isActive = false;
    session.save(function(err) {
      if(err){
        console.error(err);
        response.end("fail");
      }else{
        response.end("success");
      }
    });
  })
});
newFunc("joinTeam", "POST", function(request, response, get, post) {
  var data = parseJSON(post);
  Session.findOne({user_id: data.id, token: data.token, isActive: true}, function(err, session){
    if(err){
      console.error(err);
      response.end("fail");
    } else if(session != null){
      User.findOne({id: data.id}, function(err, user){
        if(err){
          console.error(err);
          response.end("fail");
        }else{
          user.teams.push(data.team_id);
          user.save(function(err){
            if(err){
              console.error(err);
              response.end("fail");
            }else{
              console.log("Team " + data.team_id + " was added to user " + data.id);
              response.end("success");
            }
          });
        }
      });
    }else{
      response.end("fail")
    }
  });
});
