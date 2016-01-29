var socket = io.connect();
var globid;

socket.on('connect', function(){
	if ($('#chat')) {
		$('#chat').empty();
	}
	socket.emit('adduser', prompt("Quel est ton pseudo?"));
	$('.brand-logo').text('general');
	$('#data').focus();
});

socket.on('updatechat', function (room, username, data, color) {
	if (data != '' && data != null) {
		switch (username) {
			case "SERVER":
			case "ERROR":
				color = username;
				break;
		}
		if (room == "WHISP") {
			color = room;
		};
		if (!color) {
			if (username == socket.username) {
				color = "ME";
			} else {
				color = "GENERAL";
			}
		}
		$('#chat').append(
			'<p class=\'list collection-item ' + color + '\'><span class=\'room btn\'>' + room.substr(0, 4) + '</span>'
			+ '<span class=\'btn username\'>' + username + '</span>'
			+ '<span class=\'btn text\'>' + data + '</span></p>');
		$(window).scrollTop(9999);
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
						$('.brand-logo').text(list[1]);
					} else {
						socket.emit('errorParse', list[0]);
					}
				break;
				case 'NICKNAME':
				case 'NICK':
					if (list[1]) {
						socket.emit('nickname', list[1]);
					} else {
						socket.emit('errorParse', list[0]);
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
						socket.emit('errorParse', list[0]);
					}
				break;
				case 'HELP':
					socket.emit('help');
				break;
				case 'GIF':
					if (list[1]) {
						socket.emit('gif', list[1]);
					} else {
						socket.emit('errorParse', list[0]);
					}
				break;
				case 'CLEAR':
					$('#chat').empty();
				break;
			}
		} else {
			socket.emit('sendchat', backup);
		}
		$('#data').focus();
	});

	$('#data').keypress(function(e) {
		if(e.which == 13) {
			$(this).blur();
			$('#datasend').focus().click();
		}
	});
});