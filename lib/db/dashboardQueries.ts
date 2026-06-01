/**
 * Dashboard Query Functions
 * 
 * ADAPTER LAYER: Customize the SQL queries below to match your exact table names and columns.
 * Each function includes comments explaining the expected schema.
 * 
 * Expected core tables:
 * - predictions: fight_id, event_id, event_name, event_date, fighter_1_id, fighter_2_id,
 *   fighter_1_name, fighter_2_name, weight_class, predicted_prob_f1, calibrated_prob_f1,
 *   confidence_tier, is_uncertain, model_name, model_artifact, scored_at
 *   (If actual results are available, also map actual_winner, result_method, result_round, is_correct, completed.)
 * - events: event_id, name, event_date, location, completed
 */

import { query, queryOne } from './client';
import {
  Prediction,
  Event,
  DashboardSummary,
  ConfidenceTierStat,
  AccuracyOverTimePoint,
  EventDetail,
  CalibrationBucket,
  FighterCareerSummary,
} from '@/lib/types';

/**
 * Get dashboard summary statistics
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  // Read event- and fight-level reporting views for dashboard summary
  const sql = `
    WITH reviewed_fights AS (
      SELECT *
      FROM pre_event_prediction_fights
    ),
    upcoming AS (
      SELECT COUNT(*) as upcoming_predictions_count
      FROM current_event_predictions
    )
    SELECT
      COALESCE(ROUND(SUM(CASE WHEN correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 4), 0) as overall_accuracy,
      COUNT(*) as total_reviewed_fights,
      COALESCE(ROUND(SUM(CASE WHEN confidence_tier = 'high' AND correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(CASE WHEN confidence_tier = 'high' THEN 1 ELSE 0 END), 0), 4), 0) as high_confidence_accuracy,
      COALESCE(MAX(model_name), 'unknown') as current_model_version,
      COALESCE(MAX(scored_at)::text, NOW()::text) as last_updated,
      COALESCE(SUM(CASE WHEN correct = true THEN 1 ELSE 0 END), 0) as total_correct,
      COUNT(*) as total_predictions,
      COALESCE((SELECT upcoming_predictions_count FROM upcoming), 0) as upcoming_predictions_count
    FROM reviewed_fights;
  `;

  const result = await queryOne<DashboardSummary>(sql);
  return (
    result || {
      overall_accuracy: 0,
      total_reviewed_fights: 0,
      upcoming_predictions_count: 0,
      high_confidence_accuracy: 0,
      current_model_version: 'unknown',
      last_updated: new Date().toISOString(),
      total_correct: 0,
      total_predictions: 0,
    }
  );
}

/**
 * Get upcoming predictions for next event
 */
export async function getUpcomingPredictions(): Promise<Prediction[]> {
  // Read upcoming/current predictions from the reporting view
  const sql = `
    SELECT
      fight_id AS id,
      event_id,
      event_name,
      event_date,
      fight_id,
      fighter_1_name AS fighter_a,
      fighter_2_name AS fighter_b,
      predicted_winner_name AS predicted_winner,
      CASE WHEN predicted_label = 1 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END as predicted_winner_probability,
      calibrated_prob_f1 AS fighter_a_win_probability,
      (1 - calibrated_prob_f1) AS fighter_b_win_probability,
      CASE
        WHEN confidence_tier = 'high' THEN 'High'
        WHEN confidence_tier = 'medium' THEN 'Medium'
        ELSE 'Uncertain'
      END as confidence_tier,
      is_uncertain AS uncertainty_flag,
      model_name AS model_version,
      model_artifact,
      scored_at AS prediction_generated_at,
      NULL::text AS actual_winner,
      NULL::text AS result_method,
      NULL::int AS result_round,
      NULL::boolean AS is_correct,
      COALESCE(event_status = 'completed', false) AS completed
    FROM current_event_predictions
    WHERE event_status = 'upcoming' OR (event_status IS NULL AND event_date >= CURRENT_DATE)
    ORDER BY COALESCE(event_date, scored_at) ASC, predicted_winner_probability DESC
    LIMIT 100;
  `;

  return await query<Prediction>(sql);
}

/**
 * Get upcoming predictions filtered by confidence tier
 */
