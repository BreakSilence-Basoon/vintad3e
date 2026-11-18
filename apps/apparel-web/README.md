# Apparel 인벤토리 화면

원본 인벤토리의 빈 목록, 분류 탭과 필터를 옮겼습니다. 실제 상품, 재고·권한·로그인과 저장 기능은 연결하지 않았습니다. 필터 선택지는 상품이 없는 경우의 원본 상태입니다. 실무에 사용할 수 없습니다.

개발 환경에서 `VINTAD3E_APPAREL_FIXTURE=1`을 설정하면 합성 상품과 옵션을 목록에 표시합니다. 실제 상품이나 재고는 포함하지 않습니다. 상세에서 변경한 수량은 브라우저 메모리에만 남으며 새로고침하면 초기화됩니다. 실제 로그인과 저장은 연결되지 않습니다.

Node 24와 Corepack을 준비해 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/apparel-web dev`를 실행하고 `http://127.0.0.1:3826`을 엽니다.
