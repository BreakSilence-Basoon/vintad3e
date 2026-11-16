# @vintage/ui

사내 앱의 버튼·입력·라벨·네이티브 선택창과 해당 CSS를 한곳에서 관리한다.
shadcn/ui의 소스 소유 방식을 적용하되, 기존 Apparel·Timetable·Supporters의
디자인과 네이티브 HTML 동작을 유지하도록 구성했다. 원본 출처와 MIT 고지는
[NOTICE](NOTICE.md), 전환 범위와 근거는 [구조 정본](../../docs/ops/design/shared-ui-architecture.md)에 있다.

작업 전 [AI 작업 합의](../../docs/ops/ai-working-agreement.md),
[저장소 규칙](../../docs/ops/repo-workflow.md), [디자인 정본](../../DESIGN.md)을 읽는다.
실행 책임자: [REDACTED] 개발자 (실행: [REDACTED] 개발자의 Codex).

## 소유 경계

| 위치 | 책임 |
| --- | --- |
| `packages/shared` | 기존 공용 색상·글꼴·전역 토큰과 업무 스키마 |
| 이 패키지 | 공통 native control, 기존 디자인별 profile, 명시한 CSS·예외 및 lint 계약 |
| `packages/staff-web` | 회사 인증·권한 상태·확인 화면과 업무 버튼 동작 |
| `apps/*` | 업무 데이터·문구·조회·저장·loading/error·화면 구성 |

앱에 컴포넌트를 다시 복사하지 않는다. 새 공통 요소는 이 패키지에서 검토하고
사용 앱의 화면과 동작을 함께 검증한다. 현재 고객용 Shop·Storefront는 소비 대상이 아니다.
CSS reset·Tailwind preflight·새 Radix wrapper를 추가하지 않았다. 공개 props의
네이티브 `slot`, `ref`, 이벤트, submit 기본값을 유지하고 시각 변형에는 별도
`appearanceSlot`을 쓴다.

## 앱 연결

앱에 `@vintage/ui: workspace:*`, Next `transpilePackages`, 공용 ESLint config,
`components.json` 경로를 연결한다. 실제 예는 [Apparel layout](../../apps/apparel/src/app/layout.tsx)과
[lint 설정](../../apps/apparel/eslint.config.mjs)이다.

```tsx
import { Button } from '@vintage/ui/components/button';
import { Input } from '@vintage/ui/components/input';

<Input name="brand" value={brand} onChange={handleBrandChange} />
<Button type="submit" variant="primary" disabled={pending}>적용</Button>
```

이 예시는 새 업무·문구를 승인하지 않는다. 기존 호출자의 props와 동작을 보존한다.
기존 `.field__control`을 쓰지 않던 입력은 `appearance="native"`를 명시한다.
Floor·Timetable 버튼은 `profile="timetable"`, Library 버튼은 `profile="library"`다.
Library에 console controls CSS를 추가하면 기존 모양이 달라지므로 독립 library CSS를 쓴다.
CSS 순서는 shared 기본 → UI profile → 기존 앱 업무 CSS다. 정확 연결과 소비 목록은
[구조 정본](../../docs/ops/design/shared-ui-architecture.md)에 따른다.

새 앱을 추가할 때 dependency만 연결하고 끝내지 않는다. profile·lint 대상·기준 source·
실제 비교 경로를 함께 등록한다. 새로운 색상·모양·변형은 사용자 UI 권한과 검토를 따르며,
복제·inline 재정의·파일 전체 ignore로 검사를 피하지 않는다.

## 검사와 화면 비교

```text
corepack pnpm --filter @vintage/ui test
corepack pnpm --filter @vintage/ui test:lint
corepack pnpm --filter @vintage/ui test:react
corepack pnpm --filter @vintage/ui typecheck
corepack pnpm design:check
```

