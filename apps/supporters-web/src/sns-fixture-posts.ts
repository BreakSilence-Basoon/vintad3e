import type { SnsPerformanceReport } from './sns-performance-table';

export function getSnsFixturePosts(env: string | undefined, enabled: string | undefined, platform: 'instagram' | 'tiktok', staff: string | undefined): SnsPerformanceReport[] {
  if (env !== 'development' || enabled !== '1' || staff !== 'supporter-1') return [];
  return [
    { id: `${platform}-1`, postType: 'VIDEO', postedAt: '2026-01-02T03:00:00.000Z', createdAt: '2026-01-02T03:00:00.000Z', postUrl: 'https://example.invalid/post/1', note: '카페 소식', views: 1200, accountsReached: 900, likes: 80, comments: 4, shares: 3, saves: 6, isRegistered: true },
    { id: `${platform}-2`, postType: 'FEED', postedAt: '2026-01-01T03:00:00.000Z', createdAt: '2026-01-01T03:00:00.000Z', postUrl: 'https://example.invalid/post/2', note: '새 메뉴 소개', views: 400, accountsReached: 300, likes: 20, comments: 1, shares: 1, saves: 1, isRegistered: false },
  ];
}
