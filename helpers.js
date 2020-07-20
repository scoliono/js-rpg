const allItems = require('./items.json');
const allAnimals = require('./animals.json');
const fs = require('fs');
const util = require('util');

/**
 * Generates a random integer between min and max.
 * @param Number min  The lowest number in the range
 * @param Number max  The highest number in the range
 * @returns Number
 */
const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Returns a random element of an Array.
 */
const randomChoice = arr => arr[randomInt(0, arr.length - 1)];

/**
 * Returns the name of a random item in the game.
 * @returns String
 */
const randomItem = () => {
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
};

/**
 * Counts how many occurences of an item there are in the inventory.
 * @param Array inventory  The player's inventory.
 * @param String item  The item to search for.
 * @returns Number
 */
const countItem = (inventory, item) => {
    return inventory.filter(i => i.name === item).length;
};

/**
 * Find the first occurrence of an item with a matching name
 * in the player's inventory.
 * @param Array inventory  The player's inventory.
 * @param String item  The item's name.
 * @returns Number
 */
const findItem = (inventory, item) => {
    return inventory.findIndex(i => i.name === item);
};

/**
 * Displays a menu prompt.
 * @param rl  The readline interface.
 * @param String prompt  The question to respond to.
 * @param Array options  The list of choices the user is presented with.
 * @returns Number  The index of the selected option.
 */
const menuSelect = async (rl, options, prompt) => {
    for (let i = 0; i < options.length; i++) {
        console.log(`[${i + 1}] ${options[i]}`);
    }
    console.log(`[${options.length + 1}] CANCEL`);
    while (true) {
        const choice = +(await question(rl, prompt));
        if (choice === options.length + 1) {
            return -1;
        } else if (Number.isInteger(choice) && choice >= 1 && choice <= options.length) {
            return choice - 1;
        } else {
            console.log(`Please type a number from 1 to ${options.length + 1}.`);
        }
    }
};

/**
 * Version of readline.question() that returns a Promise.
 * @param rl  The readline interface.
 * @param String prompt  The question to respond to.
 * @returns Promise
 */
const question = (rl, prompt) => {
    return new Promise((resolve, reject) => {
        rl.question(prompt, resolve);
    });
};

/**
 * Gives an item to the player and runs additional logic if needed.
 * @param Object player
 * @param Object items  The items database.
 * @param Object itemList  An object with the key being the item's name, and the value being the quantity to add.
 * @returns Boolean
 */
const giveItem = async (player, itemList, rl) => {
    // preliminary check that player has enough inv slots.
    let flattened = [];
    for (let itemName in itemList) {
        // hidden items don't count against your total slots,
        // but we'll revisit them later
        if (!allItems[itemName].hidden) {
            for (let i = 0; i < itemList[itemName]; i++)
                flattened.push(itemName);
        }
    }
    if (player.inventory.length + flattened.length > player.maxInventorySlots) {
        let newInv = [...player.inventory];
        let menuItems;
        while (true) {
            menuItems = flattened.concat(newInv.map(i => i.name));
            let canExit = menuItems.length <= player.maxInventorySlots;
            if (canExit) {
                menuItems.push('DONE');
            }
            const result = await menuSelect(rl, menuItems, 'Choose which item to discard: ');
            if (result === -1) {
                // cancel
                return false;
            } else if (canExit && result === menuItems.length - 1) {
                // done
                break;
            } else if (result < flattened.length) {
                // they want to discard one of the "new items"
                flattened.splice(result, 1);
            } else {
                // they want to discard an item they already have
                newInv.splice(result - flattened.length, 1);
            }
        }
        // update player.inventory to reflect deletion of any items they already had
        player.inventory = newInv;
        // update itemList to reflect changes to flattened
        let newItemList = {};
        for (let name of flattened) {
            newItemList[name] = newItemList[name] ? newItemList[name] + 1 : 1;
        }
        itemList = newItemList;
    }
    let strList = [];
    // Add each item to the inventory
    for (let itemName in itemList) {
        const item = allItems[itemName];
        if (itemName === 'Backpack') {
            player.maxInventorySlots += 30;
            console.log(`Your inventory can now hold ${player.maxInventorySlots} items.`);
        }
        player.discoveredItems[itemName] = true;
        // don't add hidden items to inv
        if (item.hidden) continue;
        // format as ["3x Stick", "1x Rock"] etc.
        const quantity = itemList[itemName];
        strList.push(`${quantity}x ${itemName}`);
        for (let i = 0; i < quantity; i++) {
            player.inventory.push({
                name: itemName,
                durability: +item.durability,
                maxDurability: +item.durability,
                unbreakable: item.unbreakable,
            });
        }
    }
    if (strList.length) {
        console.log(`You picked up: ${strList.join(', ')}!`);
    }
    return true;
};

