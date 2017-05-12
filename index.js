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
argv.ignore = typeof(argv.ignore) === 'string' ? argv.ignore.split(',') : [];
argv.only = typeof(argv.only) === 'string' ? argv.only.split(',') : [];

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
        console.info(`Done`.green);
        if (argv.marshal) {
            return marshal(tree, argv);
        }

        console.info(`Checking for dependency intersections...`.cyan);

        // Scan tree for issues
        const issues = [];
        utils.tdoSemverRangesResolve(tree, argv.ignore, (name, subtree) => {
            issues.push(utils.printSemverInconsistencies(name, subtree));
        });

        if (issues.length > 0) {
            console.warn(issues.join('\n\n'));
        }
        else {
            console.log('No semver range issues to report'.green);
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

        let validTrees = argv.only.length > 0 ? argv.only : ['dependencies', 'devDependencies', 'testDependencies', 'peerDependencies'];
        const dt = validTrees.map(t => utils.createDependencyTree(name, t, file));

        return utils.reduceDependencyTrees(dt);
    });

    return utils.reduceDependencyTrees(trees);
}
