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
			socket.emit('updatechat', socket.room, 'ERROR', 'The name ' + username + ' is already in use');
		}
	});

	socket.on('errorParse', function(error){
		var result;
		if (error) {
			switch (error) {
				case 'JOIN':
					result = 'You can\'t join an empty room or SERVER/WHISP ones';
					break;
				case 'NICK':
					result = 'You need to specify a username';
					break;
				case 'MSG':
					result = 'You need to specify a user';
					break;
				case 'GIF':
					result = 'You need to specify a word';
					break;
			}
		} else {
			result = 'An unknown error occured';
		}
		socket.emit('updatechat', socket.room, 'ERROR', result);
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
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/JOIN CHANNEL to join an existing or to create a channel.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/NICKNAME /NICK YOURNICKNAME to change your name if he\'s not already used.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/LIST (PATTERN) to list all channels or to search list which contains PATTERN.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/PART /DISCONNECT /LEAVE (CHANNEL) to disconnect from current channel or CHANNEL.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/USERS (CHANNEL) to list all users in the current channel or in CHANNEL.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/MSG /MESSAGE /PRIVATE /WHISP(ER) USER to send a private message to USER.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/GIF WORD to get a random Gif from the WORD.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/CLEAR to clear the chat.</span></p>'
		+	'<p class=\'list collection-item\'><span class=\'btn text\'>/HELP to see the help.</span></p>'
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