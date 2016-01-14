#MorTeam Beta 4
***
##Contact
support@morteam.com
##Usage
This is the REST format for the MorTeam server. It can be used to create or improve upon clients that wish to use MorTeam as their backend.

IMPORTANT NOTES:

1. While the user is logged in, all requests have a req.user object that contains the logged-in user’s info (minus password).
2. For brevity, self explanatory parameters will be replaced with "SE"

###Basic Format
```
<Request URL>:

	server receives:

		<key>: <value>,

		<key>: <value>,

		...

	server sends:

		error: <String>

		success: <String or JSON>
```
###Requests
```
/f/login:

	server receives:

		username: username or email

		password: SE

	server sends:

		error: "fail", “inc/username”, “inc/password”

		success: JSON of user
```
* * *
```
/f/getUsersInTeam:

	server receives:

		nothing

	server sends:

		error: "fail"

		success: JSON of user
```
* * *
```
/f/deleteUser:

	server receives:

		_id: the _id of the user that s being deleted

	server sends:

		error: "fail"

		success: "success"
```
* * *
```
/f/logout:

	server receives:

		nothing

	server sends:

		error: "fail"

		success: "success"
```
* * *
```
/f/joinTeam:

	server receives:

		team_id: the id (NOT _id) of the team that wants to be joined>

	server sends:

		error: "fail", “no such team”, “banned”

		success: "success"
```
* * *
```
/f/createSubdivision:

	server receives:

		name: SE

		type: public or private

	server sends:

		error: "fail"

		success: String of the newly created subdivision _id

		NOTE: If the request succeeds, depending on how the client UI is formatted,

		one must call /f/inviteToSubdivision in a loop in the client
```
* * *
```
/f/getPublicSubdivisions:

	server receives:

		nothing

	server sends:

		error: "fail"

		success: JSON of public subdivisions in current team
```
* * *
```
/f/getAllSubdivisionsForUserInTeam:

	server receives:

		nothing

	server sends:

		error: "fail"

		success: JSON format: [{name: <subdivision name>, _id: <subdivision _id>}]
```
* * *
```
/f/getAnnouncementsForUser:

	server receives:

        skip: the number of announcements to skip from the beginning(most recent)

        //this request always returns 20 announcements so make skip a multiple of 20

	server sends:

		error: "fail"

		success: JSON string of announcements
```
* * *
```
/f/postAnnouncement:

	server receives:

		audience: {

			userMembers: [<Array of user _ids>],

			subdivisionMembers: [<Array of subdivision _ids>]

		} OR "everyone" //this makes it so everyone in the team can see it

		content: SE

	server sends:

		error: "fail"

		success: the new announcement _id
```
* * *
```
/f/deleteAnnouncement:

	server receives:

		_id: the _id of the announcement

	server sends:

		error: "fail"

		success: "success"
```
* * *
```
/f/createUser

	server receives:

		firstname: SE

		lastname: SE

		username: SE

		password: SE

		password_confirm: SE

		email: SE

		phone: SE

		(OPTIONAL) profpic: <profile picture image (has to be sent as multipart data)>

	server sends:

		success: "success"

		error: "fail"
```
* * *
```
/f/createChat:

	server receives:

        subdivisionMembers: [ _id of subdivisions ] (OPTIONAL: only send if it is a group chat)

		userMembers: [ _id of users ]  (OPTIONAL: only send if it is a group chat)

		type: "private” || "group”

		user2: _id of the other user (OPTIONAL: only send user2 if it is a private chat)

		name (OPTIONAL: only send name if it is a group chat)

	server sends:

		error: "fail"

		success: JSON of the chat that was just created
```
* * *
```
/f/getChatsForUser:

	server receives:

		nothing

	server sends:

		error: "fail"

		success: JSON array of chats
```
* * *
```
/f/loadMessagesForChat:

	server receives:

        skip: number of messages to skip from the most recent (start with 0, increment by 20 for pagination)

        chat_id: SE

	server sends:

		error: "fail"

		success: JSON array of messages
```
* * *

NOTE: the following two requests are similar but should not be confused.

```/f/getUsersInChat``` returns each individual user who is able to see the chat. For example if the chats members were the programming subdivision and 2 people from build, it would return an array of user _ids that consists of all of the members of programming and those 2 users from build.

```/f/getMembersOfChat``` however returns object with userMembers and subdivisionMembers both of which are arrays of _ids of users and subdivisions respectively

