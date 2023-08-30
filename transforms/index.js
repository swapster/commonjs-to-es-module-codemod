import toImportDefault from "./require-to-import-default";
import toNamedImport from "./require-with-props-to-named-import";
import toExportDefault from "./module-exports-to-export-default";
import toNamedExport from "./module-exports-to-named-export";
import singleRequire from "./single-require";
import toNamedAndDefaultExport from "./module-exports-to-named-and-default-export";
import inlineRequireToVariable from "./inline-require-to-imports-with-variable";

const transformScripts = (fileInfo, api, options) => {
    return [
        toNamedAndDefaultExport,
        // toExportDefault,
        toNamedImport,
        singleRequire,
        toImportDefault,
        toNamedExport,
        inlineRequireToVariable,
    ].reduce((input, script) => {
        return script(
            {
                source: input,
                path: fileInfo.path
            },
            api,
            options
        );
    }, fileInfo.source);
};

module.exports = transformScripts;
