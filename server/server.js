var http = require('http');
var fs = require('fs');
var url = require('url');


function send404(response) {
  response.writeHead(404, {
    "Content-Type": "text/plain"
  });
  response.end("404: Page Not Found");
}

function openServer(request, response) {

  var requrl = url.parse(request.url).pathname;
  var query = url.parse(request.url).query;

  if (request.method == "GET" && requrl == "/") {
    fs.createReadStream("../website/index.html").pipe(response);
  } else {
    if (requrl.indexOf(".htm") > -1) {
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
}

var port = process.argv[2] || 8080;
http.createServer(openServer).listen(port);
console.log("Server is now running on port " + port);
