$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$oldFixture = [Environment]::GetEnvironmentVariable('VINTAD3E_PORTAL_FIXTURE', 'Process')
$oldOrigin = [Environment]::GetEnvironmentVariable('VINTAD3E_PORTAL_FIXTURE_ORIGIN', 'Process')
Push-Location -LiteralPath $repo
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 24를 설치하고 터미널을 다시 열어 주세요.' }
  $nodeVersion = & node --version
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v24\.') { throw 'Node.js 24가 필요합니다. node --version으로 확인해 주세요.' }
  if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) { throw 'Corepack을 찾지 못했습니다. Node.js 24 설치를 확인해 주세요.' }
  $pnpmVersion = & corepack pnpm --version
  if ($LASTEXITCODE -ne 0 -or $pnpmVersion -ne '10.11.0') { throw 'pnpm 10.11.0을 준비하지 못했습니다. 인터넷 연결과 Corepack을 확인해 주세요.' }
  & node -e "const s=require('node:net').createServer();s.once('error',()=>process.exit(1));s.listen(3825,'127.0.0.1',()=>s.close())"
  if ($LASTEXITCODE -ne 0) { throw '3825 포트가 사용 중입니다. 사용 중인 프로그램을 먼저 확인해 주세요.' }
  & corepack pnpm install --frozen-lockfile --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw '설치하지 못했습니다. 인터넷 연결과 표시된 오류를 확인해 주세요.' }
  $env:VINTAD3E_PORTAL_FIXTURE = '1'
  $env:VINTAD3E_PORTAL_FIXTURE_ORIGIN = 'http://127.0.0.1:3825'
  Write-Host '브라우저에서 http://127.0.0.1:3825 를 여세요. 종료하려면 Ctrl+C를 누르세요.'
  & corepack pnpm --filter '@vintad3e/portal-web' dev
  if ($LASTEXITCODE -ne 0) { throw '포털을 시작하지 못했습니다. 위 오류를 확인해 주세요.' }
} catch {
  Write-Error $_
  exit 1
} finally {
  [Environment]::SetEnvironmentVariable('VINTAD3E_PORTAL_FIXTURE', $oldFixture, 'Process')
  [Environment]::SetEnvironmentVariable('VINTAD3E_PORTAL_FIXTURE_ORIGIN', $oldOrigin, 'Process')
  Pop-Location
}
