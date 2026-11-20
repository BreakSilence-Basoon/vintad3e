'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { DateRangePopover } from './fixture-date-range-popover';
import { readSettlementForClient } from './fixture-settlement-client-read';
import {
  createSettlementSelection,
  findSettlementBrand,
  payoutAmount,
  resolveSettlementDates,
  toBusinessDayBounds,
  type SettlementRange,
  type SettlementSelection,
} from './fixture-showroom-settlement';

export type ShowroomSettlementBrand = {
  code: string;
  name: string;
  // 저장된 정산 조건: 판매액의 몇 %를 브랜드에 넘기는지. 없으면 null.
  defaultPercent: number | null;
};

type SettlementResponse = {
  brand: { code: string; name: string };
  defaultPercent: number | null;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    amount: number;
  }>;
  // 판매액 카드를 누르면 보이는 판매 한 건씩(최근 판매부터).
  sales: Array<{
    id: string;
    soldAt: string;
    productName: string;
    quantity: number;
    amount: number;
  }>;
  totals: { quantity: number; amount: number };
  unpricedQuantity: number;
};

const rangeOptions: Array<{ label: string; value: SettlementRange }> = [
  { label: '이번 달', value: 'this_month' },
  { label: '지난달', value: 'last_month' },
  { label: '최근 30일', value: '30d' },
  { label: '직접 지정', value: 'custom' },
];

