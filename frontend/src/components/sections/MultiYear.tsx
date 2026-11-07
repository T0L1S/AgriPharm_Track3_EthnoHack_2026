import { AnimatedSection } from '@/components/AnimatedSection';
import { Divider } from '@/components/tremor/Divider';
import { ProgressCircle } from '@/components/tremor/ProgressCircle';

export function MultiYear() {
  return (
    <AnimatedSection>
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div>
                <Divider><h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">Multi-Year Production Planning</h3></Divider>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">How can production be planned over a multi-year horizon?</p>
              </div>
              
              <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <p>This section extends the simulation horizon to three years, accounting for the carry-over of production from one year to the next.</p>
                <p>Namely at the end of each year, the model keeps track of:</p>
                <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
                  <li>The remaining stock of harvested plants that have not yet been used.</li>
                  <li>The crops that remain in the field and will continue growing into the following year.</li>
                </ul>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center min-h-[350px] border-slate-800/80 bg-slate-900/40 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-10 text-center">
                Visualizing the severe drop in demand coverage when the system starts with zero initial inventory compared to standard operational levels.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-12 sm:gap-24">
                <div className="flex flex-col items-center gap-y-4">
                  <ProgressCircle value={38.6} radius={64} strokeWidth={12} variant="error">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">38.6%</span>
                  </ProgressCircle>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Cold Start</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">0 kg Initial Stock</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-y-4">
                  <ProgressCircle value={99.9} radius={64} strokeWidth={12} variant="success">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-mono tabular-nums">99.9%</span>
                  </ProgressCircle>
                  <div className="text-center">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-50">Steady State</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">4,170 kg Initial Stock</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
  )
}

export default MultiYear;