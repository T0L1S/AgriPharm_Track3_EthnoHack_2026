import { Divider } from '@/components/tremor/Divider';
import { LineChart } from '@/components/tremor/LineChart';

import { formatPercent } from '@/lib/formattingUtils';

type SweepProps = {
    data: any
};

export function Sweep({ data }: SweepProps) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              {/* Left Column */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Impact of Available Land Area</h3></Divider>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How is demand coverage affected by the amount of arable land?</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                <LineChart
                  className="h-80"
                  data={data.map((d: any) => ({
                    "Έκταση": Math.round(d.land),
                    "Κάλυψη": d.coverage * 100
                  }))}
                  index="Έκταση"
                  categories={["Κάλυψη"]}
                  colors={["emerald"]}
                  valueFormatter={formatPercent}
                  yAxisWidth={75}
                  showLegend={false}
                />
              </div>
            </section>
  )
}

export default Sweep;