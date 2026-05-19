export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getEventDetail } from '@/lib/db/dashboardQueries';
import { FightResultTable } from '@/components/FightResultTable';
import { formatDate, formatPercentage } from '@/lib/utils';

async function EventDetailContent({ eventId }: { eventId: string }) {
  try {
    const eventDetail = await getEventDetail(eventId);

    if (!eventDetail) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <p className="text-gray-400">Event not found.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">{eventDetail.name}</h2>
          <p className="text-gray-500">
            {formatDate(eventDetail.event_date)} • {eventDetail.location}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-sm font-medium text-gray-400">Event Accuracy</p>
            <p className="text-2xl font-bold text-red-500 mt-2">
              {formatPercentage(eventDetail.event_accuracy)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {eventDetail.correct_picks} / {eventDetail.total_fights}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-sm font-medium text-gray-400">Correct Picks</p>
            <p className="text-2xl font-bold text-green-500 mt-2">
              {eventDetail.correct_picks}
            </p>
            <p className="text-xs text-gray-500 mt-1">predictions</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-sm font-medium text-gray-400">Incorrect Picks</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {eventDetail.incorrect_picks}
            </p>
            <p className="text-xs text-gray-500 mt-1">predictions</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <p className="text-sm font-medium text-gray-400">Avg Confidence</p>
            <p className="text-2xl font-bold text-blue-500 mt-2">
              {formatPercentage(eventDetail.average_predicted_probability)}
            </p>
            <p className="text-xs text-gray-500 mt-1">predicted probability</p>
          </div>
        </div>

        {/* Fights Table */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Fight Results</h3>
          <FightResultTable fights={eventDetail.fights} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading event detail:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Event</h3>
          <p className="text-red-300 text-sm">
            Could not fetch event details. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

export default function EventDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-800 rounded mb-2 w-1/2"></div>
            <div className="h-4 bg-gray-800 rounded mb-8 w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 h-24"></div>
              ))}
            </div>
            <div className="bg-gray-800 rounded-lg h-96"></div>
          </div>
        </div>
      }
    >
      <EventDetailContent eventId={params.eventId} />
    </Suspense>
  );
}
