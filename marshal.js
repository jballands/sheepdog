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

module.exports = (tree, argv) => {
    console.info('Starting marshal...'.cyan);
    const writePromises = [];

    utils.tdoSemverRangesResolve(tree, argv.ignore, (name, subtree) => {
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
            console.info(`Queued update of ${name.bold} to ${command.bold} in affected packages`.green);
            writePromises.push(fwriteNewRangeToFiles(subtree, name, command));
        }
        // On skip, do nothing...

        console.info('Continuing...'.cyan);
    });

    // Write promises
    if (writePromises.length > 0) {
        console.info('Fixing package.json files...'.cyan);

        Promise.all(writePromises.map(fun => new Promise(fun)))
            .then(() => {
                console.info('Success'.green)
                console.info('Run <lerna bootstrap|yarn|npm i> again to consolidate dependencies'.cyan)
            })
            .catch(err => console.error(err).red);
    }
    else {
        console.info('Nothing to fix'.green);
    }
};

// -----------------------------------------------------------------------------

function fwriteNewRangeToFiles(subtree, name, range) {
    return (resolve, reject) => {
        const ranges = Object.keys(subtree);
        const nodes = _.flatten(ranges.map(r => subtree[r]));

        Promise.all(nodes.map(node => {
            const newData = _.assign({}, node.file.data);
            newData[node.type][name] = range;

            // Update this file
            return utils.writeFile(node.file, newData);
        }))
        .then(() => resolve())
        .catch(err => reject(err));
    };
}

function isValidCommand(command) {
    const valid = command === 'quit' || command === 'skip' || semver.validRange(command);;
    if (!valid) {
        console.error('Invalid semver range or command'.red);
    }
    return valid;
}
