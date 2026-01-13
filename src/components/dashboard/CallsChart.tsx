import { HourlyStat } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CallsChartProps {
  data: HourlyStat[];
}

export function CallsChart({ data }: CallsChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" className="[stop-color:hsl(var(--chart-primary))]" stopOpacity={0.3} />
              <stop offset="95%" className="[stop-color:hsl(var(--chart-primary))]" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAnswered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" className="[stop-color:hsl(var(--chart-positive))]" stopOpacity={0.3} />
              <stop offset="95%" className="[stop-color:hsl(var(--chart-positive))]" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" className="[stop-color:hsl(var(--chart-negative))]" stopOpacity={0.3} />
              <stop offset="95%" className="[stop-color:hsl(var(--chart-negative))]" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            className="stroke-chart-grid"
            vertical={false} 
          />
          <XAxis
            dataKey="hour"
            axisLine={false}
            tickLine={false}
            className="fill-chart-text text-[11px]"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            className="fill-chart-text text-[11px]"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: 'var(--shadow-elevated)',
            }}
            labelStyle={{ 
              color: 'hsl(var(--foreground))', 
              fontWeight: 600, 
              marginBottom: 4 
            }}
            itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            formatter={(value) => (
              <span className="text-muted-foreground text-xs">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="calls"
            name="Total"
            className="stroke-chart-primary"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCalls)"
          />
          <Area
            type="monotone"
            dataKey="answered"
            name="Atendidas"
            className="stroke-chart-positive"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAnswered)"
          />
          <Area
            type="monotone"
            dataKey="abandoned"
            name="Abandonadas"
            className="stroke-chart-negative"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAbandoned)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
