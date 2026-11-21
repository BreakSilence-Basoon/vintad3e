import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import typescript from 'typescript';
import { fixtureNext, fixtureResumePath } from './fixture-session.mjs';

// Compile the real TSX component in memory; no app server or generated files are needed.
function loadComponent(relativePath, mocks = {}) {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const source = readFileSync(sourceUrl, 'utf8');
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { jsx: typescript.JsxEmit.ReactJSX, module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const output = { exports: {} };
  const nativeRequire = createRequire(sourceUrl);
  const localRequire = name => Object.hasOwn(mocks, name) ? mocks[name] : nativeRequire(name);
  new Function('require', 'module', 'exports', compiled)(localRequire, output, output.exports);
  return output.exports;
}
const { PortalCarousel } = loadComponent('./portal-carousel.tsx');

test('carousel renders the first page and keeps other pages inaccessible initially', () => {
  const pages = [
    { id: 'first', label: '첫 페이지', content: React.createElement('a', { href: '/one' }, '첫 링크') },
    { id: 'second', label: '둘째 페이지', content: React.createElement('a', { href: '/two' }, '둘째 링크') },
  ];
  const markup = renderToStaticMarkup(React.createElement(PortalCarousel, { pages }));
  assert.match(markup, /aria-label="1 \/ 2 첫 페이지" aria-hidden="false"/);
  assert.match(markup, /aria-label="2 \/ 2 둘째 페이지" aria-hidden="true" inert=""/);
  assert.match(markup, /aria-label="이전 페이지"[^>]*aria-disabled="true"/);
  assert.match(markup, /aria-label="첫 페이지 보기" aria-current="true"/);
});

test('carousel accepts an empty result within an existing page without adding links', () => {
  const pages = [{ id: 'empty', label: '앱 목록', content: React.createElement('p', null, '목록이 없습니다.') }];
  const markup = renderToStaticMarkup(React.createElement(PortalCarousel, { pages }));
  assert.match(markup, /목록이 없습니다\./);
  assert.doesNotMatch(markup, /<a\b/);
  assert.match(markup, /aria-label="다음 페이지"[^>]*aria-disabled="true"/);
});

test('about page renders its introductory content without a server', () => {
  const AboutPage = loadComponent('./app/about/page.tsx').default;
  const markup = renderToStaticMarkup(React.createElement(AboutPage));
  assert.match(markup, /<h1>빈타제<\/h1>/);
  assert.match(markup, /업무 앱과 사이트를 한곳에서 찾을 수 있습니다\./);
});

test('error screen presents a retry action without starting the app', () => {
  const RouteError = loadComponent('./app/error.tsx', { 'next/navigation': { useRouter: () => ({ refresh() {} }) } }).default;
  const markup = renderToStaticMarkup(React.createElement(RouteError, { error: new Error('example'), reset() {} }));
  assert.match(markup, /role="alert"/);
  assert.match(markup, /화면을 불러오지 못했습니다\./);
  assert.match(markup, /<button[^>]*>다시 시도<\/button>/);
});

test('confirmation screen starts in a loading state without offering a premature action', () => {
  const Button = ({ variant, profile, ...props }) => React.createElement('button', props);
  const { FixtureConfirmationView } = loadComponent('./fixture-confirmation-view.tsx', { '@vintad3e/ui/components': { Button } });
  const markup = renderToStaticMarkup(React.createElement(FixtureConfirmationView, { proposalId: 'proposal-01' }));
  assert.match(markup, /<button[^>]*disabled=""[^>]*>제안 불러오기<\/button>/);
  assert.doesNotMatch(markup, /이 변경 확인/);
});

test('home page renders normal, empty and error fixture states and rejects a wrong host', async () => {
  const previous = Object.fromEntries(['NODE_ENV', 'VINTAD3E_PORTAL_FIXTURE', 'VINTAD3E_PORTAL_FIXTURE_STATE'].map(name => [name, process.env[name]]));
  process.env.NODE_ENV = 'development';
  process.env.VINTAD3E_PORTAL_FIXTURE = '1';
  let host = '127.0.0.1:3825';
  let signedIn = true;
  const mocks = {
    'next/image': { default: ({ unoptimized, priority, ...props }) => React.createElement('img', props) },
    '../portal-carousel': { PortalCarousel },
    '../fixture-session.mjs': { fixtureOrigin: () => 'http://127.0.0.1:3825', fixtureSession: () => signedIn },
    'next/headers': { headers: async () => new Headers({ host }) },
    'next/navigation': { notFound: () => { throw new Error('not found'); }, redirect: value => { throw new Error(`redirect:${value}`); } },
  };
  try {
    const Page = loadComponent('./app/page.tsx', mocks).default;
    delete process.env.VINTAD3E_PORTAL_FIXTURE_STATE;
    let markup = renderToStaticMarkup(await Page());
    assert.match(markup, /http:\/\/127\.0\.0\.1:3829\//);
    process.env.VINTAD3E_PORTAL_FIXTURE_STATE = 'empty';
    markup = renderToStaticMarkup(await Page());
    assert.match(markup, /열 수 있는 업무 앱이 없습니다\./);
    process.env.VINTAD3E_PORTAL_FIXTURE_STATE = 'error';
    markup = renderToStaticMarkup(await Page());
    assert.match(markup, /앱 목록을 불러오지 못했습니다\./);
    host = 'example.invalid';
    await assert.rejects(Page(), /not found/);
    host = '127.0.0.1:3825';
    signedIn = false;
    await assert.rejects(Page(), /redirect:\/sign-in/);
  } finally {
    for (const [name, value] of Object.entries(previous)) value === undefined ? delete process.env[name] : process.env[name] = value;
  }
});

test('session resume preserves safe paths and redirects signed-out users safely', async () => {
  let signedIn = true;
  const mocks = {
    '../../../fixture-session.mjs': { fixtureNext, fixtureResumePath, fixtureOrigin: () => 'http://127.0.0.1:3825', fixtureSession: () => signedIn },
    'next/headers': { headers: async () => new Headers({ host: '127.0.0.1:3825' }) },
    'next/navigation': { notFound: () => { throw new Error('not found'); }, redirect: value => { throw new Error(`redirect:${value}`); } },
  };
  const Page = loadComponent('./app/auth/session-resume/page.tsx', mocks).default;
  await assert.rejects(Page({ searchParams: Promise.resolve({ next: '/about?tab=one' }) }), /redirect:\/about\?tab=one/);
  await assert.rejects(Page({ searchParams: Promise.resolve({ next: '//example.invalid' }) }), /redirect:\/$/);
  signedIn = false;
  await assert.rejects(Page({ searchParams: Promise.resolve({ next: '/about' }) }), /redirect:\/sign-in\?next=%2Fabout/);
});

test('sign-in page handles empty, invalid and signed-in requests', async () => {
  let signedIn = false;
  let origin = 'http://127.0.0.1:3825';
  const mocks = {
    'next/link': { default: ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children) },
    'next/headers': { headers: async () => new Headers({ host: '127.0.0.1:3825' }) },
    'next/navigation': { notFound: () => { throw new Error('not found'); }, redirect: value => { throw new Error(`redirect:${value}`); } },
    '../../fixture-session.mjs': { fixtureNext, fixtureOrigin: () => origin, fixtureSession: () => signedIn },
    '../../fixture-sign-in-toast': { FixtureSignInToast: ({ notice }) => React.createElement('div', { role: 'alert' }, notice.title) },
    '@vintad3e/ui/styles/toast.css': {},
    './sign-in-toast.css': {},
  };
  const Page = loadComponent('./app/sign-in/page.tsx', mocks).default;
  let markup = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  assert.match(markup, /회사 계정으로 로그인/);
  assert.match(markup, /name="next" value="\/"/);
  markup = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ next: '//example.invalid', error: 'unknown' }) }));
  assert.match(markup, /name="next" value="\/"/);
  assert.match(markup, /로그인을 완료하지 못했습니다\./);
  signedIn = true;
  markup = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ mode: 'cover', next: '/about' }) }));
  assert.match(markup, /href="\/about"/);
  await assert.rejects(Page({ searchParams: Promise.resolve({ next: '/about' }) }), /redirect:\/about/);
  origin = null;
  await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /not found/);
});

