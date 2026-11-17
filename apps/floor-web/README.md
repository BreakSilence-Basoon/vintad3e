# Floor 판매내역 화면

원본 판매내역의 빈 목록과 기간·검색·정렬 필터를 이관했습니다. 실제 판매·금액·로그인·권한·서버는 연결되지 않았으며 실제 업무에 사용할 수 없습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/floor-web dev`를 실행하고 `http://127.0.0.1:3830/sales`를 엽니다.
