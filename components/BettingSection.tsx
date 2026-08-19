'use client';

import { useMemo, useState } from 'react';
import { BettingBet, BettingDashboardData, BettingSummary } from '@/lib/types';
import { formatDate, formatDateTime, formatNumber, formatPercentage } from '@/lib/utils';

interface BettingSectionProps {
  data: BettingDashboardData;
}

interface PolicyBet {
  policyLabel: string;
  bet: BettingBet;
}

export function BettingSection({ data }: BettingSectionProps) {
  const [activeSummaryLabel, setActiveSummaryLabel] = useState<string | null>(null);
  const activeSummary = activeSummaryLabel
    ? data.summaries.find((summary) => summary.label === activeSummaryLabel) || null
    : null;
  const activeBets = activeSummary ? data.betsBySummary[activeSummary.label] || [] : [];

  const openBets = useMemo(
    () =>
      data.summaries
        .filter((summary) => summary.source === 'honest')
        .flatMap((summary) =>
          (data.betsBySummary[summary.label] || [])
            .filter(isOpenBet)
            .map((bet) => ({ policyLabel: summary.label, bet }))
        )
        .sort((a, b) => a.bet.event_date.localeCompare(b.bet.event_date)),
    [data.betsBySummary, data.summaries]
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Betting</h3>
          <p className="text-sm text-gray-500">
            Honest policies and research backtests are shown separately.
          </p>
        </div>
        {data.updatedAt && (
          <p className="text-xs text-gray-600">Reports updated {formatDateTime(data.updatedAt)}</p>
        )}
      </div>

      {data.summaries.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm text-gray-400">No betting reports available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {data.summaries.map((summary) => (
            <BettingSummaryCard
              key={summary.label}
              summary={summary}
              betCount={(data.betsBySummary[summary.label] || []).length}
              onOpen={() => setActiveSummaryLabel(summary.label)}
            />
          ))}
        </div>
      )}

      <OpenBetsPanel bets={openBets} />

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

