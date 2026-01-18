"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface CaliberSeries {
  key: string;
  label: string;
  color: string;
}

export interface CaliberDataPoint {
  perimeter: number;
  [key: string]: number;
}

interface CaliberChartProps {
  data: CaliberDataPoint[];
  series: CaliberSeries[];
}

export function CaliberChart({ data, series }: CaliberChartProps) {
  const config = React.useMemo(() => {
    return series.reduce<ChartConfig>((acc, item) => {
      acc[item.key] = { label: item.label, color: item.color };
      return acc;
    }, {});
  }, [series]);

  return (
    <ChartContainer config={config} className="h-[360px] w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="perimeter"
          tickFormatter={(value) => Number(value).toFixed(1)}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={(value) => Number(value).toLocaleString("es-CL")}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                `Calibre: ${Number(value).toFixed(1)}`
              }
              formatter={(value) =>
                Number(value).toLocaleString("es-CL")
              }
            />
          }
        />
        {series.map((item) => (
          <Area
            key={item.key}
            dataKey={item.key}
            type="monotone"
            stroke={`var(--color-${item.key})`}
            fill={`var(--color-${item.key})`}
            fillOpacity={series.length > 1 ? 0.25 : 0.35}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
