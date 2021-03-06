const fs = require('fs');
const io = require('socket.io')();
const helpers = require(__dirname + '/../helpers.js');
const config = require(__dirname + '/settings.json');
const commands = require(__dirname + '/commands.js');
const turn = require(__dirname + '/turn.js');

var players = {};
var sockets = {};

// create a log file
const filename = new Date().toJSON().replace('T', '_').replace(/[:\.]/g, '-').slice(0, -1);
const stream = fs.createWriteStream(`./logs/${filename}.log`);

io.listen(config.port);
helpers.log(stream, `Started the server on port ${config.port}`);
process.send({ status: 'ready' });

io.on('connect', socket => {
    sockets[socket.id] = socket;
    helpers.log(stream, `New connection from ${socket.handshake.address}`);
    socket.on('join', name => {
        players[socket.id] = helpers.initPlayer();
        players[socket.id].socketID = socket.id;
        // no duplicate usernames allowed
        if (Object.values(players).filter(p => p.name === name).length > 0) {
            socket.emit('username_taken', name);
        } else {
            players[socket.id].name = name;
            helpers.log(stream, `Socket ${socket.id} joined w/ username ${name}`);
            io.emit('join', players[socket.id]);
        }
    });
    socket.on('command', msg => {
        const player = players[socket.id];
        turn.doCombatTurn(player);
        turn.doPetTurn(player);

        const username = player.name;
        const args = msg.split(' ');
        const command = args[0].toLowerCase();
        helpers.log(stream, `New command from ${username} with args ${args}`);
        const commandExists = command in commands;
        const commandAllowed = !helpers.Cheats.includes(command) || config.dev;
        if (commandExists && commandAllowed) {
            const response = commands[command](player, args, players, socket, io, sockets);
            socket.emit('command_response', response);
        } else {
            socket.emit('invalid_command', { message: 'Unknown command.' });
        }
        let deathReason = turn.checkDeath(player);
        if (deathReason !== false) {
            helpers.log(stream, `${username} died, reason: ${deathReason}`);
            io.emit('death', {
                username,
                socketID: socket.id,
                reason: deathReason
            });
        }
    });
    socket.on('disconnect', reason => {
        const username = players[socket.id].name;
        helpers.log(stream, `${username} was disconnected, reason: ${reason}`);
        io.emit('player_disconnect', {
            username,
            socketID: socket.id,
            reason
        });
        players[socket.id] = undefined;
    });
});
