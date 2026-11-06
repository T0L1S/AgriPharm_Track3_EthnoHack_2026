"use client"

import { getColorClassName } from "@/lib/chartUtils"

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md p-3 shadow-lg z-50">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-3 pb-2 border-b border-gray-200 dark:border-gray-800">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                {/* Replaced SVG with the utility-based span */}
                <span
                  aria-hidden="true"
                  className={`h-[3px] w-3.5 shrink-0 rounded-full ${getColorClassName(entry.color, "bg")}`}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{entry.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {entry.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <ul className="flex items-center justify-end gap-x-6 pb-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-x-2">
          <span
            aria-hidden="true"
            className={`h-[3px] w-3.5 shrink-0 rounded-full ${getColorClassName(entry.color, "bg")}`}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

export { CustomTooltip, CustomLegend };