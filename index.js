const readline = require('readline-sync');
const commands = require('./commands.js');
const helpers = require('./helpers.js');

// player state
var player = {
    hunger: 100,
    health: 100,
    inventory: [],
    // [ {name: "Shovel", life: 0.5}, {name: "Shovel", life: 0.75}, {name: "Rock"} ]
    opponent: null,
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
        let findEnemy = helpers.randomInt(1, 5) === 1;
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
    if (command in commands) {
        lastCommand = commands[command](player, args);
    } else {
        console.error('That action is invalid!');
    }
    // check if the player moved in the last turn
    // OR you are currently in combat
    if ((lastCommand & helpers.Status.MOVED) ||
        player.opponent) {
        doCombatTurn();
    }
    gameOver = checkDeath();
}

console.log('Game Over!');
