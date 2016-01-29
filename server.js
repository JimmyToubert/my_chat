var express = require('express'),
app = express(),
http = require('http').Server(app),
io = require('socket.io').listen(http),
giphy = require('giphy-api-without-credentials')();

app.use('/assets', express.static('assets'));

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/assets/views/client.html');
});

var usernames = {};
var channels = {};
var rooms = [];
var default_room = "general";

io.sockets.on('connection', function (socket) {
	socket.on('adduser', function(username){
		if (username != null && username != '') {
			socket.username = username;
		} else {
			socket.username = 'Anonyme';
		}
		usernames[username] = socket.id;
		switchRoom(default_room, socket.id);
	});

	socket.on('sendchat', function (data) {
		io.to(usernames[socket.username]).in(socket.room).emit('updatechat', socket.room, socket.username, data);
	});
	
	socket.on('switchRoom', function(newroom, userId){
		switchRoom(newroom, userId);
	});

	socket.on('dc', function(str){
		if (!str) {
			str = socket.room;
		}
		console.log(str);
		console.log(default_room);
		channels[str].splice(channels[str].indexOf(socket.username),1);
		socket.leave(str);
		socket.join(default_room);
		socket.room = default_room;
		socket.broadcast.to(str).emit('updatechat', str,'SERVER', socket.username + ' has disconnected from the channel ' + str);
		
	});

	socket.on('nickname', function(username){
		if (!usernames[username] && username != 'Anonyme') {
			channels[socket.room].splice(channels[socket.room].indexOf(socket.username),1);
			channels[socket.room].push(username);
			usernames[username] = socket.id;
			delete usernames[socket.username];
			socket.username = username;
			socket.emit('updatechat', socket.room, 'SERVER', 'You changed your nickname to ' + username);
		} else {
			socket.emit('updatechat', socket.room, 'SERVER', 'The name ' + username + ' is already in use');
		}
	});

	socket.on('error', function(error){
		if (error) {
			error = '<span id=\'error\'>[' + error + '] ' + error + ' error occured';	
		} else {
			error = '<span id=\'error\'>[UNKNOWN] An unknown error occured';	
		}
		socket.emit('updatechat', socket.room, 'SERVER', error);
	});

	socket.on('gif', function(str){
		giphy.random(str, function(err, res) {
			io.to(usernames[socket.username]).in(socket.room).emit('updatechat', socket.room, socket.username, "<img src=\'" + res.data.image_url + "\' width=\"128\" height=\"128\" />");
		});
	});

	socket.on('listRooms', function(str){
		var results = [];
		if (str) {
			var i = 0;
			results = rooms.filter(function(val) {
				for (var i = 0; i < rooms.length; i++){
					if (val.indexOf(str) == -1){
						return false;
					}
				}
				return val;
			});
		} else {
			results = rooms;
		}
		socket.emit('updatechat', socket.room, 'SERVER', 'list of all rooms: ' +  results.join(' | '));
	});

	socket.on('listUsers', function(str){
		if (str != null) {
			socket.emit('updatechat', socket.room, 'SERVER', 'List of all users in the channel ' + str + ': ' + channels[str].join(' | '));
		} else {
			socket.emit('updatechat', socket.room, 'SERVER', 'List of all users in the channel ' + socket.room + ': ' + channels[socket.room].join(' | '));
		}
	});

	socket.on('whisper', function(target, message){
		socket.emit('updatechat', 'WHISP', socket.username, message);
		io.to(usernames[target]).emit('updatechat', "WHISP", socket.username, message);
	});

	socket.on('help', function(){
		var help = 'Hello, here is the list of all the command lines:'
		+'<ul>'
		+	'<li>/JOIN CHANNEL to join an existing or to create a channel.</li>'
		+	'<li>/NICKNAME /NICK YOURNICKNAME to change your name if he\'s not already used.</li>'
		+	'<li>/LIST (PATTERN) to list all channels or to search list which contains PATTERN.</li>'
		+	'<li>/PART /DISCONNECT /LEAVE (CHANNEL) to disconnect from current channel or CHANNEL.</li>'
		+	'<li>/USERS (CHANNEL) to list all users in the current channel or in CHANNEL.</li>'
		+	'<li>/MSG /MESSAGE /PRIVATE /WHISP(ER) USER to send a private message to USER.</li>'
		+	'<li>/HELP to see the help.</li>'
		+'</ul>';
		socket.emit('updatechat', socket.room, 'SERVER', help);
	});

	function switchRoom(newroom) {
		if (rooms.indexOf(newroom) == -1) {
			rooms.push(newroom);
		}
		if (!channels[newroom]) {
			channels[newroom] = [];
		}
		if (channels[newroom].indexOf(socket.username) == -1) {
			channels[newroom].push(socket.username);
		}
		socket.join(newroom);
		socket.room = newroom;
		socket.emit('updatechat', socket.room, 'SERVER', 'you have connected to ' + newroom);
		socket.broadcast.to(newroom).emit('updatechat', socket.room, 'SERVER', socket.username + ' has joined ' + newroom);
	};
});

http.listen(8080, function () {
  console.log('Server is listening on *:8080');
});