const readline = require('readline-sync');
const commands = require('./commands.js');

// player state
var player = {
    hunger: 100,
    health: 100,
    inventory: [],
    opponent: null,
    maxInventorySlots: 10
    // [ {name: "Shovel", life: 0.5}, {name: "Shovel", life: 0.75}, {name: "Rock"} ]
};

// ask for player name
player.name = readline.question('What\'s your name? ');
console.log(`Hello, ${player.name}!`);


/**
 * Prints out the status of the player. Should run every turn.
 * @returns undefined
 */
function printStatus()
{
    console.log();
    console.log(`Health: ${player.health}/100, Hunger: ${player.hunger}/100`);
    console.log("You're not dead yet!");
}

/**
 * Checks whether the player has died. Should print out a death message.
 * @returns bool
 */
function checkDeath()
{
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
    ;
}


// main game loop
var gameOver = false;
while (!gameOver) {
    printStatus();
    doCombatTurn();
    const args = readline.question('> ').split(' ');
    const command = args[0].toLowerCase();
    if (command in commands) {
        commands[command](player, args);
    } else {
        console.error('That action is invalid!');
    }
    gameOver = checkDeath();
}

console.log('Game Over!');
