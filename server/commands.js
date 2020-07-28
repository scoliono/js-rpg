var allItems = require('../items.json');
var allAnimals = require('../animals.json');

const config = require('./settings.json');
const helpers = require('../helpers.js');

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

ServerCommands.spawn = async function (player, args) {
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

module.exports = ServerCommands;
