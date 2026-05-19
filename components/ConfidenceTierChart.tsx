'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ConfidenceTierStat } from '@/lib/types';
import { formatPercentage } from '@/lib/utils';

interface ConfidenceTierChartProps {
  data: ConfidenceTierStat[];
}

export function ConfidenceTierChart({ data }: ConfidenceTierChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  const chartData = data.map((stat) => ({
    ...stat,
    accuracyPercent: stat.accuracy * 100,
  }));

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Accuracy by Confidence Tier</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis 
            dataKey="tier" 
            stroke="#737373"
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
          />
          <YAxis 
            stroke="#737373"
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
            label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #dc2626',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#ffffff' }}
            formatter={(value: any) => {
              if (typeof value === 'number') {
                return [formatPercentage(value / 100), 'Accuracy'];
              }
              return value;
            }}
          />
          <Legend />
          <Bar 
            dataKey="accuracyPercent" 
            fill="#dc2626" 
            name="Accuracy"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {chartData.map((tier) => (
          <div key={tier.tier} className="bg-gray-800 rounded p-3 border border-gray-700 hover:border-red-700/50 transition-colors">
            <p className="text-sm font-medium text-gray-300">{tier.tier}</p>
            <p className="text-lg font-semibold text-red-500 mt-1">
              {formatPercentage(tier.accuracy)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{tier.total} fights</p>
          </div>
        ))}
      </div>
    </div>
  );
}
