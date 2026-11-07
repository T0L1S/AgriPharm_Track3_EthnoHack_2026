import { useState } from "react";
import { AnimatedSection } from '@/components/AnimatedSection';
import { Card } from "@/components/tremor/Card";
import { Badge } from "@/components/tremor/Badge";
import { Divider } from "@/components/tremor/Divider";
import { LineChart } from "@/components/tremor/LineChart";
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/tremor/Select";

// Αφαίρεση του A04AD01 (και του L01CB01 που είχε αφαιρεθεί προηγουμένως) από τα δεδομένα
const forecastData = [
  { "Month": "Aug 2026", "M04AC01": 107895.96, "C01AA05": 40410.7, "S01EB01": 7397.51, "S01FA01": 15239.65, "P01BF01": 134.78, "L01CA04": 5213.39 },
  { "Month": "Sep 2026", "M04AC01": 105381.92, "C01AA05": 45275.58, "S01EB01": 10757.33, "S01FA01": 18453.54, "P01BF01": 175.61, "L01CA04": 5505.34 },
  { "Month": "Oct 2026", "M04AC01": 116990.41, "C01AA05": 45307.45, "S01EB01": 10480.61, "S01FA01": 20173.58, "P01BF01": 145.03, "L01CA04": 5480.51 },
  { "Month": "Nov 2026", "M04AC01": 104776.84, "C01AA05": 38876.32, "S01EB01": 9781.06, "S01FA01": 17638.66, "P01BF01": 112.46, "L01CA04": 5062.7 },
  { "Month": "Dec 2026", "M04AC01": 119673.62, "C01AA05": 46205.19, "S01EB01": 10490.27, "S01FA01": 18117.38, "P01BF01": 102.46, "L01CA04": 5484.82 },
  { "Month": "Jan 2027", "M04AC01": 118519.9, "C01AA05": 41140.07, "S01EB01": 10212.76, "S01FA01": 18609.12, "P01BF01": 108.36, "L01CA04": 5064.19 },
  { "Month": "Feb 2027", "M04AC01": 116002.31, "C01AA05": 38817.94, "S01EB01": 9955.64, "S01FA01": 18373.0, "P01BF01": 78.17, "L01CA04": 4742.87 },
  { "Month": "Mar 2027", "M04AC01": 132676.82, "C01AA05": 44145.81, "S01EB01": 11459.2, "S01FA01": 19406.89, "P01BF01": 49.58, "L01CA04": 5462.22 },
  { "Month": "Apr 2027", "M04AC01": 125143.26, "C01AA05": 40695.68, "S01EB01": 9365.68, "S01FA01": 18000.5, "P01BF01": 59.28, "L01CA04": 5357.97 },
  { "Month": "May 2027", "M04AC01": 123512.79, "C01AA05": 37835.56, "S01EB01": 9603.94, "S01FA01": 17126.48, "P01BF01": 31.59, "L01CA04": 5358.11 },
  { "Month": "Jun 2027", "M04AC01": 143041.82, "C01AA05": 43672.43, "S01EB01": 10811.21, "S01FA01": 18673.31, "P01BF01": 55.35, "L01CA04": 5284.39 },
  { "Month": "Jul 2027", "M04AC01": 150118.75, "C01AA05": 42119.3, "S01EB01": 9035.18, "S01FA01": 17663.38, "P01BF01": 84.32, "L01CA04": 5581.69 }
];

// Αφαίρεση του A04AD01 από το mapping για να μην εμφανίζεται στο dropdown
const atcMapping: Record<string, { name: string; species: string }> = {
  'M04AC01': { name: 'Colchicine', species: 'Gloriosa superba' },
  'C01AA05': { name: 'Digoxin', species: 'Digitalis lanata' },
  'S01EB01': { name: 'Pilocarpine', species: 'Pilocarpus microphyllus' },
  'S01FA01': { name: 'Atropine', species: 'Atropa belladonna' },
  'P01BF01': { name: 'Artemether', species: 'Artemisia annua' },
  'L01CA04': { name: 'Vinorelbine', species: 'Catharanthus roseus' }
};

const atcCodes = Object.keys(atcMapping);

