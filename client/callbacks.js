var allItems = require(__dirname + '/../items.json');
var allAnimals = require(__dirname + '/../animals.json');

const helpers = require(__dirname + '/../helpers.js');

const fs = require('fs');
const util = require('util');

var ClientCallbacks = {};

ClientCallbacks.players = async function (res) {
    console.log('Players connected to this server:');
    for (let player of res.players) {
        console.log(`- ${player}`);
    }
};

module.exports = ClientCallbacks;
