const readline = require('readline');
const commands = require(__dirname + '/client/commands.js');
const helpers = require(__dirname + '/helpers.js');
const config = require(__dirname + '/server/settings.json');
const io = require('socket.io-client');
const { fork } = require('child_process');

var socket = null;
const ClientEvents = require(__dirname + '/client/events.js');
var events;

// player state
var player = {};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Prints out the status of the player and opponent, if there is one. Should run every turn.
 * @returns undefined
 */
function printStatus()
{
    console.log();
    if (player.opponent) {
        console.log(`=== Enemy ${player.opponent.name}: ${player.opponent.health}/${player.opponent.maxHealth} HP ===`);
    }
    if (player.pet) {
        console.log(`=== Friendly ${player.pet.name}: ${player.pet.health}/${player.pet.maxHealth} HP ===`);
    }
    if (player.shield) {
        let durabilityStr;
        if (player.shield.unbreakable) {
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
async function checkDeath()
{
    // check if opponent has died, and remove it if it has
    if (player.opponent && player.opponent.health <= 0) {
        let opponent = player.opponent;
        player.opponent = null;
        console.log(`=== The ${opponent.name} died! ===`);
    }
    // check if pet has died, and remove it if it has
    if (player.pet && player.pet.health <= 0) {
        const pet = player.pet;
        player.pet = null;
        console.log(`=== The ${pet.name} died! ===`);
        // give player the loot
        if (pet.loot && Object.keys(pet.loot).length) {
            let itemList = {};
            // sets up itemList like so: {"Leather": 4, "Wool": 2}
            for (let loot in pet.loot) {
                let quantity = helpers.randomInt(...pet.loot[loot]);
                itemList[loot] = quantity;
            }
            await helpers.giveItem(player, itemList, rl);
        }
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
 * If the player does not have a pet, run a random probability for encountering a friendly animal. If the player has food, this probability increases.
 * If the player has food, the animal will also continue to follow them. Otherwise, it will leave on the next turn.
 */
function doPetTurn()
{
    let hasFood = helpers.countItem(player.inventory, 'Rations') > 0;
    if (player.pet === null) {
        // dice roll
        let findPet = helpers.randomInt(1, hasFood ? 10 : 15) === 1;
        if (findPet) {
            let pet = helpers.randomPet();
            player.pet = {};
            Object.assign(player.pet, pet);
            console.log(`=== You encountered a friendly ${pet.name}!  ===`);
            console.log(`=== ${pet.description} ===`);
        }
    } else if (!hasFood) {
        let oldPet = player.pet;
        player.pet = null;
        console.log(`=== The ${oldPet.name} wandered off. ===`);
    }
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
            player.opponent = {};
            Object.assign(player.opponent, enemy);
            console.log(`=== You encountered an enemy ${enemy.name}!  ===`);
            console.log(`=== ${enemy.description} ===`);
        }
    } else {
        // attack
        let randMove = helpers.randomChoice(player.opponent.moves);
        let dmg = helpers.randomInt(...player.opponent.strength);
        console.log(`=== The ${player.opponent.name} ${randMove}, doing ${dmg} HP of damage! ===`);
        // if player is equipping something without infinite durability,
        // have it absorb roughly half the damage
        if (player.shield && !player.shield.unbreakable) {
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

/**
 * Connects to a remote game host server,
 * or the locally running server by default.
 * @param String [addr='http://localhost:3000']  The address of the server.
 */
function connect(addr = 'http://localhost:3000')
{
    return new Promise((resolve, reject) => {
        socket = io(addr);
        events = new ClientEvents(socket);
        socket.on('connect', resolve);
        socket.on('connect_timeout', reject);
        socket.on('connect_error', reject);
    });
}

var onPlayerJoinedWithResolve;

/**
 * Enters the game server on the current socket and registers the player.
 * @param String [username='Player']  The player's username.
 */
async function join(username = 'Player')
{
    return new Promise((resolve, reject) => {
        onPlayerJoinedWithResolve = function (player) {
            events.onPlayerJoined(player, resolve);
        };
        socket.emit('join', username);
        socket.on('join', onPlayerJoinedWithResolve);
        socket.on('username_taken', reject);
        socket.on('chat', events.onChatMessage);
    });
}

/**
 * unhooks event listeners before disconnecting from a server.
 */
function tearDown()
{
    socket.off('join', onPlayerJoinedWithResolve);
    socket.off('chat', events.onChatMessage);
    socket = null;
}

/**
 * Boots the game host server, for either singleplayer
 * or hosting a multiplayer game.
 * @returns Promise
 */
function bootServer()
{
    return new Promise((resolve, reject) => {
        try {
            const server = fork('./server');
            server.on('message', msg => {
                // only connect once server is ready
                if (msg.status === 'ready') {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

// main menu
async function mainMenu()
{
    while (true) {
        console.log('Welcome to my JavaScript RPG!');
        const mode = await helpers.menuSelect(
            rl, ['Singleplayer', 'Multiplayer'], 'Select a game mode: '
        );
        if (mode === -1) {
            console.log('Bye!');
            break;
        }
        if (mode === 0) {
            await bootServer();
            await connect();
            await join();
        } else if (mode === 1) {
            const mpMode = await helpers.menuSelect(
                rl, ['Host a Game', 'Join a Game'], 'Select an option: '
            );
            if (mpMode === -1) {
                continue;
            } else if (mpMode === 0) {
                await bootServer();
                await connect();
            } else {
                const addr = await helpers.question(rl, 'Enter the server address: ');
                try {
                    await connect(addr);
                } catch (err) {
                    console.error('Connection error: ' + err);
                    continue;
                }
            }
            const username = await helpers.question(rl, 'Enter a username: ');
            try {
                await join(username);
                
            } catch (err) {
                console.error(`The name ${username} is already taken.`);
                tearDown();
                continue;
            }
        }
        await gameLoop();
        console.log('Game Over!');
        break;
    }
    process.exit(0);
}

// main game loop
async function gameLoop()
{
    var gameOver = false;
    var lastCommand = 0;
    while (!gameOver) {
        printStatus();
        const answer = await helpers.question(rl, '> ');
        const args = answer.split(' ');
        const command = args[0].toLowerCase();
        // validate the command before sending to server
        const shouldEmit = !(command in commands) || commands[command](player, args);
        if (shouldEmit) {
            // run the command on the server if needed
            socket.emit('command', answer);
            lastCommand = await commands[command](player, args, rl);
        } else {
            lastCommand = helpers.Status.NO_ACTION;
            console.error('That action is invalid!');
        }
        // if last command did not fail, regardless of combat status
        if (lastCommand & helpers.Status.SUCCESS) {
            // check if the player moved in the last turn
            // OR they are currently in combat
            if ((lastCommand & helpers.Status.MOVED) || player.opponent) {
                doCombatTurn();
                doPetTurn();
            }
        }
        gameOver = await checkDeath();
    }
}

mainMenu();
