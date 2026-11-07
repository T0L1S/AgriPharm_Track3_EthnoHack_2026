import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { BarChart } from '@/components/tremor/BarChart';
import { formatPercent } from '@/lib/formattingUtils';

import { 
  expectedCostData, scenarioData 
} from '@/data/chartData';

export interface ExpectedCoverage {
  deterministic: number;
  stochastic: number;
  perfect_information: number;
}

export interface StochasticData {
  expected_coverage: ExpectedCoverage;
  scenarios_breakdown: any[];
}

interface StochasticProps {
  stochasticData?: StochasticData;
}

export function Stochastic({ stochasticData }: StochasticProps) {
  console.log(stochasticData);

  const dynamicExpectedData = stochasticData ? [
    { plan: 'Deterministic', 'Expected Coverage': stochasticData.expected_coverage.deterministic * 100 },
    { plan: 'Stochastic', 'Expected Coverage': stochasticData.expected_coverage.stochastic * 100 },
    { plan: 'Perfect Info', 'Expected Coverage': stochasticData.expected_coverage.perfect_information * 100 },
  ] : expectedCostData;

  let dynamicScenarioData = scenarioData;

  if (stochasticData?.scenarios_breakdown) {
    const breakdown = stochasticData.scenarios_breakdown;
    
    if (typeof breakdown === 'object' && breakdown !== null) {
      dynamicScenarioData = Object.entries(breakdown).map(([key, values]: [string, any]) => ({
        scenario: key,
        'Deterministic Plan': values.deterministic_plan_coverage * 100, 
        'Stochastic Plan': values.stochastic_plan_coverage * 100
      }));
    }
  }

  return (
    <AnimatedSection>
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
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Comparison of the final expected demand coverage across all probability scenarios, highlighting the benefit of the stochastic model.
          </p>
          <BarChart 
            data={dynamicExpectedData} 
            index="plan" 
            categories={['Expected Coverage']}
            colors={['blue']} 
            valueFormatter={formatPercent}
            yAxisWidth={80} 
            className="h-72" 
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Comparing Deterministic vs. Stochastic plans under different Demand (D) and Yield (Y) multipliers.
          </p>
          <BarChart 
            data={dynamicScenarioData} 
            index="scenario" 
            categories={['Deterministic Plan', 'Stochastic Plan']} 
            colors={['blue', 'emerald']} 
            valueFormatter={formatPercent}
            yAxisWidth={80} 
            className="h-80" 
            angle={-25} 
          />
        </div>
      </div>
    </AnimatedSection>
  );
}

export default Stochastic;