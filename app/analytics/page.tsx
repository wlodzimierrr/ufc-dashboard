export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import {
  getAccuracyByConfidenceTier,
  getAccuracyByModelVersion,
  getAccuracyOverTime,
  getCalibrationBuckets,
  getDashboardSummary,
} from '@/lib/db/dashboardQueries';
import { AccuracyOverTimeChart } from '@/components/AccuracyOverTimeChart';
import { ConfidenceTierChart } from '@/components/ConfidenceTierChart';
import { CalibrationChart } from '@/components/CalibrationChart';
import { DashboardStatCard } from '@/components/DashboardStatCard';
import { formatPercentage, formatNumber } from '@/lib/utils';

async function AnalyticsContent() {
  try {
    const [summary, confidenceTiers, modelVersions, accuracyOverTime, calibrationBuckets] =
      await Promise.all([
        getDashboardSummary(),
        getAccuracyByConfidenceTier(),
        getAccuracyByModelVersion(),
        getAccuracyOverTime(),
        getCalibrationBuckets(),
      ]);

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Accuracy Analytics</h2>
          <p className="text-gray-500">Deep dive into model performance and calibration</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <DashboardStatCard
            title="Overall Accuracy"
            value={formatPercentage(summary.overall_accuracy)}
            subtitle={`${formatNumber(summary.total_correct)} / ${formatNumber(summary.total_predictions)} correct`}
          />
          <DashboardStatCard
            title="Total Predictions"
            value={formatNumber(summary.total_predictions)}
            subtitle="Completed fights reviewed"
          />
          <DashboardStatCard
            title="High Confidence Accuracy"
            value={formatPercentage(summary.high_confidence_accuracy)}
            subtitle="Top tier predictions"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {accuracyOverTime.length > 0 && (
            <AccuracyOverTimeChart data={accuracyOverTime} />
          )}
          {confidenceTiers.length > 0 && (
            <ConfidenceTierChart data={confidenceTiers} />
          )}
        </div>

        {/* Confidence Tier Detailed Stats */}
        {confidenceTiers.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Confidence Tier Breakdown</h3>
            <p className="text-sm text-gray-500 mb-6">
              Accuracy shows how often the predicted winner won. Confidence tiers group predictions by calibrated probability. Higher confidence tiers should have higher accuracy.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Total Fights
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Correct
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Accuracy
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Avg Probability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {confidenceTiers.map((tier) => (
                    <tr key={tier.tier} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-white font-semibold">{tier.tier}</td>
                      <td className="px-6 py-4 text-center text-gray-400">{tier.total}</td>
                      <td className="px-6 py-4 text-center text-gray-400">{tier.correct}</td>
                      <td className="px-6 py-4 text-center text-red-500 font-semibold">
                        {formatPercentage(tier.accuracy)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        {formatPercentage(tier.average_probability)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Model Version Comparison */}
        {modelVersions.length > 0 && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Model Version Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                      Version
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Predictions
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Correct
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                      Accuracy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {modelVersions.map((model) => (
                    <tr key={model.model_version} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-white font-semibold">
                        {model.model_version}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        {formatNumber(model.total_predictions)}
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        {formatNumber(model.correct_predictions)}
                      </td>
                      <td className="px-6 py-4 text-center text-red-500 font-semibold">
                        {formatPercentage(model.accuracy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calibration Curve */}
        {calibrationBuckets.length > 0 && (
          <div className="mb-8">
            <CalibrationChart data={calibrationBuckets} />
            <div className="mt-6 bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-sm text-gray-400">
                <strong>Calibration explained:</strong> The chart shows predicted probability (x-axis) vs actual win rate (y-axis).
                Points on the diagonal (45°) indicate perfect calibration - the predicted probabilities match observed outcomes.
                Points above the line indicate the model is overconfident. Points below indicate underconfidence.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error loading analytics:', error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-red-300 text-sm">
            Could not fetch analytics data. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-800 rounded mb-2 w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded mb-8 w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-6 h-24"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg h-80"></div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
