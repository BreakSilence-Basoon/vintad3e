#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repo"
command -v node >/dev/null 2>&1 || { printf '%s\n' 'Node.js 24를 설치하고 터미널을 다시 열어 주세요.' >&2; exit 1; }
case "$(node --version)" in v24.*) ;; *) printf '%s\n' 'Node.js 24가 필요합니다. node --version으로 확인해 주세요.' >&2; exit 1;; esac
command -v corepack >/dev/null 2>&1 || { printf '%s\n' 'Corepack을 찾지 못했습니다. Node.js 24 설치를 확인해 주세요.' >&2; exit 1; }
[ "$(corepack pnpm --version)" = '10.11.0' ] || { printf '%s\n' 'pnpm 10.11.0을 준비하지 못했습니다. 인터넷 연결과 Corepack을 확인해 주세요.' >&2; exit 1; }
node -e "const s=require('node:net').createServer();s.once('error',()=>process.exit(1));s.listen(3825,'127.0.0.1',()=>s.close())" || { printf '%s\n' '3825 포트가 사용 중입니다. 사용 중인 프로그램을 먼저 확인해 주세요.' >&2; exit 1; }
corepack pnpm install --frozen-lockfile --ignore-scripts || { printf '%s\n' '설치하지 못했습니다. 인터넷 연결과 표시된 오류를 확인해 주세요.' >&2; exit 1; }
export VINTAD3E_PORTAL_FIXTURE=1 VINTAD3E_PORTAL_FIXTURE_ORIGIN=http://127.0.0.1:3825
printf '%s\n' '브라우저에서 http://127.0.0.1:3825 를 여세요. 종료하려면 Ctrl+C를 누르세요.'
exec corepack pnpm --filter @vintad3e/portal-web dev
