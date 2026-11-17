# 포털 화면

원본 포털의 세 장짜리 캐러셀, 빈 업무 앱 상태와 하단 그림을 이관합니다. 회사 전용 링크는 넣지 않았습니다. 인증, 앱 목록과 로그아웃 동작은 연결되지 않았습니다. 실제 업무에 사용할 수 없습니다.

Node.js 24와 Corepack을 준비한 뒤 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts`와 `corepack pnpm --filter @vintad3e/portal-web dev`를 실행하고 `http://127.0.0.1:3825`를 엽니다.