export async function getUpcomingPredictionsByConfidence(
  confidenceTier: string
): Promise<Prediction[]> {
  // Read upcoming/current predictions from the reporting view
  const sql = `
    SELECT
      fight_id AS id,
      event_id,
      event_name,
      event_date,
      fight_id,
      fighter_1_name AS fighter_a,
      fighter_2_name AS fighter_b,
      predicted_winner_name AS predicted_winner,
      CASE WHEN predicted_label = 1 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END as predicted_winner_probability,
      calibrated_prob_f1 AS fighter_a_win_probability,
      (1 - calibrated_prob_f1) AS fighter_b_win_probability,
      CASE
        WHEN confidence_tier = 'high' THEN 'High'
        WHEN confidence_tier = 'medium' THEN 'Medium'
        ELSE 'Uncertain'
      END as confidence_tier,
      is_uncertain AS uncertainty_flag,
      model_name AS model_version,
      model_artifact,
      scored_at AS prediction_generated_at,
      NULL::text AS actual_winner,
      NULL::text AS result_method,
      NULL::int AS result_round,
      NULL::boolean AS is_correct,
      COALESCE(event_status = 'completed', false) AS completed
    FROM current_event_predictions
    WHERE (event_status = 'upcoming' OR (event_status IS NULL AND event_date >= CURRENT_DATE))
      AND (
        CASE
          WHEN confidence_tier = 'high' THEN 'High'
          WHEN confidence_tier = 'medium' THEN 'Medium'
          ELSE 'Uncertain'
        END = $1
      )
    ORDER BY COALESCE(event_date, scored_at) ASC, predicted_winner_probability DESC
    LIMIT 100;
  `;

  return await query<Prediction>(sql, [confidenceTier]);
}

/**
 * Get past events summary
 */
export async function getPastEventsSummary(): Promise<Event[]> {
  // Read completed event performance from the event-level reporting view
  const sql = `
    SELECT
      e.event_id AS id,
      e.event_name AS name,
      e.event_date,
      COALESCE(e.location, e.event_location, '') AS location,
      COALESCE(e.event_status = 'completed', false) AS completed,
      e.n_predicted_fights AS total_fights,
      e.correct AS correct_predictions,
      e.accuracy,
      COALESCE(avg_probs.average_confidence, 0) AS average_confidence
    FROM pre_event_prediction_events e
    LEFT JOIN (
      SELECT
        event_id,
        COALESCE(ROUND(AVG(CASE WHEN predicted_label = 1 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END), 4), 0) AS average_confidence
      FROM pre_event_prediction_fights
      GROUP BY event_id
    ) avg_probs USING (event_id)
    WHERE e.event_status = 'completed'
    ORDER BY e.event_date DESC
    LIMIT 50;
  `;

  return await query<Event>(sql);
}

/**
 * Get event detail with all fights
 */
export async function getEventDetail(eventId: string): Promise<EventDetail | null> {
  // Read event summary from the event-level reporting view
  const sql = `
    SELECT
      event_id AS id,
      event_name AS name,
      event_date,
      COALESCE(location, event_location, '') AS location,
      COALESCE(event_status = 'completed', false) AS completed,
      n_predicted_fights AS total_fights,
      correct AS correct_picks,
      (n_predicted_fights - correct) AS incorrect_picks,
      accuracy AS event_accuracy
    FROM pre_event_prediction_events
    WHERE event_id = $1
    LIMIT 1;
  `;

  const event = await queryOne<any>(sql, [eventId]);
  if (!event) return null;

  const fightsSql = `
    SELECT
      fight_id AS id,
      event_id,
      event_name,
      event_date,
      fight_id,
      fighter_1_name AS fighter_a,
      fighter_2_name AS fighter_b,
      predicted_winner_name AS predicted_winner,
      CASE WHEN predicted_label = 1 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END as predicted_winner_probability,
      calibrated_prob_f1 AS fighter_a_win_probability,
      (1 - calibrated_prob_f1) AS fighter_b_win_probability,
      CASE
        WHEN confidence_tier = 'high' THEN 'High'
        WHEN confidence_tier = 'medium' THEN 'Medium'
        ELSE 'Uncertain'
      END as confidence_tier,
      is_uncertain AS uncertainty_flag,
      model_name AS model_version,
      model_artifact,
      scored_at AS prediction_generated_at,
      actual_winner_name AS actual_winner,
      finish_method AS result_method,
      finish_round AS result_round,
      correct AS is_correct,
      COALESCE(resolved, false) AS completed
    FROM pre_event_prediction_fights
    WHERE event_id = $1
    ORDER BY fight_id ASC;
  `;

  const fights = await query<Prediction>(fightsSql, [eventId]);

  return {
    id: event.id,
    name: event.name,
    event_date: event.event_date,
    location: event.location,
    completed: event.completed,
    total_fights: event.total_fights,
    correct_picks: event.correct_picks,
    incorrect_picks: event.incorrect_picks,
    event_accuracy: event.event_accuracy,
    average_predicted_probability: event.average_predicted_probability,
    fights,
  };
}

/**
 * Get accuracy by confidence tier
 */
