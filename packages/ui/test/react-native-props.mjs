// HQ/CI qualification after install. This is an element/prop contract, not a
// rendered browser, focus/keyboard or Next build parity claim.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
// data: modules have no package/relative resolver. Pin every emitted import to
// its actual package or owned helper file; never mock React/CVA or write output.
const resolutions = new Map([
  ['react/jsx-runtime', import.meta.resolve('react/jsx-runtime')],
  ['class-variance-authority', import.meta.resolve('class-variance-authority')],
  ['../lib/classes', pathToFileURL(path.join(packageRoot, 'src/lib/classes.ts')).href],
  ['../slots', pathToFileURL(path.join(packageRoot, 'src/slots.ts')).href],
]);
const names = { button: 'Button', input: 'Input', label: 'Label', 'native-select': 'NativeSelect' };
const components = {};
for (const [file, name] of Object.entries(names)) {
  const source = await readFile(path.join(packageRoot, `src/components/${file}.tsx`), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const output = compiled.outputText.replace(/(\bfrom\s*|\bimport\s*)(['"])([^'"]+)\2/g, (_match, prefix, _quote, specifier) => {
    const resolved = resolutions.get(specifier);
    assert.ok(resolved, `UI_NATIVE_IMPORT_NOT_REGISTERED:${specifier}`);
    return `${prefix}${JSON.stringify(resolved)}`;
  });
  components[name] = (await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`))[name];
}

for (const [name, tag] of [['Button', 'button'], ['Input', 'input'], ['Label', 'label'], ['NativeSelect', 'select']]) {
  test(`${name}: native element retains ref, event callback, native attributes and aria`, () => {
    const ref = () => {};
    const callback = () => {};
    const props = { id: 'reference', name: 'choice', ref, onFocus: callback, slot: 'native-slot', 'aria-describedby': 'help', 'data-business-id': 'unchanged', 'data-slot': 'existing-business-slot' };
    const element = components[name](props);
    assert.equal(element.type, tag);
    for (const [key, value] of Object.entries(props)) assert.equal(element.props[key], value);
  });
}

test('Button does not change native submit default, disabled, children or handlers', () => {
  const child = '저장';
  const callback = () => {};
  const defaultButton = components.Button({ children: child, onClick: callback });
  assert.equal(defaultButton.props.type, undefined);
  assert.equal(defaultButton.props.disabled, undefined);
  assert.equal(defaultButton.props.children, child);
  assert.equal(defaultButton.props.onClick, callback);
  for (const type of ['button', 'submit', 'reset']) assert.equal(components.Button({ type }).props.type, type);
  for (const disabled of [false, true]) assert.equal(components.Button({ disabled }).props.disabled, disabled);
});

test('Button named variants preserve existing classes and distinct Timetable profile', () => {
  for (const [variant, expected] of [['default', 'button'], ['primary', 'button button--primary'], ['secondary', 'button button--secondary'], ['ghost', 'button button--ghost'], ['danger', 'button button--danger']]) {
    assert.equal(components.Button({ variant }).props.className, expected);
  }
  assert.equal(components.Button({ profile: 'timetable', size: 'small', variant: 'ghost' }).props.className, 'button button--ghost button--small button--timetable');
  assert.equal(components.Button({ profile: 'library', size: 'small', variant: 'primary' }).props.className, 'button button--primary button--small button--library');
  assert.equal(components.Button({ className: 'is-pending', 'aria-busy': true }).props['aria-busy'], true);
});

test('finite domain button slots add only the original class and never become DOM props', () => {
  for (const [slot, expected] of [['graphic-transfer', 'graphic-dialog__transfer'], ['calendar-icon-action', 'schedule-calendar-page__icon-action'], ['text-danger', 'text-danger'], ['guest-logout', 'guest-preview-logout'], ['topbar-logout', 'topbar__logout']]) {
    const element = components.Button({ variant: 'ghost', size: 'small', profile: 'timetable', appearanceSlot: slot });
    assert.equal(element.props.className, `button button--ghost button--small button--timetable ${expected}`);
    assert.equal(element.props.appearanceSlot, undefined);
  }
  assert.equal(components.Button({ variant: 'primary', size: 'small', appearanceSlot: 'graphic-transfer' }).props.className, 'button button--primary button--small graphic-dialog__transfer');
  assert.equal(components.Button({ variant: 'ghost', appearanceSlot: 'text-danger' }).props.className.includes('button--danger'), false);
});

test('mapping Label layout preserves exact inline geometry, native props and child identity', () => {
  const children = ['브랜드'];
  const element = components.Label({ appearance: 'group', layout: 'mapping-review', htmlFor: 'mapping', children });
  assert.equal(element.type, 'label');
  assert.equal(element.props.className, 'field');
  assert.deepEqual(element.props.style, { minWidth: 240, flex: '1 1 260px' });
  assert.equal(element.props.children, children);
  assert.equal(element.props.htmlFor, 'mapping');
  assert.equal(element.props.layout, undefined);
  const style = { marginTop: 3 };
  assert.equal(components.Label({ style }).props.style, style);
});

test('Input retains type/required/value while native appearance adds no field CSS', () => {
  const element = components.Input({ appearance: 'native', type: 'hidden', required: true, value: 'reference' });
  assert.equal(element.props.className, undefined);
  assert.equal(element.props.type, 'hidden');
  assert.equal(element.props.required, true);
  assert.equal(element.props.value, 'reference');
  assert.equal(components.Input({}).props.className, 'field__control');
});

test('Label remains native label with exact htmlFor association', () => {
  const element = components.Label({ htmlFor: 'input-id', children: '브랜드', appearance: 'native' });
  assert.equal(element.type, 'label');
  assert.equal(element.props.htmlFor, 'input-id');
  assert.equal(element.props.children, '브랜드');
  assert.equal(element.props.className, undefined);
  const groupChildren = [{ type: 'span', props: { className: 'field__label', children: '브랜드' } }, { type: 'input', props: {} }];
  const group = components.Label({ appearance: 'group', children: groupChildren });
  assert.equal(group.type, 'label');
  assert.equal(group.props.className, 'field');
  assert.equal(group.props.children, groupChildren);
});

test('NativeSelect retains numeric size, multiple, option children and selection props', () => {
  const children = [{ type: 'option', props: { value: 'a' } }];
  const element = components.NativeSelect({ size: 4, multiple: true, required: true, defaultValue: ['a'], children, appearance: 'native' });
  assert.equal(element.type, 'select');
  assert.equal(element.props.size, 4);
  assert.equal(element.props.multiple, true);
  assert.equal(element.props.required, true);
  assert.deepEqual(element.props.defaultValue, ['a']);
  assert.equal(element.props.children, children);
  assert.equal(element.props.className, undefined);
});
