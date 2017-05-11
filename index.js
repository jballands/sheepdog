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
    const dogGenerator = utils.getDogBreed();

    let trees = files.map(file => {
        const name = file.data.name !== undefined ? file.data.name : dogGenerator.next().value.toString();
        if (file.data.name === undefined) {
            console.error(`${file.path} doesn't have a name field. I'll call it ${name.bold} instead`.red);
        }

        const dependenciesTree = utils.createDependencyTree(name, 'dependencies', file);
        const devDependenciesTree = utils.createDependencyTree(name, 'devDependencies', file);
        const testDependenciesTree = utils.createDependencyTree(name, 'testDependencies', file);
        const peerDependenciesTree = utils.createDependencyTree(name, 'peerDependencies', file);

        return utils.reduceDependencyTrees([dependenciesTree, devDependenciesTree, testDependenciesTree]);
    });

    return utils.reduceDependencyTrees(trees);
}
