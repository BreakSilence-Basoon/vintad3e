# 합성 화면 브라우저 검사

다음 검사는 가상의 로그인과 자료를 사용하고 PC 폭 1440px과 휴대폰 폭 390px에서 실행합니다. 첫 화면은 [공통 검사](../scripts/browser-smoke.mjs), 주요 흐름은 각 앱 검사로 확인합니다. 실제 인증·권한이나 가게 데이터의 정확성은 확인하지 않습니다.

| 앱 | 첫 화면 | 주요 흐름 예시와 검사 |
| --- | --- | --- |
| Portal | 공통 검사 | 로그인·화면 전환·확인 ([검사](../apps/portal-web/test/fixture-browser.test.mjs)) |
| Timetable | 공통 검사 | 합성 기기 등록과 카메라 거부 ([검사](../apps/timetable-web/src/interaction-keyboard-browser.test.mjs)) |
| Apparel | 공통 검사 | 합성 재고 검증·저장과 판매 필터 ([검사](../apps/apparel-web/src/interaction-keyboard-browser.test.mjs)) |
| Supporters | 공통 검사 | 합성 쿠폰 오류와 키보드 입력 ([검사](../apps/supporters-web/src/interaction-keyboard-browser.test.mjs)) |
| Partners | 공통 검사 | 가이드 언어 이동·복사와 합성 정산 입력 ([검사](../apps/partners-web/src/interaction-keyboard-browser.test.mjs)) |
| Library | 공통 검사 | 합성 회의·문서 입력과 저장 오류 복구 ([검사](../apps/library-web/src/interaction-keyboard-browser.test.mjs)) |
| Floor | 공통 검사 | 합성 판매 검색·더 보기와 재고 조회 ([검사](../apps/floor-web/src/sales-keyboard-browser.test.mjs)) |
| Creative | 공통 검사는 로그인 화면까지 | 별도 검사에서 로그인 후 합성 프로젝트 목록과 확인 흐름 ([검사](../apps/creative-web/src/interaction-browser.test.mjs)) |
| Admin | 공통 검사 | 합성 구성원 목록과 변경 기록 필터 ([검사](../apps/admin-web/src/interaction-keyboard-browser.test.mjs)) |

기존 GitHub 호스팅 검사에서 [아홉 앱의 주요 흐름](https://github.com/BreakSilence-Basoon/vintad3e/actions/runs/44915393568)과 [첫 화면 검사](https://github.com/BreakSilence-Basoon/vintad3e/actions/runs/44913041223)가 통과했습니다. 공통 검사의 Creative 행은 로그인 화면을 확인하므로 로그인 뒤 홈은 별도 검사 결과로 구분합니다. 각 검사에 기록된 일부 흐름만 보장하며 모든 화면·입력 조합을 검증하지 않습니다.
