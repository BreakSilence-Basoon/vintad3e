# Library 홈 화면

원본 홈의 제목 검색과 게시물이 없는 상태를 이관했습니다. 실제 사내 문서·게시물·로그인·권한·검색 서버는 연결되지 않았으며 실제 업무에 사용할 수 없습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/library-web dev`를 실행하고 `http://127.0.0.1:3829`를 엽니다.
