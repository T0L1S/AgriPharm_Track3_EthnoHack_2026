import { Divider } from '@/components/tremor/Divider';
import { Card } from '@/components/tremor/Card';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';

export function Drought() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Drought Stress Test</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How resilient is the cultivation plan to drought conditions?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>Drought is a significant and often unpredictable factor that can adversely affect crop production. This section examines how demand coverage is affected when plant yields decrease as a result of an unexpected drought event.</p>
                <p>The analysis considers two scenarios:</p>
                <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
                  <li><strong className="text-gray-900 dark:text-gray-100">Unexpected Drought:</strong> The original cultivation plan is applied without any adjustments. This scenario assesses the resilience of the initial plan under adverse conditions.</li>
                  <li><strong className="text-gray-900 dark:text-gray-100">Anticipated Drought:</strong> The model has prior knowledge of the reduced yields and calculates a new, optimized cultivation plan adapted to the changed conditions.</li>
                </ul>
              </div>
            </div>

            {/* Right Column (2x2 Grid integration) */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center gap-10 border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
                Visualizing the <strong className="text-gray-900 dark:text-gray-50"><span className="font-mono tabular-nums">7.6%</span> demand coverage drop</strong> when drought occurs unexpectedly versus when it is anticipated.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                {/* Unexpected Scenario Column */}
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col items-center gap-y-4">
                    <ProgressCircle value={75.8} radius={72} strokeWidth={12} variant="error">
                      <span className="text-3xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">75.8%</span>
                    </ProgressCircle>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">Unexpected Drought</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Locked Plan</p>
                    </div>
                  </div>
                  
                  <Card className="p-6 border-l-4 border-l-amber-500 dark:border-l-amber-500/70 shadow-sm flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Demand Coverage Drop</p>
                    <div className="mt-2 flex items-baseline gap-x-2">
                      <span className="text-3xl font-bold text-amber-600 dark:text-amber-500 font-mono tabular-nums">75.8%</span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">fulfilled</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Coverage falls significantly behind the <strong className="text-gray-900 dark:text-gray-50 font-mono tabular-nums">83.4%</strong> target that an adjusted, anticipated plan would achieve.
                    </p>
                  </Card>
                </div>

                {/* Anticipated Scenario Column */}
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col items-center gap-y-4">
                    <ProgressCircle value={83.4} radius={72} strokeWidth={12} variant="warning">
                      <span className="text-3xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">83.4%</span>
                    </ProgressCircle>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">Anticipated Drought</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Adjusted Plan</p>
                    </div>
                  </div>

                  <Card className="p-6 border-l-4 border-l-red-500 dark:border-l-red-500/70 shadow-sm flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unexpected Drought Cost Penalty</p>
                    <div className="mt-2 flex items-baseline gap-x-2">
                      <span className="text-3xl font-bold text-red-600 dark:text-red-500 font-mono tabular-nums">+38%</span>
                      <span className="text-sm text-gray-500">extra cost</span>
                    </div>
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Cost spikes to <strong className="text-gray-900 dark:text-gray-50 font-mono tabular-nums">30,944€</strong> with a locked plan, compared to <span className="font-mono tabular-nums">22,350€</span> if the drought was known in advance.
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </section>
  )
}

export default Drought;