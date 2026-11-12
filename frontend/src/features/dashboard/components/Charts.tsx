import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { compactMoney, formatMoney, formatNumber } from '@/utils/format'

/**
 * Biểu đồ dùng chung cho Dashboard/Báo cáo (theo skill dataviz):
 * - Mỗi biểu đồ chỉ có MỘT chuỗi → một màu (primary, đã kiểm tra ≥ 3:1 trên nền trắng), tiêu đề đặt tên chuỗi, không cần chú giải.
 * - Nét mảnh: line 2px, cột mảnh bo 4px ở đầu dữ liệu; lưới ngang mờ, trục chữ màu phụ.
 * - Luôn có tooltip khi hover; chữ dùng màu chữ, không dùng màu chuỗi.
 * - Có prop `ariaLabel` tóm tắt nội dung cho trình đọc màn hình; số liệu chi tiết có bảng đi kèm ở trang Báo cáo.
 */
const SERIES = 'var(--rf-primary)'
const GRID = 'var(--rf-border)'
const AXIS_TICK = { fill: 'var(--rf-text-secondary)', fontSize: 12 }

function TooltipBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-card">
      <div className="text-xs text-text-secondary">{title}</div>
      <div className="font-semibold text-text tabular-nums">{children}</div>
    </div>
  )
}

export interface RevenuePoint {
  date: string
  amount: number
}

/** Doanh thu theo thời gian: area 2px + crosshair tooltip. groupBy MONTH → nhãn "thg 11/2026". */
export function RevenueChart({ data, groupBy = 'DAY', height = 260, ariaLabel }: { data: RevenuePoint[]; groupBy?: 'DAY' | 'MONTH'; height?: number; ariaLabel: string }) {
  const fmt = (d: string) => (groupBy === 'MONTH' ? dayjs(d).format('MM/YYYY') : dayjs(d).format('DD/MM'))
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="rf-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.18} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={fmt} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
          <YAxis tickFormatter={compactMoney} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--rf-text-muted)', strokeDasharray: '3 3' }}
            content={({ active, payload, label }: TooltipContentProps<ValueType, NameType>) =>
              active && payload?.length ? <TooltipBox title={groupBy === 'MONTH' ? `Tháng ${fmt(String(label))}` : dayjs(String(label)).format('DD/MM/YYYY')}>{formatMoney(Number(payload[0].value))}</TooltipBox> : null
            }
          />
          <Area type="monotone" dataKey="amount" name="Doanh thu" stroke={SERIES} strokeWidth={2} fill="url(#rf-revenue-fill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--rf-surface)' }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
}

/** Cột ngang (so sánh độ lớn giữa các hạng mục có tên dài, VD trạng thái, linh kiện). Nhãn giá trị ở đầu cột. */
export function HorizontalBars({ data, unit, ariaLabel, valueFormatter = formatNumber }: { data: BarDatum[]; unit: string; ariaLabel: string; valueFormatter?: (v: number) => string }) {
  const height = Math.max(120, data.length * 34 + 16)
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} domain={[0, 'dataMax']} />
          <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={150} />
          <Tooltip
            cursor={{ fill: 'var(--color-tone-neutral-bg)' }}
            content={({ active, payload }: TooltipContentProps<ValueType, NameType>) =>
              active && payload?.length ? <TooltipBox title={String(payload[0].payload.label)}>{valueFormatter(Number(payload[0].value))} {unit}</TooltipBox> : null
            }
          />
          <Bar
            dataKey="value"
            fill={SERIES}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            isAnimationActive={false}
            label={{ position: 'right', fill: 'var(--rf-text-secondary)', fontSize: 12, formatter: (v: unknown) => valueFormatter(Number(v)) }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Doanh thu dạng cột đứng (trang Báo cáo) – mỗi cột là một kỳ. */
export function RevenueBars({ data, groupBy, ariaLabel }: { data: RevenuePoint[]; groupBy: 'DAY' | 'MONTH'; ariaLabel: string }) {
  const fmt = (d: string) => (groupBy === 'MONTH' ? dayjs(d).format('MM/YYYY') : dayjs(d).format('DD/MM'))
  return (
    <div role="img" aria-label={ariaLabel} style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={fmt} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
          <YAxis tickFormatter={compactMoney} tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            cursor={{ fill: 'var(--color-tone-neutral-bg)' }}
            content={({ active, payload, label }: TooltipContentProps<ValueType, NameType>) =>
              active && payload?.length ? <TooltipBox title={groupBy === 'MONTH' ? `Tháng ${fmt(String(label))}` : dayjs(String(label)).format('DD/MM/YYYY')}>{formatMoney(Number(payload[0].value))}</TooltipBox> : null
            }
          />
          <Bar dataKey="amount" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
