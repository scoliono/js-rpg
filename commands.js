var allItems = require('./items.json');
var allAnimals = require('./animals.json');

const config = require('./config.json');
const helpers = require('./helpers.js');
const process = require('process');

const give = function (player, args) {
    let itemName = helpers.multiWordArg(args);
    if (allItems[itemName]) {
        const result = helpers.giveItem(player, { [itemName]: 1 });
        return result ? helpers.Status.SUCCESS : helpers.Status.NO_ACTION;
    } else {
        console.error(`Unrecognized item name ${itemName}`);
        return helpers.Status.NO_ACTION;
    }
};

const spawn = function (player, args) {
    let animalName = helpers.multiWordArg(args);
    let animal = helpers.findAnimal(animalName);
    if (animal) {
        if (animal.friendly) {
            player.pet = Object.create(animal);
            return helpers.Status.SUCCESS;
        } else {
            player.opponent = Object.create(animal);
            return helpers.Status.SUCCESS;
        }
    } else {
        console.error(`Unrecognized animal name ${animalName}`);
        return helpers.Status.NO_ACTION;
    }
};

const craft = function (player, args) {
    let itemName = helpers.multiWordArg(args);
    if (!itemName) {
        console.error('You did not specify an item to craft.');
        return helpers.Status.NO_ACTION;
    }
    let item = allItems[itemName];
    // only allow already discovered items with ingredients list to be crafted 
    if (item && item.ingredients && player.discoveredItems[itemName]) {
        let success = helpers.removeItems(player.inventory, item.ingredients);
        if (success) {
            //TODO: update to use giveItem
            player.inventory.push({ name: itemName });
            console.log(`You crafted a ${itemName}!`);
            return helpers.Status.SUCCESS;
        } else {
            console.log(`To craft a ${itemName} you need:`);
            for (let ingredient in item.ingredients) {
                let requiredCount = item.ingredients[ingredient];
                console.log(`- ${requiredCount}x ${ingredient}`);
            }
            return helpers.Status.NO_ACTION;
        }
    } else {
        console.log('You\'ve never heard of that before.');
        return helpers.Status.NO_ACTION;
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
            return helpers.Status.NO_ACTION;
        }
    } else {
        console.error('You are not hungry.');
        return helpers.Status.NO_ACTION;
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
        return helpers.Status.NO_ACTION;
    }
    Object.keys(allItems).forEach(item => {
        const count = helpers.countItem(player.inventory, item);
        if (count > 0) {
            console.log(`${item} x${count}`);
        }
    });
    return helpers.Status.NO_ACTION;
};

const rummage = function (player) {
    const randItem = helpers.randomItem();
    player.hunger -= helpers.randomInt(3, 5);
    if (randItem === 'Nothing') {
        console.log('You didn\'t pick up anything!');
    } else {
        helpers.giveItem(player, { [randItem]: 1 });
    }
    return helpers.Status.SUCCESS | helpers.Status.MOVED;
};

const attack = function (player, args) {
    let target;
    switch (args[1]) {
        case 'enemy':
        case 'e':
            target = player.opponent;
            break;
        case 'friendly':
        case 'f':
            target = player.pet;
            break;
        default:
            console.error('You need to attack either an "enemy" or "friendly" animal.');
            return helpers.Status.NO_ACTION;
    }
    // make sure the player's target exists
    if (!target) {
        console.error('There is no animal to fight.');
        return helpers.Status.NO_ACTION;
    }
    let itemName = helpers.multiWordArg(args, 2);
    if (itemName) {
        // check that you have the weapon you want to attack with
        if (helpers.countItem(player.inventory, itemName) === 0) {
            console.error('You don\'t have that weapon.');
            return helpers.Status.NO_ACTION;
        }
        // if you are attacking with Arrow, make sure you have a bow
        if (itemName === 'Arrow' && helpers.countItem(player.inventory, 'Bow') === 0) {
            console.error('You need a Bow to shoot Arrows.');
            return helpers.Status.NO_ACTION;
        }
        // if you are attacking with Bow, make sure you have an arrow
        else if (itemName === 'Bow' && helpers.countItem(player.inventory, 'Arrow') === 0) {
            console.error('You need an Arrow to use a Bow.');
            return helpers.Status.NO_ACTION;
        }
    } else {
        itemName = 'Fists';
    }
    let weapon = allItems[itemName];
    let dmg = helpers.randomInt(...weapon.strength);
    target.health -= dmg;
    let move = helpers.randomChoice(weapon.moves);
    console.log(`=== You ${move} the ${target.name}, doing ${dmg} HP of damage ===`);
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
        return helpers.Status.NO_ACTION;
    }
};

const drop = function (player, args) {
    const itemName = helpers.multiWordArg(args);
    if (!itemName) {
        console.error('You did not specify an item to drop.');
        return helpers.Status.NO_ACTION;
    }
    const result = helpers.removeItems(player.inventory, {
        [itemName]: 1
    });
    if (result) {
        console.log(`You dropped the ${itemName}.`);
        return helpers.Status.SUCCESS;
    } else {
        console.log(`Failed to drop a ${itemName}.`);
        return helpers.Status.NO_ACTION;
    }
};

const equip = function (player, args) {
    const itemName = helpers.multiWordArg(args);
    if (!allItems[itemName].equippable) {
        console.error('You cannot equip that.');
        return helpers.Status.NO_ACTION;
    }
    if (player.shield) {
        console.error(`You already have a ${player.shield.name} equipped.`);
        return helpers.Status.NO_ACTION;
    }
    const result = helpers.removeItems(player.inventory, { [itemName]: 1 });
    if (result) {
        player.shield = result[0];
        let durabilityStr;
        if (player.shield.maxDurability === Infinity) {
            durabilityStr = 'Unbreakable';
        } else {
            durabilityStr = `${result[0].durability}/${result[0].maxDurability}`;
        }
        console.log(`You equipped a ${result[0].name}, with durability ${durabilityStr}.`);
        return helpers.Status.SUCCESS;
    } else {
        console.error('You can\'t equip that since you don\'t have it.');
        return helpers.Status.NO_ACTION;
    }
};

const unequip = function (player, args) {
    if (player.inventory.length === player.maxInventorySlots) {
        console.error('You need to get rid of something before unequipping.');
        return helpers.Status.NO_ACTION;
    }
    const shield = player.shield;
    player.inventory.push(player.shield);
    player.shield = null;
    console.log(`Unequipped the ${shield.name}.`);
    return helpers.Status.SUCCESS;
};

const clear = function () {
    console.clear();
    return helpers.Status.NO_ACTION;
};

const help = function () {
    let cmds = Object.keys(module.exports);
    if (!config.dev) {
        cmds = cmds.filter(cmd => !helpers.Cheats.includes(cmd));
    }
    console.log(cmds.join(', '));
    return helpers.Status.NO_ACTION;
};

const quit = function () {
    process.exit(0);
    return helpers.Status.NO_ACTION;
};

module.exports = {
    craft, eat, heal, walk, run, attack,
    inventory, rummage, drop, equip, unequip,
    clear, help, quit, give, spawn
};
