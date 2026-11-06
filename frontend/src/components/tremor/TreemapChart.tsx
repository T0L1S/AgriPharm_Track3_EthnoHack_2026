// Tremor TreemapChart [v1.0.0]
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client"

import React from "react"
import {
  ResponsiveContainer,
  Tooltip,
  Treemap as RechartsTreemap,
} from "recharts"

import {
  AvailableChartColors,
  getColorClassName,
  type AvailableChartColorsKeys,
} from "@/lib/chartUtils"
import { cx } from "@/lib/utils"

//#region Tooltip

interface TreemapTooltipProps {
  active?: boolean;
  payload?: any[];
  valueFormatter: (value: number) => string;
  categoryColors: Map<string, AvailableChartColorsKeys>; // Προσθήκη του Map
}

const TreemapTooltip = ({
  active,
  payload,
  valueFormatter,
  categoryColors,
}: TreemapTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  // Βρίσκουμε το χρώμα με βάση το όνομα (π.χ. "Smartphones")
  const color = categoryColors.get(data.name) || "gray";

  return (
    <div className="rounded-md border border-gray-200 bg-white text-sm shadow-md dark:border-gray-800 dark:bg-gray-950">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between space-x-8">
          <div className="flex items-center space-x-2">
            {/* Η έγχρωμη κουκκίδα που έλειπε */}
            <span
              className={cx(
                "size-2 shrink-0 rounded-xs",
                getColorClassName(color, "bg")
              )}
              aria-hidden="true"
            />
            <p className="font-medium text-gray-700 dark:text-gray-300">
              {data.name}
            </p>
          </div>
          <p className="text-right font-medium tabular-nums text-gray-900 dark:text-gray-50">
            {valueFormatter(data.value)}
          </p>
        </div>
      </div>
    </div>
  );
};

//#region Shape / Content

const CustomizedContent = (props: any) => {
  const {
    x, y, width, height, name,
    categoryColors, // Λαμβάνουμε το Map
    onValueChange, activeNode
  } = props;

  // Βρίσκουμε το χρώμα για το συγκεκριμένο node
  const color = categoryColors.get(name) || "slate";
  
  const isActive = activeNode && activeNode.name === name;
  const hasActiveNode = !!activeNode;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        className={cx(
          "stroke-white stroke-[3px] dark:stroke-gray-950 transition-all duration-200",
          getColorClassName(color, "fill"), // Εφαρμογή του χρώματος γεμίσματος
          onValueChange ? "cursor-pointer" : "",
          !hasActiveNode && "hover:brightness-110 dark:hover:brightness-125",
          hasActiveNode && !isActive ? "opacity-40" : "opacity-100"
        )}
        // ... onClick κλπ
        onClick={(e) => {
          e.stopPropagation()
          if (onValueChange) {
            onValueChange(props.payload)
          }
        }}
      />
      {width > 50 && height > 30 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className={cx(
            "pointer-events-none truncate text-xs font-medium",
            "fill-white dark:fill-gray-50",
            hasActiveNode && !isActive ? "opacity-30" : "opacity-100"
          )}
        >
          {name}
        </text>
      )}
    </g>
  )
}

//#region TreemapChart

interface TreemapChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: any[]
  category?: string
  index?: string
  colors?: AvailableChartColorsKeys[]
  valueFormatter?: (value: number) => string
  showTooltip?: boolean
  onValueChange?: (value: any | null) => void
  customTooltip?: React.ComponentType<TreemapTooltipProps>
}

const TreemapChart = React.forwardRef<HTMLDivElement, TreemapChartProps>(
  (props, forwardedRef) => {
    const {
      data = [],
      category = "value",
      index = "name",
      colors = AvailableChartColors,
      valueFormatter = (value: number) => value.toString(),
      showTooltip = true,
      className,
      onValueChange,
      customTooltip,
      ...other
    } = props

    const categoryColors = React.useMemo(() => {
      const map = new Map<string, AvailableChartColorsKeys>();
      data.forEach((item, i) => {
        map.set(item[index], colors[i % colors.length] as AvailableChartColorsKeys);
      });
      return map;
    }, [data, index, colors]);

    const [activeNode, setActiveNode] = React.useState<any | undefined>(
      undefined,
    )
    const hasOnValueChange = !!onValueChange

    const handleNodeClick = (payload: any) => {
      if (!hasOnValueChange) return
      if (activeNode && activeNode.name === payload.name) {
        setActiveNode(undefined)
        onValueChange?.(null)
      } else {
        setActiveNode(payload)
        onValueChange?.(payload)
      }
    }

    return (
      <div
        ref={forwardedRef}
        className={cx("h-80 w-full", className)}
        tremor-id="tremor-raw"
        {...other}
      >
        <ResponsiveContainer>
            <RechartsTreemap
            data={data}
            dataKey={category}
            nameKey={index}
            isAnimationActive={false}
            // ...
            content={(contentProps: any) => (
                <CustomizedContent
                {...contentProps}
                categoryColors={categoryColors}
                activeNode={activeNode}
                onValueChange={hasOnValueChange ? handleNodeClick : undefined}
                />
            )}
            >
            <Tooltip
                // ...
                content={({ active, payload }) => {
                if (!showTooltip) return null;
                return (
                    <TreemapTooltip
                    active={active}
                    payload={payload as any}
                    valueFormatter={valueFormatter}
                    categoryColors={categoryColors}
                    />
                );
                }}
            />
            </RechartsTreemap>
        </ResponsiveContainer>
      </div>
    )
  },
)

TreemapChart.displayName = "TreemapChart"

export { TreemapChart }