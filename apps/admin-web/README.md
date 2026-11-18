# Admin 구성원 화면

원본 구성원 목록에서 직원이 없는 경우의 화면을 이관했습니다. 실제 직원·외부 구성원·로그인·권한·서버는 연결되지 않았으며 실무에 사용할 수 없습니다.

개발 환경에서 `VINTAD3E_ADMIN_FIXTURE=1`을 설정하면 합성 직원·외부 구성원 목록을 전환해 볼 수 있습니다. 이메일은 예약된 비운영 도메인입니다. 구성원 상세, 실제 로그인과 권한 확인은 연결되지 않습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/admin-web dev`를 실행하고 `http://127.0.0.1:3832/members`를 엽니다.
