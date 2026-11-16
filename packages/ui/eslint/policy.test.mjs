import assert from 'node:assert/strict';
import test from 'node:test';
import { createSharedUiConfig, rules, staticStrings } from './policy.mjs';

const literal = (value) => ({ type: 'Literal', value });
const identifier = (name) => ({ type: 'Identifier', name });
const expression = (value) => ({ type: 'JSXExpressionContainer', expression: value });
const attr = (name, value) => ({ type: 'JSXAttribute', name: { type: 'JSXIdentifier', name }, value });
const opening = (name, attrs = []) => ({ type: 'JSXOpeningElement', name: typeof name === 'string' ? { type: 'JSXIdentifier', name } : name, attributes: attrs });
const variable = (name, init) => ({ type: 'VariableDeclarator', id: identifier(name), init });
const imported = (component, local = component) => ({
  type: 'ImportDeclaration', source: literal('@vintage/ui/components'),
  specifiers: [{ type: 'ImportSpecifier', imported: identifier(component), local: identifier(local) }],
});
const heading = (children, tag = 'h1') => ({ type: 'JSXElement', openingElement: opening(tag), children });
function exercise(rule, nodes, filename = '/repo/apps/apparel/src/components/form.tsx') {
  const reports = [];
  const visitor = rules[rule].create({ filename, report: (report) => reports.push(report) });
  for (const node of nodes) visitor[node.type]?.(node);
  return reports;
}

test('ESLint wiring uses real official rule names, discovery and strict CSS complement', () => {
  const shadcn = { rules: { 'no-restyle': {} } };
  const parser = { parseForESLint() {} };
  const [config] = createSharedUiConfig(shadcn, parser);
  assert.equal(config.plugins.shadcn, shadcn);
  assert.equal(config.languageOptions.parser, parser);
  assert.equal(config.settings.shadcn.ui, '@vintage/ui/components');
  for (const rule of ['no-raw-colors', 'no-arbitrary-values', 'require-static-classes']) assert.equal(config.rules[`shadcn/${rule}`], 'error');
  assert.equal(config.rules['shadcn/no-restyle'][0], 'error');
  for (const rule of Object.keys(rules)) assert.equal(config.rules[`bs-ui/${rule}`], 'error');
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 'error');
  assert.equal(config.ignores, undefined);
  assert.equal(config.rules['shadcn/no-unknown-classes'], undefined); // no installed Tailwind to answer that question
  assert.throws(() => createSharedUiConfig({}, parser), /DEPENDENCY_INVALID/);
  assert.throws(() => createSharedUiConfig(shadcn, {}), /DEPENDENCY_INVALID/);
});

for (const name of ['Button', 'Input', 'Label', 'NativeSelect']) {
  test(`local ${name} replica fails; importing it is allowed`, () => {
    assert.equal(exercise('no-local-primitives', [{ type: 'FunctionDeclaration', id: identifier(name) }]).length, 1);
    assert.equal(exercise('no-local-primitives', [variable(name, { type: 'ArrowFunctionExpression' })]).length, 1);
    assert.equal(exercise('no-local-primitives', [imported(name)]).length, 0);
  });
}

for (const [tag, classes] of [['button', 'button button--ghost'], ['input', 'field__control'], ['label', 'field__label'], ['select', 'field__control']]) {
  test(`native ${tag} cannot duplicate registered control CSS`, () => {
    assert.equal(exercise('no-local-primitives', [opening(tag, [attr('className', literal(classes))])]).length, 1);
  });
}

test('hidden/native fields and native status spans are not blindly turned into buttons', () => {
  for (const node of [
    opening('input', [attr('type', literal('hidden'))]),
    opening('span', [attr('role', literal('status')), attr('className', literal('button button--ghost kiosk-select-active'))]),
    opening('label', [attr('className', literal('audit-filter-bar__keyword'))]),
  ]) assert.equal(exercise('no-local-primitives', [node]).length, 0);
});

