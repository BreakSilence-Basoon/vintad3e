import test from 'node:test';
import assert from 'node:assert/strict';
import { checkInternalLinks } from '../scripts/check-internal-links.mjs';

const documents = new Map([
  ['README.md', '# 첫 화면\n\n[안내](docs/guide.md#hello-world-1)\n'],
  ['docs/guide.md', '# Hello, **World**!\n\n# Hello, **World**!\n\n<a id="custom-id"></a>\n'],
]);
const files = [...documents.keys(), 'assets/file name.svg', 'src/example.ts'];

test('resolves GitHub headings, repeated headings, references, images and HTML links', () => {
  const source = `# 첫 화면

[반복 제목](docs/guide.md#hello-world-1)
[HTML 앵커](docs/guide.md#custom-id)
[참조][guide]
[같은 문서](#첫-화면)
![그림](assets/file%20name.svg)
<a href="src/example.ts">파일</a>
<img src="assets/file%20name.svg" alt="그림">
[저장소 루트](./)

[guide]: docs/guide.md#hello-world
`;
  const result = checkInternalLinks(files, new Map([...documents, ['README.md', source]]));
  assert.deepEqual(result.errors, []);
  assert.ok(result.checked >= 9);
});

test('reports missing paths and anchors, including unused reference definitions', () => {
  const source = `# 제목

[없는 파일](missing.md)
[없는 제목](docs/guide.md#missing)
[저장소 밖](../private.md)
[잘못된 인코딩](docs/%FF.md)
![없는 이미지](assets/missing.png)

[unused]: docs/absent.md
`;
  const result = checkInternalLinks(files, new Map([...documents, ['README.md', source]]));
  assert.equal(result.errors.length, 6);
  assert.ok(result.errors.some(item => item.href === 'docs/guide.md#missing' && item.reason === '제목 앵커가 없음'));
  assert.ok(result.errors.some(item => item.href === '../private.md' && item.reason === '저장소 밖 경로'));
  assert.ok(result.errors.some(item => item.href === 'docs/%FF.md' && item.reason === '잘못된 URL 인코딩'));
});

test('resolves parent paths and Korean heading anchors from a nested document', () => {
  const nested = '# 하위 문서\n\n[홈](../README.md#첫-화면)\n[폴더](../assets/)\n';
  const result = checkInternalLinks(files, new Map([['README.md', '# 첫 화면'], ['docs/guide.md', nested]]));
  assert.deepEqual(result.errors, []);
  assert.equal(result.checked, 2);
});

test('does not treat examples, comments or external links as internal links', () => {
  const source = `# 제목

\`[예시](missing.md)\`

\`\`\`md
[예시](missing.md)
\`\`\`

<!-- <a href="missing.md">숨김</a> -->
[외부](https://example.com/missing.md)
[메일](mailto:example@example.invalid)
`;
  const result = checkInternalLinks(files, new Map([['README.md', source]]));
  assert.equal(result.checked, 0);
  assert.deepEqual(result.errors, []);
});