function formatWon(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}원`;
}

// 판매내역 페이지와 같은 판매 시각 표기.
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatCount(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

// 쇼룸 정산 계산기: 브랜드 검색 + 기간 + 비율 → 판매액과 브랜드에 넘겨줄 금액.
export function ShowroomSettlement({
  brands,
}: {
  brands: ShowroomSettlementBrand[];
}) {
  const brandListId = useId();
  const [brandQuery, setBrandQuery] = useState('');
  const [range, setRange] = useState<SettlementRange>('this_month');
  const [customDates, setCustomDates] = useState(() =>
    resolveSettlementDates('this_month', { from: '', to: '' }),
  );
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);
  const [percentInput, setPercentInput] = useState('');
  const [percentEdited, setPercentEdited] = useState(false);
  const [applied, setApplied] = useState<SettlementSelection | null>(null);
  const [result, setResult] = useState<SettlementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSalesOpen, setIsSalesOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const salesCloseRef = useRef<HTMLButtonElement>(null);
  const salesOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 판매 내역 창: 열리면 닫기 버튼에 초점, 닫히면 연 자리로 초점 복귀. 닫기는 X 버튼으로만.
  useEffect(() => {
    if (!isSalesOpen) {
      return;
    }

    salesCloseRef.current?.focus();
    // 창이 떠 있는 동안 뒤 화면은 스크롤되지 않게(창 안 목록만 스크롤).
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousOverflow;
      salesOpenerRef.current?.focus();
    };
  }, [isSalesOpen]);

  const brand = useMemo(
    () => findSettlementBrand(brands, brandQuery),
    [brands, brandQuery],
  );
  const dates = resolveSettlementDates(range, customDates);
  const bounds = toBusinessDayBounds(dates);
  const percent = applied?.percent ?? null;
  const resultDates = applied?.dates;

  // 브랜드를 고르면 저장된 비율을 기본값으로(직접 고친 뒤에는 그대로 둔다).
  useEffect(() => {
    if (brand && !percentEdited) {
      setPercentInput(
        brand.defaultPercent === null ? '' : String(brand.defaultPercent),
      );
    }
  }, [brand, percentEdited]);

  useEffect(() => {
    if (!applied) {
      return;
    }

    const { from, to } = applied.bounds;
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({ brand: applied.brandCode, from, to });
        const result = await readSettlementForClient(params, controller.signal);
        if (result.kind === 'aborted' || controller.signal.aborted) return;
        if (result.kind === 'ok') {
          setResult(result.value);
          return;
        }
        setResult(null);
        setError('정산 금액을 불러오지 못했습니다.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    void load();

    return () => {
      controller.abort();
    };
  }, [applied]);

  function applyConditions() {
    const selection = createSettlementSelection(brands, {
      brandQuery,
      range,
      customDates,
      percentInput,
      percentEdited,
    });
    if (!selection || isLoading) {
      return;
    }

    setIsSalesOpen(false);
    setIsCustomDateOpen(false);
    setResult(null);
    setError(null);
    setIsLoading(true);
    setApplied(selection);
  }

  const payout =
    result && percent !== null ? payoutAmount(result.totals.amount, percent) : null;

  return (
    // 홈·아래 재고 카드 영역과 같은 카드(graphic-inventory) 안에 둔다. 화면 제목은 쓰지 않는다.
    <section className="graphic-inventory showroom-settlement" aria-label="정산">
      <div className="audit-filter-bar showroom-settlement__filters">
        <label className="audit-filter-bar__keyword">
          <span className="sr-only">브랜드</span>
          <input
            type="search"
            list={brandListId}
            value={brandQuery}
            placeholder="브랜드명을 입력하세요"
            autoComplete="off"
            onChange={(event) => setBrandQuery(event.target.value)}
          />
          <datalist id={brandListId}>
            {brands.map((item) => (
              <option key={item.code} value={item.name} />
            ))}
          </datalist>
        </label>
        <div className="audit-filter-bar__range">
          <label>
            <span className="sr-only">기간</span>
            <select
              value={range}
              onClick={() => {
                if (range === 'custom') {
                  setIsCustomDateOpen(true);
                }
              }}
              onChange={(event) => {
                const next = event.target.value as SettlementRange;

                if (next === 'custom') {
                  setCustomDates(dates);
                }

                setRange(next);
                setIsCustomDateOpen(next === 'custom');
              }}
            >
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {range === 'custom' ? (
            <DateRangePopover
              from={customDates.from}
              isOpen={isCustomDateOpen}
              to={customDates.to}
              onClose={() => setIsCustomDateOpen(false)}
              onFromChange={(from) =>
                setCustomDates((current) => ({ ...current, from }))
              }
              onToChange={(to) =>
                setCustomDates((current) => ({ ...current, to }))
              }
            />
          ) : null}
        </div>
        <label className="showroom-settlement__percent">
          <span className="sr-only">브랜드에 넘겨줄 비율(%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={percentInput}
            placeholder="브랜드 지급 비율"
            onChange={(event) => {
              // 숫자와 소수점 하나만 받는다(위아래 화살표 없는 입력칸).
              const [whole, ...rest] = event.target.value
                .replace(/[^0-9.]/g, '')
                .split('.');
              setPercentEdited(true);
              setPercentInput(
                rest.length > 0 ? `${whole}.${rest.join('')}` : whole,
              );
            }}
          />
          <span className="showroom-settlement__percent-suffix" aria-hidden="true">
            %
          </span>
        </label>
        <div className="audit-filter-bar__actions">
          <Button
            type="button"
            variant="ghost"
            disabled={!brand || !bounds || isLoading}
            aria-busy={isLoading}
            onClick={applyConditions}
          >
            적용
          </Button>
        </div>
      </div>

      {!brand ? (
        brandQuery.trim() ? (
          <p className="showroom-settlement__hint">브랜드를 찾을 수 없습니다.</p>
        ) : null
      ) : !bounds ? (
        <p className="showroom-settlement__hint">기간을 확인해 주세요.</p>
      ) : null}
      {applied && error ? (
        <p className="showroom-settlement__hint is-error" role="alert">
          {error}
        </p>
      ) : applied ? (
        <div
          className="showroom-settlement__result"
          aria-busy={isLoading}
          aria-live="polite"
        >
          <dl className="showroom-settlement__summary">
            {(() => {
              const canOpen = Boolean(result && result.sales.length > 0);
              const open = (target: HTMLElement) => {
                salesOpenerRef.current = target;
                setIsSalesOpen(true);
              };

              return (
                <div
                  className={canOpen ? 'is-clickable' : undefined}
                  role={canOpen ? 'button' : undefined}
                  tabIndex={canOpen ? 0 : undefined}
                  onClick={(event) => {
                    if (canOpen) open(event.currentTarget);
                  }}
                  onKeyDown={(event) => {
                    if (canOpen && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      open(event.currentTarget);
                    }
                  }}
                >
                  <dt>
                    {resultDates?.from} ~ {resultDates?.to} 판매액
                    {canOpen ? (
                      <span
                        className="showroom-settlement__more"
                        aria-hidden="true"
                      >
                        내역 보기 ›
                      </span>
                    ) : null}
                  </dt>
                  <dd>{result ? formatWon(result.totals.amount) : '-'}</dd>
                </div>
              );
            })()}
            <div className="is-payout">
              <dt>
                넘겨줄 금액
                {percent !== null ? ` (판매액의 ${percent}%)` : ''}
              </dt>
              <dd>{payout !== null ? formatWon(payout) : '-'}</dd>
            </div>
            <div>
              <dt>
                우리 몫
                {percent !== null
                  ? ` (판매액의 ${Math.round((100 - percent) * 100) / 100}%)`
                  : ''}
              </dt>
              <dd>
                {result && payout !== null
                  ? formatWon(result.totals.amount - payout)
                  : '-'}
              </dd>
            </div>
          </dl>
          {result && result.unpricedQuantity > 0 ? (
            <p className="showroom-settlement__hint is-error">
              판매 금액이 기록되지 않은 {formatCount(result.unpricedQuantity)}장은
              합계에서 빠졌습니다.
            </p>
          ) : null}
          {result && result.products.length > 0 ? (
              <div className="showroom-settlement__table-wrap">
                <table className="simple-table showroom-settlement__table">
                  <colgroup>
                    <col />
                    <col className="showroom-settlement__col-qty" />
                    <col className="showroom-settlement__col-money" />
                    <col className="showroom-settlement__col-money" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>상품명</th>
                      <th>수량</th>
                      <th>판매액</th>
                      <th>넘겨줄 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((product) => (
                      <tr key={product.productId}>
                        <td>{product.name}</td>
                        <td>{formatCount(product.quantity)}장</td>
                        <td>{formatWon(product.amount)}</td>
                        <td>
                          {percent !== null
                            ? formatWon(payoutAmount(product.amount, percent))
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          ) : null}
        </div>
      ) : null}
      {isSalesOpen && result && isMounted
        ? (
            <div className="graphic-dialog-backdrop">
              <section
                className="graphic-dialog showroom-sales-dialog"
                onKeyDown={(event) => {
                  // This preserved dialog has exactly one interactive control: its close button.
                  if (event.key === 'Tab') { event.preventDefault(); salesCloseRef.current?.focus(); }
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="showroom-sales-dialog-title"
              >
                <div className="graphic-dialog__chrome">
                  <h3
                    id="showroom-sales-dialog-title"
                    className="graphic-dialog__title showroom-sales-dialog__title"
                  >
                    {resultDates?.from} ~ {resultDates?.to} 판매 내역
                  </h3>
                  <div className="graphic-dialog__titlebar">
                    <button
                      ref={salesCloseRef}
                      type="button"
                      className="graphic-dialog__close"
                      aria-label="판매 내역 창 닫기"
                      onClick={() => setIsSalesOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="graphic-dialog__body showroom-sales-dialog__body">
                  {/* 판매내역 페이지 카드와 같은 모양, 한 줄로. 판매 시각·상품명·수량·판매 금액만. */}
                  <div className="showroom-sales-dialog__list">
                    {result.sales.map((sale) => (
                      <article
                        key={sale.id}
                        className="audit-card sales-audit-card"
                      >
                        <div className="sales-audit-card__topline">
                          <div className="sales-audit-card__source">
                            <time dateTime={sale.soldAt}>
                              {formatDateTime(sale.soldAt)}
                            </time>
                          </div>
                        </div>
                        <div className="sales-audit-card__summary showroom-sales-dialog__summary">
                          <span className="sales-audit-card__items">
                            <span className="sales-audit-card__item-line">
                              <span className="sales-audit-card__item-name">
                                {sale.productName}
                              </span>
                              <span className="sales-audit-card__quantity-chip">
                                {formatCount(sale.quantity)}개
                              </span>
                            </span>
                          </span>
                          <strong>{formatWon(sale.amount)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )
        : null}
    </section>
  );
}