test('only the exact four owned definitions can implement registered primitives', () => {
  const definition = { type: 'FunctionDeclaration', id: identifier('Button') };
  assert.equal(exercise('no-local-primitives', [definition], '/repo/packages/ui/src/components/button.tsx').length, 0);
  assert.equal(exercise('no-local-primitives', [definition], '/repo/packages/ui/src/components/another-button.tsx').length, 1);
});

test('native replica detection follows same-file class constants', () => {
  assert.equal(exercise('no-local-primitives', [variable('classes', literal('button')), opening('button', [attr('className', expression(identifier('classes')))])]).length, 1);
});

test('unregistered ordinary CSS, raw color and arbitrary utility fixture fails', () => {
  for (const className of ['my-prettier-button', 'button--danger', 'bg-red-500', 'p-[13px]', 'w-full']) {
    const reports = exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('className', literal(className))])]);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].messageId, 'class');
  }
});

test('named variant/size, aria-busy and exact pending class pass', () => {
  const nodes = [imported('Button'), opening('Button', [
    attr('variant', literal('primary')), attr('size', literal('small')),
    attr('aria-busy', expression(identifier('pending'))), attr('className', literal('is-pending')),
  ])];
  assert.equal(exercise('no-primitive-css-override', nodes).length, 0);
});

test('inline primitive style and unreadable dynamic class fail', () => {
  const reports = exercise('no-primitive-css-override', [imported('Input'), opening('Input', [attr('style', expression({ type: 'ObjectExpression', properties: [] })), attr('className', expression(identifier('externalClass')))])]);
  assert.deepEqual(reports.map((report) => report.messageId), ['style', 'unknown']);
});

test('renamed and namespace imports cannot hide CSS overrides', () => {
  assert.equal(exercise('no-primitive-css-override', [imported('Button', 'Action'), opening('Action', [attr('className', literal('custom'))])]).length, 1);
  const namespace = { type: 'ImportDeclaration', source: literal('@vintage/ui'), specifiers: [{ type: 'ImportNamespaceSpecifier', local: identifier('UI') }] };
  const member = { type: 'JSXMemberExpression', object: { type: 'JSXIdentifier', name: 'UI' }, property: { type: 'JSXIdentifier', name: 'Button' } };
  assert.equal(exercise('no-primitive-css-override', [namespace, opening(member, [attr('style', expression({ type: 'ObjectExpression' }))])]).length, 1);
});

test('conditional classes check every readable branch and reject unknown branches', () => {
  const conditional = { type: 'ConditionalExpression', consequent: literal('is-pending'), alternate: literal('colorful') };
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('className', expression(conditional))])]).length, 1);
  conditional.alternate = identifier('external');
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('className', expression(conditional))])])[0].messageId, 'unknown');
});

test('decorative eyebrow classes and components fail without blocking real field labels', () => {
  for (const className of ['eyebrow', 'page__eyebrow', 'section-kicker', 'intro overline']) {
    assert.equal(exercise('no-decorative-label', [opening('p', [attr('className', literal(className))])]).length, 1);
  }
  assert.equal(exercise('no-decorative-label', [opening('HeaderEyebrow')]).length, 1);
  assert.equal(exercise('no-decorative-label', [opening('Label', [attr('htmlFor', literal('brand')), attr('className', literal('field__label'))])]).length, 0);
});

test('Apparel route duplicate title fails; useful distinct section and detail title pass', () => {
  const filename = '/repo/apps/apparel/src/app/admin/products/page.tsx';
  const text = (value) => ({ type: 'JSXText', value });
  assert.equal(exercise('no-duplicate-route-title', [heading([text('인벤토리')])], filename).length, 1);
  assert.equal(exercise('no-duplicate-route-title', [heading([heading([text('인벤토리')], 'span')])], filename).length, 1);
  assert.equal(exercise('no-duplicate-route-title', [variable('title', literal('인벤토리')), heading([expression(identifier('title'))])], filename).length, 1);
  const condition = { type: 'ConditionalExpression', consequent: literal('인벤토리'), alternate: literal('판매처') };
  assert.equal(exercise('no-duplicate-route-title', [heading([expression(condition)])], filename).length, 1);
  assert.equal(exercise('no-duplicate-route-title', [heading([text('판매처')], 'h2')], filename).length, 0);
  assert.equal(exercise('no-duplicate-route-title', [heading([text('옵션 품목')])], '/repo/apps/apparel/src/app/admin/inventory/graphics/[productCode]/page.tsx').length, 0);
});

