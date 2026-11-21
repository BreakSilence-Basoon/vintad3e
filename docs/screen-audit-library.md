# Library 화면별 대조

원본 화면과 공개판의 합성 흐름을 비교했습니다. 실제 문서·회의·직원 정보와 권한 서버는 연결하지 않았습니다. 검사 근거는 [자료](../apps/library-web/src/library-fixture-browser.test.mjs), [기록](../apps/library-web/src/library-records-browser.test.mjs), [키보드 동작](../apps/library-web/src/interaction-keyboard-browser.test.mjs), [내부 문서](../apps/library-web/src/internal-document-browser.test.mjs)입니다.

| 화면 | 원본에서 확인한 구성·동작 | 공개판의 상태와 남은 차이 |
| --- | --- | --- |
| `/` | 로그인 후 자료 목록·검색과 문서 열기. | 합성 자료·검색·로그인 제공. 실제 문서 서버와 권한은 미연결. |
| `/bookmarks`, `/mypage` | 저장한 게시물 또는 내 활동 목록과 조회 오류 안내. | 합성 보관함·활동 목록·빈 상태와 합성 조회 오류 제공 ([#322](https://github.com/BreakSilence-Basoon/vintad3e/pull/322)). 실제 활동·조회 서버는 미연결. |
| `/members` | 구성원 검색·목록과 빈 결과, 조회 오류 안내. | 합성 구성원 검색·빈 결과·합성 조회 오류 제공 ([#322](https://github.com/BreakSilence-Basoon/vintad3e/pull/322)). 실제 직원·서버는 미연결. |
| `/meetings` | 회의 목록·생성과 조회 오류 안내. | 합성 회의 생성·목록·합성 조회 오류 제공 ([#321](https://github.com/BreakSilence-Basoon/vintad3e/pull/321)). 실제 회의 서버는 미연결. |
| `/meetings/[meetingId]` | 녹화·녹음 첨부와 회의 문서 단계별 등록·확인. | 지정 합성 파일을 사용한 첨부·문서 등록과 합성 확인 제공. 실제 파일·회의와 권한 서버는 미연결. |
| `/objects`, `/objects/new` | 파일 목록·빈 상태·오류와 파일 올리기 확인 절차. | 합성 목록·빈 상태·합성 조회 오류와 지정 합성 파일의 업로드 확인 제공 ([#320](https://github.com/BreakSilence-Basoon/vintad3e/pull/320)). 실제 파일 서버는 미연결. |
| `/objects/[objectId]` | 파일 열기와 연결된 문서·보정본 확인. | 지정 합성 텍스트 파일과 해당 보정본 주소 열기 제공 ([#318](https://github.com/BreakSilence-Basoon/vintad3e/pull/318)). 실제 파일과 서식 있는 보정본 렌더러는 미연결 또는 미이관. |
| `/public/objects/[objectId]`, `/public/documents/[documentId]` | 공개 주소에서 파일 또는 문서를 열기. | 지정 합성 자료 열기 제공. 실제 공개 자료 서버는 미연결. |
| `/ir/[id]`, `/native/[id]` | 내부 문서 제목·본문·목차와 문서 정보 조회. | 합성 문서와 로그인 경로 제공. 실제 내부 자료·권한은 미연결. |
| `/publications/[id]` | 발행 문서 읽기·정보·다운로드·공유·댓글과 권한별 보관. | 합성 문서·도구·댓글 및 목록 제외 제공. 실제 문서와 권한은 미연결. |
| `/publications`, `/publications/new`, `/publish` | 이전 발행 주소에서 검색어를 보존하거나 홈으로 이동. | 해당 이동을 합성 홈에서 제공. |
| `/documents/[slug]` | 로그인 확인 뒤 찾을 수 없는 문서로 처리하는 이전 주소. | 합성 로그인 확인 뒤 없는 문서로 처리. 실제 인증은 미연결. |
| `/sign-in` | 로그인·로그인 화면 보기·복귀와 인증 실패 안내. | 합성 로그인·화면 보기·복귀와 원본 오류 안내 제공. 오류 유형·주소 정리·중복 화면 보기 값을 PC·모바일에서 검사. 실제 인증 제공자는 미연결. |
| `/auth/session-resume` | 안전한 주소를 보존해 세션 갱신 뒤 재인증으로 이동. | 합성 세션과 로그인 복귀 제공. 실제 갱신은 미연결. |
| `/confirmations/[proposalId]` | 서버 제안·권한 확인, 검토·승인, 만료·오류·재인증 안내. | 합성 제안 확인 제공. 실제 제안·권한·재인증과 모든 오류 분기는 미연결 또는 미대조. |

위 표에 없는 모든 입력 조합과 실제 서버·권한의 오류는 별도 대조가 필요합니다. 합성 서버의 확인은 실제 업무 권한을 부여하지 않습니다.
