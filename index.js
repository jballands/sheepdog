#!/usr/bin/env node
'use strict';

//
//  @jballands/sheepdog
//  index.js
//
//  © 2017 Jonathan Ballands
//

const process = require('process');
const colors = require('colors');
const utils = require('./utils');
const marshal = require('./marshal');

const argv = require('yargs')
    .alias('b', 'bark')
    .alias('d', 'dir')
    .alias('q', 'quiet')
    .alias('m', 'marshal')
    .alias('i', 'ignore')
    .alias('o', 'only')
    .argv;

// -----------------------------------------------------------------------------

const dir = argv.dir ? argv.dir : '.';
console.info = argv.quiet ? function() {} : console.info;

console.info('Looking for package.json files...'.cyan);

utils.findFilePaths(/package.json/, dir)
    .then(paths => {
        paths = paths.filter(path => {
            return path.indexOf('node_modules') < 0;
        });

        // No files?
        if (paths.length <= 0) {
            return console.error('Couldn\'t find any package.json files'.red);
        }
        console.info(`Found ${paths.length} file(s)`.green);
        console.info(`Generating dependency tree...`.cyan);
        return getDependencyTree(paths);
    })
    .then(tree => {
        console.info(`Done 🐶`.green);
        if (argv.marshal) {
            return marshal(tree);
        }

        console.info(`Checking for dependency intersections...`.cyan);

        // Scan tree for issues
        const issues = [];
        utils.tdoSemversResolve(tree, (name, subtree) => {
            issues.push(utils.printSemverInconsistencies(name, subtree));
        });

        if (issues.length > 0) {
            console.info(issues.join('\n\n'));
        }
        else {
            console.info('No semver range issues to report'.green);
        }

        // Exit with an error
        if (argv.bark) {
            process.exit(1);
        }
        process.exit(0);
    })
    .catch(err => console.error(err.red));

// -----------------------------------------------------------------------------

function getDependencyTree(paths) {
    return new Promise((resolve, reject) => {
        utils.readFiles(paths)
            .then(files => resolve(contentsToDependencyTree(files)))
            .catch(err => reject(err));
    });
}

function contentsToDependencyTree(files) {
    let trees = files.map(file => {
        if (file.data.name === undefined) {
            console.error('One of your package.json files doesn\'t have a name field. Skipping this file:'.red);
            console.error(file.path.red);
            return null;
        }

        const dependenciesTree = utils.createDependencyTree(file.data.name, 'dependencies', file);
        const devDependenciesTree = utils.createDependencyTree(file.data.name, 'devDependencies', file);
        const testDependenciesTree = utils.createDependencyTree(file.data.name, 'testDependencies', file);

        const cleanedDeps = [dependenciesTree, devDependenciesTree, testDependenciesTree].filter(tree => tree !== null);
        return utils.reduceDependencyTrees(cleanedDeps);
    });

    return utils.reduceDependencyTrees(trees);
}
