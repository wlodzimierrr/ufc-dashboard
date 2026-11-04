/**
 * Core types for the UFC Prediction Dashboard
 * Ensure these align with your database schema
 */

export interface Prediction {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  fight_id: string;
  fighter_a: string;
  fighter_b: string;
  predicted_winner: string;
  predicted_winner_probability: number;
  fighter_a_win_probability: number;
  fighter_b_win_probability: number;
  confidence_tier: 'High' | 'Medium' | 'Low' | 'Uncertain';
  uncertainty_flag: boolean;
  model_version: string;
  model_artifact?: string;
  prediction_generated_at: string;
  actual_winner: string | null;
  result_method: string | null;
  result_round: number | null;
  is_correct: boolean | null;
  completed: boolean;
}

export interface Event {
  id: string;
  name: string;
  event_date: string;
  location: string;
  completed: boolean;
  total_fights: number;
  correct_predictions: number;
  accuracy: number;
  average_confidence: number;
}

export interface DashboardSummary {
  overall_accuracy: number;
  total_reviewed_fights: number;
  upcoming_predictions_count: number;
  high_confidence_accuracy: number;
  current_model_version: string;
  last_updated: string;
  total_correct: number;
  total_predictions: number;
}

/** Upcoming forecasts and optional current market comparisons only. */
export interface BettingMarketComparison {
  evaluatedFighterId: string;
  evaluatedFighterName: string;
  bookmaker: string;
  isBenchmark: boolean;
  decimalOdds: number;
  modelProbability: number;
  marketProbability: number;
  edge: number;
  expectedValuePerUnit: number;
  decision: 'bet' | 'pass';
  suggestedStake: number;
  oddsTimestamp: string;
  reportGeneratedAt: string;
}

export interface BettingPrediction {
  fightId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  fighter1: { id: string; name: string; probability: number };
  fighter2: { id: string; name: string; probability: number };
  decisionStatus: 'pick' | 'no_pick';
  isActionable: boolean;
  modelPick: { fighterId: string; name: string } | null;
  confidenceTier: string;
  modelName: string;
  scoredAt: string;
  decisionPolicyVersion: string;
  decisionOrigin: string;
  uncertaintyReasons: string[];
  market: BettingMarketComparison | null;
}

export interface BettingDashboardData {
  predictions: BettingPrediction[];
  updatedAt: string | null;
  error: boolean;
}

export interface ConfidenceTierStat {
  tier: 'High' | 'Medium' | 'Low' | 'Uncertain';
  total: number;
  correct: number;
  accuracy: number;
  average_probability: number;
}

export interface AccuracyOverTimePoint {
  date: string;
  accuracy: number;
  fights_reviewed: number;
  cumulative_correct: number;
  cumulative_total: number;
}

export interface ModelAccuracySnapshot {
  model_version: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  brier_score?: number;
  log_loss?: number;
  calibration_error?: number;
  last_updated: string;
}

export interface FighterCareerSummary {
  fighter_id: string;
  fighter_name: string;
  total_fights: number;
  wins: number;
  losses: number;
  win_rate: number;
  accuracy: number;
  average_confidence?: number;
  last_updated?: string;
}

export interface CalibrationBucket {
  probability_bucket: string;
  predicted_probability_avg: number;
  actual_win_rate: number;
  fights_count: number;
}

export interface EventDetail {
  id: string;
  name: string;
  event_date: string;
  location: string;
  completed: boolean;
  total_fights: number;
  correct_picks: number;
  incorrect_picks: number;
  event_accuracy: number;
  average_predicted_probability: number;
  fights: Prediction[];
}
