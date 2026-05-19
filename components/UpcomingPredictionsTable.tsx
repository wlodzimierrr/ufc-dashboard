'use client';

import Link from 'next/link';
import { Prediction } from '@/lib/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { formatDate, formatProbability } from '@/lib/utils';

interface UpcomingPredictionsTableProps {
  predictions: Prediction[];
}

export function UpcomingPredictionsTable({ predictions }: UpcomingPredictionsTableProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Predictions</h3>
        <p className="text-slate-400">No upcoming predictions available.</p>
      </div>
    );
  }

  // Group by event
  const eventMap = new Map<string, Prediction[]>();
  predictions.forEach((pred) => {
    if (!eventMap.has(pred.event_id)) {
      eventMap.set(pred.event_id, []);
    }
    eventMap.get(pred.event_id)?.push(pred);
  });

  const events = Array.from(eventMap.entries()).slice(0, 3); // Show next 3 events

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Upcoming Predictions</h3>
      {events.map(([eventId, eventPreds]) => (
        <div key={eventId} className="mb-6 pb-6 border-b border-slate-700 last:border-b-0">
          <p className="text-sm font-semibold text-gray-300 mb-3">
            {eventPreds[0]?.event_name} • {formatDate(eventPreds[0]?.event_date || '')}
          </p>
          <div className="space-y-2">
            {eventPreds.slice(0, 5).map((pred) => (
              <div
                key={pred.id}
                className="flex items-center justify-between bg-gray-800 rounded p-3 border border-gray-700 hover:border-red-700/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-white font-medium">
                    {pred.fighter_a} vs {pred.fighter_b}
                  </p>
                  <p className="text-sm text-gray-400">
                    Pick: <span className="text-green-400 font-semibold">{pred.predicted_winner}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white font-semibold">
                      {formatProbability(pred.predicted_winner_probability)}
                    </p>
                    <ConfidenceBadge tier={pred.confidence_tier} />
                  </div>
                  {pred.uncertainty_flag && (
                    <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                      ⚠
                    </span>
                  )}
                </div>
              </div>
            ))}
            {eventPreds.length > 5 && (
              <p className="text-sm text-slate-400 text-center py-2">
                +{eventPreds.length - 5} more fights
              </p>
            )}
          </div>
        </div>
      ))}
      <Link
        href="/predictions/upcoming"
        className="inline-block mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-semibold"
      >
        View All Upcoming →
      </Link>
    </div>
  );
}
