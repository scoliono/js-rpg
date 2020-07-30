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

module.exports = ClientEvents;
