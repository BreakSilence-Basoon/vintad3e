const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(root, '.public-render-'));
fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"commonjs"}\n');

function compileDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      compileDirectory(file);
    } else if (/\.tsx?$/.test(file)) {
      const relative = path.relative(path.join(root, 'src'), file).replace(/\.tsx?$/, '.js');
      const output = path.join(temp, relative);
      const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
        reportDiagnostics: true,
      });
      assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, result.outputText);
    }
  }
}

try {
  compileDirectory(path.join(root, 'src'));
  const { Button } = require(path.join(temp, 'components/button.js'));
  const { Input } = require(path.join(temp, 'components/input.js'));
  const { Label } = require(path.join(temp, 'components/label.js'));
  const { NativeSelect } = require(path.join(temp, 'components/native-select.js'));
  const { StaffToastViewport } = require(path.join(temp, 'components/staff-toast.js'));
  const { splitToastSentences, formatToastText } = require(path.join(temp, 'lib/toast-text.js'));
  test('native button renders its label and disabled state', () => {
    const html = renderToStaticMarkup(React.createElement(Button, { disabled: true }, 'Example'));
    assert.match(html, /^<button\b/);
    assert.match(html, /\bdisabled=""/);
    assert.match(html, />Example<\/button>$/);
  });
  test('input and label render their native association', () => {
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(Label, { htmlFor: 'example' }, 'Example'),
      React.createElement(Input, { id: 'example', required: true })));
    assert.match(html, /<label\b[^>]*\bfor="example"/);
    assert.match(html, /<input\b[^>]*\bid="example"/);
    assert.match(html, /\brequired=""/);
  });
  test('native select renders options and selection', () => {
    const html = renderToStaticMarkup(React.createElement(NativeSelect, { defaultValue: 'b' },
      React.createElement('option', { value: 'a' }, 'A'),
      React.createElement('option', { value: 'b' }, 'B')));
    assert.match(html, /^<select\b/);
    assert.match(html, /<option value="b" selected="">B<\/option>/);
  });
  test('the toast viewport renders safely with its server snapshot', () => {
    const html = renderToStaticMarkup(React.createElement(StaffToastViewport));
    assert.equal(typeof html, 'string');
  });
  test('toast text helpers keep a simple message usable', () => {
    assert.deepEqual(splitToastSentences('Hello.'), ['Hello.']);
    assert.equal(formatToastText('Hello.'), 'Hello.');
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
