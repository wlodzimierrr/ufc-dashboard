'use client';

import { useMemo, useState } from 'react';
import { BettingBet, BettingDashboardData, BettingSummary } from '@/lib/types';
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
} from '@/lib/utils';

interface BettingSectionProps {
  data: BettingDashboardData;
}

interface PolicyBet {
  policyLabel: string;
  bet: BettingBet;
}

export function BettingSection({ data }: BettingSectionProps) {
  const [activeSummaryLabel, setActiveSummaryLabel] = useState<string | null>(
    null
  );

  const activeSummary = activeSummaryLabel
    ? data.summaries.find(
        (summary) => summary.label === activeSummaryLabel
      ) || null
    : null;

  const activeBets = activeSummary
    ? data.betsBySummary[activeSummary.label] || []
    : [];

  /**
   * All unresolved bets belonging to honest policies.
   *
   * This automatically includes Current BFO Mean without
   * needing to hardcode current_bfo_mean anywhere.
   */
  const openBets = useMemo(
    () =>
      data.summaries
        .filter((summary) => summary.source === 'honest')
        .flatMap((summary) =>
          (data.betsBySummary[summary.label] || [])
            .filter(isOpenBet)
            .map((bet) => ({
              policyLabel: summary.label,
              bet,
            }))
        )
        .sort((a, b) =>
          a.bet.event_date.localeCompare(b.bet.event_date)
        ),
    [data.betsBySummary, data.summaries]
  );

  /**
   * Honest policy summaries.
   *
   * Default Policy
   * Conservative Candidate
   * Current BFO Mean
   * ...and any future honest policies.
   */
  const honestSummaries = useMemo(
    () =>
      data.summaries.filter(
        (summary) => summary.source === 'honest'
      ),
    [data.summaries]
  );

  /**
   * Research / backtest summaries.
   *
   * Currently Kaggle Research.
   */
  const researchSummaries = useMemo(
    () =>
      data.summaries.filter(
        (summary) => summary.source === 'research'
      ),
    [data.summaries]
  );

  /**
   * Used only for showing a LIVE badge on a policy card.
   */
  const openPolicyLabels = useMemo(
    () => new Set(openBets.map((item) => item.policyLabel)),
    [openBets]
  );

  return (
    <section className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Betting
          </h3>

          <p className="text-sm text-gray-500">
            Current recommendations, honest policy performance,
            and research backtests.
          </p>
        </div>

        {data.updatedAt && (
          <p className="text-xs text-gray-600">
            Reports updated {formatDateTime(data.updatedAt)}
          </p>
        )}
      </div>

      {data.summaries.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">
            No betting reports available yet.
          </p>
        </div>
      ) : (
        <>
          {/* ====================================================== */}
          {/* LIVE / CURRENT RECOMMENDATIONS                         */}
          {/* ====================================================== */}

          <OpenBetsPanel bets={openBets} />

          {/* ====================================================== */}
          {/* HONEST POLICY PERFORMANCE                              */}
          {/* ====================================================== */}

          {honestSummaries.length > 0 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Honest Policy Performance
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Performance and bankroll results from honest
                  betting policies.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {honestSummaries.map((summary) => (
                  <BettingSummaryCard
                    key={summary.label}
                    summary={summary}
                    betCount={
                      (
                        data.betsBySummary[summary.label] || []
                      ).length
                    }
                    hasOpenBets={openPolicyLabels.has(
                      summary.label
                    )}
                    onOpen={() =>
                      setActiveSummaryLabel(summary.label)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* RESEARCH / BACKTESTS                                   */}
          {/* ====================================================== */}

          {researchSummaries.length > 0 && (
            <div className="mx-auto w-full max-w-5xl space-y-4">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                  Research / Backtests
                </h4>

                <p className="mt-1 text-sm text-gray-500">
                  Historical research results are shown separately
                  and are not directly comparable to live policy
                  performance.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {researchSummaries.map((summary) => (
                  <BettingSummaryCard
                    key={summary.label}
                    summary={summary}
                    betCount={
                      (
                        data.betsBySummary[summary.label] || []
                      ).length
                    }
                    hasOpenBets={false}
                    onOpen={() =>
                      setActiveSummaryLabel(summary.label)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* History modal */}
      {activeSummary && (
        <BetHistoryModal
          summary={activeSummary}
          bets={activeBets}
          onClose={() => setActiveSummaryLabel(null)}
        />
      )}
    </section>
  );
}

/* ========================================================================== */
/* LIVE / CURRENT RECOMMENDATIONS                                             */
/* ========================================================================== */

function OpenBetsPanel({ bets }: { bets: PolicyBet[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-red-950/80 bg-gray-900">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-red-300">
            Live / Current Recommendations
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Active honest-policy bets awaiting results.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded border border-red-900 bg-red-950/40 px-3 py-1.5 text-sm font-semibold text-red-300">
          {formatNumber(bets.length)} open
        </span>
      </div>

      {bets.length === 0 ? (
        <div className="p-5">
          <p className="text-sm text-gray-400">
            No open bets awaiting results.
          </p>
        </div>
      ) : (
        <div className="space-y-4 p-4 sm:p-5">
          {bets.map(({ policyLabel, bet }) => (
            <LiveBetCard
              key={`${policyLabel}-${bet.fight_id}-${bet.bookmaker}-${bet.fighter_name}-${bet.odds_timestamp}`}
              policyLabel={policyLabel}
              bet={bet}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LiveBetCard({
  policyLabel,
  bet,
}: {
  policyLabel: string;
  bet: BettingBet;
}) {
  return (
    <article className="rounded-lg border border-gray-800 bg-gray-950/40 p-4 sm:p-5">
      {/* Main information */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {/* Policy + Date */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-xs font-semibold text-red-300">
              {policyLabel}
            </span>

            <span className="text-xs text-gray-500">
              {formatDate(bet.event_date)}
            </span>

            {bet.confidence_tier && (
              <span className="rounded bg-gray-800 px-2 py-1 text-xs capitalize text-gray-400">
                {bet.confidence_tier}
              </span>
            )}
          </div>

          {/* Event */}
          <p className="break-words text-sm text-gray-500">
            {bet.event_name}
          </p>

          {/* Fight */}
          <p className="mt-1 break-words text-lg font-semibold text-white sm:text-xl">
            {bet.fighter_name}

            <span className="mx-2 font-normal text-gray-600">
              vs
            </span>

            {bet.opponent_fighter_name}
          </p>

          {/* Pick */}
          <p className="mt-3 text-sm text-gray-500">
            Pick:{' '}
            <span className="font-semibold text-gray-200">
              {bet.fighter_name}
            </span>
          </p>
        </div>

        {/* Book */}
        <div className="shrink-0 border-t border-gray-800 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
            Book / Market
          </p>

          <p className="mt-1 font-medium text-gray-300">
            {bet.bookmaker}
          </p>

          <p className="mt-1 text-xs capitalize text-gray-500">
            {bet.line_type}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-gray-800 pt-5 sm:grid-cols-3 xl:grid-cols-6">
        <LiveMetric
          label="Odds"
          value={
            bet.offered_decimal_odds > 0
              ? bet.offered_decimal_odds.toFixed(2)
              : '—'
          }
        />

        <LiveMetric
          label="Model"
          value={formatPercentage(
            bet.model_probability
          )}
        />

        <LiveMetric
          label="Market"
          value={formatPercentage(
            bet.no_vig_market_probability
          )}
        />

        <LiveMetric
          label="Edge"
          value={formatPercentage(bet.edge)}
          tone="positive"
        />

        <LiveMetric
          label="EV"
          value={formatPercentage(bet.ev_per_unit)}
        />

        <LiveMetric
          label="Stake"
          value={formatCurrency(bet.stake_amount)}
        />
      </dl>
    </article>
  );
}

function LiveMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive';
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>

      <dd
        className={`mt-1 break-words text-lg font-semibold ${
          tone === 'positive'
            ? 'text-red-400'
            : 'text-gray-200'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/* ========================================================================== */
/* SUMMARY CARD                                                               */
/* ========================================================================== */

function BettingSummaryCard({
  summary,
  betCount,
  hasOpenBets,
  onOpen,
}: {
  summary: BettingSummary;
  betCount: number;
  hasOpenBets: boolean;
  onOpen: () => void;
}) {
  const isResearch = summary.source === 'research';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-lg border bg-gray-900 p-5 text-left transition-colors ${
        isResearch
          ? 'border-amber-900/70 hover:border-amber-600'
          : 'border-gray-800 hover:border-red-700/70'
      }`}
    >
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-white">
            {summary.label}
          </h4>

          <p className="mt-1 text-xs text-gray-500">
            {summary.max_one_bet_per_fight
              ? 'One bet per fight'
              : 'Multiple books allowed'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span
            className={`rounded border px-2 py-1 text-xs font-medium ${
              isResearch
                ? 'border-amber-800 bg-amber-950/40 text-amber-300'
                : 'border-emerald-900 bg-emerald-950/30 text-emerald-300'
            }`}
          >
            {isResearch ? 'Research' : 'Honest'}
          </span>

          {hasOpenBets && !isResearch && (
            <span className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-xs font-medium text-red-300">
              Live
            </span>
          )}
        </div>
      </div>

      {/* Main metrics */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500">
            Profit / Loss
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${profitTextClass(
              summary.profit_loss
            )}`}
          >
            {formatSignedCurrency(summary.profit_loss)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500">
            ROI
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${nullableProfitTextClass(
              summary.roi
            )}`}
          >
            {formatNullablePercentage(summary.roi)}
          </p>
        </div>
      </div>

      {/* Secondary metrics */}
      <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <Metric
          label="Bets"
          value={formatNumber(summary.total_bets)}
        />

        <Metric
          label="Hit Rate"
          value={formatNullablePercentage(summary.hit_rate)}
        />

        <Metric
          label="Staked"
          value={formatCurrency(summary.total_staked)}
        />

        <Metric
          label="Max DD"
          value={formatPercentage(summary.max_drawdown)}
        />

        <Metric
          label="Min Edge"
          value={formatPercentage(summary.min_edge, 0)}
        />

        <Metric
          label="Kelly"
          value={formatPercentage(summary.kelly_fraction, 1)}
        />
      </dl>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-4">
        <span
          className={
            isResearch
              ? 'text-sm font-semibold text-amber-300'
              : 'text-sm font-semibold text-red-400'
          }
        >
          View {formatNumber(betCount)}{' '}
          {betCount === 1 ? 'bet' : 'bets'}
        </span>
      </div>
    </button>
  );
}

/* ========================================================================== */
/* BET HISTORY MODAL                                                          */
/* ========================================================================== */

function BetHistoryModal({
  summary,
  bets,
  onClose,
}: {
  summary: BettingSummary;
  bets: BettingBet[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
        {/* Modal header */}
        <div className="flex flex-col gap-4 border-b border-gray-800 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-lg font-semibold text-white">
                {summary.label} Bets
              </h4>

              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  summary.source === 'research'
                    ? 'border-amber-800 bg-amber-950/40 text-amber-300'
                    : 'border-emerald-900 bg-emerald-950/30 text-emerald-300'
                }`}
              >
                {summary.source === 'research'
                  ? 'Research'
                  : 'Honest'}
              </span>
            </div>

            <p className="text-sm text-gray-500">
              {formatNumber(bets.length)}{' '}
              {bets.length === 1 ? 'bet' : 'bets'},{' '}
              {formatSignedCurrency(summary.profit_loss)} P/L,{' '}
              {formatNullablePercentage(summary.roi)} ROI
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-900"
          >
            Close
          </button>
        </div>

        <BetDetailsTable bets={bets} />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* BET DETAILS TABLE                                                          */
/* ========================================================================== */

function BetDetailsTable({ bets }: { bets: BettingBet[] }) {
  if (bets.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-400">
          No bet rows for this policy yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[72vh] overflow-auto">
      <table className="w-full min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-gray-800 bg-gray-900">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
              Date
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
              Fight
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
              Pick
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
              Book
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              Odds
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              Model
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              No-Vig
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              Edge
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              EV
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              Stake
            </th>

            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">
              Result
            </th>

            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">
              P/L
            </th>
          </tr>
        </thead>

        <tbody>
          {bets.map((bet) => (
            <tr
              key={`${bet.fight_id}-${bet.bookmaker}-${bet.fighter_name}-${bet.odds_timestamp}`}
              className="border-b border-gray-800 hover:bg-gray-900/70"
            >
              {/* Date */}
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">
                {formatDate(bet.event_date)}
              </td>

              {/* Fight */}
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-white">
                  {bet.event_name}
                </p>

                <p className="text-xs text-gray-500">
                  {bet.fighter_name} vs{' '}
                  {bet.opponent_fighter_name}
                </p>
              </td>

              {/* Pick */}
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {bet.fighter_name}
                </p>

                <p className="text-xs capitalize text-gray-500">
                  {bet.confidence_tier}
                </p>
              </td>

              {/* Book */}
              <td className="px-4 py-3">
                <p className="text-sm text-gray-300">
                  {bet.bookmaker}
                </p>

                <p className="text-xs capitalize text-gray-500">
                  {bet.line_type}
                </p>
              </td>

              {/* Odds */}
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {bet.offered_decimal_odds > 0
                  ? bet.offered_decimal_odds.toFixed(2)
                  : '—'}
              </td>

              {/* Model */}
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatPercentage(bet.model_probability)}
              </td>

              {/* No vig */}
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatPercentage(
                  bet.no_vig_market_probability
                )}
              </td>

              {/* Edge */}
              <td className="px-4 py-3 text-right text-sm font-semibold text-red-400">
                {formatPercentage(bet.edge)}
              </td>

              {/* EV */}
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatPercentage(bet.ev_per_unit)}
              </td>

              {/* Stake */}
              <td className="px-4 py-3 text-right text-sm text-gray-300">
                {formatCurrency(bet.stake_amount)}
              </td>

              {/* Result */}
              <td className="px-4 py-3">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${resultBadgeClass(
                    bet.bet_result
                  )}`}
                >
                  {bet.bet_result || 'pending'}
                </span>

                {bet.actual_winner_name && (
                  <p className="mt-1 text-xs text-gray-500">
                    {bet.actual_winner_name}
                  </p>
                )}
              </td>

              {/* P/L */}
              <td
                className={`px-4 py-3 text-right text-sm font-semibold ${profitTextClass(
                  bet.profit_loss_amount
                )}`}
              >
                {formatSignedCurrency(
                  bet.profit_loss_amount
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ========================================================================== */
/* SMALL COMPONENTS                                                           */
/* ========================================================================== */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">
        {label}
      </dt>

      <dd className="mt-1 text-sm font-semibold text-gray-200">
        {value}
      </dd>
    </div>
  );
}

/* ========================================================================== */
/* FORMATTING                                                                 */
/* ========================================================================== */

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

function formatNullablePercentage(
  value: number | null
): string {
  return value === null
    ? 'N/A'
    : formatPercentage(value);
}

/* ========================================================================== */
/* BET STATE                                                                  */
/* ========================================================================== */

function isOpenBet(bet: BettingBet): boolean {
  if (!bet.resolved) return true;

  return !['win', 'loss', 'push'].includes(
    bet.bet_result.toLowerCase()
  );
}

/* ========================================================================== */
/* COLOR HELPERS                                                              */
/* ========================================================================== */

function profitTextClass(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';

  return 'text-gray-300';
}

function nullableProfitTextClass(
  value: number | null
): string {
  if (value === null) return 'text-gray-400';
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';

  return 'text-gray-300';
}

function resultBadgeClass(result: string): string {
  const normalizedResult = result.toLowerCase();

  if (normalizedResult === 'win') {
    return 'bg-emerald-950/60 text-emerald-300';
  }

  if (normalizedResult === 'loss') {
    return 'bg-red-950/60 text-red-300';
  }

  if (normalizedResult === 'push') {
    return 'bg-gray-800 text-gray-300';
  }

  return 'bg-gray-800 text-gray-400';
}
