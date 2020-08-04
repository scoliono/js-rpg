const helpers = require(__dirname + '/../helpers.js');

var ClientEvents = function ClientEvents(socket) {
    this.socket = socket;
};

ClientEvents.prototype.onPlayerJoined = function (player, resolve) {
    // ensure the player that just joined was us
    if (player.socketID === this.socket.id) {
        resolve(player);
        console.log(`* You joined the game`);
    } else {
        console.log(`* <${player.name}> joined the game`);
    }
};

ClientEvents.prototype.onChatMessage = function ({ message, username }) {
    console.log(`<${username}> ${message}`);
};

ClientEvents.prototype.onDeath = function ({ username, socketID, reason }) {
    var str = '* ';
    if (socketID === this.socket.id) {
        str += 'You'
    } else {
        str += username;
    }
    if (reason === helpers.DeathReason.STARVATION) {
        str += ' starved to death!';
    } else if (reason === helpers.DeathReason.KILLED && socketID !== this.socket.id) {
        str += ' was killed!';
    } else if (reason === helpers.DeathReason.KILLED && socketID === this.socket.id) {
        str += ' were killed!';
    } else {
        str += ' died!';
    }
    console.log(str);
};

module.exports = ClientEvents;
