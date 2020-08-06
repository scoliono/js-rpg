const readline = require('readline');
const callbacks = require(__dirname + '/client/callbacks.js');
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
var gameOver = false;

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
        socket.on('disconnect', events.onSelfDisconnect);
        socket.on('player_disconnect', events.onDisconnect);
        socket.on('death', events.onDeath.bind(events));
    });
}

async function getCommandResponse(command)
{
    return new Promise((resolve, reject) => {
        socket.on('invalid_command', reject);
        socket.on('command_response', resolve);
    });
}

/**
 * unhooks event listeners before disconnecting from a server.
 */
function tearDown()
{
    socket.off('join', onPlayerJoinedWithResolve);
    socket.off('chat', events.onChatMessage);
    socket.off('disconnect', events.onDisconnect);
    socket.off('death', events.onDeath.bind(events));
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
                player = await join(username);
            } catch (err) {
                console.error(`The name ${username} is already taken.`);
                tearDown();
                continue;
            }
        }
        await gameLoop();
        console.log('Game Over!');
    }
}

// main game loop
async function gameLoop()
{
    var lastCommand = 0;
    while (!gameOver) {
        printStatus();
        const answer = await helpers.question(rl, '> ');
        const args = answer.split(' ');
        const command = args[0].toLowerCase();
        // validate the command before sending to server
        const shouldEmit = !(command in commands) || await commands[command](player, args, rl, socket);
        if (shouldEmit) {
            // run the command on the server if needed
            socket.emit('command', answer);
            try {
                const res = await getCommandResponse(answer);
                lastCommand = res.status;
                if (command in callbacks) {
                    await callbacks[command](res, player, args, rl);
                }
            } catch (err) {
                console.error('Command failed: ' + err.message);
            }
        } else {
            lastCommand = helpers.Status.NO_ACTION;
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
    }
}

mainMenu();
