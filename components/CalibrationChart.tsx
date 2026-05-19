'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalibrationBucket } from '@/lib/types';

interface CalibrationChartProps {
  data: CalibrationBucket[];
}

export function CalibrationChart({ data }: CalibrationChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }

  const chartData = data.map((bucket) => ({
    ...bucket,
    predicted: bucket.predicted_probability_avg * 100,
    actual: bucket.actual_win_rate * 100,
  }));

  // Add perfect calibration line
  const calibrationLine = [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ];

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-2">Calibration Curve</h3>
      <p className="text-sm text-gray-400 mb-4">
        Predicted probability vs actual win rate. Points on the diagonal indicate perfect calibration.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
          <XAxis 
            dataKey="predicted" 
            type="number"
            name="Predicted Probability"
            stroke="#737373"
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
            label={{ value: 'Predicted Probability (%)', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis 
            dataKey="actual" 
            type="number"
            name="Actual Win Rate"
            stroke="#737373"
            tick={{ fill: '#a3a3a3', fontSize: 12 }}
            label={{ value: 'Actual Win Rate (%)', angle: -90, position: 'insideLeft' }}
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
                return value.toFixed(1) + '%';
              }
              return value;
            }}
          />
          <Scatter 
            name="Calibration Points" 
            data={chartData} 
            fill="#dc2626"
            r={6}
          />
          <Scatter 
            name="Perfect Calibration" 
            data={calibrationLine} 
            fill="none"
            stroke="#f87171"
            strokeDasharray="5 5"
            type="line"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
