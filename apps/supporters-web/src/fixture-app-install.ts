
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type AppInstallEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
  hasPromptEvent: boolean;
};

export type AppInstallAction =
  | { kind: 'hidden' }
  | { kind: 'prompt' }
  | { kind: 'guide'; guide: AppInstallGuide };

export type AppInstallGuide = 'ios-safari' | 'ios-chrome' | 'ios-other' | 'ios-open-safari' | 'in-app' | 'browser-menu';

export const APP_INSTALL_GUIDE_TEXT: Record<AppInstallGuide, string> = {
  'ios-safari': "아래쪽 ⋯ 또는 공유 버튼을 누르세요.\n'홈 화면에 추가'를 누르면 앱이 생겨요.",
  'ios-chrome': "주소창 오른쪽 공유 버튼을 누르세요.\n'홈 화면에 추가'를 누르면 앱이 생겨요.",
  'ios-other': "브라우저 메뉴에서 공유를 누르세요.\n'홈 화면에 추가'를 누르면 앱이 생겨요.",
  'ios-open-safari': '이 브라우저에서는 설치할 수 없어요.\n사파리에서 열고 다시 눌러 주세요.',
  'in-app': '이 앱 안에서는 설치할 수 없어요.\n메뉴에서 다른 브라우저로 열고 다시 눌러 주세요.',
  'browser-menu': "브라우저 메뉴(⋮ 또는 ≡)를 누르세요.\n'앱 설치' 또는 '홈 화면에 추가'를 누르면 앱이 생겨요.",
};

const IN_APP_BROWSER = /KAKAOTALK|Instagram|NAVER\(inapp|FBAN|FBAV|FB_IAB|\bLine\/|DaumApps|BAND\/|everytimeApp|; wv\)/i;

export function isIos(userAgent: string, maxTouchPoints: number) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

function iosMajorMinor(userAgent: string): [number, number] | null {
  const match = userAgent.match(/OS (\d+)[_.](\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
}

export function resolveAppInstallAction(env: AppInstallEnvironment): AppInstallAction {
  if (env.standalone) return { kind: 'hidden' };
  const ua = env.userAgent;
  if (IN_APP_BROWSER.test(ua)) return { kind: 'guide', guide: 'in-app' };
  if (env.hasPromptEvent) return { kind: 'prompt' };
  if (isIos(ua, env.maxTouchPoints)) {
    const isChrome = /CriOS/i.test(ua);
    const isOtherBrowser = isChrome || /EdgiOS|FxiOS|OPiOS|Whale|YaBrowser|SamsungBrowser/i.test(ua);
    if (!isOtherBrowser) return { kind: 'guide', guide: 'ios-safari' };
    const version = iosMajorMinor(ua);
    if (version && (version[0] < 16 || (version[0] === 16 && version[1] < 4))) {
      return { kind: 'guide', guide: 'ios-open-safari' };
    }
    return { kind: 'guide', guide: isChrome ? 'ios-chrome' : 'ios-other' };
  }
  return { kind: 'guide', guide: 'browser-menu' };
}

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    deferredPrompt = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

export function subscribeAppInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readAppInstallEnvironment(): AppInstallEnvironment {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone:
      installed ||
      nav.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches,
    hasPromptEvent: deferredPrompt !== null,
  };
}

export async function promptAppInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  try {
    await event.prompt();
    await event.userChoice;
  } catch {
    return false;
  } finally {
    notify();
  }
  return true;
}
