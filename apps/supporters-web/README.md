# Supporters 쿠폰 화면

원본에서 쿠폰을 발급받은 서포터즈가 없는 경우의 화면을 이관했습니다. 실제 직원 정보·쿠폰·로그인·권한·정산과 연결되지 않았습니다. 약관과 개인정보처리방침 링크의 본문도 없습니다. 실무에 사용할 수 없습니다.

Node 24와 Corepack을 준비해 저장소 루트에서 `corepack pnpm install --frozen-lockfile --ignore-scripts` 후 `corepack pnpm --filter @vintad3e/supporters-web dev`를 실행하고 `http://127.0.0.1:3827/coupon`을 엽니다.
