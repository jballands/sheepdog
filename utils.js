'use strict';

//
//  @jballands/sheepdog
//  utils.js
//
//  © 2017 Jonathan Ballands
//

const fs = require('fs');
const find = require('find');
const semver = require('semver');
const structs = require('./structs');

const File = structs.File;
const Node = structs.Node;

// -----------------------------------------------------------------------------

//  Find all files given the `filePattern` pattern in specified `directory`. Returns
//  a promise that resolves to file paths that match the input.
function findFilePaths(filePattern, directory) {
    return new Promise(resolve => {
        find.file(filePattern, directory, paths => {
            resolve(paths);
        });
    });
}

// -----------------------------------------------------------------------------

//  Given a file `path`, resolves to a File.
function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(new File(path, data));
        });
    });
}

//  Given file `paths`, resolves to an array of Files.
function readFiles(paths) {
    return new Promise((resolve, reject) => {
        Promise.all(paths.map(path => readFile(path)))
        .then(files => resolve(files))
        .catch(err => reject(err));
    });
}

//  Write to the `file` with `contents`. Returns a promise that resolves to the
//  new File.
function writeFile(file, contents) {
    return new Promise((resolve, reject) => {
        const pretty = JSON.stringify(contents, null, 2);
        fs.writeFile(file.path, pretty, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(new File(file.path, contents));
        });
    });
}

// -----------------------------------------------------------------------------

//  Creates a new dependency tree given a module `name`, the `type` to look under
//  for dependencies, and the `file` the all originates from.
function createDependencyTree(name, type, file) {
    const tree = {};

    // No file?
    if (!file) {
        return null;
    }

    const typeTree = file.data[type];

    // If there's no type tree, abort
    if (!typeTree) {
        return null;
    }

    const modules = Object.keys(file.data[type]);

    for (let m of modules) {
        const rdep = {};
        const range = typeTree[m];
        rdep[range] = [new Node(name, type, file)];
        tree[m] = rdep;
    }

    return tree;
}

//  Reduce `trees` array together such that the result is a depiction of which packages
//  depend on a semver range. Use createDependencyTree first to create your trees,
//  then reduce them with this routine.
function reduceDependencyTrees(trees) {
    const reduced = {};
    trees = !trees ? [] : trees;

    // Filter out null trees
    trees = trees.filter(tree => tree !== null);

    for (let tree of trees) {
        const modules = Object.keys(tree);

        for (let m of modules) {
            // Does module exist in the reduced tree? If not, just add it
            if (!reduced[m]) {
                reduced[m] = tree[m];
                continue;
            }

            // Otherwise it did exist and we need to do some more massaging
            const rSubtrees = reduced[m];
            const subtrees = Object.keys(tree[m]);
            for (let subtree of subtrees) {
                // If the semver doesn't exist yet, just add it
                if (!rSubtrees[subtree]) {
                    rSubtrees[subtree] = tree[m][subtree];
                    continue;
                }

                // Otherwise, just push it to the existing semver
                rSubtrees[subtree] = rSubtrees[subtree].concat(tree[m][subtree]);
            }
        }
    }

    return reduced;
}

// -----------------------------------------------------------------------------

//  Figure out if an array of `semvers` conflict. True if they do, false if not.
function doSemverRangesResolve(ranges) {
    // Sanity check
    if (!ranges) {
        return false;
    }
    if (ranges.length <= 0) {
        return true;
    }

    // Create a bunch of ranges
    const rRanges = ranges.map(r => semver.Range(r));

    // Get the biggest possible version for all comparators
    const comparatorsSet = rRanges.map(r => r.set[0]);
    const biggestComparators = comparatorsSet.map(set => {
        return set.reduce((acc, curr) => {
            return semver.gt(acc.semver.version, curr.semver.version) ? acc : curr;
        });
    }).map(c => c.value);

    // If they are all the same, we are good to go!
    for (let i = 1 ; i < biggestComparators.length ; i++) {
        if (biggestComparators[i] !== biggestComparators[0]) {
            return false;
        }
    }

    return true;
}

//  Invoke the callback `cb` if any dependency on `tree` won't resolve with
//  another version of itself.
function tdoSemverRangesResolve(tree, ignore, cb) {
    const modules = Object.keys(tree);

    for (let m of modules) {
        // If the module equals something in the ignore list, move on
        if (ignore.length > 0 && ignore.indexOf(m) > -1) {
            continue;
        }

        const ranges = Object.keys(tree[m]);

        // Skip this module if there is only one range
        if (ranges.length <= 1) {
            continue;
        }

        // If the ranges don't resolve, invoke the callback
        if (doSemverRangesResolve(ranges) === false) {
            cb(m, tree[m]);
        }
    }
}

function printSemverInconsistencies(name, subtree) {
    let builder = `${name.bold} has incompatible semver ranges:`.yellow;

    for (let range of Object.keys(subtree)) {
        const affected = subtree[range].map(a => `\u0020\u0020- ${a.name} (${a.type})`);
        builder = builder.concat(`\n${range.bold} =>\n${affected.join('\n')}`.cyan);
    }

    return builder;
}

// -----------------------------------------------------------------------------

const dogs = require('./dogs');

function* getDogBreed() {
    while (dogs.length > 0) {
        const selected = dogs.splice(Math.floor(Math.random() * dogs.length - 1), 1);
        yield selected;
    }
}

// -----------------------------------------------------------------------------

module.exports = {
    findFilePaths,
    readFile,
    readFiles,
    writeFile,
    createDependencyTree,
    reduceDependencyTrees,
    doSemverRangesResolve,
    tdoSemverRangesResolve,
    printSemverInconsistencies,
    getDogBreed
};
