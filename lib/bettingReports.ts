import { query, queryOne } from '@/lib/db/client';
import { BettingBet, BettingDashboardData, BettingSummary } from '@/lib/types';

const REPORT_KEYS = ['default_policy', 'conservative_candidate', 'kaggle_research'];

interface BettingSummaryRow {
  report_key: string;
  label: string;
  source: BettingSummary['source'];
  report_path: string;
  total_bets: string | number;
  wins: string | number;
  losses: string | number;
  pushes: string | number;
  total_staked: string | number;
  profit_loss: string | number;
  roi: string | number | null;
  hit_rate: string | number | null;
  average_odds: string | number | null;
  max_drawdown: string | number;
  starting_bankroll: string | number;
  ending_bankroll: string | number;
  odds_policy: string;
  max_one_bet_per_fight: boolean;
  kelly_fraction: string | number;
  min_edge: string | number;
  min_ev: string | number;
}

interface BettingBetRow {
  report_key: string;
  event_name: string;
  event_date: string | Date | null;
  fight_id: string;
  fighter_name: string;
  opponent_fighter_name: string;
  bookmaker: string;
  line_type: string;
  odds_timestamp: string | Date | null;
  model_probability: string | number;
  no_vig_market_probability: string | number;
  edge: string | number;
  ev_per_unit: string | number;
  offered_decimal_odds: string | number;
  confidence_tier: string;
  stake_amount: string | number;
  bet_result: string;
  profit_loss_amount: string | number;
  actual_winner_name: string;
  resolved: boolean;
}

export async function getBettingDashboardData(): Promise<BettingDashboardData> {
  const [summaryRows, betRows, updatedRow] = await Promise.all([
    query<BettingSummaryRow>(
      `
        SELECT
          report_key,
          label,
          source,
          report_key AS report_path,
          total_bets,
          wins,
          losses,
          pushes,
          total_staked,
          profit_loss,
          roi,
          hit_rate,
          average_odds,
          max_drawdown,
          starting_bankroll,
          ending_bankroll,
          odds_policy,
          max_one_bet_per_fight,
          kelly_fraction,
          min_edge,
          min_ev
        FROM betting_report_summaries
        WHERE report_key = ANY($1::text[])
          AND summary_type = 'overall'
          AND group_name = 'all'
        ORDER BY array_position($1::text[], report_key);
      `,
      [REPORT_KEYS]
    ),
    query<BettingBetRow>(
      `
        SELECT
          report_key,
          event_name,
          event_date::text,
          fight_id,
          COALESCE(NULLIF(recommended_fighter_name, ''), fighter_name) AS fighter_name,
          opponent_fighter_name,
          bookmaker,
          line_type,
          odds_timestamp::text,
          model_probability,
          no_vig_market_probability,
          edge,
          ev_per_unit,
          offered_decimal_odds,
          confidence_tier,
          stake_amount,
          bet_result,
          profit_loss_amount,
          actual_winner_name,
          resolved
        FROM betting_report_fights
        WHERE report_key = ANY($1::text[])
          AND decision = 'bet'
        ORDER BY array_position($1::text[], report_key), event_date DESC NULLS LAST, row_number ASC;
      `,
      [REPORT_KEYS]
    ),
    queryOne<{ updated_at: string | null }>(
      `
        SELECT MAX(updated_at)::text AS updated_at
        FROM (
          SELECT MAX(imported_at) AS updated_at FROM betting_report_summaries
          UNION ALL
          SELECT MAX(imported_at) AS updated_at FROM betting_report_fights
        ) updates;
      `
    ),
  ]);

  const summaries = summaryRows.map(toBettingSummary);
  const labelsByReportKey = new Map(summaryRows.map((row) => [row.report_key, row.label]));
  const betsBySummary = Object.fromEntries(summaries.map((summary) => [summary.label, [] as BettingBet[]]));

  for (const row of betRows) {
    const label = labelsByReportKey.get(row.report_key);
    if (!label) continue;
    betsBySummary[label].push(toBettingBet(row));
  }

  return {
    summaries,
    betsBySummary,
    updatedAt: updatedRow?.updated_at || null,
  };
}

function toBettingSummary(row: BettingSummaryRow): BettingSummary {
  return {
    label: row.label,
    source: row.source,
    reportPath: row.report_path,
    total_bets: parseIntValue(row.total_bets),
    wins: parseIntValue(row.wins),
    losses: parseIntValue(row.losses),
    pushes: parseIntValue(row.pushes),
    total_staked: parseNumberValue(row.total_staked),
    profit_loss: parseNumberValue(row.profit_loss),
    roi: parseNullableNumber(row.roi),
    hit_rate: parseNullableNumber(row.hit_rate),
    average_odds: parseNullableNumber(row.average_odds),
    max_drawdown: parseNumberValue(row.max_drawdown),
    starting_bankroll: parseNumberValue(row.starting_bankroll),
    ending_bankroll: parseNumberValue(row.ending_bankroll),
    odds_policy: row.odds_policy || '',
    max_one_bet_per_fight: row.max_one_bet_per_fight,
    kelly_fraction: parseNumberValue(row.kelly_fraction),
    min_edge: parseNumberValue(row.min_edge),
    min_ev: parseNumberValue(row.min_ev),
  };
}

function toBettingBet(row: BettingBetRow): BettingBet {
  return {
    event_name: row.event_name,
    event_date: dateText(row.event_date),
    fight_id: row.fight_id,
    fighter_name: row.fighter_name,
    opponent_fighter_name: row.opponent_fighter_name,
    bookmaker: row.bookmaker,
    line_type: row.line_type,
    odds_timestamp: dateTimeText(row.odds_timestamp),
    model_probability: parseNumberValue(row.model_probability),
    no_vig_market_probability: parseNumberValue(row.no_vig_market_probability),
    edge: parseNumberValue(row.edge),
    ev_per_unit: parseNumberValue(row.ev_per_unit),
    offered_decimal_odds: parseNumberValue(row.offered_decimal_odds),
    confidence_tier: row.confidence_tier,
    stake_amount: parseNumberValue(row.stake_amount),
    bet_result: row.bet_result,
    profit_loss_amount: parseNumberValue(row.profit_loss_amount),
    actual_winner_name: row.actual_winner_name,
    resolved: row.resolved,
  };
}

function parseIntValue(value: string | number | null | undefined): number {
  return Number.parseInt(String(value || '0'), 10) || 0;
}

function parseNumberValue(value: string | number | null | undefined): number {
  const parsed = Number.parseFloat(String(value || '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateText(value: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function dateTimeText(value: string | Date | null): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return value;
}
