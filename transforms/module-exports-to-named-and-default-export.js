/**
 * Transform
 *
 *   module.exports = { foo };
 *
 * to both
 *
 *   export default { foo };
 * and
 *   export const foo;
 *
 * Only on global context
 */

import Logger from "./utils/logger";
import { isTopNode } from "./utils/filters";

function transformer(file, api, options) {
    const j = api.jscodeshift;
    const _isTopNode = (path) => isTopNode(j, path);
    const logger = new Logger(file, options);

    // ------------------------------------------------------------------ SEARCH
    const nodes = j(file.source)
        .find(j.ExpressionStatement, {
            expression: {
                left: {
                    object: {
                        name: "module"
                    },
                    property: {
                        name: "exports"
                    }
                },
                operator: "="
            }
        })
        .filter(_isTopNode);

    if (nodes.length > 1) {
        logger.error(
            "There should not be more than one `module.exports` declaration in a file. Aborting transformation"
        );
        return file.source;
    }

    logger.log(`${nodes.length} nodes will be transformed`);

    // ----------------------------------------------------------------- REPLACE
    return nodes
        .replaceWith((path) => {
            // Если экспортируется объект со свойствами, module.exports = { ... }
            if (Array.isArray(path.node.expression.right.properties)) {
                const exportConstNodes = [];
                const namedExportProperties = [];
                const defaultExportProperties = [];

                try {
                    for (const property of path.node.expression.right.properties) {
                        const variable = j.variableDeclaration('const', [
                            j.variableDeclarator(
                                j.identifier(property.key.name),
                                property.value
                            )
                        ])

                        if (!property.shorthand) {
                            // export const foo = ...;
                            exportConstNodes.push(j.exportDeclaration(false, variable));
                        } else {
                            // export { foo };
                            namedExportProperties.push(j.exportSpecifier.from({ exported: property.key, local: property.key }));
                        }
                        // export default { foo };
                        defaultExportProperties.push(property.key.name);
                    }
                } catch (e) {
                    console.error(`${file.path}: adding of named exports has SKIPPED`);
                    return j.exportDefaultDeclaration(path.node.expression.right);
                }

                let namedExportNode;

                if (namedExportProperties.length > 0) {
                    namedExportNode = j.exportNamedDeclaration(null, namedExportProperties);
                }

                const defaultExportNode = j.exportDefaultDeclaration(
                    j.objectExpression(defaultExportProperties.map(propName => {
                        const prop = j.property("init", j.identifier(propName), j.identifier(propName));

                        prop.shorthand = true
                        return prop;
                    }))
                );

                defaultExportNode.comments = path.node.comments;

                return [ ...exportConstNodes, namedExportNode, defaultExportNode ].filter(Boolean);
            }

            // Если экспортируется какая-то одна переменная
            const defaultExportNode = j.exportDefaultDeclaration(path.node.expression.right);
            defaultExportNode.comments = path.node.comments;

            return defaultExportNode;
        })
        .toSource();
}

export default transformer;
