# 빈타제 화면 처음 실행하기

이 안내는 내 컴퓨터에서 공개된 포털 화면을 여는 방법입니다. 실제 고객·직원·판매 정보를 처리하는 업무용 설치는 아직 준비되지 않았습니다.

1. [Git](https://git-scm.com/install/)과 [Node.js 24](https://nodejs.org/en/download)를 설치하고 터미널을 엽니다. Corepack을 사용할 수 있어야 합니다.
2. 작업할 빈 폴더로 이동해 아래 명령을 한 줄씩 입력합니다.

   ```sh
   git clone https://github.com/BreakSilence-Basoon/vintad3e.git
   cd vintad3e
   node --version
   corepack pnpm --version
   ```

   Node 버전은 `v24.`로 시작하고 pnpm은 `10.11.0`이어야 합니다. 같은 이름의 폴더가 있으면 지우지 말고 다른 빈 폴더에서 시작하세요.
3. 아래 명령으로 필요한 패키지를 설치하고 포털을 실행합니다. 설치에는 인터넷 연결이 필요합니다.

   ```sh
   corepack pnpm install --frozen-lockfile --ignore-scripts
   corepack pnpm --filter @vintad3e/portal-web dev
   ```

4. 브라우저에서 [http://127.0.0.1:3825](http://127.0.0.1:3825)를 엽니다. 터미널은 실행하는 동안 열어 두고, 종료할 때는 Ctrl+C를 누릅니다. 포트가 이미 사용 중이면 기존 프로그램을 확인하세요.

Windows의 새 저장소 폴더에서 위 설치와 포털 HTTP 응답을 확인했습니다. 이 시험은 기존 pnpm 캐시를 사용했으며 실제 로그인이나 업무 데이터를 확인하지 않았습니다. API 기동은 [가상 자료 안내](local-api-fixture.md)를 따르세요.
