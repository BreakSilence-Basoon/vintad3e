import {
  APPAREL_ROUTE_TITLES, DECORATIVE_CLASS, PRIMITIVES, UI_IMPORT,
  definitionNameFor, normalizePath,
  INLINE_SLOT_CONTRACTS, inlineSlotSourceAllowed,
} from '../src/design-contract.mjs';
import { SVG_FILL_CONTRACTS, svgFillSourceAllowed, svgFillAnchorFor } from '../src/svg-fill-contract.mjs';

const nameOf = (node) => node?.type === 'JSXIdentifier' || node?.type === 'Identifier' ? node.name : null;
const attribute = (node, name) => node.attributes?.find((item) => item.type === 'JSXAttribute' && nameOf(item.name) === name);
const unwrap = (node) => node?.type === 'JSXExpressionContainer' ? node.expression : node;
const createMeta = (messages) => ({ type: 'problem', schema: [], messages });
const sourceFilename = (context) => normalizePath(context.filename ?? context.getFilename());

// Read literals, same-file consts and conditional branches. Unreadable values on
// a shared primitive fail, rather than approving arbitrary injected CSS classes.
export function staticStrings(node, bindings = new Map(), visited = new Set()) {
  const value = unwrap(node);
  if (!value) return [];
  if (value.type === 'Literal' || value.type === 'StringLiteral') {
    return typeof value.value === 'string' ? [value.value] : value.value === false || value.value == null ? [] : null;
  }
  if (value.type === 'Identifier') {
    if (value.name === 'undefined') return [];
    if (!bindings.has(value.name) || visited.has(value.name)) return null;
    const next = new Set(visited).add(value.name);
    return staticStrings(bindings.get(value.name), bindings, next);
  }
  if (value.type === 'TemplateLiteral' && !value.expressions.length) return [value.quasis[0]?.value.cooked ?? ''];
  if (value.type === 'ConditionalExpression') {
    const left = staticStrings(value.consequent, bindings, visited);
    const right = staticStrings(value.alternate, bindings, visited);
    return left && right ? [...left, ...right] : null;
  }
  if (value.type === 'LogicalExpression' && value.operator === '&&') return staticStrings(value.right, bindings, visited);
  // Do not infer imported or arbitrary function outputs as checked strings.
  return null;
}