/**
 * Attempts to remove some quantity of an item by name.
 * @param Array inventory  The player's inventory.
 * @param Object itemList  An object with the key being the item's name, and the value being the quantity to remove.
 * @returns Boolean
 */
const removeItems = (inventory, itemList) => {
    // preliminary check that the user has enough of each item to be removed
    for (let item in itemList) {
        let requiredCount = itemList[item];
        if (countItem(inventory, item) < requiredCount) {
            return false;
        }
    }
    // removes matches one-by-one
    let removed = [];
    for (let item in itemList) {
        for (let i = 0; i < itemList[item]; i++) {
            let itemIndex = findItem(inventory, item);
            removed = removed.concat(inventory.splice(itemIndex, 1));
        }
    }
    return removed;
};

/**
 * Finds an animal by name.
 * @returns Object
 */
const findAnimal = name => {
    return allAnimals.find(a => a.name === name);
};

/**
 * Gets a random enemy.
 * @returns Object
 */
const randomEnemy = () => randomChoice(allAnimals.filter(a => !a.friendly));

/**
 * Gets a random pet.
 * @returns Object
 */
const randomPet = () => randomChoice(allAnimals.filter(a => a.friendly));

/**
 * Extracts an argument from the end of a command that may be multiple words long. Useful for getting item/animal names.
 * @param Array args
 * @param [Number=1] index
 * @return String
 */
const multiWordArg = (args, index = 1) => args.slice(index).join(' ');

/**
 * Generates a timestamp-based save file name, as a suitable default
 * for if the player provides none.
 * @return String
 */
const genSaveFileName = () => new Date().toJSON().replace('T', '_').replace(/[:\.]/g, '-').slice(0, -1);

/**
 * Reads a filename from args[1] if it exists.
 * Otherwise, prompts the user to pick a file from `dir` with the extension `ext`.
 * Returns the filename with the extension included.
 * @param Array args
 * @param String dir
 * @param String ext
 * @returns String
 */
const filePicker = async (args, dir, ext, rl) => {
    var filename = args[1];
    if (!filename) {
        const readdir = util.promisify(fs.readdir);
        const files = await readdir(dir)
                            .filter(file => file.endsWith(ext))
                            .map(file => file.slice(0, -ext.length));
        if (!files.length) {
            filename = await question(rl, 'Enter a save file name: ');
        } else {
            const i = await menuSelect(rl, files, 'Select a save file: ');
            if (i === -1) {
                return null;
            }
            filename = files[i];
        }
    }
    filename = filename.endsWith(ext) ?
               filename :
               `${filename}${ext}`;
    return filename;
};

/**
 * A list of all status codes that a command can return.
 */
const Status = {
    NO_ACTION: 0,
    SUCCESS: 1,
    MOVED: 2
};

const saveFileExt = '.dat';

const Cheats = ['give', 'spawn'];

module.exports = {
    randomInt,
    randomItem,
    countItem,
    findItem,
    giveItem,
    genSaveFileName,
    filePicker,
    saveFileExt,
    question,
    menuSelect,
    multiWordArg,
    findAnimal,
    removeItems,
    randomEnemy,
    randomPet,
    randomChoice,
    Status,
    Cheats
};
