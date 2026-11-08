import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { BarList } from '@/components/tremor/BarList';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';
import { getProgressVariant, formatPercent } from '@/lib/formattingUtils';
import { ResultsPlaceholder } from '@/components/ResultsPlaceholder';

export interface PlanMetrics {
  coverage: number;
  unused_inventory: number;
}

export interface ComparisonData {
  naive: PlanMetrics;
  equal: PlanMetrics;
  proportional: PlanMetrics;
  optimized: PlanMetrics;
}

interface PlanComparisonProps {
  comparisonData?: ComparisonData;
  // true when the server could not be reached
  failed?: boolean;
}

export function PlanComparison({ comparisonData, failed = false }: PlanComparisonProps) {

  return (
    <AnimatedSection>
      {/* Left Column - Text Only */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider><h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Cultivation Plan Comparison</h3></Divider>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-2">Which cultivation plan best meets the needs?</p>
        </div>
        
        <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
           <p>This section compares four different strategies for planning the cultivation of plants needed for the production of plant-derived medicines. All plans are evaluated based on the same demand, using the same available arable land and the same storage capacity.</p>
            <p>4 approaches are examined:</p>
            <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
            <li><strong>Naïve plan:</strong> Each plant gets the land it needs to cover its yearly demand, all sown at the start of its season. If there isn't enough land for everyone, every plant gets the same percentage cut.</li>
            <li><strong>Equal allocation:</strong> The available area is divided equally among the permitted sowing months, allowing the production to be spread more evenly throughout the year.</li>
            <li><strong>Proportional allocation:</strong> The cultivation plan optimized for the previous year's demand is applied in order to assess how well it meets the current year's needs.</li>
            <li><strong>Optimized plan:</strong> The best possible cultivation plan is determined based on the current year's demand and available resources.</li>
          </ul>
        </div>
      </div>

      {/* Right Column - Chart & KPI Cards */}
      {comparisonData ? (
        <ComparisonResults comparisonData={comparisonData} />
      ) : (
        <ResultsPlaceholder failed={failed} className="lg:col-span-7" />
      )}
    </AnimatedSection>
  );
}

function ComparisonResults({ comparisonData }: { comparisonData: ComparisonData }) {
  const optCoverage = comparisonData.optimized.coverage * 100;
  const propCoverage = comparisonData.proportional.coverage * 100;
  const eqCoverage = comparisonData.equal.coverage * 100;
  const naiveCoverage = comparisonData.naive.coverage * 100;

  const unusedInventoryData = [
    { name: 'Naïve Plan', value: comparisonData.naive.unused_inventory * 100 },
    { name: 'Equal Allocation', value: comparisonData.equal.unused_inventory * 100 },
    { name: 'Proportional Allocation', value: comparisonData.proportional.unused_inventory * 100 },
    { name: 'Optimized', value: comparisonData.optimized.unused_inventory * 100 },
  ].sort((a, b) => b.value - a.value);

  return (
      <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col gap-10">
        {/* Top: KPI Cards Grid */}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Demand coverage at the end of year 3 across strategies.</p>
        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Optimized Plan - Accentuated */}
          <div className="relative flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-lg ring-1 ring-emerald-500/30 text-center transition-transform hover:scale-[1.02]">
            <ProgressCircle value={optCoverage} variant={getProgressVariant(optCoverage)} radius={40} strokeWidth={6}>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-50 font-mono tabular-nums">{optCoverage.toFixed(1)}%</span>
            </ProgressCircle>
            <p className="text-sm font-bold text-emerald-900 dark:text-emerald-50">Optimized Plan</p>
          </div>

          {[
            { title: "Naïve Plan", value: naiveCoverage },
            { title: "Proportional Allocation", value: propCoverage },
            { title: "Equal Allocation", value: eqCoverage },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center gap-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/50 shadow-sm text-center opacity-90 hover:opacity-100 transition-all duration-300">
              <ProgressCircle value={item.value} variant={getProgressVariant(item.value)} radius={40} strokeWidth={6}>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-50 font-mono tabular-nums">{item.value.toFixed(1)}%</span>
              </ProgressCircle>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.title}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Ranking of strategies based on the percentage of unused inventory at the end of year 3.</p>
          <BarList data={unusedInventoryData} valueFormatter={formatPercent} className="mt-4" />
        </div>
      </div>
  );
}

export default PlanComparison;