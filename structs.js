'use strict';

//
//  @jballands/sheepdog
//  structs.js
//
//  © 2017 Jonathan Ballands
//

//  Helper struct that represents a file on the file system.
function File(path, data) {
    this.path = path;
    this.data = typeof(data) === 'object' ? data : JSON.parse(data);
}

//   Helper struct that represents a node in the dependency tree.
function Node(name, type, file) {
    this.name = name;
    this.type = type;
    this.file = file;
}

// -----------------------------------------------------------------------------

module.exports = {
    File,
    Node
};
