export function cameraMessage(error: unknown, secure: boolean) {
  if (!secure) return '카메라는 보안 연결에서만 사용할 수 있습니다.';
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) return '카메라 권한이 꺼져 있습니다. 브라우저 설정에서 Timetable의 카메라를 허용해주세요.';
  if (error instanceof DOMException && (error.name === 'NotFoundError' || error.name === 'OverconstrainedError')) return '사용할 수 있는 카메라가 없습니다.';
  if (error instanceof DOMException && (error.name === 'NotReadableError' || error.name === 'AbortError')) return '다른 앱이 카메라를 사용 중입니다. 다른 앱을 닫고 다시 시도해주세요.';
  return '카메라를 열지 못했습니다. 카메라 권한을 확인하고 다시 시도해주세요.';
}
