export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { BettingSection } from '@/components/BettingSection';
import { getBettingDashboardData } from '@/lib/bettingReports';
import { formatDateTime } from '@/lib/utils';

async function BettingContent() {
  const data = await getBettingDashboardData();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">Upcoming cards</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Betting predictions</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
          Model forecasts for upcoming fights, with current odds, market edges and suggested stakes when a matching comparison is available.
        </p>
        {data.updatedAt && <p className="mt-3 text-xs text-gray-500">Predictions updated {formatDateTime(data.updatedAt)}</p>}
      </header>
      <BettingSection data={data} />
    </div>
  );
}

export default function BettingPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" role="status" aria-label="Loading betting predictions">
        <div className="animate-pulse" aria-hidden="true">
          <div className="mb-4 h-8 w-2/3 rounded bg-gray-800 sm:w-1/3" />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {[0, 1].map((index) => <div key={index} className="h-96 rounded-xl bg-gray-900" />)}
          </div>
        </div>
      </div>
    }>
      <BettingContent />
    </Suspense>
  );
}
