var socket = io.connect();
var globid;

socket.on('connect', function(){
	if ($('#chat')) {
		$('#chat').empty();
	}
	socket.emit('adduser', prompt("Quel est ton pseudo?"));
});

socket.on('updatechat', function (room, username, data) {
	if (data != '' && data != null) {
		$('#chat').append(
			'<li><span class=\'room\'>' + room + '</span>'
			+ '<span class=\'username\'>'+ username + ':</span>'
			+ data + '</li>');
	}
});

function switchRoom(room, username){
	socket.emit('switchRoom', room, username);
}

$(function(){
	$('#datasend').click(function() {
		var backup = $('#data').val();
		var list = backup.split(' ');
		$('#data').val('');
		if (list[0].indexOf('\/') == 0) {
			list[0] = list[0].replace('\/', '').toUpperCase();
			switch (list[0]) {
				case 'JOIN':
					if (list[1] && list[1].toUpperCase() != "WHISP" && list[1].toUpperCase() != "SERVER") {
						globid = '\/#' + socket.id;
						switchRoom(list[1], globid);
					} else {
						socket.emit('error', 'JOIN');
					}
				break;
				case 'NICKNAME':
				case 'NICK':
					if (list[1]) {
						socket.emit('nickname', list[1]);
					} else {
						socket.error('error', 'NICK');
					}
				break;
				case 'LIST':
					if (list[1]) {
						socket.emit('listRooms', list[1]);
					} else {
						socket.emit('listRooms');
					}
				break;
				case 'PART':
				case 'LEAVE':
				case 'DISCONNECT':
					if (list[1]) {
						socket.emit('dc', list[1]);
					} else {
						socket.emit('dc');
					}
				break;
				case 'USERS':
					if (list[1]) {
						socket.emit('listUsers', list[1]);
					} else {
						socket.emit('listUsers');
					}
					break;
				case 'PRIVATE':
				case 'MSG':
				case 'MESSAGE':
				case 'WHISP':
				case 'WHISPER':
					if (list[1] && list[2]) {
						var target = list[1];
						list.splice(0, 2);
						var message = list.join(' ');
						socket.emit('whisper', target, message);
					} else {
						socket.error('error', 'MSG');
					}
				break;
				case 'HELP':
					socket.emit('help');
				break;
				case 'GIF':
					socket.emit('gif', list[1]);
				break;
			}
		} else {
			socket.emit('sendchat', backup);
		}
	});

	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
		}
	});
});