function BettingSummaryCard({
  summary,
  betCount,
  onOpen,
}: {
  summary: BettingSummary;
  betCount: number;
  onOpen: () => void;
}) {
  const isResearch = summary.source === 'research';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`rounded-lg border bg-gray-900 p-5 text-left transition-colors ${
        isResearch
          ? 'border-amber-900/70 hover:border-amber-600'
          : 'border-gray-800 hover:border-red-700/70'
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-white">{summary.label}</h4>
          <p className="mt-1 text-xs text-gray-500">
            {summary.max_one_bet_per_fight ? 'One bet per fight' : 'Multiple books allowed'}
          </p>
        </div>
        <span
          className={`rounded border px-2 py-1 text-xs font-medium ${
            isResearch
              ? 'border-amber-800 bg-amber-950/40 text-amber-300'
              : 'border-emerald-900 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          {isResearch ? 'Research' : 'Honest'}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500">Profit / Loss</p>
          <p className={`mt-1 text-2xl font-bold ${profitTextClass(summary.profit_loss)}`}>
            {formatSignedCurrency(summary.profit_loss)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">ROI</p>
          <p className="mt-1 text-2xl font-bold text-red-500">
            {formatNullablePercentage(summary.roi)}
          </p>
        </div>
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Bets" value={formatNumber(summary.total_bets)} />
        <Metric label="Hit Rate" value={formatNullablePercentage(summary.hit_rate)} />
        <Metric label="Staked" value={formatCurrency(summary.total_staked)} />
        <Metric label="Max DD" value={formatPercentage(summary.max_drawdown)} />
        <Metric label="Edge" value={formatPercentage(summary.min_edge, 0)} />
        <Metric label="Kelly" value={formatPercentage(summary.kelly_fraction, 1)} />
      </dl>

      <div className="border-t border-gray-800 pt-4">
        <span className={isResearch ? 'text-sm font-semibold text-amber-300' : 'text-sm font-semibold text-red-400'}>
          View {formatNumber(betCount)} bets
        </span>
      </div>
    </button>
  );
}

function OpenBetsPanel({ bets }: { bets: PolicyBet[] }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="flex flex-col gap-1 border-b border-gray-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-white">Open Bets</h4>
          <p className="text-sm text-gray-500">Future bets awaiting results.</p>
        </div>
        <span className="text-sm font-semibold text-gray-300">{formatNumber(bets.length)} open</span>
      </div>

      {bets.length === 0 ? (
        <div className="p-5">
          <p className="text-sm text-gray-400">No open bets awaiting results.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Policy</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Fight</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Pick</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Book</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Odds</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Stake</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Edge</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(({ policyLabel, bet }) => (
                <tr
                  key={`${policyLabel}-${bet.fight_id}-${bet.bookmaker}-${bet.fighter_name}-${bet.odds_timestamp}`}
                  className="border-b border-gray-800"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">{formatDate(bet.event_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{policyLabel}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-white">{bet.event_name}</p>
                    <p className="text-xs text-gray-500">{bet.fighter_name} vs {bet.opponent_fighter_name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">{bet.fighter_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{bet.bookmaker}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">{bet.offered_decimal_odds.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">{formatCurrency(bet.stake_amount)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-red-400">{formatPercentage(bet.edge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-gray-800 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h4 className="text-lg font-semibold text-white">{summary.label} Bets</h4>
              <span
                className={`rounded border px-2 py-1 text-xs font-medium ${
                  summary.source === 'research'
                    ? 'border-amber-800 bg-amber-950/40 text-amber-300'
                    : 'border-emerald-900 bg-emerald-950/30 text-emerald-300'
                }`}
              >
                {summary.source === 'research' ? 'Research' : 'Honest'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {formatNumber(bets.length)} historical bets, {formatSignedCurrency(summary.profit_loss)} P/L,{' '}
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

function BetDetailsTable({ bets }: { bets: BettingBet[] }) {
  if (bets.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-400">No bet rows for this policy yet.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[72vh] overflow-auto">
      <table className="w-full min-w-[1200px]">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-gray-800 bg-gray-900">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Date</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Fight</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Pick</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Book</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Odds</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Model</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">No-Vig</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Edge</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">EV</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">Stake</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Result</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">P/L</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <tr
              key={`${bet.fight_id}-${bet.bookmaker}-${bet.fighter_name}-${bet.odds_timestamp}`}
              className="border-b border-gray-800 hover:bg-gray-900/70"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-300">{formatDate(bet.event_date)}</td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-white">{bet.event_name}</p>
                <p className="text-xs text-gray-500">{bet.fighter_name} vs {bet.opponent_fighter_name}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-white">{bet.fighter_name}</p>
                <p className="text-xs text-gray-500">{bet.confidence_tier}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-gray-300">{bet.bookmaker}</p>
                <p className="text-xs text-gray-500">{bet.line_type}</p>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">{bet.offered_decimal_odds.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">{formatPercentage(bet.model_probability)}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">{formatPercentage(bet.no_vig_market_probability)}</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-red-400">{formatPercentage(bet.edge)}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">{formatPercentage(bet.ev_per_unit)}</td>
              <td className="px-4 py-3 text-right text-sm text-gray-300">{formatCurrency(bet.stake_amount)}</td>
              <td className="px-4 py-3">
                <span className={`rounded px-2 py-1 text-xs font-medium ${resultBadgeClass(bet.bet_result)}`}>
                  {bet.bet_result || 'pending'}
                </span>
                {bet.actual_winner_name && <p className="mt-1 text-xs text-gray-500">{bet.actual_winner_name}</p>}
              </td>
              <td className={`px-4 py-3 text-right text-sm font-semibold ${profitTextClass(bet.profit_loss_amount)}`}>
                {formatSignedCurrency(bet.profit_loss_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-200">{value}</dd>
    </div>
  );
}

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

function formatNullablePercentage(value: number | null): string {
  return value === null ? 'N/A' : formatPercentage(value);
}

function isOpenBet(bet: BettingBet): boolean {
  if (!bet.resolved) return true;
  return !['win', 'loss', 'push'].includes(bet.bet_result.toLowerCase());
}

function profitTextClass(value: number): string {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-300';
}

function resultBadgeClass(result: string): string {
  if (result === 'win') return 'bg-emerald-950/60 text-emerald-300';
  if (result === 'loss') return 'bg-red-950/60 text-red-300';
  if (result === 'push') return 'bg-gray-800 text-gray-300';
  return 'bg-gray-800 text-gray-400';
}