export const rules = {
  'no-inline-slot-misuse': {
    meta: createMeta({ slot: '기존 inline 슬롯은 등록한 요소·값·사용처에서만 사용하세요.' }),
    create(context) {
      if (definitionNameFor(sourceFilename(context))) return {};
      const imports = new Map();
      const primitives = new Map();
      const bindings = new Map();
      const resolve = (node, seen = new Set()) => {
        const value = unwrap(node);
        if (value?.type !== 'Identifier' || !bindings.has(value.name) || seen.has(value.name)) return value;
        return resolve(bindings.get(value.name), new Set(seen).add(value.name));
      };
      const slotGroup = (value) => value?.type === 'MemberExpression'
        ? value.object.type === 'Identifier' ? imports.get(value.object.name)
          : value.object.type === 'MemberExpression' && !value.object.computed && imports.has(`${nameOf(value.object.object)}.*`)
            ? nameOf(value.object.property) : null
        : null;
      const containsSlot = (value) => {
        if (!value || typeof value !== 'object') return false;
        if (slotGroup(value)) return true;
        return Object.entries(value).some(([key, child]) => key !== 'parent'
          && (Array.isArray(child) ? child.some(containsSlot) : containsSlot(child)));
      };
      const containsSvgFill = (value) => {
        if (!value || typeof value !== 'object') return false;
        if (value.type === 'Identifier' && imports.get(value.name) === 'svgFillSlots') return true;
        if (slotGroup(value) === 'svgFillSlots') return true;
        return Object.entries(value).some(([key, child]) => key !== 'parent'
          && (Array.isArray(child) ? child.some(containsSvgFill) : containsSvgFill(child)));
      };
      const svgAnchorMatches = (node, anchor) => {
        if (anchor.d) return staticStrings(attribute(node, 'd')?.value, bindings)?.join('') === anchor.d;
        if (anchor.keyTemplatePrefix) {
          const key = unwrap(attribute(node, 'key')?.value);
          return key?.type === 'TemplateLiteral' && key.expressions.length === 1
            && key.quasis[0]?.value.cooked === anchor.keyTemplatePrefix && key.quasis[1]?.value.cooked === '';
        }
        return Object.entries(anchor.expressions ?? {}).every(([key, expected]) => {
          const value = unwrap(attribute(node, key)?.value);
          return value && context.sourceCode.getText(value).replace(/\s+/g, '') === expected;
        });
      };
      return {
        ImportDeclaration(node) {
          for (const spec of node.specifiers) {
            if (spec.type === 'ImportNamespaceSpecifier') {
              if (node.source.value === '@vintage/ui/slots') imports.set(`${spec.local.name}.*`, '*');
              if (UI_IMPORT.test(node.source.value)) primitives.set(`${spec.local.name}.*`, '*');
            }
            if (spec.type !== 'ImportSpecifier') continue;
            if (node.source.value === '@vintage/ui/slots') imports.set(spec.local.name, spec.imported.name);
            if (UI_IMPORT.test(node.source.value)) primitives.set(spec.local.name, spec.imported.name);
          }
        },
        VariableDeclarator(node) { if (node.id.type === 'Identifier') bindings.set(node.id.name, node.init); },
        JSXOpeningElement(node) {
          const tag = nameOf(node.name);
          for (const item of node.attributes) {
            const value = resolve(item.type === 'JSXSpreadAttribute' ? item.argument : item.value);
            if (!containsSvgFill(value)) continue;
            const key = nameOf(value?.property), spec = SVG_FILL_CONTRACTS[key];
            if (item.type !== 'JSXAttribute' || nameOf(item.name) !== 'fill'
              || value?.type !== 'MemberExpression' || value.computed || slotGroup(value) !== 'svgFillSlots'
              || !spec || !svgFillSourceAllowed(key, sourceFilename(context), tag)
              || !svgAnchorMatches(node, svgFillAnchorFor(key, sourceFilename(context)))) context.report({ node: item, messageId: 'slot' });
          }
          const component = node.name.type === 'JSXMemberExpression' && primitives.has(`${nameOf(node.name.object)}.*`)
            ? nameOf(node.name.property) : primitives.get(tag);
          const appearanceSlot = attribute(node, 'appearanceSlot');
          if (component === 'Button' && appearanceSlot) {
            const values = staticStrings(appearanceSlot.value, bindings);
            if (!values || values.some((value) => !['default', 'graphic-transfer', 'calendar-icon-action', 'text-danger', 'guest-logout', 'topbar-logout'].includes(value))) {
              context.report({ node: appearanceSlot, messageId: 'slot' });
            }
          }
          const layout = attribute(node, 'layout');
          if (component === 'Label' && layout) {
            const values = staticStrings(layout.value, bindings);
            const appearance = staticStrings(attribute(node, 'appearance')?.value, bindings);
            if (!inlineSlotSourceAllowed('mappingReviewSlots.groupStyle', sourceFilename(context), component)
              || values?.length !== 1 || values[0] !== 'mapping-review'
              || appearance?.length !== 1 || appearance[0] !== 'group') context.report({ node: layout, messageId: 'slot' });
          }
          const style = attribute(node, 'style');
          const value = resolve(style?.value);
          // The two legacy error spans must use the exact registered style;
          // wrapper layout declarations in those files are still independent.
          if (inlineSlotSourceAllowed('supportersFeedbackSlots.snsErrorStyle', sourceFilename(context), tag)
            && value?.type === 'ObjectExpression'
            && value.properties?.some((property) => ['color', 'fontSize'].includes(nameOf(property.key)))) {
            context.report({ node: style, messageId: 'slot' });
          }
          if (value?.type !== 'MemberExpression') {
            if (containsSlot(value)) context.report({ node: style, messageId: 'slot' });
            return;
          }
          const group = slotGroup(value);
          if (!group) return;
          const key = `${group}.${nameOf(value.property)}`;
          if (value.computed || !Object.hasOwn(INLINE_SLOT_CONTRACTS, key)
            || !inlineSlotSourceAllowed(key, sourceFilename(context), tag)) context.report({ node: style, messageId: 'slot' });
        },
      };
    },
  },
  'no-local-primitives': {
    meta: createMeta({
      duplicate: '공통 {{component}}를 복제하지 말고 @vintage/ui에서 가져오세요.',
      native: '공통 {{component}} 스타일을 native {{tag}}에 다시 만들지 마세요. 공통 요소와 named variant/slot을 사용하세요.',
    }),
    create(context) {
      if (definitionNameFor(sourceFilename(context))) return {};
      const bindings = new Map();
      const definition = (node, name) => {
        if (Object.hasOwn(PRIMITIVES, name ?? '')) context.report({ node, messageId: 'duplicate', data: { component: name } });
      };
      return {
        FunctionDeclaration(node) { definition(node, node.id?.name); },
        ClassDeclaration(node) { definition(node, node.id?.name); },
        VariableDeclarator(node) {
          if (node.id.type !== 'Identifier') return;
          bindings.set(node.id.name, node.init);
          // Reserve primitive names, including aliases to forwardRef/memo.
          definition(node, node.id.name);
        },
        JSXOpeningElement(node) {
          const tag = nameOf(node.name);
          const entries = Object.entries(PRIMITIVES).filter(([, spec]) => spec.tag === tag);
          if (!entries.length) return;
          const classAttribute = attribute(node, 'className');
          const values = staticStrings(classAttribute?.value, bindings);
          const tokens = values?.flatMap((item) => item.split(/\s+/)) ?? [];
          for (const [component, spec] of entries) {
            if (tokens.some((token) => spec.classes.includes(token))) {
              context.report({ node: classAttribute ?? node, messageId: 'native', data: { component, tag } });
              break;
            }
          }
        },
      };
    },
  },
  'no-primitive-css-override': {
    meta: createMeta({
      style: '공통 요소의 style 덮어쓰기는 금지입니다. 승인된 named variant/slot에 등록하세요.',
      class: '공통 요소에 미등록 CSS class {{className}}를 추가하지 마세요. named variant/slot으로 등록하세요.',
      unknown: '공통 요소의 className을 정적으로 확인할 수 없습니다. named variant/slot을 사용하세요.',
      profile: 'Floor/Timetable과 Library의 기존 외형에 맞는 명시 profile을 보존하세요.',
    }),
    create(context) {
      if (definitionNameFor(sourceFilename(context))) return {};
      const imports = new Map();
      const bindings = new Map();
      return {
        ImportDeclaration(node) {
          if (!UI_IMPORT.test(node.source.value)) return;
          for (const spec of node.specifiers) {
            if (spec.type === 'ImportSpecifier' && Object.hasOwn(PRIMITIVES, spec.imported.name)) imports.set(spec.local.name, spec.imported.name);
            if (spec.type === 'ImportNamespaceSpecifier') imports.set(`${spec.local.name}.*`, '*');
          }
        },
        VariableDeclarator(node) { if (node.id.type === 'Identifier') bindings.set(node.id.name, node.init); },
        JSXOpeningElement(node) {
          let component = imports.get(nameOf(node.name));
          if (node.name.type === 'JSXMemberExpression' && imports.has(`${nameOf(node.name.object)}.*`)) component = nameOf(node.name.property);
          if (!Object.hasOwn(PRIMITIVES, component ?? '')) return;
          const profileApp = sourceFilename(context).match(/(?:^|\/)apps\/(timetable|floor|library)\//)?.[1];
          if (component === 'Button' && profileApp) {
            const profile = staticStrings(attribute(node, 'profile')?.value, bindings);
            const expected = profileApp === 'library' ? 'library' : 'timetable';
            if (!profile || profile.length !== 1 || profile[0] !== expected) context.report({ node, messageId: 'profile' });
          }
          const style = attribute(node, 'style');
          if (style) context.report({ node: style, messageId: 'style' });
          const classAttribute = attribute(node, 'className');
          if (!classAttribute) return;
          const values = staticStrings(classAttribute.value, bindings);
          if (!values) { context.report({ node: classAttribute, messageId: 'unknown' }); return; }
          // Pending is existing behavior, not an arbitrary appearance exception.
          const allowed = component === 'Button' ? new Set(['is-pending']) : new Set();
          for (const token of new Set(values.flatMap((item) => item.split(/\s+/)).filter(Boolean))) {
            if (!allowed.has(token)) context.report({ node: classAttribute, messageId: 'class', data: { className: token } });
          }
        },
      };
    },
  },
  'no-decorative-label': {
    meta: createMeta({ label: '장식용 eyebrow/kicker/overline은 승인되지 않았습니다. 업무 제목과 label을 유지하세요.' }),
    create(context) {
      const bindings = new Map();
      return {
        VariableDeclarator(node) { if (node.id.type === 'Identifier') bindings.set(node.id.name, node.init); },
        JSXOpeningElement(node) {
          const tag = nameOf(node.name);
          if (tag && /(?:Eyebrow|Kicker|Overline)(?:Label|Text)?$/.test(tag)) context.report({ node, messageId: 'label' });
          const classAttribute = attribute(node, 'className');
          if (staticStrings(classAttribute?.value, bindings)?.some((value) => DECORATIVE_CLASS.test(value))) context.report({ node: classAttribute, messageId: 'label' });
        },
      };
    },
  },
  'no-duplicate-route-title': {
    meta: createMeta({ duplicate: 'Apparel 현재 위치의 {{title}}를 본문 heading에서 반복하지 마세요.' }),
    create(context) {
      const filename = sourceFilename(context);
      const route = Object.keys(APPAREL_ROUTE_TITLES).find((file) => filename === file || filename.endsWith(`/${file}`));
      if (!route) return {};
      const title = APPAREL_ROUTE_TITLES[route];
      const bindings = new Map();
      const textOf = (node) => {
        if (node.type === 'JSXText') return [node.value];
        if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
          let texts = [''];
          for (const child of node.children) {
            const values = textOf(child);
            texts = texts.flatMap((text) => values.map((value) => text + value)).slice(0, 64);
          }
          return texts;
        }
        return staticStrings(node, bindings) ?? [''];
      };
      return {
        VariableDeclarator(node) { if (node.id.type === 'Identifier') bindings.set(node.id.name, node.init); },
        JSXElement(node) {
          if (!/^h[1-6]$/.test(nameOf(node.openingElement.name) ?? '')) return;
          if (textOf(node).some((text) => text.replace(/\s+/g, ' ').trim() === title)) context.report({ node, messageId: 'duplicate', data: { title } });
        },
      };
    },
  },
};

