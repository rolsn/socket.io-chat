var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.sendFile('index.html', {'root': '.'}, function(err) {
                console.log(err);
    });
});

io.on('connection', function(socket) {
    console.log('a user connected');
    io.emit('CONN', 'a user connected');

    socket.on('disconnect', function() {
        console.log('user disconnected');
        io.emit('CONN', 'a user disconnected');
    });

    socket.on('CHAT', function(msg) {
        io.emit('CHAT', msg);
    });

    socket.on('CMD', function(cmd) {
        cmd = cmd.substr(1, cmd.length);
        console.log("CMD:", cmd);
    });

});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
