const helpers = require(__dirname + '/../helpers.js');

/**
 * Checks whether the player (or opponent, if there is one) has died. Should print out a death message.
 * @returns bool
 */
function checkDeath(player)
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
            helpers.giveItem(player, itemList, null);
        }
    }
    if (player.hunger <= 0) {
        return helpers.DeathReason.STARVATION;
    }
    if (player.health <= 0) {
        return helpers.DeathReason.KILLED;
    }
    return false;
}

/**
 * If the player does not have a pet, run a random probability for encountering a friendly animal. If the player has food, this probability increases.
 * If the player has food, the animal will also continue to follow them. Otherwise, it will leave on the next turn.
 */
function doPetTurn(player)
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
function doCombatTurn(player)
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

module.exports = {
    checkDeath, doCombatTurn, doPetTurn
};
