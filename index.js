var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var VERBOSE = true;
var clients = {};
var nicks = {};

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
    nicks[nick] = {'nick': nick, 'uid': uid, 'ipaddr': ipaddr}
    socket.emit('NICKSET', {status: 'success', newNick: nick});
    io.emit('CONN', '* client connected ' + idstring);
    if (VERBOSE) console.log('client connected ' + idstring);

    // event listeners

    socket.on('disconnect', function(msg) {
        delete clients[uid];
        delete nicks[nick];
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
            'MOTD': "cmd_motd",
            'QUIT': "cmd_quit",
            'WHO': cmd_who,
            'WHOIS': cmd_whois
        }
        var command = cmd.split(" ")[0].substr(1, cmd.length).toUpperCase();
        var params = cmd.split(" ").slice(1, cmd.length)
        if (VERBOSE) console.log("nick: " + nick + ", CMD:", command, "PARAMS:", params);

        if (command in commandMap) {
            commandMap[command](params)
        }
    });

    var cmd_nick = function(params) {
        if (params.length > 0) {
            var newNick = params[0];

            if (Object.keys(nicks).indexOf(newNick) === -1) {
                if (VERBOSE) console.log("nick change:", nick, "->", newNick);

                // delete the old nick from the global nicklist
                nicks[newNick] = nicks[nick];
                delete nicks[nick];
                // then create a new one and update
                clients[uid].nick = nick = newNick;

                socket.emit('NICKSET', {status: 'success', newNick: newNick});
            }
            else {
                // for now, simply 'set' the new nick to the same nick
                socket.emit('NICKSET', {status: 'error', errormsg: newNick + ' already in use'});
            }
        }

    };

    var cmd_who = function(params) {
        var users = [];

        for (prop in clients) {
            if (!clients.hasOwnProperty(prop)) {
                continue;
            }

            users.push(clients[prop].nick);
        };

        socket.emit('CMD', users);
    }

    var cmd_whois = function(params) {
        // just your own whois for now
        socket.emit('CMD', nick+'@'+ipaddr+" ("+uid+")");
    }

});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

