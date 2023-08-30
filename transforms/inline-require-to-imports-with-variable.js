/**
 * Transform
 *
 *   foo(require('lib'))
 *
 * to
 *
 *   import lib from 'lib';
 *   ...
 *   foo(lib)
 *
 */

import Logger from "./utils/logger";

function toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, word, idx) => idx === 0 ? word : word.toUpperCase());
}
function toVariableName(str) {
    return toCamelCase(str).replace(/^\d/, '_');
}

function transformer(file, api, options) {
    const j = api.jscodeshift;
    const logger = new Logger(file, options);

    // ------------------------------------------------------------------ SEARCH
    const nodes = j(file.source)
        .find(j.CallExpression, {
            callee: {
                name: "require"
            }
        });

    logger.log(`${nodes.length} nodes will be transformed`);

    // ----------------------------------------------------------------- REPLACE
    const newImports = [];
    const replaceResult = nodes
        .replaceWith((path) => {
            const identifier = j.identifier(toVariableName(path.node.arguments[0].value));
            const importNode = j.importDeclaration([j.importDefaultSpecifier(identifier)], path.node.arguments[0]);

            newImports.push(importNode);
            return identifier;
        })
        .toSource();
    const firstNode = j(replaceResult).find(j.Node, {}).at(1);

    return firstNode.insertBefore(() => newImports).toSource();
}

export default transformer;
