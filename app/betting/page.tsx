export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { BettingSection } from '@/components/BettingSection';
import { getBettingDashboardData } from '@/lib/bettingReports';
import { formatDateTime } from '@/lib/utils';

async function BettingContent() {
  const bettingData = await getBettingDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h2 className="mb-2 text-xl font-semibold text-white">Betting Dashboard</h2>
        <p className="text-sm text-gray-500">
          Report data from tracked betting backtests and research-only simulations.
        </p>
        {bettingData.updatedAt && (
          <p className="mt-2 text-xs text-gray-600">
            Last updated: {formatDateTime(bettingData.updatedAt)}
          </p>
        )}
      </div>

      <BettingSection data={bettingData} />
    </div>
  );
}

export default function BettingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-4 h-4 w-1/3 rounded bg-gray-800"></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 rounded-lg bg-gray-800"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <BettingContent />
    </Suspense>
  );
}
