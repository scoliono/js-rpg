var allItems = require('./items.json');
var allAnimals = require('./animals.json');
const helpers = require('./helpers.js');
const process = require('process');

module.exports = {
    craft: function (player, args) {
        let itemName = args[1];
        if (!itemName) {
            console.error('You did not specify an item to craft.');
            return false;
        }
        let item = allItems[itemName];
        // only allow already discovered items with ingredients list to be crafted 
        if (item && item.ingredients && item.discovered) {
            let success = helpers.removeItems(player.inventory, item.ingredients);
            if (success) {
                player.inventory.push({ name: itemName });
                console.log(`You crafted a ${itemName}!`);
                return true;
            } else {
                console.log(`To craft a ${itemName} you need:`);
                for (let ingredient in item.ingredients) {
                    let requiredCount = item.ingredients[ingredient];
                    console.log(`- ${requiredCount}x ${ingredient}`);
                }
                return false;
            }
        } else {
            console.log('You\'ve never heard of that before.');
            return false;
        }
    },
    eat: function (player, args) {
        if (player.hunger < 100) {
            let success = helpers.removeItems(player.inventory, {'Rations': 1});
            if (success) {
                player.hunger += helpers.randomInt(...allItems.Rations.hunger);
                player.hunger = Math.min(player.hunger, 100);
            } else {
                console.error('You have nothing to eat.');
            }
        } else {
            console.error('You are not hungry.');
        }
    },
    walk: function (player, args) {
        const place = args[1] || 'middle of nowhere';
        console.log(`You walk to the ${place}.`);
        player.hunger -= helpers.randomInt(1, 5);
    },
    run: function (player, args) {
        const place = args[1] || 'middle of nowhere';
        console.log(`You run to the ${place}.`);
        player.hunger -= helpers.randomInt(3, 10);
    },
    inventory: function (player) {
        console.log(`${player.inventory.length}/${player.maxInventorySlots} items full`);
        if (player.inventory.length === 0) {
            console.log('You have nothing!');
            return false;
        }
        Object.keys(allItems).forEach(item => {
            const count = helpers.countItem(player.inventory, item);
            if (count > 0) {
                console.log(`${item} x${count}`);
            }
        });
    },
    rummage: function (player) {
        if (player.inventory.length === player.maxInventorySlots) {
            console.error('Your inventory is full! Please drop something first.');
            return false;
        }
        const randItem = helpers.randomItem();
        player.hunger -= helpers.randomInt(3, 5);
        if (randItem === 'Nothing') {
            console.log('You didn\'t pick up anything!');
        } else {
            if (!allItems[randItem].hidden) {
                player.inventory.push({ name: randItem });
            }
            console.log(`You picked up a ${randItem}!`);
            if (randItem === 'Backpack') {
                player.maxInventorySlots += 30;
                console.log(`Your inventory can now hold ${player.maxInventorySlots} items.`);
            }
            allItems[randItem].discovered = true;
        }
    },
    drop: function (player, args) {
        const itemName = args[1];
        if (!itemName) {
            console.error('You did not specify an item to drop.');
            return false;
        }
        const result = helpers.removeItems(player.inventory, {
            [itemName]: 1
        });
        if (result) {
            console.log(`You dropped the ${itemName}.`);
        } else {
            console.log(`Failed to drop a ${itemName}.`);
        }
    },
    clear: function () {
        console.clear();
    },
    help: function () {
        console.log(
            Object.keys(module.exports).join(', ')
        );
    },
    quit: function () {
        process.exit(0);
    }
};
