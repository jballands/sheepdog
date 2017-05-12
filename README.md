# sheepdog

Herd NPM packages in your monorepo. :dog:

This devtool ensures that common dependencies in a monorepo
"resolve" to the same version to allow for hoisting with tools
like [Lerna](https://lernajs.io/). This makes for more
predictable development and a smaller bundle footprint.

## How's It Work?

First, Sheepdog looks at `package.json` files and forms a dependency tree. This
dependency tree represents all the dependencies an entire monorepo needs.

Next, Sheepdog examines the tree and tries to see if dependency ranges across
the monorepo "resolve" to the same version. At a high-level, that routine looks
like this:

1. Dependency version ranges can be thought of as mathematical intervals.
2. If all version ranges end on the same version with the same exclusivity,
the dependencies will resolve. For example, these version ranges will resolve
because they both end in `3.0.0` exclusive:
    ```
    ^2.0.0 => [2.0.0, 3.0.0)
    ^2.1.5 => [2.1.5, 3.0.0)
    ```

## Installation

```
$ yarn add global @jballands/sheepdog
```

## Usage

Jump to command line argument documentation:

* [bark](#bark)
* [marshal](#marshal)
* [dir](#dir)
* [quiet](#quiet)
* [ignore](#ignore)
* [only](#only)

Executing Sheepdog with no arguments will find all
`package.json` files in the current directory that are
simultaneously not in a `node_modules` directory. It will
then warn you of dependencies that conflict with each other
in your monorepo packages (they do not resolve to the same
version).

Exits with code 0.

#### bark

```
-b | --bark
```

Makes Sheepdog exit with code 1 if it finds conflicts.
Useful for [continuous integration](https://en.wikipedia.org/wiki/Continuous_integration).

#### marshal

```
-m | --marshal
```

Allows you to marshal conflicting dependencies to the
correct version interactively. Useful for correcting
dependency inconsistencies.

#### dir

```
-d | --dir <directory>
```

Changes the working directory in which Sheepdog will try
to find `package.json` files.

#### quiet

```
-q | --quiet
```

Suppresses extraneous information to the terminal.

#### ignore

```
-i | --ignore <modules>
```

Ignores conflicting versions of modules in `<modules>`.
For example:

```
# Ignores conflicting versions of react and redux.
$ sheepdog -i react,redux
```

#### only

```
-o | --only <type>
```

Only work on a specific dependency type. For example:

```
# Only works on devDependencies and dependencies
$ sheepdog -o dependencies,devDependencies
```
