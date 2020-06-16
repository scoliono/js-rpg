var allItems = require('./items.json');
var allAnimals = require('./animals.json');
const process = require('process');

/**
 * Generates a random integer between min and max.
 * @param Number min  The lowest number in the range
 * @param Number max  The highest number in the range
 * @returns Number
 */
function randomInt(min, max)
{
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Returns the name of a random item in the game.
 * @returns String
 */
function randomItem()
{
    const total = Object.values(allItems).reduce((t, i) => t + i.rarity, 0);
    const rand = randomInt(1, total);
    var tally = 0;
    for (var item in allItems) {
        var { rarity } = allItems[item];
        tally += rarity;
        if (tally >= rand) {
            break;
        }
    }
    return item;
}

/**
 * Counts how many occurences of an item there are in the inventory.
 * @param Array inventory  The player's inventory.
 * @param String item  The item to search for.
 * @returns Number
 */
function countItem(inventory, item)
{
    return inventory.filter(i => i.name === item).length;
}

/**
 * Find the first occurrence of an item with a matching name
 * in the player's inventory.
 * @param Array inventory  The player's inventory.
 * @param String item  The item's name.
 * @returns Number
 */
function findItem(inventory, item)
{
    return inventory.findIndex(i => i.name === item);
}

/**
 * Attempts to remove some quantity of an item by name.
 * @param Array inventory  The player's inventory.
 * @param Object item  An object with the key being the item's name, and the value being the quantity to remove.
 * @returns Boolean
 */
function removeItems(inventory, itemList)
{
    // preliminary check that the user has enough of each item to be removed
    for (let item in itemList) {
        let requiredCount = itemList[item];
        if (countItem(inventory, item) < requiredCount) {
            return false;
        }
    }
    // removes matches one-by-one
    for (let item in itemList) {
        for (let i = 0; i < itemList[item]; i++) {
            let itemIndex = findItem(inventory, item);
            inventory.splice(itemIndex, 1);
        }
    }
    return true;
}

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
            let success = removeItems(player.inventory, item.ingredients);
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
            let success = removeItems(player.inventory, {'Rations': 1});
            if (success) {
                player.hunger += randomInt(...allItems.Rations.hunger);
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
        player.hunger -= randomInt(1, 5);
    },
    run: function (player, args) {
        const place = args[1] || 'middle of nowhere';
        console.log(`You run to the ${place}.`);
        player.hunger -= randomInt(3, 10);
    },
    inventory: function (player) {
        if (player.inventory.length === 0) {
            console.log('You have nothing!');
            return false;
        }
        Object.keys(allItems).forEach(item => {
            const count = countItem(player.inventory, item);
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
        const randItem = randomItem();
        player.hunger -= randomInt(3, 5);
        if (randItem === 'Nothing') {
            console.log('You didn\'t pick up anything!');
        } else {
            player.inventory.push({ name: randItem });
            allItems[randItem].discovered = true;
            console.log(`You picked up a ${randItem}!`);
        }
    },
    drop: function (player, args) {
        const itemName = args[1];
        if (!itemName) {
            console.error('You did not specify an item to drop.');
            return false;
        }
        const result = removeItems(player.inventory, {
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