공식 `@shadcn/lint`는 지원하는 JSX/Tailwind 규칙을 검사한다. 자체 CSS·native 요소 복제·
장식용 kicker·특정 화면 제목 반복은 보완 검사로 다룬다. CSS 검사에서는 원본 선언과
이관된 선언을 비교하고, 승인 예외를 selector·속성·값·media context 단위로 제한한다.
예외·검사·비교 기준을 고치는 변경도 검토 대상이다.

[기준 화면 목록](../../docs/ops/design/approved-screen-baselines.md)의 고정 source와
변경 source를 같은 Next/React·브라우저·폰트·화면 크기·합성 데이터 조건에서 비교한다.
픽셀·geometry·computed style·문구와 입력·keyboard·pending·오류 동작을 각각 확인한다.
순수 검사·CI PASS·이미지 일치만으로 디자인 의도나 운영 인증이 검증됐다고 하지 않는다.
Apparel의 별도 카탈로그·쇼룸 변경은 이 전환의 의도하지 않은 차이와 분리한다.

현재 작업의 실제 수행·실패·미검증 범위는
[기반 작업 기록](../../docs/worklog/platform/2026-10-05-shared-ui-foundation.md)과
[브라우저 검증 기록](../../docs/worklog/platform/2026-10-05-shared-ui-browser-qualification.md)에 누적한다.

## 직원 앱 슬라이드 알림

Apparel에서 승인된 오른쪽 아래 알림을 전용 client 경로로 제공한다. 기존 root
barrel과 control CSS는 그대로 두며, 소비 앱이 아래 CSS와 viewport를 명시적으로 연결한다.

```tsx
import {
  showStaffToast,
  setStaffStatusToast,
  StaffToastViewport,
} from '@vintage/ui/toast';
import '@vintage/ui/styles/toast.css';
```

유지되는 앱 client layout에 `StaffToastViewport`를 한 번 둔다. `showStaffToast(text,
tone)`는 client 이벤트/effect에서 기존 결과 문구를 전달한다. tone은 `success`(기본),
`error`, `warning`, `info`다. 접수 알림을 작업 완료로 바꾸거나 업무 요청을 대신 실행하지 않는다.
빈 결과 문구는 무시하고 앞뒤 공백을 제거한다. 같은 문구·tone이 떠 있으면 행을 추가하지
않고 시간을 다시 잰다. 서로 다른 결과와 tone은 함께 쌓인다.

일반 결과는 2400ms, 오류는 5000ms 후 퇴장하며 퇴장에는 260ms가 걸린다. `warning`과
`info`도 일반 결과 시간이다. 완료 전까지 유지할 상태는 `setStaffStatusToast(key, text,
tone)`를 사용하고 끝나면 같은 key에 `null`을 전달한다. 상태의 기본 tone은 `info`이며,
서로 다른 key를 쓰면 작업 상태가 덮어쓰이지 않는다. 상태 안내는 결과 아래에 놓인다.
문구·업무 처리·오류 복구 수단은 소비 앱이 소유한다.

모듈 store는 viewport 구독 전에 받은 결과도 보존한다. 서버/초기 hydration snapshot은
안정된 빈 배열이며 client 구독 뒤 현재 항목을 읽는다. CSS는 원래 Apparel의 색·간격·
300ms 진입·640px 배치·reduced-motion 1ms를 이름만 바꿔 보존한다. 기존 CSS 연결 순서를
따르고 같은 페이지에 이전 앱 toast viewport를 중복 mount하지 않는다.

공개 패키지의 `test`는 실제 UI 컴포넌트 동작, React 서버 렌더, CSS 계약과
SVG·슬롯 규칙을 검사한다. 다른 앱과 비공개 원본이 필요한 통합 검사는
이 공개 패키지에 포함하지 않으며, 소비 앱을 이관한 뒤 별도로 검증해야 한다.
소비 앱 연결 후 실제 화면·오류 복구·전환·reduced-motion은 별도로 검증해야 한다.
이번 추출은 Apparel/Timetable의 소비 코드를 옮기거나 전 앱에 배포한 결과가 아니다.