export async function getAccuracyByConfidenceTier(): Promise<ConfidenceTierStat[]> {
  // Read confidence-tier accuracy from the fight-level reporting view
  const sql = `
    SELECT 
      CASE 
        WHEN is_uncertain = true THEN 'Uncertain'
        WHEN calibrated_prob_f1 >= 0.70 THEN 'High'
        WHEN calibrated_prob_f1 >= 0.60 THEN 'Medium'
        ELSE 'Low'
      END as tier,
      COUNT(*) as total,
      SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct,
      COALESCE(ROUND(SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 4), 0) as accuracy,
      COALESCE(ROUND(AVG(CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END), 4), 0) as average_probability
    FROM pre_event_prediction_fights
    GROUP BY
      CASE 
        WHEN is_uncertain = true THEN 'Uncertain'
        WHEN calibrated_prob_f1 >= 0.70 THEN 'High'
        WHEN calibrated_prob_f1 >= 0.60 THEN 'Medium'
        ELSE 'Low'
      END
    ORDER BY 
      CASE 
        WHEN is_uncertain = true THEN 'Uncertain'
        WHEN calibrated_prob_f1 >= 0.70 THEN 'High'
        WHEN calibrated_prob_f1 >= 0.60 THEN 'Medium'
        ELSE 'Low'
      END;
  `;

  return await query<ConfidenceTierStat>(sql);
}

/**
 * Get accuracy over time (cumulative)
 */
export async function getAccuracyOverTime(): Promise<AccuracyOverTimePoint[]> {
  // Read cumulative accuracy history from the fight-level reporting view
  const sql = `
    WITH daily_accuracy AS (
      SELECT 
        DATE(event_date) as date,
        COUNT(*) as fights_reviewed,
        SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct_today
      FROM pre_event_prediction_fights
      WHERE event_date IS NOT NULL
        AND event_date <= CURRENT_DATE
        AND is_correct IS NOT NULL
      GROUP BY DATE(event_date)
      ORDER BY DATE(event_date)
    ),
    cumulative AS (
      SELECT
        date,
        fights_reviewed,
        correct_today,
        SUM(fights_reviewed) OVER (ORDER BY date) as cumulative_total,
        SUM(correct_today) OVER (ORDER BY date) as cumulative_correct
      FROM daily_accuracy
    )
    SELECT 
      date::text,
      COALESCE(ROUND(cumulative_correct::numeric / NULLIF(cumulative_total, 0), 4), 0) as accuracy,
      fights_reviewed,
      cumulative_correct,
      cumulative_total
    FROM cumulative
    ORDER BY date;
  `;

  return await query<AccuracyOverTimePoint>(sql);
}

/**
 * Get accuracy by model version
 */
export async function getAccuracyByModelVersion(): Promise<
  Array<{
    model_version: string;
    total_predictions: number;
    correct_predictions: number;
    accuracy: number;
  }>
> {
  // Read model-version performance from the fight-level reporting view
  const sql = `
    SELECT 
      model_name AS model_version,
      COUNT(*) as total_predictions,
      SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct_predictions,
      COALESCE(ROUND(SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 4), 0) as accuracy
    FROM pre_event_prediction_fights
    WHERE is_correct IS NOT NULL
    GROUP BY model_name
    ORDER BY model_name DESC;
  `;

  return await query(sql);
}

/**
 * Get fighter career summary for profile/comparison panels
 */
export async function getFighterCareerSummary(
  fighterId: string
): Promise<FighterCareerSummary | null> {
  const sql = `
    SELECT *
    FROM fighter_career_summary
    WHERE fighter_id = $1
    LIMIT 1;
  `;

  return await queryOne<FighterCareerSummary>(sql, [fighterId]);
}

/**
 * Get calibration buckets for calibration curve
 */
export async function getCalibrationBuckets(): Promise<CalibrationBucket[]> {
  // Read calibration data from the fight-level reporting view
  const sql = `
    SELECT 
      bucket as probability_bucket,
      COALESCE(ROUND(AVG(predicted_winner_probability), 4), 0) as predicted_probability_avg,
      COALESCE(ROUND(SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0), 4), 0) as actual_win_rate,
      COUNT(*) as fights_count
    FROM (
      SELECT
        CASE 
          WHEN CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END >= 0.90 THEN '0.90-1.00'
          WHEN CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END >= 0.80 THEN '0.80-0.90'
          WHEN CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END >= 0.70 THEN '0.70-0.80'
          WHEN CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END >= 0.60 THEN '0.60-0.70'
          WHEN CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END >= 0.55 THEN '0.55-0.60'
          ELSE '0.50-0.55'
        END as bucket,
        CASE WHEN predicted_prob_f1 >= 0.5 THEN calibrated_prob_f1 ELSE 1 - calibrated_prob_f1 END as predicted_winner_probability,
        is_correct
      FROM pre_event_prediction_fights
      WHERE is_correct IS NOT NULL
    ) AS buckets
    GROUP BY bucket
    ORDER BY bucket DESC;
  `;

  return await query<CalibrationBucket>(sql);
}
