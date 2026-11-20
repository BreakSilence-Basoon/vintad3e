# 앱별 브라우저 동작 검사 현황

이 표는 현재 main의 브라우저 시험 파일에서 확인한 **서로 다른 사용자 동작과 그 결과**를 보수적으로 센 최소치입니다. 같은 동작을 PC와 모바일에서 반복하거나 단순 내부 API 요청만 검사한 것은 별도 동작으로 세지 않습니다. 오류·권한 거부·빈 결과는 사용자의 시도와 화면 결과를 확인할 때 한 건으로 셉니다. 15+는 아래에 근거가 되는 15개 이상이 있다는 뜻이며 실제 총수를 뜻하지 않습니다. 각 앱의 목표는 15개 이상입니다. 이 표는 명시된 브라우저 검사가 main에 반영된 상태를 기준으로 합니다. 실제 운영 인증이나 실사용 데이터 검증은 포함하지 않습니다.

| 앱 | 현재 확인한 최소 | 목표 | 근거 |
| --- | ---: | ---: | --- |
| Admin | 16 | 15 | [구성원 검사](../apps/admin-web/src/members-fixture-browser.test.mjs), [키보드 검사](../apps/admin-web/src/interaction-keyboard-browser.test.mjs). 구성원 조회·직원/협업자 전환·상세·권한 화면·계층 전환 3종·앱별 권한·감사 목록·검색·초기화·상세·더보기·잘못된 주소를 확인합니다. 직접 기간 지정과 오래된순 정렬은 [검사 보강 PR #242](https://github.com/BreakSilence-Basoon/vintad3e/pull/242)에서 검사하고 main에 반영했습니다. |
| Apparel | 15+ | 15 | [재고 검사](../apps/apparel-web/src/inventory-stock-browser.test.mjs), [부족 재고 검사](../apps/apparel-web/src/shortage-fixture-browser.test.mjs), [키보드 검사](../apps/apparel-web/src/interaction-keyboard-browser.test.mjs), [매출 통계 검사](../apps/apparel-web/src/sales-overview-browser.test.mjs). 재고 상세·수량 검증·저장·새로고침·미저장 취소/확인·스위치 끄기/켜기·저장 오류·판매 검색/초기화·검증 오류·감사 필터·부족 재고 탭·통계 지표 전환·정렬을 확인합니다. |
| Creative | 15 | 15 | [브라우저 검사](../apps/creative-web/src/interaction-browser.test.mjs). 로그인 필요·로그인·제안 불러오기/검토/확인·새로고침·프로젝트 조회·없는 주소·서버 오류 복구를 확인합니다. 프로젝트 빈 상태·읽기 오류와 원본 상단 홈/계정/로그아웃은 [이관 PR #241](https://github.com/BreakSilence-Basoon/vintad3e/pull/241)에서 검사하고 main에 반영했습니다. 상단 홈 링크의 실제 이동 결과는 [검사 PR #246](https://github.com/BreakSilence-Basoon/vintad3e/pull/246)으로 확인했습니다. 원본에 없는 동작은 만들지 않습니다. |
| Floor | 17 | 15 | [판매 검사](../apps/floor-web/src/sales-fixture-browser.test.mjs), [키보드 검사](../apps/floor-web/src/sales-keyboard-browser.test.mjs). 홈·기간 전환·이전 날짜의 빈 상태·판매 목록·더보기·검색·정렬·초기화·재고 조회·로그인·제안 불러오기/검토/확인·없는 주소를 확인합니다. 재료 등록·중복 거부·손상 저장 보호는 [이관 PR #239](https://github.com/BreakSilence-Basoon/vintad3e/pull/239)에서 검사하고 main에 반영했습니다. |
| Library | 15+ | 15 | [자료 검사](../apps/library-web/src/library-fixture-browser.test.mjs), [기록 검사](../apps/library-web/src/library-records-browser.test.mjs), [키보드 검사](../apps/library-web/src/interaction-keyboard-browser.test.mjs). 검색·문서 열기·파일 목록/열기·북마크 추가/해제·댓글·내 기록·구성원 검색/빈 결과·회의 생성·파일 검증·업로드 확인/승인/실행·업로드 오류 복구·공개 자료 열기를 확인합니다. |
| Partners | 15+ | 15 | [협업 검사](../apps/partners-web/src/partner-fixture-browser.test.mjs), [키보드·게스트 검사](../apps/partners-web/src/interaction-keyboard-browser.test.mjs), [기간 조회 검사](../apps/partners-web/src/collaboration-browser.test.mjs). 협업처 이동·정산 상세·검색/빈 결과·상태 필터·초기화·조건 열기·DJ 추가/삭제/입력 지우기·복사와 실패·게스트 로그인/로그아웃·다른 협업처 접근 거부·재고 탭/상세·기간 조회를 확인합니다. |
| Portal | 16 | 15 | [브라우저 검사](../apps/portal-web/test/fixture-browser.test.mjs). 로그인 필요·로그인·제안 불러오기/검토/확인·새로고침·다음 페이지·업무 앱 보기·로그아웃·없는 주소·서버 오류 복구를 확인합니다. 페이지 선택·이전 이동·방향키·소개 화면 복귀는 [검사 보강 PR #243](https://github.com/BreakSilence-Basoon/vintad3e/pull/243)에서 검사하고 main에 반영했습니다. |
| Supporters | 15+ | 15 | [쿠폰·정산 검사](../apps/supporters-web/src/coupon-fixture-browser.test.mjs), [본인 SNS 검사](../apps/supporters-web/src/sns-fixture-self-browser.test.mjs), [키보드 검사](../apps/supporters-web/src/interaction-keyboard-browser.test.mjs). 쿠폰 조회·코드/링크 복사·구성원 선택·기간 검증/조회·SNS 조회/정렬/설명 열기·등록 표시 변경·연결 해제 취소/확인·정산 연도 선택·지급 표시·공식 검색/빈 결과·로그인을 확인합니다. |
| Timetable | 15+ | 15 | [관리자 일정 검사](../apps/timetable-web/src/fixture-schedule-admin-browser.test.mjs), [관리자 출근부 검사](../apps/timetable-web/src/fixture-history-admin-browser.test.mjs), [본인 검사](../apps/timetable-web/src/fixture-self-browser.test.mjs), [키보드 검사](../apps/timetable-web/src/interaction-keyboard-browser.test.mjs). 일정/출근부 조회·상세·수정·저장·삭제 확인·본인 읽기 제한·기기 등록/해제·빈값/서버 오류·QR 보기·카메라 거부/재시도·로그인 필요·잘못된 저장 내용 보존을 확인합니다. |

수치는 확인된 검사를 추적하기 위한 것이며, 원본의 모든 화면과 기능을 이관했다는 뜻은 아닙니다. 사용자 동작이 없는 화면에 임의 기능을 추가하거나 같은 검사를 여러 번 세어 숫자를 맞추지 않습니다.

## 화면 경로 대조

원본과 공개판의 앱 화면 파일을 경로 기준으로 대조한 숫자입니다. 경로가 같아도 내용과 기능이 모두 같다는 뜻은 아닙니다. [화면별 대조 목록](screen-migration-audit.md)에서 상세 미대조 화면을 확인할 수 있습니다. 동적 경로가 여러 원본 주소를 처리하는 Partners는 단순 합계만으로 이관율을 계산하지 않습니다.

| 앱 | 원본 화면 경로 | 현재 main 공개판 경로 | 확인된 차이 |
| --- | ---: | ---: | --- |
| Admin | 7 | 7 | 경로 일치 |
| Apparel | 14 | 13 | 개인정보 문서는 각 가게가 준비 |
| Creative | 3 | 3 | 경로 일치 |
| Floor | 8 | 7 | 정책 차단 1개 제외 |
| Library | 21 | 21 | 내부 문서 두 경로를 [PR #245](https://github.com/BreakSilence-Basoon/vintad3e/pull/245)에서 이관 |
| Partners | 15 | 13 | 동적 협업처 경로와 합성 정산 경로로 처리하는 주소가 있어 일대일 숫자로 비교할 수 없음; 개인정보 문서는 각 가게가 준비 |
| Portal | 5 | 5 | 경로 일치 |
| Supporters | 13 | 11 | 개인정보 문서·약관은 각 가게가 준비 |
| Timetable | 16 | 14 | 개인정보 문서·약관은 각 가게가 준비 |

코드 기반 대조로 Creative 홈의 로그인 메뉴·빈 상태·오류와 Floor 재료 등록·구매·입고·실사·재료 구성 저장 및 구성 이력 계산을 복원했습니다. 다른 경로도 개별 내용과 상호작용의 원본 일치 여부는 계속 확인해야 합니다.

## 내용·동작 대조 기록

아래는 원본 화면 코드를 직접 읽고 공개판과 대조한 항목입니다. 목록에 없는 화면의 내용 일치는 아직 확인하지 않았습니다.

| 화면 | 원본에서 확인한 구성 | 공개판 상태 |
| --- | --- | --- |
| Admin 홈 | 앱 이름을 눌러 설정된 앱으로 이동 | 합성 홈에 로컬 앱 링크를 더하는 [PR #270](https://github.com/BreakSilence-Basoon/vintad3e/pull/270) 검사 중; 공개 화면이 없는 앱은 연결하지 않음 |
| Admin 구성원 목록 | 권한에 따른 직원·협업자 목록, 상세 이동, 다음 목록 및 처음부터 보기 | 합성 직원·협업자 목록과 상세 이동은 동작; 합성 목록에 다음 목록 이동과 원본의 세부 권한별 분기는 아직 없음 |
| Apparel 용어집 | 분류별 용어 설명과 검색 | 같은 구성으로 이관; 회사 전용 상품과 장소 등은 합성 표현으로 변경 |
| Apparel 홈 | 재고 준비 요약·부족 수량·목표재고 추적표·온라인 주문 준비 | [PR #282](https://github.com/BreakSilence-Basoon/vintad3e/pull/282)에서 합성 재고와 주문으로 연결; 외부 서비스 연동은 하지 않음 |
| Creative 홈·로그인 | 로그인 후 상단 홈·계정·로그아웃과 프로젝트 목록, 빈 상태·오류 | 합성 세션과 함께 이관; 홈 이동 결과도 검사 |
| Floor 재고 | 재료 등록, 재료 구성, 구매·입고, 실사 입력 및 기록 취소 | 합성 자료와 구성 적용 시점 보정 이관 |
| Partners 협업처 상세 | 협업 정산 계산 진입과 해당 협업처의 정산·상품 구성 및 확정 내역 | 합성 쇼룸 계산기·상품·재고와 협업 정산 상세 이관; 확정 내역 구조는 [PR #272](https://github.com/BreakSilence-Basoon/vintad3e/pull/272) 검사 중 |
| Library 내부 문서 | 홈 목록에서 문서를 열고 목차·본문·문서 정보를 확인 | 합성 문서와 로그인 경로는 [PR #245](https://github.com/BreakSilence-Basoon/vintad3e/pull/245) 검사 완료 |
| Library 회의 상세 | 녹화·녹음 첨부와 회의 문서 단계별 등록을 확인 절차를 거쳐 실행 | main에서는 합성 회의 생성과 조회가 가능하지만 첨부·문서 등록은 비활성; 확인 절차를 포함한 작업은 별도 브랜치에 보존됐으며 미완료 |
| Library 로그인 상단 | 홈·검색·계정·로그아웃 및 모바일 메뉴 | 합성 검색·세션 연결 이관 |
| Library 홈 | 로그인 후 자료 목록·검색 | 홈 로그인 흐름은 [PR #271](https://github.com/BreakSilence-Basoon/vintad3e/pull/271) 검사 중 |
| Library 발행 문서 | 문서 도구·문서 정보·다운로드·공유·댓글 및 권한에 따른 보관 | 합성 로그인과 읽기 도구·문서 정보·다운로드·공유·댓글 및 목록 제외 이관 |
| Portal 소개 | 공개 소개 문단을 순서대로 표시 | 같은 구성으로 이관; 회사 전용 소개는 합성 문구로 교체 |
| Supporters 홈 | 로그인 후 직원 선택과 기간 조회, 재인증 뒤 선택값 복귀 | 합성 조회 이관; 로그인 복귀는 [PR #269](https://github.com/BreakSilence-Basoon/vintad3e/pull/269) 검사 완료 |
| Supporters 쿠폰 | 역할과 선택한 구성원에 따른 쿠폰 정보와 복사, 조회 오류 안내 | 합성 구성원 선택과 쿠폰·복사 동작을 제공; 실제 발급 내역과 역할별 서버 조회는 연결하지 않음 |
| Supporters 정산 안내 | 목차·언어 전환·복사·본문 안내 | 원본 탐색 구성과 합성 안내 이관; 실제 공식과 조건 제외 |
| Apparel 인벤토리 상세 | 부족 수량·옵션 수 요약과 재고 편집 | 합성 재고와 원본 편집 구성 연결 |
| Apparel 판매내역 | 판매 검색·기간·출처·상태·정렬·더 불러오기 및 수동 갱신·교차 검증 | 합성 판매 검색·조건 선택과 합성 갱신 이관; 더 불러오기는 PR #289에서 검사 중이며 교차 검증은 실패 상태만 표시하고 실제 서비스를 호출하지 않음 |
| Timetable 기기 등록 | 미등록 기기의 안내, 등록된 기기의 QR 화면 이동 | 합성 기기 등록과 설정 주소 복귀 이관 |
| Timetable QR 스캔 | 로그인 후 카메라로 QR을 읽고 카메라 오류를 안내 | [PR #283](https://github.com/BreakSilence-Basoon/vintad3e/pull/283)에서 합성 로그인과 카메라 오류 안내를 원본과 대조; 실제 출퇴근 기록은 사용하지 않음 |
| Timetable 홈 | 로그인 후 출근부·시간표 전환, 선택한 화면 조회, 등록된 기기 진입 분기 | 합성 로그인·전환·기기 분기 이관; 원본은 선택하지 않은 화면을 불러오지 않고 자리표시만 보여 주지만 공개판은 두 화면 구성을 함께 만듦 |
