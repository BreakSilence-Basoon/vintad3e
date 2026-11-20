# 화면별 이관 대조 현황

공개판의 추적 화면 경로를 빠짐없이 나열한 목록입니다. 경로 일치는 화면 내용이나 동작의 일치를 뜻하지 않습니다. 각 앱의 시험 수와 직접 확인한 차이는 [앱별 브라우저 동작 검사 현황](browser-action-inventory.md)을 보세요.

‘일부 대조’는 위 문서에 기록된 범위만 비교했다는 뜻입니다. 나머지 동작과 ‘상세 미대조’ 화면은 추가 확인이 필요합니다. 공개판의 로그인·자료는 합성 환경이며 실제 운영 권한이나 사업 데이터를 검증하지 않습니다.

## Admin

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/audit` | 동일 주소 | 상세 미대조 |
| `/members/[staffId]` | 동일 주소 | 상세 미대조 |
| `/members` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/permissions/apps` | 동일 주소 | 상세 미대조 |
| `/permissions` | 동일 주소 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

## Apparel

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/admin/audit` | 동일 주소 | 상세 미대조 |
| `/admin/inventory/graphics/[productCode]` | 동일 주소 | 일부 대조 |
| `/admin/inventory/shortages` | 동일 주소 | 상세 미대조 |
| `/admin` | 동일 주소 | 상세 미대조 |
| `/admin/products` | 동일 주소 | 상세 미대조 |
| `/admin/sales` | 동일 주소 | 일부 대조 |
| `/admin/stats` | 동일 주소 | 상세 미대조 |
| `/admin/support` | 동일 주소 | 상세 미대조 |
| `/auth/session-resume` | 동일 주소 | 상세 미대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Creative

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 일부 대조 |

## Floor

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 상세 미대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/inventory` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 상세 미대조 |
| `/sales` | 동일 주소 | 일부 대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

정책상 대조가 허용되지 않은 화면은 제외했습니다.

## Library

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/auth/session-resume` | 동일 주소 | 상세 미대조 |
| `/bookmarks` | 동일 주소 | 상세 미대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/documents/[slug]` | 동일 주소 | 일부 대조 |
| `/ir/[id]` | 동일 주소 | 일부 대조 |
| `/meetings/[meetingId]` | 동일 주소 | 일부 대조 |
| `/meetings` | 동일 주소 | 상세 미대조 |
| `/members` | 동일 주소 | 상세 미대조 |
| `/mypage` | 동일 주소 | 상세 미대조 |
| `/native/[id]` | 동일 주소 | 일부 대조 |
| `/objects/[objectId]` | 동일 주소 | 상세 미대조 |
| `/objects/new` | 동일 주소 | 상세 미대조 |
| `/objects` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/public/documents/[documentId]` | 동일 주소 | 상세 미대조 |
| `/public/objects/[objectId]` | 동일 주소 | 상세 미대조 |
| `/publications/[id]` | 동일 주소 | 일부 대조 |
| `/publications/new` | 동일 주소 | 상세 미대조 |
| `/publications` | 동일 주소 | 상세 미대조 |
| `/publish` | 동일 주소 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

## Partners

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/[area]/[partner]/guest` | 동적 경로 등 추가 확인 | 상세 미대조 |
| `/[area]/[partner]` | 동일 주소 | 일부 대조 |
| `/[area]/[partner]/sign-in` | 동적 경로 등 추가 확인 | 상세 미대조 |
| `/[area]` | 동일 주소 | 상세 미대조 |
| `/accounts` | 동일 주소 | 상세 미대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/guide/dj/[slug]` | 동일 주소 | 상세 미대조 |
| `/guide/dj` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 상세 미대조 |
| `/proj-bedroom/guide/[language]` | 동일 주소 | 상세 미대조 |
| `/proj-bedroom/guide` | 동일 주소 | 상세 미대조 |
| `/proj-bedroom/partner-01/settlement` | 동적 경로 등 추가 확인 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Portal

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/about` | 동일 주소 | 일부 대조 |
| `/auth/session-resume` | 동일 주소 | 일부 대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

## Supporters

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/auth/session-resume` | 동일 주소 | 상세 미대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/coupon` | 동일 주소 | 일부 대조 |
| `/formula-info` | 동일 주소 | 일부 대조 |
| `/formula` | 동일 주소 | 상세 미대조 |
| `/instagram` | 동일 주소 | 상세 미대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/performance` | 동일 주소 | 상세 미대조 |
| `/settlements` | 동일 주소 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |
| `/tiktok` | 동일 주소 | 상세 미대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.

## Timetable

| 공개 화면 경로 | 원본 경로 대응 | 내용·동작 확인 |
| --- | --- | --- |
| `/access-denied` | 동일 주소 | 일부 대조 |
| `/admin/attendance` | 동일 주소 | 상세 미대조 |
| `/admin/kiosks` | 동일 주소 | 상세 미대조 |
| `/admin/schedule` | 동일 주소 | 상세 미대조 |
| `/auth/session-resume` | 동일 주소 | 상세 미대조 |
| `/clock-code` | 동일 주소 | 상세 미대조 |
| `/confirmations/[proposalId]` | 동일 주소 | 상세 미대조 |
| `/history` | 동일 주소 | 상세 미대조 |
| `/kiosk` | 동일 주소 | 상세 미대조 |
| `/kiosk/setup` | 동일 주소 | 일부 대조 |
| `/` | 동일 주소 | 일부 대조 |
| `/scan` | 동일 주소 | 일부 대조 |
| `/schedule` | 동일 주소 | 상세 미대조 |
| `/sign-in` | 동일 주소 | 상세 미대조 |

원본에 있는 개인정보처리방침이나 약관은 가게별로 직접 준비해야 하므로 이 목록에서 공개판 화면으로 세지 않습니다.
