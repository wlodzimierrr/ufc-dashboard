import type { BettingDashboardData, BettingMarketComparison, BettingPrediction } from '@/lib/types';

// Forecast coverage comes from predictions. An absent or stale comparison must
// never remove a forecast or cause a historical report to stand in for it.
export const BETTING_PREDICTIONS_SQL = `
  SELECT
    p.fight_id::text, e.event_id::text, e.event_name, e.event_date::text,
    p.fighter_1_id::text, p.fighter_2_id::text,
    p.fighter_1_name, p.fighter_2_name, p.calibrated_prob_f1_full,
    p.decision_status, p.is_actionable, p.pick_label, p.pick_winner_name,
    p.uncertainty_reasons, p.decision_policy_version, p.decision_origin,
    p.confidence_tier, p.model_name, p.scored_at::text,
    comparison.*
  FROM current_event_prediction_decisions p
  JOIN fights f ON f.fight_id = p.fight_id AND f.event_id = p.event_id
    AND f.fighter_1_id = p.fighter_1_id AND f.fighter_2_id = p.fighter_2_id
  JOIN events e ON e.event_id = f.event_id
  LEFT JOIN LATERAL (
    SELECT
      r.report_key AS market_report_key, r.source AS market_source,
      r.detail_mode AS market_detail_mode, r.market AS market_kind,
      r.line_type AS market_line_type, r.fight_id AS market_fight_id,
      r.event_id AS market_event_id, r.fighter_id AS market_fighter_id,
      r.opponent_fighter_id AS market_opponent_fighter_id,
      r.bookmaker AS market_bookmaker, r.model_probability AS market_model_probability,
      r.no_vig_market_probability AS market_probability,
      r.offered_decimal_odds AS market_decimal_odds, r.edge AS market_edge,
      r.ev_per_unit AS market_ev_per_unit, r.decision AS market_decision,
      r.recommended_fighter_id AS market_recommended_fighter_id,
      r.stake_amount AS market_stake_amount,
      r.odds_timestamp::text AS market_odds_timestamp,
      r.report_generated_at::text AS market_report_generated_at
    FROM betting_report_fights r
    WHERE r.report_key = 'current_bfo_mean' AND r.source = 'honest'
      AND r.detail_mode = 'current_recommendations'
      AND r.market = 'moneyline' AND r.line_type = 'current'
      AND r.resolved = false AND r.decision IN ('bet', 'pass')
      AND r.fight_id = f.fight_id::text AND r.event_id = e.event_id::text
      AND ((r.fighter_id = f.fighter_1_id::text AND r.opponent_fighter_id = f.fighter_2_id::text)
        OR (r.fighter_id = f.fighter_2_id::text AND r.opponent_fighter_id = f.fighter_1_id::text))
      AND r.report_generated_at >= p.scored_at
      AND r.report_generated_at <= CURRENT_TIMESTAMP
      AND r.odds_timestamp <= CURRENT_TIMESTAMP
      AND r.odds_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
      AND ABS(r.model_probability::double precision - CASE
        WHEN r.fighter_id = f.fighter_1_id::text THEN p.calibrated_prob_f1_full
        ELSE 1.0 - p.calibrated_prob_f1_full END) <= 1e-8
    ORDER BY CASE WHEN r.decision = 'bet' THEN 0 ELSE 1 END,
      r.stake_amount DESC, r.odds_timestamp DESC, r.row_number ASC
    LIMIT 1
  ) comparison ON true
  WHERE e.event_status = 'upcoming' AND e.event_date >= CURRENT_DATE
    AND f.result_type = 'upcoming'
  ORDER BY e.event_date, e.event_name, e.event_id, p.fight_id;
`;

type Numeric = number | string | null;
type Timestamp = string | Date | null;

export interface BettingPredictionRow {
  fight_id: string;
  event_id: string;
  event_name: string;
  event_date: string | Date;
  fighter_1_id: string;
  fighter_2_id: string;
  fighter_1_name: string;
  fighter_2_name: string;
  calibrated_prob_f1_full: Numeric;
  decision_status: string;
  is_actionable: boolean;
  pick_label: number | null;
  pick_winner_name: string | null;
  uncertainty_reasons: string[] | null;
  decision_policy_version: string;
  decision_origin: string;
  confidence_tier: string;
  model_name: string;
  scored_at: Timestamp;
  market_report_key?: string | null;
  market_source?: string | null;
  market_detail_mode?: string | null;
  market_kind?: string | null;
  market_line_type?: string | null;
  market_fight_id?: string | null;
  market_event_id?: string | null;
  market_fighter_id?: string | null;
  market_opponent_fighter_id?: string | null;
  market_bookmaker?: string | null;
  market_model_probability?: Numeric;
  market_probability?: Numeric;
  market_decimal_odds?: Numeric;
  market_edge?: Numeric;
  market_ev_per_unit?: Numeric;
  market_decision?: string | null;
  market_recommended_fighter_id?: string | null;
  market_stake_amount?: Numeric;
  market_odds_timestamp?: Timestamp;
  market_report_generated_at?: Timestamp;
}

