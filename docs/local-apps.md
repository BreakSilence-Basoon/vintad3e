# 다른 앱 화면 실행하기

먼저 저장소를 내려받고 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts`를 실행합니다. Node.js 24와 pnpm 10.11.0이 필요합니다. 화면은 개발 중이며 실제 직원·고객·판매 정보를 입력하거나 업무에 사용하지 마세요.

보고 싶은 앱의 명령 하나를 터미널에 입력하고 해당 주소를 브라우저에서 엽니다. 다른 앱을 보려면 Ctrl+C로 현재 서버를 종료한 뒤 다음 명령을 실행합니다.

| 앱 | 실행 명령 | 주소 |
| --- | --- | --- |
| Apparel | `corepack pnpm --filter @vintad3e/apparel-web dev` | [http://127.0.0.1:3826](http://127.0.0.1:3826) |
| Supporters | `corepack pnpm --filter @vintad3e/supporters-web dev` | [http://127.0.0.1:3827/coupon](http://127.0.0.1:3827/coupon) |
| Partners | `corepack pnpm --filter @vintad3e/partners-web dev` | [http://127.0.0.1:3828](http://127.0.0.1:3828) |
| Library | `corepack pnpm --filter @vintad3e/library-web dev` | [http://127.0.0.1:3829](http://127.0.0.1:3829) |

Windows의 새 저장소 폴더에서 위 네 명령과 HTTP 200 응답을 확인했습니다. 설치에는 기존 pnpm 캐시를 사용했습니다. 실제 로그인·권한·서버 저장과 실제 사용자 화면은 확인하지 않았습니다. 합성 자료 설정과 각 앱의 제한은 각 앱 폴더의 README를 확인하세요.

개발 서버가 `next-env.d.ts`의 자동 생성 경로를 바꿀 수 있습니다. 코드를 수정하기 전에 `git status`와 `git diff`로 변경을 확인하세요. 자신의 변경을 확인하지 않고 파일을 지우거나 덮어쓰지 마세요.
