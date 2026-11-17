# @vintad3e/ui

빈타제 앱에서 사용하는 React 버튼·입력·라벨·선택창과 CSS를 담은 작업 공간 패키지입니다. 현재는 저장소 안에서 `workspace:*`로 연결하며, 별도의 npm 배포판이나 완성 앱은 아닙니다. React 19와 Node.js 24가 필요합니다.

## 사용

앱의 `package.json`에 `"@vintad3e/ui": "workspace:*"`를 추가하고 필요한 공용 스타일을 불러옵니다.

```tsx
import { Button } from '@vintad3e/ui/components/button';
import { Input } from '@vintad3e/ui/components/input';
import '@vintad3e/ui/styles/controls.css';

<Input name="item" />
<Button type="submit" variant="primary">적용</Button>
```

`Label`, `NativeSelect`와 슬라이드 알림도 제공합니다. `Button`과 `Input`은 일반 HTML 요소의 속성과 동작을 유지합니다. 앱마다 필요한 색상 변수와 화면 CSS는 별도로 준비해야 합니다. 제공하는 파일과 정확한 경로는 [package.json](package.json)을 참고하세요.

## 확인

저장소 루트에서 패키지의 의존성을 설치한 뒤 검사할 수 있습니다.

```sh
corepack pnpm install --filter @vintad3e/ui...
corepack pnpm --filter @vintad3e/ui test
corepack pnpm --filter @vintad3e/ui typecheck
```

컴포넌트의 유래와 제3자 라이선스는 [NOTICE](NOTICE.md)와 [shadcn/ui 라이선스](LICENSE.shadcn)에 있습니다. 이 패키지만으로 로그인·업무 데이터·권한 처리가 제공되지는 않습니다.
