import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { LineChart } from '@/components/tremor/LineChart';

import { formatPercent } from '@/lib/formattingUtils';

type SweepProps = {
    data: any
};

export function Sweep({ data }: SweepProps) {
  return (
    <AnimatedSection>
              {/* Left Column */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Impact of Available Land Area</h3></Divider>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How much arable land is truly necessary to achieve pharmaceutical self-sufficiency?</p>
                </div>

                <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                  <p>Arable land is a scarce, resource-intensive asset. While expanding cultivation area intuitively raises production, linear scaling often yields diminishing returns due to crop seasonality, processing constraints, and storage decay.</p>
                </div>
              </div>            

              {/* Right Column */}
              <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                <LineChart
                  className="h-80"
                  data={data.map((d: any) => ({
                    "Land Area": Math.round(d.land),
                    "Steady-State Coverage": d.coverage_steady_state * 100,
                    "3-Year Avg Coverage": d.coverage * 100
                  }))}
                  index="Land Area"
                  categories={["Steady-State Coverage", "3-Year Avg Coverage"]}
                  colors={["emerald", "blue"]}
                  valueFormatter={formatPercent}
                  yAxisWidth={75}
                  showLegend={true}
                />
              </div>
            </AnimatedSection>
  )
}

export default Sweep;