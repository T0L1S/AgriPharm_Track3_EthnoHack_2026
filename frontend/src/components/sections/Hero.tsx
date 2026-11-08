import { Badge } from '@/components/tremor/Badge';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16 text-center max-w-4xl mx-auto px-4">
      <div 
        aria-hidden="true" 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" 
      />

      <div className="inline-flex items-center gap-2 mb-6">
        <Badge variant="success" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full">
          EthnoHack 2026 - Track 3
        </Badge>
      </div>

      <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
        From <span className="lora-font italic font-normal text-emerald-600 dark:text-emerald-400">Field</span> to Pharmacy: <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
            Optimized Land Allocation for Plant-Derived Medicines
        </span>
      </h1>

      <p className="mt-8 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
        If demand for plant-derived medicines rises next year, how should we adapt today?
      </p>
      <p className="mt-8 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
        Plants take time to grow, land is limited, and medicine quantities must first be translated into plant material. AgriPharm orchestrates this entire supply chain using stochastic optimization to reliably meet pharmaceutical demand
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> 
          95.1% Peak Demand Coverage
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> 
          14-Year Medic'AM Dataset
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> 
          Drought-Tested Resilience
        </span>
      </div>
    </section>
  );
}