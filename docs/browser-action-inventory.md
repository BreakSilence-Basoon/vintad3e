# 앱별 브라우저 동작 검사 현황

이 표는 현재 main의 브라우저 시험 파일에서 확인한 **서로 다른 사용자 동작과 그 결과**를 보수적으로 센 최소치입니다. 같은 동작을 PC와 모바일에서 반복하거나 단순 내부 API 요청만 검사한 것은 별도 동작으로 세지 않습니다. 오류·권한 거부·빈 결과는 사용자의 시도와 화면 결과를 확인할 때 한 건으로 셉니다. 15+는 아래에 근거가 되는 15개 이상이 있다는 뜻이며 실제 총수를 뜻하지 않습니다. 각 앱의 목표는 15개 이상입니다. 실제 운영 인증이나 실사용 데이터 검증은 포함하지 않습니다.

| 앱 | 현재 확인한 수 | 목표 | 근거 및 다음 작업 |
| --- | ---: | ---: | --- |
| Admin | 최소 14 | 15 | [구성원 검사](../apps/admin-web/src/members-fixture-browser.test.mjs), [키보드 검사](../apps/admin-web/src/interaction-keyboard-browser.test.mjs). 구성원 조회·직원/협업자 전환·상세·권한 화면·계층 전환 3종·앱별 권한·감사 목록·검색·초기화·상세·더보기·잘못된 주소를 확인합니다. 남은 동작을 원본과 대조합니다. |
| Apparel | 15+ | 15 | [재고 검사](../apps/apparel-web/src/inventory-stock-browser.test.mjs), [부족 재고 검사](../apps/apparel-web/src/shortage-fixture-browser.test.mjs), [키보드 검사](../apps/apparel-web/src/interaction-keyboard-browser.test.mjs), [매출 통계 검사](../apps/apparel-web/src/sales-overview-browser.test.mjs). 재고 상세·수량 검증·저장·새로고침·미저장 취소/확인·스위치 끄기/켜기·저장 오류·판매 검색/초기화·검증 오류·감사 필터·부족 재고 탭·통계 지표 전환·정렬을 확인합니다. |
| Creative | 최소 9 | 15 | [브라우저 검사](../apps/creative-web/src/interaction-browser.test.mjs). 로그인 필요·로그인·제안 불러오기/검토/확인·새로고침·프로젝트 조회·없는 주소·서버 오류 복구를 확인합니다. 실제로 제공되는 나머지 동작을 원본과 대조합니다. |
| Floor | 최소 14 | 15 | [판매 검사](../apps/floor-web/src/sales-fixture-browser.test.mjs), [키보드 검사](../apps/floor-web/src/sales-keyboard-browser.test.mjs). 홈·기간 전환·이전 날짜의 빈 상태·판매 목록·더보기·검색·정렬·초기화·재고 조회·로그인·제안 불러오기/검토/확인·없는 주소를 확인합니다. 재료 등록 추가 검사는 별도 PR에서 확인 중입니다. |
| Library | 15+ | 15 | [자료 검사](../apps/library-web/src/library-fixture-browser.test.mjs), [기록 검사](../apps/library-web/src/library-records-browser.test.mjs), [키보드 검사](../apps/library-web/src/interaction-keyboard-browser.test.mjs). 검색·문서 열기·파일 목록/열기·북마크 추가/해제·댓글·내 기록·구성원 검색/빈 결과·회의 생성·파일 검증·업로드 확인/승인/실행·업로드 오류 복구·공개 자료 열기를 확인합니다. |
| Partners | 15+ | 15 | [협업 검사](../apps/partners-web/src/partner-fixture-browser.test.mjs), [키보드·게스트 검사](../apps/partners-web/src/interaction-keyboard-browser.test.mjs), [기간 조회 검사](../apps/partners-web/src/collaboration-browser.test.mjs). 협업처 이동·정산 상세·검색/빈 결과·상태 필터·초기화·조건 열기·DJ 추가/삭제/입력 지우기·복사와 실패·게스트 로그인/로그아웃·다른 협업처 접근 거부·재고 탭/상세·기간 조회를 확인합니다. |
| Portal | 최소 11 | 15 | [브라우저 검사](../apps/portal-web/test/fixture-browser.test.mjs). 로그인 필요·로그인·제안 불러오기/검토/확인·새로고침·다음 페이지·업무 앱 보기·로그아웃·없는 주소·서버 오류 복구를 확인합니다. 실제로 제공되는 나머지 동작을 원본과 대조합니다. |
| Supporters | 15+ | 15 | [쿠폰·정산 검사](../apps/supporters-web/src/coupon-fixture-browser.test.mjs), [본인 SNS 검사](../apps/supporters-web/src/sns-fixture-self-browser.test.mjs), [키보드 검사](../apps/supporters-web/src/interaction-keyboard-browser.test.mjs). 쿠폰 조회·코드/링크 복사·구성원 선택·기간 검증/조회·SNS 조회/정렬/설명 열기·등록 표시 변경·연결 해제 취소/확인·정산 연도 선택·지급 표시·공식 검색/빈 결과·로그인을 확인합니다. |
| Timetable | 15+ | 15 | [관리자 일정 검사](../apps/timetable-web/src/fixture-schedule-admin-browser.test.mjs), [관리자 출근부 검사](../apps/timetable-web/src/fixture-history-admin-browser.test.mjs), [본인 검사](../apps/timetable-web/src/fixture-self-browser.test.mjs), [키보드 검사](../apps/timetable-web/src/interaction-keyboard-browser.test.mjs). 일정/출근부 조회·상세·수정·저장·삭제 확인·본인 읽기 제한·기기 등록/해제·빈값/서버 오류·QR 보기·카메라 거부/재시도·로그인 필요·잘못된 저장 내용 보존을 확인합니다. |

수치는 확인된 검사를 추적하기 위한 것이며, 원본의 모든 화면과 기능을 이관했다는 뜻은 아닙니다. 사용자 동작이 없는 화면에 임의 기능을 추가하거나 같은 검사를 여러 번 세어 숫자를 맞추지 않습니다.
