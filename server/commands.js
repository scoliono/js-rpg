var allItems = require(__dirname + '/../items.json');
var allAnimals = require(__dirname + '/../animals.json');

const config = require(__dirname + '/settings.json');
const helpers = require(__dirname + '/../helpers.js');

var ServerCommands = {};

ServerCommands.give = function (player, args, players, socket, io) {
    let itemName = helpers.multiWordArg(args);
    if (allItems[itemName]) {
        const result = helpers.giveItem(player, { [itemName]: 1 }, null);
        return result ? helpers.Status.SUCCESS : helpers.Status.NO_ACTION;
    } else {
        console.error(`Unrecognized item name ${itemName}`);
        return helpers.Status.NO_ACTION;
    }
};

ServerCommands.spawn = function (player, args, players, socket, io) {
    let animalName = helpers.multiWordArg(args);
    let animal = helpers.findAnimal(animalName);
    if (animal) {
        if (animal.friendly) {
            player.pet = {};
            Object.assign(player.pet, animal);
            return helpers.Status.SUCCESS;
        } else {
            player.opponent = {};
            Object.assign(player.opponent, animal);
            return helpers.Status.SUCCESS;
        }
    } else {
        console.error(`Unrecognized animal name ${animalName}`);
        return helpers.Status.NO_ACTION;
    }
};

ServerCommands.chat = function (player, args, players, socket, io) {
    const username = player.name;
    const msg = helpers.multiWordArg(args).trim();
    if (msg) {
        io.emit('chat', { message: msg, username });
    } else {
        socket.emit('invalid_command', { message: 'Blank message provided.' });
    }
    return { status: helpers.Status.NO_ACTION };
};

ServerCommands.players = function (player, args, players, socket, io) {
    return {
        players: Object.values(players).map(p => p.name),
        status: helpers.Status.NO_ACTION
    };
};

module.exports = ServerCommands;
