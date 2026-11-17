# Timetable 화면

빈타제 Timetable 화면을 공개하기 위한 첫 단계입니다. 기존 화면의 출근부·근무시간표 전환을 가져왔습니다. 출근부는 원본의 빈 상태를 표시하고 근무시간표 달력은 아직 옮기지 않아, 이 화면은 원본 전체와 같지 않습니다. 로그인, 일정, 출퇴근 기록, 저장 및 API 연결도 없습니다. 실제 직원 정보를 입력하거나 업무에 사용하지 마세요.

Node.js 24와 Corepack이 필요합니다. 저장소 루트에서 다음 명령을 실행합니다.

```sh
corepack pnpm install --filter @vintad3e/timetable-web...
corepack pnpm --filter @vintad3e/timetable-web dev
```

브라우저에서 `http://127.0.0.1:3824`를 엽니다. 종료는 터미널에서 Ctrl+C입니다.

기존 Timetable 슬라이드 전환 컴포넌트와 해당 CSS를 보존했습니다. 이 저장소의 코드 이력에 사설 Git 이력이나 실제 직원·거래 자료는 포함하지 않습니다. 서버 연결과 실제 인증은 별도 작업입니다.
