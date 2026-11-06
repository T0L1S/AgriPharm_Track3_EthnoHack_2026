import { Divider } from '@/components/tremor/Divider';
import { CustomTooltip, CustomLegend } from '@/components/CustomGraphs';

import { getColorClassName } from "@/lib/chartUtils";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

import { penaltyData } from '@/data/chartData';

export function SowingArea() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Impact of Minimum Sowing Area</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How do minimum area constraints affect cultivation decisions?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>In real-world agricultural production, each crop might require a minimum area to be practically viable. Such a constraint reduces planning flexibility, as the available land cannot always be divided into very small plots.</p>
                <p>This section examines how the optimal cultivation plan changes as the minimum allowed area per crop varies.</p>
                <p>Different constraint levels are considered, ranging from 0 stremmas (no minimum area constraint) to 4 stremmas.</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center min-h-[400px] border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6 text-center">
                As the minimum area constraint tightens, demand coverage drops slightly (left axis) while harvest waste steadily increases (right axis).
              </p>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={penaltyData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                    <CartesianGrid vertical={false} stroke="#374151" strokeOpacity={0.2} />
                    <XAxis dataKey="area" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 13 }} dy={10} />
                    <YAxis yAxisId="left" domain={[99, 100]} axisLine={false} tickLine={false} tickFormatter={(val) => `${val.toFixed(1)}%`} tick={{ fill: '#6b7280', fontSize: 13 }} width={50} />
                    <YAxis yAxisId="right" orientation="right" domain={[3, 5]} axisLine={false} tickLine={false} tickFormatter={(val) => `${val.toFixed(1)}%`} tick={{ fill: '#6b7280', fontSize: 13 }} width={50} />
                    
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={{ stroke: '#9ca3af', strokeWidth: 1 }} />
                    <Legend verticalAlign="top" content={<CustomLegend />} />
                    
                    <Line yAxisId="left" type="linear" dataKey="coverage" name="Demand Coverage" stroke="emerald" className={getColorClassName("emerald", "stroke")} strokeWidth={2} dot={false} 
                      activeDot={{ r: 5, strokeWidth: 2, className: `${getColorClassName("emerald", "fill")} stroke-white dark:stroke-gray-950` }} />
                    <Line yAxisId="right" type="linear" dataKey="waste" name="Harvest Waste" stroke="amber" className={getColorClassName("amber", "stroke")} strokeWidth={2} dot={false} 
                      activeDot={{ r: 5, strokeWidth: 2, className: `${getColorClassName("amber", "fill")} stroke-white dark:stroke-gray-950` }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
  )
}

export default SowingArea;