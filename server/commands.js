var allItems = require(__dirname + '/../items.json');
var allAnimals = require(__dirname + '/../animals.json');

const config = require(__dirname + '/settings.json');
const helpers = require(__dirname + '/../helpers.js');

var ServerCommands = {};

ServerCommands.give = async function (player, args, rl) {
    let itemName = helpers.multiWordArg(args);
    if (allItems[itemName]) {
        const result = await helpers.giveItem(player, { [itemName]: 1 }, rl);
        return result ? helpers.Status.SUCCESS : helpers.Status.NO_ACTION;
    } else {
        console.error(`Unrecognized item name ${itemName}`);
        return helpers.Status.NO_ACTION;
    }
};

ServerCommands.spawn = async function (player, args, io) {
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

ServerCommands.chat = async function (player, args, io) {
    const username = player.name;
    const msg = helpers.multiWordArg(args);
    io.emit('chat', { message: msg, username });
};

module.exports = ServerCommands;
