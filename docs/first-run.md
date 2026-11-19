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

## 다른 앱 열기

각 앱은 포털과 별도로 실행합니다. 저장소 폴더에서 터미널을 하나 더 열고 아래 예시의 `apparel-web`을 표의 앱 이름으로 바꿉니다. 여러 앱을 동시에 열려면 앱마다 터미널이 하나씩 필요합니다. 종료할 때는 해당 터미널에서 Ctrl+C를 누릅니다.

```sh
corepack pnpm --filter @vintad3e/apparel-web dev
```

| 앱 이름 | 브라우저 주소 | 앱별 안내 |
| --- | --- | --- |
| `timetable-web` | http://127.0.0.1:3824 | [Timetable](../apps/timetable-web/README.md) |
| `apparel-web` | http://127.0.0.1:3826 | [Apparel](../apps/apparel-web/README.md) |
| `supporters-web` | http://127.0.0.1:3827 | [Supporters](../apps/supporters-web/README.md) |
| `partners-web` | http://127.0.0.1:3828 | [Partners](../apps/partners-web/README.md) |
| `library-web` | http://127.0.0.1:3829 | [Library](../apps/library-web/README.md) |
| `floor-web` | http://127.0.0.1:3830 | [Floor](../apps/floor-web/README.md) |
| `creative-web` | http://127.0.0.1:3831 | [Creative](../apps/creative-web/README.md) |
| `admin-web` | http://127.0.0.1:3832 | [Admin](../apps/admin-web/README.md) |

포털에 다른 앱의 링크를 표시하려면 포털 실행 전에 합성 자료 설정을 켜야 합니다. Windows PowerShell에서는 다음 두 줄을 입력합니다.

```powershell
$env:VINTAD3E_PORTAL_FIXTURE = '1'
corepack pnpm --filter @vintad3e/portal-web dev
```

macOS 또는 Linux 터미널에서는 `VINTAD3E_PORTAL_FIXTURE=1 corepack pnpm --filter @vintad3e/portal-web dev`를 사용합니다. 포털의 합성 로그인은 다른 앱의 로그인을 대신하지 않습니다. 각 앱에서 보여 주는 합성 자료와 그 설정 방법은 표의 앱별 안내를 확인하세요.

## 우리 가게 자료는 어떻게 넣나요?

현재 화면에서 사용하는 합성 자료는 실제 가게의 자료를 보관하는 기능이 아닙니다. 일부는 브라우저 탭이나 실행 중인 서버 메모리에만 남고 사라집니다. 실제 직원·고객·매출 정보를 입력하지 마세요. 우리 가게의 데이터를 안전하게 저장하고 직원별 접근을 제한하려면 각 앱에 실제 인증, 저장소, 백업과 필요한 데이터 연결을 별도로 구현하고 검증해야 합니다. 이 저장소만 내려받아 설정값을 바꾸는 방법은 아직 제공되지 않습니다.

앱별 안내에는 어떤 자료를 합성으로 보여 주는지와 해당 자료가 어디에 보관되는지 적혀 있습니다. 가게에 맞게 변경할 때는 먼저 가상의 자료로 시험하고, 실제 업무에 쓰기 전에는 설치·권한·보관·복구 방법을 확인하세요. 직접 설정하기 어렵다면 [mow.codes](https://mow.codes)에 설치와 맞춤 지원을 문의할 수 있습니다.
