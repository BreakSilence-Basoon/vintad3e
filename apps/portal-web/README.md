# 포털 화면

원본 포털의 세 장짜리 캐러셀, 앱과 바로가기의 자리 및 하단 그림을 이관합니다. 회사 전용 링크는 넣지 않았습니다. 실제 인증, 권한별 앱 목록과 로그아웃 동작은 연결되지 않았습니다. 실제 업무에 사용할 수 없습니다.

Node.js 24와 Corepack을 준비한 뒤 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts`와 `corepack pnpm --filter @vintad3e/portal-web dev`를 실행하고 `http://127.0.0.1:3825`를 엽니다.

개발 모드에서만 `VINTAD3E_PORTAL_FIXTURE=1`을 설정하면 가상의 Timetable 접근 목록으로 로컬 `127.0.0.1:3824` 링크를 표시합니다. 해당 앱도 별도 실행해야 합니다. 이 목록은 로그인·실제 권한 확인이 아니며, 운영 모드에서는 설정값과 관계없이 꺼집니다. 다른 앱과 외부 링크는 표시만 됩니다.