test('unresolvable and cyclic class values are never approved as static', () => {
  assert.equal(staticStrings(identifier('a'), new Map([['a', identifier('b')], ['b', identifier('a')]])), null);
  assert.equal(staticStrings({ type: 'CallExpression', callee: identifier('external') }), null);
});

test('Timetable Button cannot silently take console defaults', () => {
  const filename = '/repo/apps/timetable/src/components/form-submit-button.tsx';
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button')], filename)[0].messageId, 'profile');
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('profile', literal('console'))])], filename)[0].messageId, 'profile');
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('profile', literal('timetable'))])], filename).length, 0);
});

test('Floor and Library keep their distinct existing profiles', () => {
  for (const [app, expected, wrong] of [['floor', 'timetable', 'library'], ['library', 'library', 'timetable']]) {
    const filename = `/repo/apps/${app}/src/components/example.tsx`;
    for (const attributes of [[], [attr('profile', literal(wrong))], [attr('profile', expression(identifier('unknownProfile')))]]) {
      assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', attributes)], filename)[0].messageId, 'profile');
    }
    assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('profile', literal(expected))])], filename).length, 0);
  }
});

test('field-group label adoption uses named appearance without altering child span semantics', () => {
  assert.equal(exercise('no-local-primitives', [opening('label', [attr('className', literal('field'))])]).length, 1);
  assert.equal(exercise('no-primitive-css-override', [imported('Label'), opening('Label', [attr('appearance', literal('group'))])]).length, 0);
  assert.equal(exercise('no-local-primitives', [opening('span', [attr('className', literal('field__label'))])]).length, 0);
});

const slotImport = (name, local = name) => ({ ...imported(name, local), source: literal('@vintage/ui/slots') });
const slotStyle = (object = 'supportersFeedbackSlots', property = 'snsErrorStyle') => expression({
  type: 'MemberExpression', computed: false, object: identifier(object), property: identifier(property),
});
const mappingFile = '/repo/apps/apparel/src/components/admin/cafe24-mapping-review-panel.tsx';
const feedbackFile = '/repo/apps/supporters/src/components/sns-sync-button.tsx';

test('mapping layout is exact named Label group API in its original source only', () => {
  const nodes = [imported('Label'), opening('Label', [attr('appearance', literal('group')), attr('layout', literal('mapping-review'))])];
  assert.equal(exercise('no-inline-slot-misuse', nodes, mappingFile).length, 0);
  assert.equal(exercise('no-inline-slot-misuse', nodes, `${mappingFile}.copy.tsx`).length, 1);
  assert.equal(exercise('no-inline-slot-misuse', nodes).length, 1);
  for (const [appearance, layout] of [['field', 'mapping-review'], ['group', 'wide'], ['group', null]]) {
    assert.equal(exercise('no-inline-slot-misuse', [imported('Label'), opening('Label', [attr('appearance', literal(appearance)), attr('layout', literal(layout))])], mappingFile).length, 1);
  }
  // Registration does not approve inline overrides on the same Label.
  assert.equal(exercise('no-primitive-css-override', [...nodes.slice(0, 1), opening('Label', [attr('layout', literal('mapping-review')), attr('style', expression({ type: 'ObjectExpression', properties: [] }))])], mappingFile).length, 1);
});

test('finite domain variant/slots need no arbitrary className waiver', () => {
  for (const slot of ['graphic-transfer', 'calendar-icon-action', 'text-danger', 'guest-logout', 'topbar-logout']) {
    assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('appearanceSlot', literal(slot)), attr('variant', literal('ghost'))])]).length, 0);
  }
  assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('variant', literal('secondary'))])]).length, 0);
  for (const className of ['button--secondary', 'graphic-dialog__transfer', 'schedule-calendar-page__icon-action', 'text-danger', 'guest-preview-logout', 'topbar__logout']) {
    assert.equal(exercise('no-primitive-css-override', [imported('Button'), opening('Button', [attr('className', literal(className))])]).length, 1);
    assert.equal(exercise('no-local-primitives', [opening('button', [attr('className', literal(className))])]).length, 1);
  }
});

