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

// -----------------------------------------------------------------------------

//  Find all files given the `filename` pattern in specified `directory`. Returns
//  a promise that resolves to file paths that match the input.
function findFiles(filename, directory) {
    return new Promise(resolve => {
        find.file(filename, directory, files => {
            resolve(files);
        });
    });
}

//  Open all file paths specified in the `files` array. Returns a promise that resolves
//  to file contents.
function openFiles(files) {
    return new Promise((resolve, reject) => {
        Promise.all(files.map(file => {
            return new Promise((resolve, reject) => {
                fs.readFile(file, 'utf8', (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve({ path: file, data: data });
                });
            });
        })).then(contents => {
            resolve(contents);
        })
        .catch(err => reject(err));
    });
}

// -----------------------------------------------------------------------------

//  Creates a dependency tree from a package name `n`, a package path `p`, and dependencies
//  from package.json `d`.
function createDependencyTree(n, p, d) {
    if (d === undefined) {
        return null;
    }

    const tree = {};
    const modules = Object.keys(d);

    for (let m of modules) {
        const rdep = {};
        const range = d[m];
        rdep[range] = [{ name: n, path: p }];
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
            const rSemvers = reduced[m];
            const semvers = Object.keys(tree[m]);
            for (let semver of semvers) {
                // If the semver doesn't exist yet, just add it
                if (!rSemvers[semver]) {
                    rSemvers[semver] = tree[m][semver];
                    continue;
                }

                // Otherwise, just push it to the existing semver
                rSemvers[semver] = rSemvers[semver].concat(tree[m][semver]);
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

// -----------------------------------------------------------------------------

module.exports = {
    findFiles,
    openFiles,
    createDependencyTree,
    reduceDependencyTrees,
    doSemversResolve
};
