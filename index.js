var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clients = {};

app.get('/', function(req, res) {
    res.sendFile('index.html', {'root': '.'}, function(err) {
                console.log(err);
    });
});

io.on('connection', function(socket) {
    io.emit('CONN', 'a user connected');
    var uid = socket.id;
    var nick = Math.random().toString(36).substr(10);
    var idstring = '(id=' + uid + ', nick=' + nick + ')'

    clients[uid] = {'nick': nick}
    socket.emit('NICKSET', nick);

    console.log('client connected ' + idstring);

    // event listeners

    socket.on('disconnect', function(msg) {
        delete clients[uid];
        var msg = 'client disconnected ' + idstring;
        io.emit('CONN', msg);

        console.log(msg);
    });

    socket.on('CHAT', function(msg) {
        console.log(msg);
        io.emit('CHAT', {'nick': nick, 'msg': msg});
    });

    socket.on('CMD', function(cmd) {
        cmd = cmd.substr(1, cmd.length);
        console.log("CMD:", cmd);
    });

});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

