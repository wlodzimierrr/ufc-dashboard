'use client';

import Link from 'next/link';
import { Event } from '@/lib/types';
import { formatDate, formatPercentage } from '@/lib/utils';

interface PastEventsTableProps {
  events: Event[];
}

export function PastEventsTable({ events }: PastEventsTableProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Past Events</h3>
        <p className="text-gray-400">No past events available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-6 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">Past Events</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Event</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Fights</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Correct</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Accuracy</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">{event.name}</p>
                    <p className="text-sm text-gray-500">{event.location}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{formatDate(event.event_date)}</td>
                <td className="px-6 py-4 text-center text-white font-medium">{event.total_fights}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-red-900/40 text-red-300">
                    {event.correct_predictions}
                  </span>
                </td>
                <td className="px-6 py-4 text-center text-red-500 font-semibold">
                  {formatPercentage(event.accuracy)}
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
  );
}
