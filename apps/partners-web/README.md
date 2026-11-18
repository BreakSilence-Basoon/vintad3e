# Partners 일정 화면

원본 협업·대관 캘린더와 일정이 없는 상태를 이관했습니다. 실제 협업 일정·파트너·금액·로그인·권한·서버와 연결되지 않았으며 실제 업무에 사용할 수 없습니다.

개발 환경에서 `VINTAD3E_PARTNERS_FIXTURE=1`을 설정하면 합성 대관 일정과 수납 목록·상세를 표시합니다. 금액과 거래처는 합성 값이며 실제 파트너, 정산, 로그인 및 권한 확인과 연결되지 않습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/partners-web dev`를 실행하고 `http://127.0.0.1:3828`을 엽니다.
