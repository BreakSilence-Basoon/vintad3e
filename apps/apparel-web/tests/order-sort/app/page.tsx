import { OnlinePreparationList, type OnlinePreparationCard } from '../../../src/dashboard-online-preparation';

const base = { requestIds: [], channelNameKo: '온라인', totalQuantity: 1, checklist: { seongsuPicked: false, hanamPrepared: false } };
const orders: OnlinePreparationCard[] = [
  { ...base, id: 'fixture-a', orderNumber: 'TEST-A', soldAt: '2026-01-03T00:00:00Z', itemSummary: '상품 10' },
  { ...base, id: 'fixture-b', orderNumber: 'TEST-B', soldAt: '2026-01-01T00:00:00Z', itemSummary: '상품 2' },
  { ...base, id: 'fixture-c', orderNumber: 'TEST-C', soldAt: '2026-01-02T00:00:00Z', itemSummary: '상품 2' },
];

export default function Page() {
  return <OnlinePreparationList orders={orders} canEdit />;
}
