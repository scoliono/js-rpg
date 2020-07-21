const fs = require('fs');
const io = require('socket.io')();
const helpers = require('./helpers.js');
const config = require('./settings.json');

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
        players[socket.id].name = name;
        helpers.log(stream, `Socket ${socket.id} joined w/ username ${name}`);
        io.emit('join', players[socket.id]);
    });
    socket.on('chat', msg => {
        const username = players[socket.id].name;
        helpers.log(stream, `New chat message from ${username}: ${msg}`);
        io.emit('chat', { message: msg, username });
    });
});