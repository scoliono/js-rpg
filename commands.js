var allItems = require('./items.json');
var allAnimals = require('./animals.json');

const config = require('./config.json');
const helpers = require('./helpers.js');
const process = require('process');

const give = function (player, args) {
    let itemName = helpers.multiWordArg(args);
    if (allItems[itemName]) {
        helpers.giveItem(player, allItems, itemName);
        return helpers.Status.SUCCESS;
    } else {
        console.error(`Unrecognized item name ${itemName}`);
        return helpers.Status.FAILURE;
    }
};

const spawn = function (player, args) {
    let animalName = helpers.multiWordArg(args);
    let animal = helpers.findAnimal(animalName);
    if (animal) {
        if (animal.friendly) {
            console.error('Unimplemented');
            return helpers.Status.FAILURE;
        } else {
            player.opponent = Object.create(animal);
            return helpers.Status.SUCCESS;
        }
    } else {
        console.error(`Unrecognized animal name ${animalName}`);
        return helpers.Status.FAILURE;
    }
};

const craft = function (player, args) {
    let itemName = helpers.multiWordArg(args);
    if (!itemName) {
        console.error('You did not specify an item to craft.');
        return helpers.Status.FAILURE;
    }
    let item = allItems[itemName];
    // only allow already discovered items with ingredients list to be crafted 
    if (item && item.ingredients && item.discovered) {
        let success = helpers.removeItems(player.inventory, item.ingredients);
        if (success) {
            player.inventory.push({ name: itemName });
            console.log(`You crafted a ${itemName}!`);
            return helpers.Status.SUCCESS;
        } else {
            console.log(`To craft a ${itemName} you need:`);
            for (let ingredient in item.ingredients) {
                let requiredCount = item.ingredients[ingredient];
                console.log(`- ${requiredCount}x ${ingredient}`);
            }
            return helpers.Status.FAILURE;
        }
    } else {
        console.log('You\'ve never heard of that before.');
        return helpers.Status.FAILURE;
    }
};

const eat = function (player, args) {
    if (player.hunger < 100) {
        let success = helpers.removeItems(player.inventory, {'Rations': 1});
        if (success) {
            player.hunger += helpers.randomInt(...allItems.Rations.hunger);
            player.hunger = Math.min(player.hunger, 100);
            return helpers.Status.SUCCESS;
        } else {
            console.error('You have nothing to eat.');
            return helpers.Status.FAILURE;
        }
    } else {
        console.error('You are not hungry.');
        return helpers.Status.FAILURE;
    }
};

const walk = function (player, args) {
    const place = helpers.multiWordArg(args) || 'middle of nowhere';
    console.log(`You walk to the ${place}.`);
    player.hunger -= helpers.randomInt(1, 5);
    player.justMoved = true;
    return helpers.Status.SUCCESS | helpers.Status.MOVED;
};

const run = function (player, args) {
    const place = helpers.multiWordArg(args) || 'middle of nowhere';
    console.log(`You run to the ${place}.`);
    player.hunger -= helpers.randomInt(3, 10);
    player.justMoved = true;
    return helpers.Status.SUCCESS | helpers.Status.MOVED;
};

const inventory = function (player) {
    console.log(`${player.inventory.length}/${player.maxInventorySlots} items full`);
    if (player.inventory.length === 0) {
        console.log('You have nothing!');
        return helpers.Status.FAILURE;
    }
    Object.keys(allItems).forEach(item => {
        const count = helpers.countItem(player.inventory, item);
        if (count > 0) {
            console.log(`${item} x${count}`);
        }
    });
    return helpers.Status.SUCCESS;
};

const rummage = function (player) {
    if (player.inventory.length === player.maxInventorySlots) {
        console.error('Your inventory is full! Please drop something first.');
        return helpers.Status.FAILURE;
    }
    const randItem = helpers.randomItem();
    player.hunger -= helpers.randomInt(3, 5);
    if (randItem === 'Nothing') {
        console.log('You didn\'t pick up anything!');
    } else {
        helpers.giveItem(player, allItems, randItem);
    }
    return helpers.Status.SUCCESS | helpers.Status.MOVED;
};

const attack = function (player, args) {
    // make sure the player is in combat
    if (!player.opponent) {
        console.error('You are not fighting anything.');
        return helpers.Status.FAILURE;
    }
    let itemName = helpers.multiWordArg(args);
    if (itemName) {
        // check that you have the weapon you want to attack with
        if (helpers.countItem(player.inventory, itemName) === 0) {
            console.error('You don\'t have that weapon.');
            return helpers.Status.FAILURE;
        }
        // if you are attacking with Arrow, make sure you have a bow
        if (itemName === 'Arrow' && helpers.countItem(player.inventory, 'Bow') === 0) {
            console.error('You need a Bow to shoot Arrows.');
            return helpers.Status.FAILURE;
        }
        // if you are attacking with Bow, make sure you have an arrow
        else if (itemName === 'Bow' && helpers.countItem(player.inventory, 'Arrow') === 0) {
            console.error('You need an Arrow to use a Bow.');
            return helpers.Status.FAILURE;
        }
    } else {
        itemName = 'Fists';
    }
    let weapon = allItems[itemName];
    let dmg = helpers.randomInt(...weapon.strength);
    player.opponent.health -= dmg;
    let move = helpers.randomChoice(weapon.moves);
    console.log(`=== You ${move} the ${player.opponent.name}, doing ${dmg} HP of damage ===`);
    // if the player shot an arrow, remove it from the inventory
    if (itemName === 'Arrow' || itemName === 'Bow') {
        helpers.removeItems(player.inventory, { Arrow: 1 });
    }
    return helpers.Status.SUCCESS;
};

const heal = function (player, args) {
    const result = helpers.removeItems(player.inventory, {
        Bandage: 1
    });
    if (result) {
        const healed = helpers.randomInt(...allItems.Bandage.healing);
        player.health += healed;
        console.log(`You used 1 Bandage and restored ${healed} HP.`);
        return helpers.Status.SUCCESS;
    } else {
        console.error('You do not have any Bandages to heal yourself with.');
        return helpers.Status.FAILURE;
    }
};

const drop = function (player, args) {
    const itemName = helpers.multiWordArg(args);
    if (!itemName) {
        console.error('You did not specify an item to drop.');
        return helpers.Status.FAILURE;
    }
    const result = helpers.removeItems(player.inventory, {
        [itemName]: 1
    });
    if (result) {
        console.log(`You dropped the ${itemName}.`);
        return helpers.Status.SUCCESS;
    } else {
        console.log(`Failed to drop a ${itemName}.`);
        return helpers.Status.FAILURE;
    }
};

const clear = function () {
    console.clear();
    return helpers.Status.SUCCESS;
};

const help = function () {
    let cmds = Object.keys(module.exports);
    if (!config.dev) {
        cmds = cmds.filter(cmd => !helpers.Cheats.includes(cmd));
    }
    console.log(cmds.join(', '));
    return helpers.Status.SUCCESS;
};

const quit = function () {
    process.exit(0);
    return helpers.Status.SUCCESS;
};

module.exports = {
    craft, eat, heal, walk, run, attack,
    inventory, rummage, drop,
    clear, help, quit, give, spawn
};
