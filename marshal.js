'use strict';

//
//  @jballands/sheepdog
//  marshal.js
//
//  © 2017 Jonathan Ballands
//

const colors = require('colors');
const prompt = require('prompt-sync')();
const process = require('process');
const semver = require('semver');
const utils = require('./utils');

const _ = {
    assign: require('lodash.assign'),
    flatten: require('lodash.flatten')
};

// -----------------------------------------------------------------------------

module.exports = tree => {
    console.info('Starting marshal...'.cyan);

    utils.tdoSemversResolve(tree, (name, subtree) => {
        console.warn(utils.printSemverInconsistencies(name, subtree));

        // Get a valid command
        let command = null;
        do {
            console.info('Enter the desired semver range, skip, or quit'.magenta);
            command = prompt('range? ');
        } while (!isValidCommand(command));

        // Quit
        if (command  === 'quit') {
            console.info('Quitting...'.cyan);
            process.exit(1);
        }
        // Semver
        else if (semver.validRange(command)) {
            console.info(`Updating ${name.bold} to ${command.bold} in affected packages`.green);
            writeNewRangeToFiles(subtree, name, command)
                .then();
        }
        // On skip, do nothing...

        console.info('Continuing...'.cyan);
    });
};

// -----------------------------------------------------------------------------

function writeNewRangeToFiles(subtree, name, range) {
    return new Promise((resolve, reject) => {
        const ranges = Object.keys(subtree);
        const nodes = _.flatten(ranges.map(r => subtree[r]));

        Promise.all(nodes.map(node => {
            const newData = _.assign({}, node.file.data);
            newData[name] = range;

            // Update this file
            return utils.writeFile(node.file.path, newData);
        }))
        .then(() => resolve())
        .catch(err => reject(err));
    });
}

function isValidCommand(command) {
    const valid = command === 'quit' || command === 'skip' || semver.validRange(command);;
    if (!valid) {
        console.error('Invalid semver range or command'.red);
    }
    return valid;
}
