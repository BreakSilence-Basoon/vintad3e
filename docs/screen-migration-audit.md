# 화면별 이관 대조 현황

공개판의 추적 화면 경로를 빠짐없이 나열한 목록입니다. 경로 일치는 화면 내용이나 동작의 일치를 뜻하지 않습니다. 각 앱의 시험 수와 직접 확인한 차이는 [앱별 브라우저 동작 검사 현황](browser-action-inventory.md)을 보세요.

‘일부 대조’는 위 문서에 기록된 범위만 비교했다는 뜻입니다. 나머지 동작과 ‘상세 미대조’ 화면은 추가 확인이 필요합니다. 공개판의 로그인·자료는 합성 환경이며 실제 운영 권한이나 사업 데이터를 검증하지 않습니다.

화면의 동작·빠진 부분은 앱별 기록에서도 확인할 수 있습니다: [Admin](screen-audit-admin.md), [Apparel](screen-audit-apparel.md), [Creative](#creative), [Floor](screen-audit-floor.md), [Library](screen-audit-library.md), [Partners](screen-audit-partners.md), [Portal](screen-audit-portal.md), [Supporters](screen-audit-supporters.md), [Timetable](screen-audit-timetable.md).

## Admin

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/audit` | 동일 주소 | 일부 대조 |
| `/members/[staffId]` | 동일 주소 | 일부 대조 |
| `/members` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/permissions/apps` | 동일 주소 | 일부 대조 |
| `/permissions` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

## Apparel

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/admin/audit` | 동일 주소 | 일부 대조 |
| `/admin/inventory/graphics/[productCode]` | 동일 주소 | 일부 대조 |
| `/admin/inventory/shortages` | 동일 주소 | 일부 대조 |
| `/admin` | 동일 주소 | 일부 대조 |
| `/admin/products` | 동일 주소 | 일부 대조 |
| `/admin/sales` | 동일 주소 | 일부 대조 |
| `/admin/stats` | 동일 주소 | 일부 대조 |
| `/admin/support` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Creative

| 화면 | 단추·입력과 상태 | 공개판에서 빠진 부분 |
| --- | --- | --- |
| `/` | 프로젝트 목록·빈 목록·조회 오류, 상단 홈·로그인 화면 보기·로그아웃을 합성 자료로 확인. 목록 자체에 등록·검색 입력은 없음. | 실제 직원 접근 확인과 실제 프로젝트 서버의 권한·인증 오류 분기 미연결. |
| `/sign-in` | 합성 로그인과 로그인 화면 보기·홈 복귀, 원본 오류 문구 제공. | 실제 인증 제공자 설정·인증 실패와 접근 거부 판정은 미연결. |
| `/confirmations/[proposalId]` | 합성 제안 불러오기·검토·확인, 조회 오류 후 재시도, 유효 시간 안내와 로그아웃 뒤 새 세션의 확인 기록 분리를 검사. | 정해진 합성 제안 한 건만 사용하며 실제 서버 제안·계정 권한 확인과 업무 변경 실행은 미연결. 실제 권한 거부와 재인증 상태는 미대조. |

PC·모바일 합성 흐름의 자동 검사 근거는 [Creative 브라우저 검사](../apps/creative-web/src/interaction-browser.test.mjs)입니다. 원본의 실제 인증·회사 서버를 사용할 수 없어 이 부분까지 원본과 같다고 판단하지 않습니다.

## Floor

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/inventory` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/sales` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

정책상 대조가 허용되지 않은 화면은 제외했습니다.

## Library

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/bookmarks` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/documents/[slug]` | 동일 주소 | 일부 대조 |
| `/ir/[id]` | 동일 주소 | 일부 대조 |
| `/meetings/[meetingId]` | 동일 주소 | 일부 대조 |
| `/meetings` | 동일 주소 | 일부 대조 |
| `/members` | 동일 주소 | 일부 대조 |
| `/mypage` | 동일 주소 | 일부 대조 |
| `/native/[id]` | 동일 주소 | 일부 대조 |
| `/objects/[objectId]` | 동일 주소 | 일부 대조 |
| `/objects/new` | 동일 주소 | 일부 대조 |
| `/objects` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/public/documents/[documentId]` | 동일 주소 | 일부 대조 |
| `/public/objects/[objectId]` | 동일 주소 | 일부 대조 |
| `/publications/[id]` | 동일 주소 | 일부 대조 |
| `/publications/new` | 동일 주소 | 일부 대조 |
| `/publications` | 동일 주소 | 일부 대조 |
| `/publish` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

## Partners

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/[area]/[partner]/guest` | 원본의 특정 협업처 화면에 대응 | 일부 대조 |
| `/[area]/[partner]` | 동일 주소 | 일부 대조 |
| `/[area]/[partner]/sign-in` | 원본의 특정 협업처 화면에 대응 | 일부 대조 |
| `/[area]` | 동일 주소 | 일부 대조 |
| `/accounts` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/guide/dj/[slug]` | 동일 주소 | 일부 대조 |
| `/guide/dj` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/proj-bedroom/guide/[language]` | 동일 주소 | 일부 대조 |
| `/proj-bedroom/guide` | 동일 주소 | 일부 대조 |
| `/proj-bedroom/partner-01/settlement` | 원본의 특정 협업처 화면에 대응 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

원본의 별도 쇼룸 협업 정산 화면은 공개판의 합성 정산 경로에 대응합니다. 주소는 공개판의 협업처 이름을 합성 값으로 바꾸며 달라졌습니다. 실제 권한·판매·정산 서버는 연결하지 않았습니다.

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Portal

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/about` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

## Supporters

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/coupon` | 동일 주소 | 일부 대조 |
| `/formula-info` | 동일 주소 | 일부 대조 |
| `/formula` | 동일 주소 | 일부 대조 |
| `/instagram` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/performance` | 동일 주소 | 일부 대조 |
| `/settlements` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |
| `/tiktok` | 동일 주소 | 일부 대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Timetable

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/admin/attendance` | 동일 주소 | 일부 대조 |
| `/admin/kiosks` | 동일 주소 | 일부 대조 |
| `/admin/schedule` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/clock-code` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 일부 대조 |
| `/history` | 동일 주소 | 일부 대조 |
| `/kiosk` | 동일 주소 | 일부 대조 |
| `/kiosk/setup` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/scan` | 동일 주소 | 일부 대조 |
| `/schedule` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.
