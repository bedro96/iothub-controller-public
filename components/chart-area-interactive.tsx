"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TelemetryRecord = {
  id: string
  temp: number | null
  humidity: number | null
  ts: string | null
  createdAt: string
}

const chartConfig = {
  temperature: {
    label: "Temperature (C)",
    theme: {
      light: "hsl(12 76% 61%)",
      dark: "hsl(12 90% 70%)",
    },
  },
  humidity: {
    label: "Humidity (%)",
    theme: {
      light: "hsl(173 58% 39%)",
      dark: "hsl(173 80% 60%)",
    },
  },
} satisfies ChartConfig

export function ChartAreaInteractive({
  telemetry,
}: {
  telemetry: TelemetryRecord[]
}) {
  const [timeRange, setTimeRange] = React.useState("60m")

  const chartData = React.useMemo(() => {
    return telemetry
      .map((record) => ({
        date: record.ts ?? record.createdAt,
        temperature: record.temp ?? 0,
        humidity: record.humidity ?? 0,
      }))
      .filter((item) => item.date)
      .sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
  }, [telemetry])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date()
    let minutesToSubtract = 60

    if (timeRange === "5m") {
      minutesToSubtract = 5
    } else if (timeRange === "15m") {
      minutesToSubtract = 15
    } else if (timeRange === "24h") {
      minutesToSubtract = 24 * 60
    } else if (timeRange === "7d") {
      minutesToSubtract = 7 * 24 * 60
    }

    const startDate = new Date(
      referenceDate.getTime() - minutesToSubtract * 60000
    )
    return date >= startDate
  })

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Device Connectivity Overview</CardTitle>
          <CardDescription>
            Recent device temperature and humidity readings
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a time range"
          >
            <SelectValue placeholder="Last 60 minutes" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="15m" className="rounded-lg">
              Last 15 minutes
            </SelectItem>
            <SelectItem value="60m" className="rounded-lg">
              Last 60 minutes
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
            <SelectItem value="24h" className="rounded-lg">
              Last 24 hours
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-temperature)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-temperature)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillHumidity" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-humidity)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-humidity)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="humidity"
              type="natural"
              fill="url(#fillHumidity)"
              stroke="var(--color-humidity)"
              stackId="a"
            />
            <Area
              dataKey="temperature"
              type="natural"
              fill="url(#fillTemperature)"
              stroke="var(--color-temperature)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
