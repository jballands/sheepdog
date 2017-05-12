'use strict';

//
//  @jballands/sheepdog
//  utils.spec.js
//
//  © 2017 Jonathan Ballands
//

const jasmine = require('jasmine');
const utils = require('../utils');
const structs = require('../structs');
const File = structs.File;
const Node = structs.Node;

// -----------------------------------------------------------------------------

describe('createDependencyTree', () => {

    it('should create an empty (null) if no file is given', () => {
        const t = utils.createDependencyTree('brutalmoose', 'foo');
        expect(t).toBe(null);
    });

    it('should create an empty (null) if the file doesn\'t have the type ' +
        'key in it', () => {

        const f = new File('this/is/a/path', {
            'bar': {
                'dep1': '^2.0.0'
            }
        });
        const t = utils.createDependencyTree('brutalmoose', 'foo', f);
        expect(t).toBe(null);
    });

    it('should create an empty tree ({}) if the type key has no values', () => {
        const f = new File('this/is/a/path', { 'foo': {} });
        const t = utils.createDependencyTree('brutalmoose', 'foo', f);
        expect(t).toEqual({});
    });

    it('should be able to create a valid tree (simple)', () => {
        const f = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1',
                'dep3': '1.2.x',
                'dep4': '*',
                'dep5': '3.2.1'
            }
        });
        const t = utils.createDependencyTree('brutalmoose', 'foo', f);
        expect(t).toEqual({
            'dep1': {
                '^1.0.0': [new Node('brutalmoose', 'foo', f)],
            },
            'dep2': {
                '~2.0.1': [new Node('brutalmoose', 'foo', f)],
            },
            'dep3': {
                '1.2.x': [new Node('brutalmoose', 'foo', f)],
            },
            'dep4': {
                '*': [new Node('brutalmoose', 'foo', f)],
            },
            'dep5': {
                '3.2.1': [new Node('brutalmoose', 'foo', f)],
            },
        });
    });

});

