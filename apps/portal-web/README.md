# 포털 화면

원본 포털의 세 장짜리 캐러셀, 앱과 바로가기 및 하단 배치 구성을 이관합니다. 회사 원본 그림과 전용 링크는 넣지 않았습니다. 실제 인증, 권한별 앱 목록과 로그아웃 동작은 연결되지 않았습니다. 실제 업무에 사용할 수 없습니다.

Node.js 24와 Corepack을 준비한 뒤 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts`와 `corepack pnpm --filter @vintad3e/portal-web dev`를 실행하고 `http://127.0.0.1:3825`를 엽니다.

개발 모드에서만 `VINTAD3E_PORTAL_FIXTURE=1`을 설정하면 원본 로그인 버튼으로 가상 세션을 만들고 로컬의 Timetable·Apparel·Supporters·Partners·Library·Floor·Creative·Admin 링크를 표시합니다. 각 앱은 별도로 실행해야 하며 포털의 가상 세션이 다른 앱의 로그인이나 권한을 부여하지 않습니다. 로그아웃하면 가상 세션이 제거되고 서버를 재시작하면 모든 세션이 사라집니다. 이 기능은 실제 계정 인증이나 권한 확인이 아니며, 운영 모드에서는 설정값과 관계없이 꺼집니다. Ledger와 외부 링크는 표시만 됩니다.

가상 세션은 30분 후 만료되는 메모리 전용 임의 값이며, 로컬 HTTP에서만 쓸 수 있는 별도 HttpOnly·SameSite=Strict 쿠키를 사용합니다. 로그인과 로그아웃 요청은 설정된 `127.0.0.1` 출처를 확인합니다. 다른 포트로 개발 서버를 실행한다면 `VINTAD3E_PORTAL_FIXTURE_ORIGIN`을 해당 `http://127.0.0.1:<포트>` 출처로 지정해야 합니다. 실제 사용자·비밀번호·토큰을 이 기능에 넣지 마세요.

`/about`은 공개용 소개이며 `/auth/session-resume`은 유효한 합성 세션을 안전한 내부 경로로 돌려보냅니다. 세션이 없을 때 로그인하면 홈으로 이동합니다.

같은 개발 설정의 `/confirmations/proposal-01`에서는 합성 변경 제안의 불러오기·검토·확인을 볼 수 있습니다. 이 상태는 현재 화면 메모리에만 있으며 실제 제안·승인·Codex 실행에 영향을 주지 않습니다. 이 경로에서 로그인하면 합성 제안으로 돌아가며 다른 제안 번호는 제공하지 않습니다.

앱과 Shop 타일에는 이 저장소에서 직접 그린 중립 SVG 아이콘을 사용합니다. 가게의 아이콘으로 바꾸려면 `apps/portal-web/public/images/neutral/`에서 해당 앱 이름의 SVG 파일을 같은 파일명으로 교체하고 개발 서버를 새로고침하세요. 사용 권한을 가진 이미지만 넣으세요. 하단 배경은 `background.svg`를 같은 방식으로 교체할 수 있습니다.
