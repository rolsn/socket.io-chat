var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var VERBOSE = true;
var clients = {};

app.get('/', function(req, res) {
    res.sendFile('index.html', {'root': '.'}, function(err) {
                console.log(err);
    });
});

io.on('connection', function(socket) {
    var uid = socket.id;
    var ipaddr = socket.client.conn.remoteAddress;
    var nick = Math.random().toString(36).substr(10);
    var idstring = '(' + nick + '@' + ipaddr + ')';

    clients[uid] = {'nick': nick}
    socket.emit('NICKSET', nick);
    io.emit('CONN', 'client connected ' + idstring);
    if (VERBOSE) console.log('client connected ' + idstring);

    // event listeners

    socket.on('disconnect', function(msg) {
        delete clients[uid];
        var msg = 'client disconnected ' + idstring;
        io.emit('CONN', msg);

        if (VERBOSE) console.log(msg);
    });

    socket.on('CHAT', function(msg) {
        io.emit('CHAT', {'nick': clients[uid].nick, 'msg': msg});
    });

    socket.on('CMD', function(cmd) {
        var commandMap = {
            'NICK': cmd_nick,
            'AWAY': "cmd_away",
            'PRIVMSG': "cmd_privmsg",
            'LIST': "cmd_list",
            'MODE': "cmd_mode",
            'LUSERS': cmd_lusers,
            'MOTD': "cmd_motd",
            'QUIT': "cmd_quit",
            'WHOIS': "cmd_whois"
        }
        var command = cmd.split(" ")[0].substr(1, cmd.length).toUpperCase();
        var params = cmd.split(" ").slice(1, cmd.length)
        if (VERBOSE) console.log("nick: " + nick + ", CMD:", command, ", PARAMS:", params);

        if (command in commandMap) {
            commandMap[command](command, params)
        }
    });

    var cmd_nick = function(cmd, params) {
        if (params.length > 0) {
            var newNick = params[0];

            if (VERBOSE) console.log("nick change:", nick, "to", newNick);
            clients[uid].nick = nick = newNick;
            socket.emit('NICKSET', newNick);
        }

    };

    var cmd_lusers = function(cmd, params) {
        var users = [];

        for (prop in clients) {
            if (!clients.hasOwnProperty(prop)) {
                continue;
            }

            users.push(clients[prop].nick);
        };

        if (VERBOSE) console.log(users);
        socket.emit('CMD', users);
    }

});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

