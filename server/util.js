module.exports = function() {

  var fs = require('fs');
  var config = require("./config.json");
  var Autolinker = require( 'autolinker' );
  var nodemailer = require('nodemailer');
  var lwip = require('lwip');
  var AWS = require('aws-sdk');
  AWS.config.loadFromPath('./aws-config.json');

 return new (function() {

   this.notify = nodemailer.createTransport({
       service: 'Mailgun',
       auth: {
           user: config.mailgunUser,
           pass: config.mailgunPass
       }
   });

   this.profPicBucket = new AWS.S3({params: {Bucket: 'profilepics.morteam.com'}});
   this.driveBucket = new AWS.S3({params: {Bucket: 'drive.morteam.com'}});

   this.send404 = function(response) {
     response.writeHead(404, {
       "Content-Type": "text/plain"
     });
     response.end("404: Page Not Found");
   }
   this.parseJSON = function(str) { //not being used
     try {
       return JSON.parse(String(str));
     } catch (ex) {}
   }
   this.validateEmail = function(email) {
     var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
     return re.test(email);
   }
   this.validatePhone = function(phone){
     return phone.match(/\d/g).length===10;
   }
   this.createToken = function(size) {
     var token = "";
     for (var i = 0; i < size; i++) {
       var rand = Math.floor(Math.random() * 62);
       token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
     }
     return token;
   }

   this.requireLogin = function(req, res, next) {
     if (!req.user) {
       res.end("fail");
     } else {
       next();
     }
   }
   this.requireAdmin = function(req, res, next) {
     if (req.user.current_team.position != "admin") {
       notfiy.sendMail({
           from: 'MorTeam Notification <notify@morteam.com>',
           to: 'rafezyfarbod@gmail.com',
           subject: 'MorTeam Security Alert!',
           text: 'The user ' + req.user.firstname + " " + req.user.lastname + ' tried to perform administrator tasks. User ID: ' + req.user._id
       });
       res.end("fail");
     } else {
       next();
     }
   }
   this.requireLeader = function(req, res, next) {
     if (req.user.current_team.position == "admin" || req.user.current_team.position == "leader") {
       next();
     } else {
       notify.sendMail({
           from: 'MorTeam Notification <notify@morteam.com>',
           to: 'rafezyfarbod@gmail.com',
           subject: 'MorTeam Security Alert!',
           text: 'The user ' + req.user.firstname + " " + req.user.lastname + ' tried to perform leader/administrator tasks. User ID: ' + req.user._id
       });
       res.end("fail");
     }
   }

   this.userNotFound = function(response) {
     response.writeHead(200, {
       "Content-Type": "text/plain"
     });
     response.end("User not found");
   }

   this.subdivisionNotFound = function(response) {
     response.writeHead(200, {
       "Content-Type": "text/plain"
     });
     response.end("Subdivision not found");
   }
   this.handleError = function(err, res){
     if(err){
       console.error(err);
       fs.appendFile("errors.txt", err.toString());
       fs.appendFile("errors.txt", "##################");
       res.end("fail");
       return
     }else{
       return
     }
   }
   this.validPhoneNum = function(num) { //not being used
     var phone = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
     if(num.value.match(phone)){
       return true;
     }else{
       return false;
     }
   }
   this.findTeamInUser = function(user, teamId){
     for(var i = 0; i < user.teams.length; i++){
       if(user.teams[i].id == teamId){
         return user.teams[i];
       }
     }
   }

   this.getIdsFromObjects = function(objects){ //not being used
     result = [];
     for(var i = 0; i < objects.length; i++){
       result.push( objects[i]._id );
     }
     return result;
   }

   this.getUserOtherThanSelf = function(twoUsers, selfId){
     if(twoUsers[0] == selfId){
       return twoUsers[1];
     }else{
       return twoUsers[0];
     }
   }
   this.removeDuplicates = function(arr) {
     var result = [];
     for(var i = 0; i < arr.length; i++) {
       var dup = false;
       for(var j = 0; j < i; j++) {
         if( JSON.stringify( arr[i] ) == JSON.stringify( arr[j] ) ) {
           dup = true;
           break;
         }
       }
       if(!dup) {
         result.push(arr[i]);
       }
     }
     return result;
   }
   this.removeHTML = function(text){
     return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        //  text.replace(/\<(?!a|br).*?\>/g, "");
   }
   this.normalizeDisplayedText = function(text){
     return Autolinker.link(removeHTML(text));
   }
   var daysInWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
   var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
   this.readableDate = function(datestr){
     var date = new Date(datestr);
     return months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
   }
   this.createRecepientList = function(users){
     var result = "";
     users.forEach(function(user){
       result += user.email + ", ";
     });
     result = result.substring(0, result.length-2);
     return result;
   }
   this.extToType = function(ext){
     var spreadsheet = ['xls', 'xlsx', 'numbers', '_xls', 'xlsb', 'xlsm', 'xltx', 'xlt'];
     var word = ['doc', 'rtf', 'pages', 'txt', 'docx'];
     var image = ['png', 'jpg', 'jpeg', 'jif', 'jfif', 'gif', 'raw', 'tiff', 'bmp', 'rif', 'tif', 'webp'];
     var keynote = ['key', 'ppt', 'pptx'];
     var audio = ['mp4', 'webm', 'mp3', 'wav', 'm4a', 'avi', 'wma', 'ogg', 'm4p', 'ra', 'ram', 'rm', 'mid', 'flv', 'mkv', 'ogv', 'mov', 'mpg'];
     if(~spreadsheet.indexOf(ext)){
       return "spreadsheet";
     }else if (~word.indexOf(ext)) {
       return "word";
     }else if (~image.indexOf(ext)) {
       return "image";
     }else if (~keynote.indexOf(ext)) {
       return "keynote";
     }else if (~audio.indexOf(ext)) {
       return "audio";
     }else if(ext == "pdf"){
       return "pdf";
     }else{
       return "unknown";
     }
   }
   this.uploadToProfPics = function(buffer, destFileName, contentType, callback) {
     profPicBucket.upload({
       ACL: 'public-read',
       Body: buffer,
       Key: destFileName.toString(),
       ContentType: contentType,
     }).send(callback);
   }
   this.uploadToDrive = function(buffer, destFileName, contentType, contentDisposition, callback) {
     driveBucket.upload({
       Body: buffer,
       Key: destFileName.toString(),
       ContentType: contentType,
       ContentDisposition: contentDisposition
     }).send(callback);
   }
   this.getFileFromDrive = function(fileName, callback){ //not being used
     driveBucket.getObject({Key: fileName}).send(callback)
   }
   this.deleteFileFromDrive = function(fileName, callback){
     driveBucket.deleteObject({Key: fileName}).send(callback)
   }
   this.resizeImage = function(buffer, size, suffix, callback){
     lwip.open(buffer, suffix, function(err, image){
       if(err){
         callback(err, undefined);
       }else{
         var hToWRatio = image.height()/image.width();
         if(hToWRatio >= 1){
           image.resize(size, size*hToWRatio, function(err, image){
             if(err){
               callback(err, undefined);
             }else{
               image.toBuffer(suffix, function(err, buffer){
                 if(err){
                   callback(err, undefined);
                 }else{
                   callback(undefined, buffer);
                 }
               })
             }
           })
         }else{
           image.resize(size/hToWRatio, size, function(err, image){
             if(err){
               callback(err, undefined);
             }else{
               image.toBuffer(suffix, function(err, buffer){
                 if(err){
                   callback(err, undefined);
                 }else{
                   callback(undefined, buffer);
                 }
               })
             }
           })
         }
       }
     });
   }
   String.prototype.contains = function(arg) {
     return this.indexOf(arg) > -1;
   };
   String.prototype.capitalize = function() {
     return this.charAt(0).toUpperCase() + this.slice(1);
   }
   Array.prototype.hasAnythingFrom = function(arr){
     var result = false;
     var r = [], o = {}, l = arr.length, i, v;
     for (i = 0; i < l; i++) {
         o[arr[i]] = true;
     }
     l = this.length;
     for (i = 0; i < l; i++) {
         v = this[i];
         if (v in o) {
             result = true;
             break;
         }
     }
     return result;
   }
   Array.prototype.hasObjectThatContains = function(key, value){
     for(var i = 0; i < this.length; i++){
       if( this[i][key] == value ){
         return true;
       }
     }
     return false;
   }
 })();
};
