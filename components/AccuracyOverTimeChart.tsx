'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AccuracyOverTimePoint } from '@/lib/types';
import { formatPercentage } from '@/lib/utils';

interface AccuracyOverTimeChartProps {
  data: AccuracyOverTimePoint[];
}

export function AccuracyOverTimeChart({ data }: AccuracyOverTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    accuracyPercent: point.accuracy * 100,
  }));

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Accuracy Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis 
            dataKey="date" 
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
          <Line 
            type="monotone" 
            dataKey="accuracyPercent" 
            stroke="#dc2626" 
            name="Accuracy"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
