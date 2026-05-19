export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import {
  getDashboardSummary,
  getUpcomingPredictions,
  getAccuracyOverTime,
  getAccuracyByConfidenceTier,
} from '@/lib/db/dashboardQueries';
import { DashboardStatCard } from '@/components/DashboardStatCard';
import { AccuracyOverTimeChart } from '@/components/AccuracyOverTimeChart';
import { ConfidenceTierChart } from '@/components/ConfidenceTierChart';
import { UpcomingPredictionsTable } from '@/components/UpcomingPredictionsTable';
import { formatPercentage, formatDateTime, formatNumber } from '@/lib/utils';

async function DashboardContent() {
  try {
    const [summary, upcomingPreds, accuracyOverTime, confidenceTiers] = await Promise.all([
      getDashboardSummary(),
      getUpcomingPredictions(),
      getAccuracyOverTime(),
      getAccuracyByConfidenceTier(),
    ]);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with timestamp */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Dashboard Overview</h2>
          <p className="text-sm text-gray-500">
            Last updated: {formatDateTime(summary.last_updated)}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <DashboardStatCard
            title="Overall Accuracy"
            value={formatPercentage(summary.overall_accuracy)}
            subtitle={`${formatNumber(summary.total_correct)} / ${formatNumber(summary.total_predictions)} correct`}
          />
          <DashboardStatCard
            title="Reviewed Fights"
            value={formatNumber(summary.total_reviewed_fights)}
            subtitle="Completed predictions"
          />
          <DashboardStatCard
            title="Upcoming"
            value={formatNumber(summary.upcoming_predictions_count)}
            subtitle="Next events"
          />
          <DashboardStatCard
            title="High Confidence"
            value={formatPercentage(summary.high_confidence_accuracy)}
            subtitle="Accuracy on top picks"
          />
          <DashboardStatCard
            title="Model Version"
            value={summary.current_model_version}
            subtitle="Current production"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="lg:col-span-1">
            {accuracyOverTime.length > 0 ? (
              <AccuracyOverTimeChart data={accuracyOverTime} />
            ) : (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 h-80 flex items-center justify-center">
                <p className="text-gray-500">No accuracy history available</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            {confidenceTiers.length > 0 ? (
              <ConfidenceTierChart data={confidenceTiers} />
            ) : (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 h-80 flex items-center justify-center">
                <p className="text-gray-500">No confidence tier data</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Predictions */}
        <UpcomingPredictionsTable predictions={upcomingPreds} />
      </div>
    );
  } catch (error) {
    console.error('Error loading dashboard:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-300 text-sm">
            Could not connect to the database. Please ensure DATABASE_URL is set correctly.
          </p>
          <details className="mt-4 text-red-300 text-xs">
            <summary className="cursor-pointer">Details</summary>
            <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-800 rounded mb-4 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800 rounded-lg p-6 h-32 animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
