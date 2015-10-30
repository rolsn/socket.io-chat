var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var VERBOSE = true;
var clients = {};
var nicks = {};
var channels = {};

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
    nicks[nick] = {
        nick: nick,
        uid: uid,
        ipaddr: ipaddr,
        channels: [],
        away: false
    }
    socket.emit('CMD', {
        status: 'success',
        command: 'NICK',
        params: {
            newNick: nick
        }
    });

    io.emit('CONN', 'client connected ' + idstring);
    if (VERBOSE) console.log('client connected ' + idstring);

    /*
     * event listeners
     */

    socket.on('disconnect', function(msg) {
        delete clients[uid];
        delete nicks[nick];
        io.emit('CONN', 'client disconnected ' + idstring);

        if (VERBOSE) console.log(msg);
    });

    socket.on('CHAT', function(msg) {
        io.emit('CHAT', {'nick': clients[uid].nick, 'msg': msg});
    });

    socket.on('CMD', function(cmd) {
        var commandMap = {
            NICK        : cmd_nick,
            AWAY        : "cmd_away",
            PRIVMSG     : "cmd_privmsg",
            JOIN        : "cmd_join",
            LIST        : "cmd_list",
            MODE        : "cmd_mode",
            MOTD        : cmd_motd,
            PART        : "cmd_part",
            QUIT        : "cmd_quit",
            WHO         : cmd_who,
            WHOIS       : cmd_whois
        }
        var command = cmd.split(" ")[0].substr(1, cmd.length).toUpperCase();
        var params = cmd.split(" ").slice(1, cmd.length)
        if (VERBOSE) console.log("nick: " + nick + ", CMD:", command, "PARAMS:", params);

        if (command in commandMap) {
            commandMap[command](params)
        }
    });

    /*
     * callbacks
     */

    var cmd_motd = function() {
        socket.emit('CMD', {
            status: 'success',
            command: 'MOTD',
            params: {
                motd: "Welcome to the fake irc server."
            }
        });
    }

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

                socket.emit('CMD', {
                    status: 'success',
                    command: 'NICK',
                    params: {
                        newNick: newNick
                    }
                });
            } else {
                socket.emit('CMD', {
                    status: 'error',
                    command: 'NICK',
                    statusMsg: newNick + ' already in use'
                });
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

        socket.emit('CMD', {
            status: 'success',
            command: 'WHO',
            params: {
                who: users
            }
        });
    }

    var cmd_whois = function(params) {
        var nick = params[0]

        if (nick in nicks) {
            socket.emit('CMD', {
                status: 'success',
                command: 'WHOIS',
                params: {
                    whois: nick
                }
            });
        } else {
            socket.emit('CMD', {
                status: 'error',
                command: 'WHOIS',
                statusMsg: 'no such user ' + nick
            });
        }
    }

    cmd_motd();

});

http.listen(3000, function() {
    console.log('listening on *:3000');
});