export async function getBettingDashboardData(now = new Date()): Promise<BettingDashboardData> {
  try {
    // Keep missing configuration and database failures inside the page's error
    // boundary, including when this module is evaluated during a build.
    const { query } = await import('@/lib/db/client');
    const rows = await query<BettingPredictionRow>(BETTING_PREDICTIONS_SQL);
    const predictions = rows.flatMap((row) => {
      const prediction = toBettingPrediction(row, now);
      return prediction ? [prediction] : [];
    });
    const updatedAt = predictions.reduce<string | null>((latest, prediction) =>
      !latest || prediction.scoredAt > latest ? prediction.scoredAt : latest, null);
    return { predictions, updatedAt, error: false };
  } catch {
    return { predictions: [], updatedAt: null, error: true };
  }
}

export function toBettingPrediction(row: BettingPredictionRow, now = new Date()): BettingPrediction | null {
  const probability = finiteNumber(row.calibrated_prob_f1_full);
  const scoredAt = timestamp(row.scored_at);
  if (probability === null || probability < 0 || probability > 1 || !scoredAt) return null;

  const fighter1 = { id: row.fighter_1_id, name: row.fighter_1_name, probability };
  const fighter2 = { id: row.fighter_2_id, name: row.fighter_2_name, probability: 1 - probability };
  const expectedPick = probability > 0.60 ? fighter1 : probability < 0.40 ? fighter2 : null;
  // Full precision governs the inclusive 40–60% band. Existing decision fields
  // must agree; a latent winner is never a replacement for a missing model pick.
  const actionable = expectedPick !== null && row.decision_status === 'pick'
    && row.is_actionable === true && row.pick_label === (expectedPick === fighter1 ? 1 : 0)
    && row.pick_winner_name === expectedPick.name;
  const prediction: BettingPrediction = {
    fightId: row.fight_id, eventId: row.event_id, eventName: row.event_name,
    eventDate: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : row.event_date.slice(0, 10),
    fighter1, fighter2, decisionStatus: actionable ? 'pick' : 'no_pick', isActionable: actionable,
    modelPick: actionable && expectedPick ? { fighterId: expectedPick.id, name: expectedPick.name } : null,
    confidenceTier: row.confidence_tier, modelName: row.model_name, scoredAt,
    decisionPolicyVersion: row.decision_policy_version, decisionOrigin: row.decision_origin,
    uncertaintyReasons: Array.isArray(row.uncertainty_reasons) ? row.uncertainty_reasons.filter((reason) => typeof reason === 'string') : [],
    market: null,
  };
  prediction.market = toMarketComparison(row, prediction, now);
  return prediction;
}

function toMarketComparison(row: BettingPredictionRow, prediction: BettingPrediction, now: Date): BettingMarketComparison | null {
  if (row.market_report_key !== 'current_bfo_mean' || row.market_source !== 'honest'
    || row.market_detail_mode !== 'current_recommendations' || row.market_kind !== 'moneyline'
    || row.market_line_type !== 'current' || row.market_fight_id !== prediction.fightId
    || row.market_event_id !== prediction.eventId || !row.market_bookmaker?.trim()) return null;
  const evaluated = row.market_fighter_id === prediction.fighter1.id ? prediction.fighter1
    : row.market_fighter_id === prediction.fighter2.id ? prediction.fighter2 : null;
  const opponent = evaluated === prediction.fighter1 ? prediction.fighter2 : prediction.fighter1;
  if (!evaluated || row.market_opponent_fighter_id !== opponent.id) return null;

  const modelProbability = finiteNumber(row.market_model_probability);
  const marketProbability = finiteNumber(row.market_probability);
  const decimalOdds = finiteNumber(row.market_decimal_odds);
  const edge = finiteNumber(row.market_edge);
  const expectedValuePerUnit = finiteNumber(row.market_ev_per_unit);
  const stake = finiteNumber(row.market_stake_amount);
  const oddsTimestamp = timestamp(row.market_odds_timestamp);
  const reportGeneratedAt = timestamp(row.market_report_generated_at);
  if (modelProbability === null || modelProbability < 0 || modelProbability > 1
    || Math.abs(modelProbability - evaluated.probability) > 1e-8
    || marketProbability === null || marketProbability <= 0 || marketProbability >= 1
    || decimalOdds === null || decimalOdds <= 1 || edge === null || expectedValuePerUnit === null
    || !oddsTimestamp || !reportGeneratedAt || !Number.isFinite(now.getTime())
    || Date.parse(oddsTimestamp) > now.getTime()
    || Date.parse(oddsTimestamp) < now.getTime() - 48 * 60 * 60 * 1000
    || reportGeneratedAt < prediction.scoredAt || Date.parse(reportGeneratedAt) > now.getTime()
    || !['bet', 'pass'].includes(row.market_decision || '')) return null;

  const bet = prediction.isActionable && row.market_decision === 'bet'
    && row.market_recommended_fighter_id === evaluated.id && stake !== null && stake > 0;
  return {
    evaluatedFighterId: evaluated.id, evaluatedFighterName: evaluated.name,
    bookmaker: row.market_bookmaker.trim(),
    isBenchmark: /^(bfo[ _-]?mean|bestfightodds[ _-]?mean)$/i.test(row.market_bookmaker.trim()),
    decimalOdds, modelProbability, marketProbability, edge, expectedValuePerUnit,
    decision: bet ? 'bet' : 'pass', suggestedStake: bet ? stake : 0,
    oddsTimestamp, reportGeneratedAt,
  };
}

function finiteNumber(value: Numeric | undefined): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: Timestamp | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
