# Admin 구성원 화면

원본 구성원 목록에서 직원이 없는 경우의 화면을 이관했습니다. 실제 직원·외부 구성원·로그인·권한·서버는 연결되지 않았으며 실무에 사용할 수 없습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/admin-web dev`를 실행하고 `http://127.0.0.1:3832/members`를 엽니다.