* * *
```
/f/getUsersInChat:

	server receives:

		chat_id: SE

	server sends:

		error: "fail"

		success: JSON array of users
```
* * *
```
/f/getMembersOfChat

	server receives:

		chat_id: SE

	server sends:

		error: "fail"

		success: {members: SE, group: <boolean>}
```
* * *
```
/f/changeGroupName

	server receives:

		chat_id: SE

		newName: SE

	server sends:

		error: "fail"

		success: "success"
```
* * *
```
/f/deleteChat

	server receives:

		chat_id: SE

	server sends:

		error: "fail"

		success: "success"
```
* * *
```
/f/sendMessage

	server receives:

		chat_id: SE

		content: SE

	server sends:

		error: "fail"

		success: "success"
```
* * *

NOTE: The following code is written in JavaScript to demonstrate use of socket.io. However, it is very similar in other ports such as iOS and Android.

* * *

On page load:
```JavaScript
socket.emit(“get clients”);
```
And right underneath type
```JavaScript
socket.on(“get clients”, function(online_clients){
  //online_clients contains a JSON object of all the online clients
});
```
Inside the callback, you can request ```/f/getChatsForUser``` and check if each user is online or offline. This can be done like so:
```JavaScript
if( online_clients[user2._id.toString()] != undefined ){
    //online
}else{
    //offline
}
```

Receiving messages
```JavaScript
socket.on(“message”, function(msg){
  //use msg
});
```

When someone becomes online or offline
```JavaScript
socket.on(“joined”, function(data){
  //data._id is the _id of whoever just joined
});
socket.on(“left”, function(data){
  //data._id is the _id of whoever just left
});
```

When a new chat is made where the user is a recipient
```JavaScript
socket.on(“new chat”, function(data){
  //use data
});
```

The variable "data" looks like:
```JavaScript
{
  type: "private"
  chat_id: SE
  user_id: _id of the user who created the chat
  firstname: of the user who created the chat
  lastname: of the user who created the chat
  profpicpath: of the user who created the chat
}
//OR
{
  type: "group"
  chat_id: SE
  user_id: _id of the user who created the chat
  userMembers: SE
  subdivisionMembers: SE
  name: of the group chat
}
```

Received when someone starts typing
```JavaScript
socket.on(“start typing”, function(data){
  //data.chat_id is the _id of the chat in which someone started to type
});

```

Received when someone stops typing
```JavaScript
socket.on(“stop typing”, function(data){
  //data.chat_id is the _id of the chat in which someone stopped typing
});
```

Send when user starts typing
```JavaScript
socket.emit(“start typing”, {chat_id: SE})
```

Send when user stops typing
```JavaScript
socket.emit(“stop typing”, {chat_id: SE})
```

Sending messages
```JavaScript
//group chat
socket.emit("message", {
  chat_id: SE
  content: SE,
  chat_name: SE
  type: "group"
});

//private chat
socket.emit("message", {
  chat_id: SE
  content: SE,
  type: "private"
});
```

Send when user creates new chat
```JavaScript
//private chat
socket.emit('new chat', {
  type: "private",
  receiver: _id of the other user
  chat_id: _id of the new chat
});

//group chat
socket.emit('new chat', {
  type: "group",
  userMembers: SE
  subdivisionMembers: SE
  name: SE
  chat_id: SE
});
```
* * *
```
/f/getUserAbsences:

	server receives:

		user_id: SE

	server sends:

		error: "fail"

		success: {present: <# of presences>, absences: <array of event _ids> }
```
* * *
```
/f/editProfile:

	server receives:

		email: SE

		phone: SE

		firstname: SE

		lastname: SE

		(OPTIONAL) new_prof_pic: SE

	server sends:

		error: "fail"

		success: "success"

//NOTE: If user only changes one property, for example email, send a new email value to the server, but send the old values for the other properties, except for profile picture.
```
* * *
```
/f/changePassword:

	server receives:

		old_password: SE

		new_password: SE

		new_password_confirm: SE

	server sends:

		error: "fail", “fail: incorrect password”, “fail: new passwords do not match”

		success: "success"
```
* * *
```
/f/forgotPassword:

	server receives:

		email: SE

		username: SE

	server sends:

		error: "fail", “does not exist”

		success: "success" (and emails user new randomly generated password)
```
* * *
```
/f/getUser

	server receives:

		_id: SE

	server sends:

		error: "fail"

		success: user JSON
```
* * *
```
/f/assignTask:

	server receives:

		task_description: SE

		task_name: SE

		user_id: the assignee

		due_date: JavaScript Date Object OR Date string

	server sends:

		error: "fail"

		success: _id of the new task
```
* * *
```
/f/getCompletedUserTasks:

	server receives:

		user_id: SE

	server sends:

		error: "fail"

		success: JSON of completed tasks
```
* * *
```
/f/getPendingUserTasks:

	server receives:

		user_id: SE

	server sends:

		error: "fail"

		success: JSON of pending tasks
```
* * *
```
/f/markTaskAsCompleted:

	server receives:

		target_user: _id of target user

		task_id: SE

	server sends:

		error: "fail"

		success: "success"
```
To be continued...