test('error slot keeps native span/source boundary including import aliases and same-file constants', () => {
  const nodes = [slotImport('supportersFeedbackSlots', 'feedback'), variable('errorStyle', slotStyle('feedback').expression), opening('span', [attr('style', expression(identifier('errorStyle')))])];
  for (const filename of [feedbackFile, '/repo/apps/supporters/src/components/disconnect-button.tsx']) {
    assert.equal(exercise('no-inline-slot-misuse', nodes, filename).length, 0);
  }
  assert.equal(exercise('no-inline-slot-misuse', nodes).length, 1);
  for (const tag of ['div', 'button', 'Label']) {
    assert.equal(exercise('no-inline-slot-misuse', [slotImport('supportersFeedbackSlots'), opening(tag, [attr('style', slotStyle())])], feedbackFile).length, 1);
  }
  assert.equal(exercise('no-inline-slot-misuse', [slotImport('supportersFeedbackSlots'), opening('span', [attr('style', slotStyle('supportersFeedbackSlots', 'anything'))])], feedbackFile).length, 1);
});

test('original error source is not a blanket inline-style or color exemption', () => {
  const object = (key, value) => expression({ type: 'ObjectExpression', properties: [{ type: 'Property', key: identifier(key), value: literal(value) }] });
  for (const [key, value] of [['color', '#c0392b'], ['color', '#000000'], ['fontSize', '0.72rem'], ['fontSize', '1rem']]) {
    assert.equal(exercise('no-inline-slot-misuse', [opening('span', [attr('style', object(key, value))])], feedbackFile).length, 1);
  }
  assert.equal(exercise('no-inline-slot-misuse', [opening('span', [attr('style', object('display', 'inline-flex'))])], feedbackFile).length, 0);
});

test('namespace imports, computed keys and mixed styles cannot bypass finite slot bounds', () => {
  const namespace = (source, local) => ({ type: 'ImportDeclaration', source: literal(source), specifiers: [{ type: 'ImportNamespaceSpecifier', local: identifier(local) }] });
  const member = { type: 'MemberExpression', computed: false, object: { type: 'MemberExpression', computed: false, object: identifier('slots'), property: identifier('supportersFeedbackSlots') }, property: identifier('snsErrorStyle') };
  const imports = [namespace('@vintage/ui/slots', 'slots')];
  assert.equal(exercise('no-inline-slot-misuse', [...imports, opening('span', [attr('style', expression(member))])], feedbackFile).length, 0);
  assert.equal(exercise('no-inline-slot-misuse', [...imports, opening('span', [attr('style', expression({ ...member, computed: true }))])], feedbackFile).length, 1);
  assert.equal(exercise('no-inline-slot-misuse', [...imports, opening('span', [attr('style', expression({ type: 'ObjectExpression', properties: [{ type: 'SpreadElement', argument: member }] }))])], feedbackFile).length, 1);
  const label = { type: 'JSXMemberExpression', object: identifier('UI'), property: identifier('Label') };
  assert.equal(exercise('no-inline-slot-misuse', [namespace('@vintage/ui', 'UI'), opening(label, [attr('layout', literal('mapping-review')), attr('appearance', literal('group'))])], feedbackFile).length, 1);
});

test('unknown/dynamic domain slot fails while native HTML slot remains caller-owned', () => {
  for (const value of [literal('custom'), expression(identifier('dynamic'))]) {
    assert.equal(exercise('no-inline-slot-misuse', [imported('Button'), opening('Button', [attr('appearanceSlot', value)])]).length, 1);
  }
  assert.equal(exercise('no-inline-slot-misuse', [imported('Button'), opening('Button', [attr('slot', literal('native-slot'))])]).length, 0);
});