export const policyPlugin = { meta: { name: '@vintage/ui-policy', version: '0.1.0' }, rules };

// Kept separate from dependency imports so config contracts can be tested without
// installing ESLint. config.mjs imports the real official plugin; no fallback.
export function createSharedUiConfig(shadcn, parser, files = ['**/*.{ts,tsx}']) {
  if (!shadcn?.rules?.['no-restyle'] || !parser?.parseForESLint) throw new Error('SHARED_UI_LINT_DEPENDENCY_INVALID');
  return [{
    name: 'vintage/shared-ui',
    files,
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { shadcn, 'bs-ui': policyPlugin },
    settings: {
      shadcn: {
        ui: '@vintage/ui/components',
        componentImports: ['^@vintage/ui($|/components($|/))'],
        mergeFunctions: ['joinClasses'],
        variantFunctions: ['cva'],
      },
    },
    rules: {
      'shadcn/no-restyle': ['error', {
        allow: ['layout'],
        contracts: [{ pattern: '^Button$', allow: ['layout', 'is-pending'] }],
        message: '공통 요소의 named variant/size를 사용하세요.',
      }],
      'shadcn/no-raw-colors': 'error',
      'shadcn/no-arbitrary-values': 'error',
      'shadcn/require-static-classes': 'error',
      'bs-ui/no-local-primitives': 'error',
      'bs-ui/no-primitive-css-override': 'error',
      'bs-ui/no-inline-slot-misuse': 'error',
      'bs-ui/no-decorative-label': 'error',
      'bs-ui/no-duplicate-route-title': 'error',
    },
  }];
}
