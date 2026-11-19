// HQ/CI after dependency installation. Source worker did not execute this file.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Linter } from 'eslint';
import { sharedUiConfig } from './config.mjs';
import { SVG_FILL_CONTRACTS, svgFillAnchorFor } from '../src/svg-fill-contract.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const filename = path.join(root, 'apps/apparel/src/components/shared-ui-proof.tsx');
// pnpm executes this script from packages/ui. These synthetic files belong to
// the repository, so ESLint must resolve its flat config from the same root.
const linter = new Linter({ cwd: root });
const configuredIssues = (issues) => {
  assert.ok(issues.every((issue) => typeof issue.ruleId === 'string'),
    'LINT_FIXTURE_NOT_CONFIGURED_OR_PARSE_FAILED');
  return issues;
};
const verify = (source, sourceFile = filename) => configuredIssues(
  linter.verify(source, sharedUiConfig, { filename: sourceFile }),
);
const prefix = 'import { Button } from "@vintad3e/ui/components/button";\n';

test('public Timetable history editor uses the approved danger appearance', async () => {
  const sourceFile = path.join(root, 'apps/timetable-web/src/fixture-history-admin-view.tsx');
  const source = await readFile(sourceFile, 'utf8');
  const approved = 'appearanceSlot="text-danger"';
  assert.ok(source.includes(approved));
  assert.deepEqual(verify(source, sourceFile).filter((issue) => issue.severity === 2), []);
  assert.ok(verify(source.replace(approved, 'appearanceSlot="arbitrary-class"'), sourceFile)
    .some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'));
});

test('an unconfigured fixture cannot turn an ignored-file warning into success', () => {
  const wrongRoot = new Linter({ cwd: path.join(root, 'packages/ui') });
  assert.throws(() => configuredIssues(wrongRoot.verify(
    `${prefix}export const Example = () => <Button>확인</Button>;`, sharedUiConfig, { filename },
  )), /LINT_FIXTURE_NOT_CONFIGURED_OR_PARSE_FAILED/);
});

test('official shadcn discovery recognizes the exported Button without a name-only mock', () => {
  const issues = verify(`${prefix}export const Example = () => <Button variant="primary" size="small">확인</Button>;`);
  assert.deepEqual(issues.filter((issue) => issue.severity === 2), []);
});

test('actual official raw-color and restyle rules reject a Tailwind color override', () => {
  const issues = verify(`${prefix}export const Example = () => <Button className="bg-red-500">확인</Button>;`);
  assert.ok(issues.some((issue) => issue.ruleId === 'shadcn/no-raw-colors'));
  assert.ok(issues.some((issue) => issue.ruleId === 'shadcn/no-restyle'));
  assert.ok(issues.some((issue) => issue.ruleId === 'bs-ui/no-primitive-css-override'));
});

test('actual official arbitrary-values rule rejects an arbitrary padding override', () => {
  const issues = verify(`${prefix}export const Example = () => <Button className="p-[13px]">확인</Button>;`);
  assert.ok(issues.some((issue) => issue.ruleId === 'shadcn/no-arbitrary-values'));
});

test('official Button contract and complementary rule allow only existing pending class', () => {
  const issues = verify(`${prefix}export const Example = () => <Button aria-busy={true} className="is-pending">처리 중</Button>;`);
  assert.deepEqual(issues.filter((issue) => issue.severity === 2), []);
});

test('actual parser/plugin integration detects a local primitive replica', () => {
  const issues = verify('export function Button() { return <button className="button">확인</button>; }');
  assert.ok(issues.some((issue) => issue.ruleId === 'bs-ui/no-local-primitives'));
});

test('actual discovery accepts finite secondary/domain slots without className waivers', () => {
  for (const props of ['variant="secondary" size="small"', 'variant="primary" size="small" appearanceSlot="graphic-transfer"', 'variant="ghost" profile="timetable" appearanceSlot="calendar-icon-action"', 'variant="ghost" profile="timetable" appearanceSlot="text-danger"']) {
    assert.deepEqual(verify(`${prefix}export const Example = () => <Button ${props}>확인</Button>;`).filter((issue) => issue.severity === 2), []);
  }
  for (const className of ['button--secondary', 'graphic-dialog__transfer', 'schedule-calendar-page__icon-action', 'text-danger']) {
    assert.ok(verify(`${prefix}export const Example = () => <Button className="${className}">확인</Button>;`).some((issue) => issue.ruleId === 'bs-ui/no-primitive-css-override'));
  }
});

test('actual parser enforces exact mapping source and rejects same-file inline override', () => {
  const source = 'import {Label} from "@vintad3e/ui/components"; export const Example = () => <Label appearance="group" layout="mapping-review">브랜드</Label>;';
  const file = path.join(root, 'apps/apparel/src/components/admin/cafe24-mapping-review-panel.tsx');
  assert.deepEqual(verify(source, file).filter((issue) => issue.severity === 2), []);
  assert.ok(verify(source).some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'));
  assert.ok(verify(source.replace('layout="mapping-review"', 'layout="mapping-review" style={{minWidth:241}}'), file).some((issue) => issue.ruleId === 'bs-ui/no-primitive-css-override'));
});

test('actual parser accepts exact error span slot and rejects color/value/source/tag mutations', () => {
  const source = 'import {supportersFeedbackSlots} from "@vintad3e/ui/slots"; export const Example = () => <span style={supportersFeedbackSlots.snsErrorStyle}>오류</span>;';
  const file = path.join(root, 'apps/supporters/src/components/sns-sync-button.tsx');
  assert.deepEqual(verify(source, file).filter((issue) => issue.severity === 2), []);
  for (const bad of [source.replace('<span ', '<div ').replace('</span>', '</div>'), source.replace('snsErrorStyle', 'anotherStyle'), source.replace('supportersFeedbackSlots.snsErrorStyle', '{color:"#c0392b",fontSize:"0.72rem"}'), source.replace('supportersFeedbackSlots.snsErrorStyle', '{color:"#000000",fontSize:"1rem"}')]) {
    assert.ok(verify(bad, file).some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'));
  }
  assert.ok(verify(source).some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'));
});

test('actual official lint permits only source-bound preserved SVG fill slots', () => {
  const imported = 'import {svgFillSlots} from "@vintad3e/ui/slots";';
  for (const [name, spec] of Object.entries(SVG_FILL_CONTRACTS)) {
    for (const owned of spec.sources) {
      const original = svgFillAnchorFor(name, owned);
      const anchor = original.d ? `d="${original.d}"`
        : original.keyTemplatePrefix ? 'key={`hov-dim-${a.seg.id}`}'
          : 'x={i * slot} y={TOP_PAD - 4} width={slot} height={PLOT_H + 4} rx={4}';
      const element = `<${spec.element} ${anchor} fill={svgFillSlots.${name}} />`;
      const source = `${imported}export const Example = () => ${element};`;
      const file = path.join(root, owned);
      assert.deepEqual(verify(source, file).filter((issue) => issue.severity === 2), [], `${name}: original SVG`);
      for (const bad of [
        source.replace(`fill={svgFillSlots.${name}}`, `stroke={svgFillSlots.${name}}`),
        source.replace(`<${spec.element} `, '<div '),
        source.replace(`svgFillSlots.${name}`, `svgFillSlots['${name}']`),
        source.replace(anchor, ''),
        source.replace(`svgFillSlots.${name}`, '{...svgFillSlots}'),
      ]) assert.ok(verify(bad, file).some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'), `${name}: wrong use rejected`);
      assert.ok(verify(source.replace(`{svgFillSlots.${name}}`, `"${spec.value}"`), file)
        .some((issue) => issue.ruleId === 'shadcn/no-raw-colors'), `${name}: official rule remains active`);
      assert.ok(verify(source).some((issue) => issue.ruleId === 'bs-ui/no-inline-slot-misuse'), `${name}: wrong source rejected`);
    }
  }
});
