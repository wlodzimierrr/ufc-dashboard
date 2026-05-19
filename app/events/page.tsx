export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { getPastEventsSummary } from '@/lib/db/dashboardQueries';
import Link from 'next/link';
import { formatDate, formatPercentage, formatNumber } from '@/lib/utils';

async function PastEventsContent() {
  try {
    const events = await getPastEventsSummary();

    if (!events || events.length === 0) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <p className="text-gray-400">No past events available.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Past Events</h2>
          <p className="text-gray-500">{formatNumber(events.length)} completed events</p>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Event</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Fights</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Correct</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Accuracy</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Avg Confidence</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-semibold">{event.name}</p>
                        <p className="text-sm text-gray-500">{event.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatDate(event.event_date)}</td>
                    <td className="px-6 py-4 text-center text-white font-semibold">{event.total_fights}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-900/40 text-red-300">
                        {event.correct_predictions}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-red-500 font-semibold">
                      {formatPercentage(event.accuracy)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {formatPercentage(event.average_confidence)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/events/${event.id}`}
                        className="inline-flex items-center text-red-500 hover:text-red-400 transition-colors font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading past events:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Events</h3>
          <p className="text-red-300 text-sm">
            Could not fetch past events. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

export default function PastEventsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded mb-8 w-1/4"></div>
            <div className="bg-gray-800 rounded-lg h-64"></div>
          </div>
        </div>
      }
    >
      <PastEventsContent />
    </Suspense>
  );
}
