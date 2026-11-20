import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraMessage } from './camera-message.ts';

test('camera errors use the original guidance for each failure', () => {
  assert.match(cameraMessage(new Error(), false), /보안 연결/);
  assert.match(cameraMessage(new DOMException('', 'NotAllowedError'), true), /카메라 권한이 꺼져/);
  assert.match(cameraMessage(new DOMException('', 'NotFoundError'), true), /사용할 수 있는 카메라가 없습니다/);
  assert.match(cameraMessage(new DOMException('', 'NotReadableError'), true), /다른 앱이 카메라를 사용 중/);
  assert.match(cameraMessage(new Error(), true), /카메라 권한을 확인/);
});
