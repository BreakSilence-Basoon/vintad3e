# Library 홈 화면

원본 홈의 제목 검색과 게시물이 없는 상태를 이관했습니다. 실제 사내 문서·게시물·로그인·권한·검색 서버는 연결되지 않았으며 실제 업무에 사용할 수 없습니다.

개발 환경에서 `VINTAD3E_LIBRARY_FIXTURE=1`을 설정하면 합성 문서 목록·제목 검색·문서 내용을 볼 수 있습니다. 복사·보관·댓글은 합성 문서의 브라우저 화면에서만 작동하고 새로고침하면 초기화됩니다. 실제 문서·로그인·권한·서버 저장과 연결되지 않습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/library-web dev`를 실행하고 `http://127.0.0.1:3829`를 엽니다.
