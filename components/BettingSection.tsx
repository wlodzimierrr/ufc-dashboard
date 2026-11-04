import type { BettingDashboardData, BettingPrediction } from '@/lib/types';
import { formatDate, formatDateTime, formatPercentage } from '@/lib/utils';

export function BettingSection({ data }: { data: BettingDashboardData }) {
  if (data.error) {
    return (
      <div role="alert" className="rounded-xl border border-red-900/60 bg-gray-900 p-6">
        <h2 className="font-semibold text-white">Predictions are temporarily unavailable</h2>
        <p className="mt-2 text-sm text-gray-400">Please try again later.</p>
      </div>
    );
  }
  if (data.predictions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="font-semibold text-white">No upcoming predictions yet</h2>
        <p className="mt-2 text-sm text-gray-400">Forecasts will appear here when an upcoming card has been scored.</p>
      </div>
    );
  }
  const events = new Map<string, BettingPrediction[]>();
  for (const prediction of data.predictions) {
    const fights = events.get(prediction.eventId) || [];
    fights.push(prediction);
    events.set(prediction.eventId, fights);
  }
  return (
    <div className="space-y-9">
      {Array.from(events, ([eventId, predictions]) => (
        <section key={eventId} aria-labelledby={`event-${eventId}`}>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 id={`event-${eventId}`} className="break-words text-xl font-semibold text-white">{predictions[0].eventName}</h2>
            <p className="shrink-0 text-sm text-gray-400">{formatDate(predictions[0].eventDate)}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {predictions.map((prediction) => <PredictionCard key={prediction.fightId} prediction={prediction} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: BettingPrediction }) {
  // Keep the UI safe even if a caller passes a comparison that bypassed mapping.
  const pickSide = prediction.fighter1.probability > 0.60 ? prediction.fighter1
    : prediction.fighter1.probability < 0.40 ? prediction.fighter2 : null;
  const actionable = prediction.isActionable && prediction.decisionStatus === 'pick'
    && pickSide !== null && prediction.modelPick?.fighterId === pickSide.id
    && prediction.modelPick.name === pickSide.name;
  const market = prediction.market;
  const suggested = actionable && market?.decision === 'bet'
    && Number.isFinite(market.suggestedStake) && market.suggestedStake > 0;
  const stake = suggested && market ? market.suggestedStake : 0;
  const probabilityLabel = (value: number) => `${(value * 100).toFixed(2)}%`;
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${actionable ? 'border-red-900/80 bg-red-950/40 text-red-300' : 'border-amber-900/70 bg-amber-950/30 text-amber-300'}`}>
            {actionable ? 'MODEL PICK' : 'NO PICK'}
          </span>
          <span className="text-xs capitalize text-gray-400">{prediction.confidenceTier} confidence</span>
        </div>

        <h3 className="break-words text-lg font-semibold text-white">
          {prediction.fighter1.name}<span className="mx-2 font-normal text-gray-500">vs</span>{prediction.fighter2.name}
        </h3>
        <dl className="mt-5 grid grid-cols-2 gap-4">
          {[prediction.fighter1, prediction.fighter2].map((fighter) => (
            <div key={fighter.id} className="min-w-0">
              <dt className="break-words text-sm text-gray-400">{fighter.name}</dt>
              <dd className="mt-1 text-3xl font-semibold tabular-nums text-white">{probabilityLabel(fighter.probability)}</dd>
            </div>
          ))}
        </dl>
        <div aria-hidden="true" className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-gray-800">
          <span className="bg-red-500" style={{ width: `${prediction.fighter1.probability * 100}%` }} />
          <span className="bg-gray-500" style={{ width: `${prediction.fighter2.probability * 100}%` }} />
        </div>
        <p className="mt-5 text-sm text-gray-400">
          Model pick: <span className="font-semibold text-gray-100">{actionable ? prediction.modelPick?.name : 'NO PICK'}</span>
        </p>
        {!actionable && (
          <p className="mt-1 text-xs text-amber-200/80">
            {prediction.fighter1.probability >= 0.40 && prediction.fighter1.probability <= 0.60
              ? 'The 40–60% uncertainty range includes both boundaries.' : 'No actionable model pick is available.'}
          </p>
        )}
      </div>

      <div className="mt-auto border-t border-gray-800 bg-gray-950/40 p-5 sm:p-6">
        {market ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Market comparison: {market.evaluatedFighterName}</h4>
                <p className="mt-1 text-xs text-gray-400">{market.bookmaker}{market.isBenchmark ? ' · aggregate benchmark' : ''}</p>
              </div>
              <span className={`rounded border px-2 py-1 text-xs ${suggested ? 'border-emerald-900 text-emerald-300' : 'border-gray-700 text-gray-400'}`}>
                {suggested ? market.isBenchmark ? 'Benchmark signal' : 'Suggested bet' : 'Pass'}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Metric label="Decimal odds" value={market.decimalOdds.toFixed(2)} />
              <Metric label="Market (no vig)" value={formatPercentage(market.marketProbability)} />
              <Metric label="Model for this side" value={formatPercentage(market.modelProbability, 2)} />
              <Metric label="Edge" value={`${market.edge > 0 ? '+' : ''}${formatPercentage(market.edge)}`} />
              <Metric label="Expected value / unit" value={`${market.expectedValuePerUnit > 0 ? '+' : ''}${formatPercentage(market.expectedValuePerUnit)}`} />
              <Metric label={market.isBenchmark ? 'Illustrative stake' : 'Suggested stake'} value={`${stake.toLocaleString('en-GB', { maximumFractionDigits: 2 })} units`} />
            </dl>
            <p className="mt-4 text-xs text-gray-500">
              Odds captured {formatDateTime(market.oddsTimestamp)}. {market.isBenchmark
                ? 'BFO Mean combines bookmaker prices; this signal is illustrative.' : 'Suggestions are not placed bets.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No fresh matching market comparison is available.</p>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-gray-800 px-5 py-3 text-xs text-gray-500 sm:px-6">
        <span>Model: {prediction.modelName}</span>
        <span>Scored {formatDateTime(prediction.scoredAt)}</span>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums text-gray-200">{value}</dd></div>;
}
