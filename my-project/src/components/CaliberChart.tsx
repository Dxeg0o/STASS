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
  yAxisTickFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
}

export function CaliberChart({
  data,
  series,
  yAxisTickFormatter,
  tooltipValueFormatter,
}: CaliberChartProps) {
  const config = React.useMemo(() => {
    return series.reduce<ChartConfig>((acc, item) => {
      acc[item.key] = { label: item.label, color: item.color };
      return acc;
    }, {});
  }, [series]);

  const defaultFormatter = (value: number) =>
    Number(value).toLocaleString("es-CL");

  const yFormatter = yAxisTickFormatter || defaultFormatter;
  const toolFormatter = tooltipValueFormatter || defaultFormatter;

  return (
    <ChartContainer config={config} className="h-[360px] w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="perimeter"
          tickFormatter={(value) => Number(value).toFixed(1)}
          tickMargin={8}
        />
        <YAxis tickFormatter={yFormatter} tickMargin={8} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const perimeter = payload?.[0]?.payload?.perimeter;
                if (typeof perimeter === "number") {
                  return `Calibre: ${perimeter.toFixed(1)}`;
                }
                return "Calibre: —";
              }}
              formatter={(value) => toolFormatter(Number(value))}
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
