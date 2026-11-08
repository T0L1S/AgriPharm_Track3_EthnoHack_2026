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

  const cardStyle = "bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl ring-1 ring-slate-200 dark:ring-white/10";

  return (
    <AnimatedSection>
      {/* Left Column: Text + Expected Coverage Chart */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider>
            <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Stochastic Optimization
            </h3>
          </Divider>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-2">
            How can we plan production when demand and crop yields are uncertain?
          </p>
        </div>
        
        <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            In practice, both the demand for plant-derived medicines and crop yields may differ from their initial estimates. A plan based solely on a single forecast may consequently prove ineffective if the actual conditions turn out to be different from those anticipated.
          </p>
          <p>
            Stochastic optimization accounts for this uncertainty by considering six different possible scenarios of demand and crop yields, each associated with its probability of occurrence.
          </p>
        </div>

        <div className="p-3">
          <div className={`${cardStyle}`}>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
              Comparison of the final expected demand coverage across all probability scenarios.
            </p>
            <BarChart 
              data={dynamicExpectedData} 
              index="plan" 
              categories={['Expected Coverage']}
              colors={['blue']} 
              valueFormatter={formatPercent}
              yAxisWidth={80} 
              className="h-60" 
            />
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col justify-center h-full p-3">
        <div className={`flex flex-col justify-center h-full ${cardStyle}`}>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 text-center">
            Comparing Deterministic vs. Stochastic plans under different Demand (D) and Yield (Y) multipliers.
          </p>
          <BarChart 
            data={dynamicScenarioData} 
            index="scenario" 
            categories={['Deterministic Plan', 'Stochastic Plan']} 
            colors={['blue', 'emerald']} 
            valueFormatter={formatPercent}
            yAxisWidth={80} 
            className="h-96" 
            angle={-25} 
          />
        </div>
      </div>
    </AnimatedSection>
  );
}

export default Stochastic;