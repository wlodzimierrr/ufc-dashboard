export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getUpcomingPredictions } from '@/lib/db/dashboardQueries';
import { Prediction } from '@/lib/types';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { formatDate, formatProbability } from '@/lib/utils';

async function UpcomingPredictionsContent() {
  try {
    const predictions = await getUpcomingPredictions();

    if (!predictions || predictions.length === 0) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <p className="text-gray-400">No upcoming predictions available.</p>
          </div>
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

    const events = Array.from(eventMap.entries());

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Upcoming Predictions</h2>
          <p className="text-gray-500">{predictions.length} fights predicted</p>
        </div>

        {events.map(([eventId, eventPreds]) => (
          <div key={eventId} className="mb-8">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {eventPreds[0]?.event_name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {formatDate(eventPreds[0]?.event_date || '')} • {eventPreds[0]?.event_name}
              </p>

              <div className="space-y-2">
                {eventPreds.map((pred) => (
                  <div
                    key={pred.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-red-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        {pred.fighter_a} vs {pred.fighter_b}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Fight #{pred.fight_id}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-red-500 font-semibold">
                          {pred.predicted_winner}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          {formatProbability(pred.predicted_winner_probability)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ConfidenceBadge tier={pred.confidence_tier} />
                        {pred.uncertainty_flag && (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-900/40 text-yellow-300 rounded text-xs font-medium">
                            ⚠ Uncertain
                          </span>
                        )}
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">{pred.model_version}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error loading upcoming predictions:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Predictions</h3>
          <p className="text-red-300 text-sm">
            Could not fetch upcoming predictions. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

export default function UpcomingPredictionsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded mb-8 w-1/4"></div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 h-24"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <UpcomingPredictionsContent />
    </Suspense>
  );
}