describe('reduceDependencyTrees', () => {

    it('should return an empty tree ({}) if no trees are provided (no argument)', () => {
        const m = utils.reduceDependencyTrees();
        expect(m).toEqual({});
    });

    it('should return an empty tree ({}) if no trees are provided (empty array)', () => {
        const m = utils.reduceDependencyTrees([]);
        expect(m).toEqual({});
    });

    it('should return the identity if only one tree is provided', () => {
        const f = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1',
                'dep3': '1.2.x',
                'dep4': '*',
                'dep5': '3.2.1'
            }
        });
        const t = utils.createDependencyTree('brutalmoose', 'foo', f);
        const m = utils.reduceDependencyTrees([t]);
        expect(m).toEqual(t);
    });

    it('should merge trees together (no overlap, simple)', () => {
        const f1 = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1'
            }
        });
        const f2 = new File('this/is/a/new/path', {
            'foo': {
                'dep3': '1.2.x',
                'dep4': '*'
            }
        });

        const t1 = utils.createDependencyTree('brutalmoose', 'foo', f1);
        const t2 = utils.createDependencyTree('lucahjin', 'foo', f2);
        const m = utils.reduceDependencyTrees([t1, t2]);
        expect(m).toEqual({
            'dep1': {
                '^1.0.0': [new Node('brutalmoose', 'foo', f1)],
            },
            'dep2': {
                '~2.0.1': [new Node('brutalmoose', 'foo', f1)],
            },
            'dep3': {
                '1.2.x': [new Node('lucahjin', 'foo', f2)],
            },
            'dep4': {
                '*': [new Node('lucahjin', 'foo', f2)],
            }
        });
    });

    it('should merge trees together (overlap, simple)', () => {
        const f1 = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1'
            }
        });
        const f2 = new File('this/is/a/new/path', {
            'foo': {
                'dep1': '^2.0.0',
                'dep2': '~2.0.2'
            }
        });

        const t1 = utils.createDependencyTree('brutalmoose', 'foo', f1);
        const t2 = utils.createDependencyTree('lucahjin', 'foo', f2);
        const m = utils.reduceDependencyTrees([t1, t2]);
        expect(m).toEqual({
            'dep1': {
                '^1.0.0': [new Node('brutalmoose', 'foo', f1)],
                '^2.0.0': [new Node('lucahjin', 'foo', f2)]
            },
            'dep2': {
                '~2.0.1': [new Node('brutalmoose', 'foo', f1)],
                '~2.0.2': [new Node('lucahjin', 'foo', f2)],
            }
        });
    });

    it('should merge trees together (no overlap, complex)', () => {
        const f1 = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1'
            }
        });
        const f2 = new File('this/is/a/path', {
            'bar': {
                'dep3': '1.2.x',
                'dep4': '*'
            }
        });
        const f3 = new File('this/is/a/path', {
            'foo': {
                'dep5': '3.2.1',
                'dep6': '^2.0.0'
            }
        });
        const f4 = new File('this/is/a/path', {
            'bar': {
                'dep7': '~2.2.2',
                'dep8': '3.2.x'
            }
        });

        const t1 = utils.createDependencyTree('brutalmoose', 'foo', f1);
        const t2 = utils.createDependencyTree('brutalmoose', 'bar', f2);
        const t3 = utils.createDependencyTree('lucahjin', 'foo', f3);
        const t4 = utils.createDependencyTree('lucahjin', 'bar', f4);
        const m = utils.reduceDependencyTrees([t1, t2, t3, t4]);
        expect(m).toEqual({
            'dep1': {
                '^1.0.0': [new Node('brutalmoose', 'foo', f1)]
            },
            'dep2': {
                '~2.0.1': [new Node('brutalmoose', 'foo', f1)]
            },
            'dep3': {
                '1.2.x': [new Node('brutalmoose', 'bar', f2)]
            },
            'dep4': {
                '*': [new Node('brutalmoose', 'bar', f2)]
            },
            'dep5': {
                '3.2.1': [new Node('lucahjin', 'foo', f3)]
            },
            'dep6': {
                '^2.0.0': [new Node('lucahjin', 'foo', f3)]
            },
            'dep7': {
                '~2.2.2': [new Node('lucahjin', 'bar', f4)]
            },
            'dep8': {
                '3.2.x': [new Node('lucahjin', 'bar', f4)]
            }
        });
    });

    it('should merge trees together (overlap, complex)', () => {
        const f1 = new File('this/is/a/path', {
            'foo': {
                'dep1': '^1.0.0',
                'dep2': '~2.0.1'
            }
        });
        const f2 = new File('this/is/a/path', {
            'bar': {
                'dep3': '1.2.x',
                'dep4': '*'
            }
        });
        const f3 = new File('this/is/a/path', {
            'foo': {
                'dep1': '3.2.1',
                'dep4': '^5.5.0'
            }
        });
        const f4 = new File('this/is/a/path', {
            'bar': {
                'dep3': '~2.2.2',
                'dep2': '3.2.x'
            }
        });

        const t1 = utils.createDependencyTree('brutalmoose', 'foo', f1);
        const t2 = utils.createDependencyTree('brutalmoose', 'bar', f2);
        const t3 = utils.createDependencyTree('lucahjin', 'foo', f3);
        const t4 = utils.createDependencyTree('lucahjin', 'bar', f4);
        const m = utils.reduceDependencyTrees([t1, t2, t3, t4]);
        expect(m).toEqual({
            'dep1': {
                '^1.0.0': [new Node('brutalmoose', 'foo', f1)],
                '3.2.1': [new Node('lucahjin', 'foo', f3)]
            },
            'dep2': {
                '~2.0.1': [new Node('brutalmoose', 'foo', f1)],
                '3.2.x': [new Node('lucahjin', 'bar', f4)]
            },
            'dep3': {
                '1.2.x': [new Node('brutalmoose', 'bar', f2)],
                '~2.2.2': [new Node('lucahjin', 'bar', f4)]
            },
            'dep4': {
                '*': [new Node('brutalmoose', 'bar', f2)],
                '^5.5.0': [new Node('lucahjin', 'foo', f3)]
            }
        });
    });

    describe('doSemversResolve', () => {

        it('should return false if there no arguments', () => {
            expect(utils.doSemverRangesResolve()).toBe(false);
        });

        it('should return true if there no semvers (empty array)', () => {
            expect(utils.doSemverRangesResolve([])).toBe(true);
        });

        it('should return true if semvers resolve each other (simple)', () => {
            expect(utils.doSemverRangesResolve(['^2.0.0', '^2.3.0'])).toBe(true);
        });

        it('should return true if semvers resolve each other (complex)', () => {
            expect(utils.doSemverRangesResolve(['^2.0.0', '^2.3.0', '^2.5.2', '^2.7.4'])).toBe(true);
        });

        it('should return false if semvers don\'t resolve each other (simple)', () => {
            expect(utils.doSemverRangesResolve(['^2.1.0', '~2.0.0'])).toBe(false);
        });

        it('should return false if semvers don\'t resolve each other (complex)', () => {
            expect(utils.doSemverRangesResolve(['^2.1.0', '~2.0.0', '^2.2.0', '~2.0.1'])).toBe(false);
        });

        it('should return false if semvers don\'t resolve each other (point)', () => {
            expect(utils.doSemverRangesResolve(['~2.1.0', '2.2.0'])).toBe(false);
        });

        it('should return false if semvers don\'t resolve each other (special)', () => {
            expect(utils.doSemverRangesResolve(['^2.1.0', '*'])).toBe(false);
        });
    });

});
