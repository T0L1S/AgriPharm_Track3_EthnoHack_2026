import { Divider } from '@/components/tremor/Divider';
import { BarChart } from '@/components/tremor/BarChart';

import { 
  expectedCostData, scenarioData
} from '@/data/chartData';

import { formatEuro } from '@/lib/formattingUtils';

export function Stochastic() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Stochastic Optimization</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How can we plan production when demand and crop yields are uncertain?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>In practice, both the demand for herbal medicines and crop yields may differ from their initial estimates. A plan based solely on a single forecast may consequently prove ineffective if the actual conditions turn out to be different from those anticipated.</p>
                <p>Stochastic optimization accounts for this uncertainty by considering six different possible scenarios of demand and crop yields, each associated with its probability of occurrence.</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-10 border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Comparison of the final expected annual cost across all probability scenarios, highlighting the financial benefit of the stochastic model.</p>
                <BarChart data={expectedCostData} index="plan" categories={['Expected Cost']} colors={['blue']} valueFormatter={formatEuro} yAxisWidth={75} className="h-72" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Comparing Deterministic vs. Stochastic plans under different Demand (D) and Yield (Y) multipliers.</p>
                <BarChart data={scenarioData} index="scenario" categories={['Deterministic Plan', 'Stochastic Plan']} colors={['blue', 'emerald']} valueFormatter={formatEuro} yAxisWidth={75} className="h-80" angle={-25} />
              </div>
            </div>
          </section>
  )
}

export default Stochastic;