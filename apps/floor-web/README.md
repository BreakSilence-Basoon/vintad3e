# Floor 영업일 브리핑과 판매내역 화면

원본 영업일 브리핑과 판매내역의 빈 목록과 기간·검색·정렬 필터를 이관했습니다. 실제 판매·금액·로그인·권한·서버는 연결되지 않았으며 실제 업무에 사용할 수 없습니다.

개발 환경에서 `VINTAD3E_FLOOR_FIXTURE=1`을 설정하면 합성 판매를 바탕으로 한 영업일 브리핑·기간별 매출과 판매 카드, 기간·검색·정렬 및 더 불러오기를 볼 수 있습니다. 표시되는 상품·수량·금액은 합성 값이며 실제 판매·결제·인증·권한과 연결되지 않습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/floor-web dev`를 실행하고 `http://127.0.0.1:3830` 또는 `http://127.0.0.1:3830/sales`를 엽니다.
