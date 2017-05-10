'use strict';

//
//  @jballands/sheepdog
//  utils.js
//
//  © 2017 Jonathan Ballands
//

const fs = require('fs');
const find = require('find');
const intersect = require('semver-set').intersect;
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
    return new Promsise((resolve, reject) => {
        fs.writeFile(file.name, contents, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(new File(file.name, contents));
        });
    });
}

// -----------------------------------------------------------------------------

//  Creates a new dependency tree given a module `name`, the `type` to look under
//  for dependencies, and the `file` the all originates from.
function createDependencyTree(name, type, file) {
    const tree = {};
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
function doSemversResolve(semvers) {
    // Sanity check
    if (semvers.length <= 0) {
        return true;
    }
    return intersect.apply(this, semvers);
}

//  Invoke the callback `cb` if any dependency on `tree` won't resolve with
//  another version of itself.
function tdoSemversResolve(tree, cb) {
    const modules = Object.keys(tree);

    for (let m of modules) {
        const semvers = Object.keys(tree[m]);

        // Skip this module if there is only one semver
        if (semvers.length <= 1) {
            continue;
        }

        // If the semvers don't resolve, invoke the callback
        if (doSemversResolve(semvers) === null) {
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

module.exports = {
    findFilePaths,
    readFile,
    readFiles,
    writeFile,
    createDependencyTree,
    reduceDependencyTrees,
    doSemversResolve,
    tdoSemversResolve,
    printSemverInconsistencies
};
