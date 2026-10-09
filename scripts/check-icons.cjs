const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual source passed to expo-image, without a native renderer.
const filename = 'src/components/commute/ui.tsx';
const source = fs.readFileSync(filename, 'utf8');
const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = ast.statements.filter((statement) =>
  (ts.isFunctionDeclaration(statement) && statement.name?.text === 'Icon') ||
  (ts.isVariableStatement(statement) && statement.declarationList.declarations.some((d) => d.name.getText(ast) === 'paths'))
).map((statement) => statement.getText(ast)).join('\n');
const compiled = ts.transpileModule(declarations, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = {
  exports: {},
  Image: 'Image',
  useTheme: () => ({ primary: '#117C83' }),
  React: { createElement: (_type, props) => props },
  fromByteArray: require('base64-js').fromByteArray,
  Uint8Array,
  encodeURIComponent,
};
vm.createContext(context);
vm.runInContext(compiled + '\nexports.names = Object.keys(paths);', context);

let count = 0;
for (const name of context.exports.names) {
  for (const color of ['#117C83', '#FFF9E9', '#15262C']) {
    const props = context.exports.Icon({ name, size: 20, color });
    const uri = props.source.uri;
    // Android's Base64DataFetcher decodes the portion after the first comma.
    const decoded = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64').toString('utf8');
    assert.match(decoded, /^<svg\s/, `${name}: Android must receive valid SVG bytes`);
    assert.ok(decoded.endsWith('</svg>'), `${name}: SVG must be complete`);
    assert.ok(decoded.includes(`stroke="${color}"`), `${name}: preserve theme color`);
    assert.equal(props.style.width, 20);
    assert.equal(props.style.height, 20);
    count++;
  }
}
console.log(`Icon source checks passed: ${count} Android-decodable SVGs.`);
