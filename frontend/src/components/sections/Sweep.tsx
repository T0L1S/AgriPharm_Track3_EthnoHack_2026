import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { LineChart } from '@/components/tremor/LineChart';

import { formatPercent } from '@/lib/formattingUtils';

type SweepProps = {
    data: any
};

export function Sweep({ data }: SweepProps) {
  // Κοινή κλάση για το δεξί container
  const containerStyle = "lg:col-span-7 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col justify-center shadow-xl ring-1 ring-slate-200 dark:ring-white/10";

  return (
    <AnimatedSection>
      {/* Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider>
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Impact of Available Land Area
            </h3>
          </Divider>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-2">
            How much arable land is truly necessary to achieve pharmaceutical self-sufficiency?
          </p>
        </div>

        <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Arable land is a scarce, resource-intensive asset. While expanding cultivation area intuitively raises production, linear scaling often yields diminishing returns due to crop seasonality.
          </p>
        </div>
      </div>            

      {/* Right Column */}
      <div className={containerStyle}>
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