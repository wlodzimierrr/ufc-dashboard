'use client';

import { Prediction } from '@/lib/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { CorrectnessBadge } from './CorrectnessBadge';
import { formatProbability } from '@/lib/utils';

interface FightResultTableProps {
  fights: Prediction[];
}

export function FightResultTable({ fights }: FightResultTableProps) {
  if (!fights || fights.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <p className="text-gray-400">No fights available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Fighters</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Prediction</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Probability</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Confidence</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Result</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {fights.map((fight) => (
              <tr key={fight.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-white font-medium">
                    {fight.fighter_a} vs {fight.fighter_b}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">#{fight.fight_id}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-red-400 font-semibold">{fight.predicted_winner}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="text-white font-semibold">
                    {formatProbability(fight.predicted_winner_probability)}
                  </p>
                </td>
                <td className="px-6 py-4 text-center">
                  <ConfidenceBadge tier={fight.confidence_tier} />
                  {fight.uncertainty_flag && (
                    <p className="text-xs text-yellow-400 mt-1">⚠ Uncertain</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  {fight.actual_winner ? (
                    <div>
                      <p className="text-white font-medium">{fight.actual_winner}</p>
                      {fight.result_method && (
                        <p className="text-xs text-gray-500">
                          {fight.result_method}
                          {fight.result_round && ` - R${fight.result_round}`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Pending</p>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {fight.completed && <CorrectnessBadge isCorrect={fight.is_correct} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
