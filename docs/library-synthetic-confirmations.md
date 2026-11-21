# Library 합성 이관 확인

이 경로는 개발 환경에서 정해진 예시만 다룹니다. 실제 가게 문서나 외부 서비스 계정을 연결하지 않습니다. 실행 결과는 로컬 개발 서버의 메모리와 해당 합성 세션에만 남습니다.

1. [Library 안내](../apps/library-web/README.md)에 따라 합성 데이터를 켜고 로그인합니다.
2. 브라우저 개발자 도구의 콘솔을 엽니다. 아래 코드의 `single`은 단건, `batch`는 묶음 이관, `notion`은 Notion 이관 예시입니다.
3. 코드를 실행하면 원본과 같은 확인 주소가 열립니다. 확인 후 적용하면 해당 세션에서 단건·묶음 예시는 `/ir/00000000-0000-4000-8000-000000000101`, Notion 예시는 `/native/00000000-0000-4000-8000-000000000104`를 열 수 있습니다.

```js
const response = await fetch('/api/fixture/ir-confirmation', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ action: 'prepare', kind: 'single' }),
});
if (!response.ok) throw new Error('합성 제안을 만들지 못했습니다.');
const proposal = await response.json();
sessionStorage.setItem(`vintad3e-library-ir-recovery:${proposal.proposalId}`, proposal.proof);
location.assign(`/confirmations/${encodeURIComponent(proposal.proposalId)}`);
```

같은 탭의 합성 로그인 복귀를 지원합니다. 제안 기한이 지나거나 서버가 재시작되면 제안을 다시 만들어야 합니다. 실제 인증·작업 권한과 문서 이관은 연결되지 않습니다.
