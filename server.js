const fs = require('fs');
const io = require('socket.io')();
const config = require('./settings.json');

// create a log file
const filename = new Date().toJSON().replace('T', '_').replace(/[:\.]/g, '-').slice(0, -1);
const stream = fs.createWriteStream(`./logs/${filename}.log`);

function log(message, severity = 'INFO')
{
    let timestamp = new Date().toJSON().replace('T', ' ').slice(0, -1);
    stream.write(`[${timestamp}] ${severity.toUpperCase()}: ${message}`);
}

io.listen(config.port);
process.send({ status: 'ready' });
log(`Started the server on port ${config.port}`);

io.on('connect', socket => {
    log('New connection');
});
