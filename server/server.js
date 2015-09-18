var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var mongoose = require('mongoose');
// var bcrypt = require('bcrypt'),
var functions = [];

//schemas
var User = require('./User.js');

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
            position: data.position,
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
            position: data.position,
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
