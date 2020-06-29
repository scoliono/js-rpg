const readline = require('readline-sync');
const commands = require('./commands.js');
const helpers = require('./helpers.js');
const config = require('./config.json');


// player state
var player = {
    hunger: 100,
    health: 100,
    inventory: [],
    // [ {name: "Shovel", life: 0.5}, {name: "Shovel", life: 0.75}, {name: "Rock"} ]
    opponent: null,
    shield: null,
    maxInventorySlots: 10
};

// ask for player name
player.name = readline.question('What\'s your name? ');
console.log(`Hello, ${player.name}!`);


/**
 * Prints out the status of the player and opponent, if there is one. Should run every turn.
 * @returns undefined
 */
function printStatus()
{
    console.log();
    if (player.opponent) {
        console.log(`=== ${player.opponent.name}: ${player.opponent.health}/${player.opponent.maxHealth} HP ===`);
    }
    if (player.shield) {
        let durabilityStr;
        if (player.shield.maxDurability === Infinity) {
            durabilityStr = ' (unbreakable)';
        } else {
            durabilityStr = `: ${player.shield.durability}/${player.shield.maxDurability} durability`;
        }
        console.log(`Equipped a ${player.shield.name}${durabilityStr}`);
    }
    console.log(`Health: ${player.health}/100, Hunger: ${player.hunger}/100`);
}

/**
 * Checks whether the player (or opponent, if there is one) has died. Should print out a death message.
 * @returns bool
 */
function checkDeath()
{
    // check if opponent has died, and remove it if it has
    if (player.opponent && player.opponent.health <= 0) {
        console.log(`=== The ${player.opponent.name} died! ===`);
        player.opponent = null;
    }
    if (player.hunger <= 0) {
        console.log('You starved to death');
        return true;
    }
    if (player.health <= 0) {
        console.log('You died!');
        return true;
    }
    return false;
}

/**
 * If the player has no opponent, run a random probability for encountering one.
 * Otherwise, take one turn fighting the player.
 */
function doCombatTurn()
{
    if (player.opponent === null) {
        // dice roll
        let hasCloak = player.shield && player.shield.name === 'Camo Cloak';
        let findEnemy = helpers.randomInt(1, hasCloak ? 90 : 30) === 1;
        if (findEnemy) {
            let enemy = helpers.randomEnemy();
            player.opponent = Object.create(enemy);
            console.log(`=== You encountered a ${enemy.name}!  ===`);
            console.log(`=== ${enemy.description} ===`);
        }
    } else {
        // attack
        let randMove = helpers.randomChoice(player.opponent.moves);
        let dmg = helpers.randomInt(...player.opponent.strength);
        console.log(`=== The ${player.opponent.name} ${randMove}, doing ${dmg} HP of damage! ===`);
        // if player is equipping something without infinite durability,
        // have it absorb roughly half the damage
        if (player.shield && player.shield.maxDurability !== Infinity) {
            let maxDmgAbsorbed = Math.ceil(dmg / 2);
            let actualDmgAbsorbed = Math.min(player.shield.durability, maxDmgAbsorbed);
            player.shield.durability -= actualDmgAbsorbed;
            if (player.shield.durability === 0) {
                const shield = player.shield;
                player.shield = null;
                console.log(`Your ${shield.name} broke!`);
            }
            dmg -= actualDmgAbsorbed;
        }
        player.health -= dmg;
    }
}


// main game loop
var gameOver = false;
var lastCommand = 0;
while (!gameOver) {
    printStatus();
    const args = readline.question('> ').split(' ');
    const command = args[0].toLowerCase();
    if (command in commands && (!helpers.Cheats.includes(command) || config.dev)) {
        lastCommand = commands[command](player, args);
    } else {
        lastCommand = helpers.Status.NO_ACTION;
        console.error('That action is invalid!');
    }
    // if last command did not fail, regardless of combat status
    if (lastCommand & helpers.Status.SUCCESS) {
        // check if the player moved in the last turn
        // OR they are currently in combat
        if ((lastCommand & helpers.Status.MOVED) || player.opponent)
            doCombatTurn();
    }
    gameOver = checkDeath();
}

console.log('Game Over!');
