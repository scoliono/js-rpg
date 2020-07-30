const fs = require('fs');
const io = require('socket.io')();
const helpers = require(__dirname + '/../helpers.js');
const config = require(__dirname + '/settings.json');
const commands = require(__dirname + '/commands.js');

var players = {};

// create a log file
const filename = new Date().toJSON().replace('T', '_').replace(/[:\.]/g, '-').slice(0, -1);
const stream = fs.createWriteStream(`./logs/${filename}.log`);

io.listen(config.port);
helpers.log(stream, `Started the server on port ${config.port}`);
process.send({ status: 'ready' });

io.on('connect', socket => {
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
        const username = player.name;
        const args = msg.split(' ');
        const command = args[0].toLowerCase();
        helpers.log(stream, `New command from ${username} with args ${args}`);
        if (command in commands && (!helpers.Cheats.includes(command) || config.dev)) {
            const result = commands[command](player, args, io);
            //TODO: decide socket.emit or io.emit
            io.emit('command', { result, command: msg, player: username });
        }
    });
});