test('confirmation page rejects unknown proposals and redirects when signed out', async () => {
  let signedIn = true;
  const mocks = {
    'next/headers': { headers: async () => new Headers({ host: '127.0.0.1:3825' }) },
    'next/navigation': { notFound: () => { throw new Error('not found'); }, redirect: value => { throw new Error(`redirect:${value}`); } },
    '../../../fixture-session.mjs': { fixtureOrigin: () => 'http://127.0.0.1:3825', fixtureSession: () => signedIn },
    '../../../fixture-confirmation-view': { FixtureConfirmationView: ({ proposalId }) => React.createElement('p', null, proposalId) },
    '../../../fixture-topbar': { FixturePortalTopbar: () => React.createElement('header') },
  };
  const Page = loadComponent('./app/confirmations/[proposalId]/page.tsx', mocks).default;
  const markup = renderToStaticMarkup(await Page({ params: Promise.resolve({ proposalId: 'proposal-01' }) }));
  assert.match(markup, /proposal-01/);
  await assert.rejects(Page({ params: Promise.resolve({ proposalId: '' }) }), /not found/);
  await assert.rejects(Page({ params: Promise.resolve({ proposalId: 'unknown' }) }), /not found/);
  signedIn = false;
  await assert.rejects(Page({ params: Promise.resolve({ proposalId: 'proposal-01' }) }), /redirect:\/sign-in\?next=%2Fconfirmations%2Fproposal-01/);
});

