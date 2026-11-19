import type { SnsPerformanceReport } from './sns-performance-table';

export function getSnsFixturePosts(env: string | undefined, enabled: string | undefined, platform: 'instagram' | 'tiktok', staff: string | undefined): SnsPerformanceReport[] {
  if (env !== 'development' || enabled !== '1' || (staff !== 'supporter-1' && staff !== 'supporter-2')) return [];
  if (staff === 'supporter-2') return [
    { id: `${platform}-supporter-2-1`, postType: 'VIDEO', postedAt: '2026-01-04T03:00:00.000Z', createdAt: '2026-01-04T03:00:00.000Z', postUrl: 'https://example.invalid/post/supporter-2/1', note: '가게 이야기', views: 700, accountsReached: 500, likes: 40, comments: 2, shares: 2, saves: 3, isRegistered: false },
    { id: `${platform}-supporter-2-2`, postType: 'FEED', postedAt: '2026-01-03T03:00:00.000Z', createdAt: '2026-01-03T03:00:00.000Z', postUrl: 'https://example.invalid/post/supporter-2/2', note: '새 소식', views: 200, accountsReached: 150, likes: 10, comments: 1, shares: 0, saves: 0, isRegistered: true },
  ];
  return [
    { id: `${platform}-1`, postType: 'VIDEO', postedAt: '2026-01-02T03:00:00.000Z', createdAt: '2026-01-02T03:00:00.000Z', postUrl: 'https://example.invalid/post/1', note: '카페 소식', views: 1200, accountsReached: 900, likes: 80, comments: 4, shares: 3, saves: 6, isRegistered: true },
    { id: `${platform}-2`, postType: 'FEED', postedAt: '2026-01-01T03:00:00.000Z', createdAt: '2026-01-01T03:00:00.000Z', postUrl: 'https://example.invalid/post/2', note: '새 메뉴 소개', views: 400, accountsReached: 300, likes: 20, comments: 1, shares: 1, saves: 1, isRegistered: false },
  ];
}
