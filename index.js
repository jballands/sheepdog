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
const marshaler = require('./marshal');

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

utils.findFiles(/package.json/, dir)
    .then(files => {
        files = files.filter(file => {
            return file.indexOf('node_modules') < 0;
        });

        // No files?
        if (files.length <= 0) {
            return console.error('Couldn\'t find any package.json files'.red);
        }
        console.info(`Found ${files.length} file(s)`.green);
        console.info(`Generating dependency tree...`.cyan);
        return getDependencyTree(files);
    })
    .then(tree => {
        console.info(`Done`.green);
        if (argv.marshal) {
            return marshaler(tree);
        }

        console.info(`Checking for dependency intersections...`.cyan);

        // Scan tree for issues
        const issues = [];
        const modules = Object.keys(tree);
        for (let m of modules) {
            const semvers = Object.keys(tree[m]);

            // Skip this module if there is only one semver
            if (semvers.length <= 1) {
                continue;
            }

            // If the semvers don't resolve, log it
            if(utils.doSemversResolve(semvers) === null) {
                let builder = `- ${m.bold} has incompatible semver ranges:`.yellow;
                for (let s of semvers) {
                    const affected = tree[m][s].map(a => a.name);
                    builder = builder.concat(`\n${s} => ${affected.join(', ')}`.cyan);
                }
                issues.push(builder);
            }
        }

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

function getDependencyTree(files) {
    return new Promise((resolve, reject) => {
        utils.openFiles(files)
            .then(contents => resolve(contentsToDependencyTree(contents)))
            .catch(err => reject(err));
    });
}

function contentsToDependencyTree(contents, path) {
    let trees = contents.map(content => {
        const data = JSON.parse(content.data);
        if (data.name === undefined) {
            console.error('One of your package.json files doesn\'t have a name field. Skipping this file:'.red);
            console.error(contents.path.red);
            return null;
        }

        const dependenciesTree = utils.createDependencyTree(data.name, content.path, data.dependencies);
        const devDependenciesTree = utils.createDependencyTree(data.name, content.path, data.devDependencies);
        const testDependenciesTree = utils.createDependencyTree(data.name, content.path, data.testDependencies);

        const cleanedDeps = [dependenciesTree, devDependenciesTree, testDependenciesTree].filter(d => d !== null);
        return utils.reduceDependencyTrees(cleanedDeps);
    });

    return utils.reduceDependencyTrees(trees);
}