test('topbar exposes home, login-cover and logout actions without a server', () => {
  const Link = ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
  const Image = ({ unoptimized, ...props }) => React.createElement('img', props);
  const Button = ({ variant, size, profile, ...props }) => React.createElement('button', props);
  const { FixturePortalTopbar } = loadComponent('./fixture-topbar.tsx', {
    'next/link': { default: Link }, 'next/image': { default: Image }, '@vintad3e/ui/components': { Button },
  });
  const markup = renderToStaticMarkup(React.createElement(FixturePortalTopbar));
  assert.match(markup, /href="\/"[^>]*aria-label="빈타제 홈으로 이동"/);
  assert.match(markup, /href="\/sign-in\?mode=cover&amp;next=%2F"/);
  assert.match(markup, /<form action="\/api\/fixture\/logout" method="post">/);
});

test('sign-in notice renders both provided and empty text', () => {
  const StaffToast = ({ tone, leaving, ...props }) => React.createElement('div', props);
  const { FixtureSignInToast } = loadComponent('./fixture-sign-in-toast.tsx', {
    '@vintad3e/ui/toast': { StaffToast, formatToastText: text => text, getStaffToastTiming: () => ({ durationMs: 1, leaveMs: 1 }) },
  });
  const markup = renderToStaticMarkup(React.createElement(FixtureSignInToast, { notice: { title: '제목', message: '안내' } }));
  assert.match(markup, /<strong>제목<\/strong><span>안내<\/span>/);
  assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(FixtureSignInToast, { notice: { title: '', message: '' } })));
});

test('root layout preserves its language and supplied children', () => {
  const css = Object.fromEntries(['../internal-console-original.css', '@vintad3e/ui/styles/controls.css', '@vintad3e/ui/styles/staff-web.css', '../staff-original.css', '../portal-original.css'].map(name => [name, {}]));
  const Layout = loadComponent('./app/layout.tsx', css).default;
  const markup = renderToStaticMarkup(React.createElement(Layout, null, React.createElement('main', null, '내용')));
  assert.match(markup, /<html lang="ko"><head><\/head><body><main>내용<\/main><\/body><\/html>/);
});