export function MLForecast() {
  const [selectedATC, setSelectedATC] = useState<string>("M04AC01");

  const totalM04 = Math.round(
    forecastData.reduce((acc, curr) => acc + curr["M04AC01"], 0),
  );
  const totalC01 = Math.round(
    forecastData.reduce((acc, curr) => acc + curr["C01AA05"], 0),
  );

  return (
    <AnimatedSection>
      {/* Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div>
          <Divider>
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              AI Demand Forecasting
            </h3>
          </Divider>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-2">
            How do we accurately project pharmaceutical needs?
          </p>
        </div>

        <div className="space-y-4 text-base leading-relaxed text-gray-600 dark:text-gray-400">
          <p>
            Accurate demand modeling is critical for realistic simulations. This
            section highlights our Machine Learning approach to projecting the
            exact volume of Active Pharmaceutical Ingredients (APIs) required
            over the next 12 months.
          </p>
          <p>The prediction pipeline utilizes:</p>
          <ul className="list-disc list-outside pl-6 space-y-2 marker:text-gray-400">
            <li>
              <strong className="text-gray-900 dark:text-gray-100">
                Ameli Dataset:
              </strong>{" "}
              Analyzed 14 years of historical pharmaceutical dispensation
              records (Jan 2012 - Jul 2026).
            </li>
            <li>
              <strong className="text-gray-900 dark:text-gray-100">
                SARIMA Algorithm:
              </strong>{" "}
              Implemented a Seasonal Autoregressive Integrated Moving Average
              model to capture long-term trends and seasonal variations in API
              demand.
            </li>
          </ul>

          <div className="flex gap-2 mt-6 flex-wrap">
            <Badge>SARIMA Model</Badge>
            <Badge variant="success">14yr Historical Data</Badge>
            <Badge variant="success">12mo Projection</Badge>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-7 bg-white/40 dark:bg-gray-900/30 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-center gap-10 border-slate-800/80 bg-slate-900/40 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
          Visualizing the{" "}
          <strong className="text-gray-900 dark:text-gray-50">
            projected trajectory
          </strong>{" "}
          for top ATC5 codes between Aug 2026 - Jul 2027.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Top API Card */}
          <Card className="p-6 border-l-4 border-l-blue-500 dark:border-l-blue-500/70 shadow-sm flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Highest Demand ({atcMapping['M04AC01'].name})
            </p>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-3xl font-bold text-blue-600 dark:text-blue-500 font-mono tabular-nums">
                {(totalM04 / 1000000).toFixed(2)}M
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                boxes/yr
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Total projected annual volume for the leading pharmaceutical
              ingredient.
            </p>
          </Card>

          {/* 2nd Top API Card */}
          <Card className="p-6 border-l-4 border-l-emerald-500 dark:border-l-emerald-500/70 shadow-sm flex-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              2nd Highest ({atcMapping['C01AA05'].name})
            </p>
            <div className="mt-2 flex items-baseline gap-x-2">
              <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-500 font-mono tabular-nums">
                {(totalC01 / 1000).toFixed(0)}k
              </span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                boxes/yr
              </span>
            </div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Total projected annual volume for the secondary high-demand
              ingredient.
            </p>
          </Card>
        </div>

        {/* Interactive Chart Section */}
        <div className="mt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Demand Curve
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select an API to view its forecast.
              </p>
            </div>
            <div className="w-full sm:w-auto sm:max-w-xs"> 
              <Select value={selectedATC} onValueChange={setSelectedATC}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an API" /> 
                </SelectTrigger>
                <SelectContent>
                  {atcCodes.map((code) => {
                    const info = atcMapping[code];
                    return (
                      <SelectItem key={code} value={code}>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{info.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            {info.species} ({code})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <LineChart
            className="h-72"
            data={forecastData}
            index="Month"
            categories={[selectedATC]}
            colors={["blue"]}
            valueFormatter={(number: number) =>
              `${Intl.NumberFormat("en-US").format(number).toString()}`
            }
            yAxisWidth={80}
          />
        </div>
      </div>
    </AnimatedSection>
  );
}

export default MLForecast;