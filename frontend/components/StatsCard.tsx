// components/StatsCard.tsx - Stats Display Card

'use client';

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'purple' | 'blue' | 'green' | 'yellow' | 'pink';
}

const colorClasses = {
  purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50 border-purple-200',
  blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50 border-blue-200',
  green: 'from-green-500 to-green-600 text-green-600 bg-green-50 border-green-200',
  yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50 border-yellow-200',
  pink: 'from-pink-500 to-pink-600 text-pink-600 bg-pink-50 border-pink-200',
};

export default function StatsCard({ title, value, subtitle, icon: Icon, color }: StatsCardProps) {
  const colors = colorClasses[color];
  const [gradientFrom, gradientTo, textColor, bgColor, borderColor] = colors.split(' ');

  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border-4 ${borderColor} hover:shadow-xl transition-all hover:scale-105`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${textColor} mb-1`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );
}
