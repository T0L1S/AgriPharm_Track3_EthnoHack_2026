import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';

export interface DroughtData {
  unexpected: number;
  anticipated: number;
}

interface DroughtProps {
  droughtData?: DroughtData;
}

export function Drought({ droughtData }: DroughtProps) {
  const unexpectedVal = (droughtData?.unexpected ?? 0.758) * 100;
  const anticipatedVal = (droughtData?.anticipated ?? 0.834) * 100;
  
  const coverageDrop = Math.max(0, anticipatedVal - unexpectedVal);

  return (
    <AnimatedSection>
      {/* Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider><h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Drought Stress Test</h3></Divider>
          <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400 mt-2">How resilient is the cultivation plan to drought conditions?</p>
        </div>
        
        <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          <p>Drought is a significant and often unpredictable factor that can adversely affect crop production. This section examines how demand coverage is affected when plant yields decrease as a result of an unexpected drought event.</p>
          <p>The analysis considers two scenarios:</p>
          <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
            <li><strong>Unexpected Drought:</strong> The original cultivation plan is applied without any adjustments. This scenario assesses the resilience of the initial plan under adverse conditions.</li>
            <li><strong>Anticipated Drought:</strong> The model has prior knowledge of the reduced yields and calculates a new, optimized cultivation plan adapted to the changed conditions.</li>
          </ul>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col justify-center gap-10 shadow-xl ring-1 ring-slate-200 dark:ring-white/10">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
          Visualizing the <strong className="text-slate-900 dark:text-slate-50"><span className="font-mono tabular-nums">{coverageDrop.toFixed(1)}%</span> demand coverage drop</strong> when drought occurs unexpectedly vs when anticipated.
        </p>
        
        {/* KPI Circles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
          {/* Unexpected */}
          <div className="flex flex-col items-center gap-y-4">
            <ProgressCircle value={unexpectedVal} radius={72} strokeWidth={12} variant="error">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">{unexpectedVal.toFixed(1)}%</span>
            </ProgressCircle>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">Unexpected Drought</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Locked Plan</p>
            </div>
          </div>

          {/* Anticipated */}
          <div className="flex flex-col items-center gap-y-4">
            <ProgressCircle value={anticipatedVal} radius={72} strokeWidth={12} variant="warning">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-50 font-mono tabular-nums">{anticipatedVal.toFixed(1)}%</span>
            </ProgressCircle>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-slate-50">Anticipated Drought</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Adjusted Plan</p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}

export default Drought;