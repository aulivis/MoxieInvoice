'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CHART_PRIMARY = '#E8893A';

export type ChartViewMode = 'daily' | 'weekly' | 'monthly';

interface InvoiceActivityChartProps {
  /** ISO date strings (created_at) of all invoices for the org */
  invoiceDates: string[];
  locale: string;
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
}

/** ISO 8601 week number (1–53) for the given date */
function getISOWeekNumber(d: Date): number {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const yearStart = new Date(t.getFullYear(), 0, 1);
  return Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function aggregateByDay(
  dates: string[],
  lastDays: number,
  locale: string
): { period: string; count: number; label: string }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastDays);
  cutoff.setHours(0, 0, 0, 0);
  const map = new Map<string, number>();
  for (const iso of dates) {
    const d = new Date(iso);
    if (d < cutoff) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const result: { period: string; count: number; label: string }[] = [];
  for (let i = lastDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({
      period: key,
      count: map.get(key) ?? 0,
      label: d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    });
  }
  return result;
}

function aggregateByWeek(
  dates: string[],
  lastWeeks: number
): { period: string; count: number; weekNumber: number; year: number }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lastWeeks * 7);
  const map = new Map<string, number>();
  for (const iso of dates) {
    const d = new Date(iso);
    const weekStart = getWeekStart(d);
    if (weekStart < cutoff) continue;
    const key = weekStart.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const result: { period: string; count: number; weekNumber: number; year: number }[] = [];
  for (let i = lastWeeks - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekStart = getWeekStart(d);
    const key = weekStart.toISOString().slice(0, 10);
    result.push({
      period: key,
      count: map.get(key) ?? 0,
      weekNumber: getISOWeekNumber(weekStart),
      year: weekStart.getFullYear(),
    });
  }
  return result;
}

function aggregateByMonth(
  dates: string[],
  lastMonths: number,
  locale: string
): { period: string; count: number; label: string }[] {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - lastMonths);
  const map = new Map<string, number>();
  for (const iso of dates) {
    const d = new Date(iso);
    if (d < cutoff) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const result: { period: string; count: number; label: string }[] = [];
  for (let i = lastMonths - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({
      period: key,
      count: map.get(key) ?? 0,
      label: d.toLocaleDateString(locale, { month: 'short', year: '2-digit' }),
    });
  }
  return result;
}

export function InvoiceActivityChart({ invoiceDates, locale }: InvoiceActivityChartProps) {
  const t = useTranslations('dashboard');
  const [viewMode, setViewMode] = useState<ChartViewMode>('weekly');

  const chartData = useMemo(() => {
    if (viewMode === 'daily') return aggregateByDay(invoiceDates, 14, locale);
    if (viewMode === 'weekly') {
      const rows = aggregateByWeek(invoiceDates, 12);
      return rows.map((row) => ({
        ...row,
        label: t('chartWeekNumber', { number: row.weekNumber }),
      }));
    }
    return aggregateByMonth(invoiceDates, 12, locale);
  }, [invoiceDates, viewMode, locale, t]);

  const hasAnyInvoices = invoiceDates.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-section-title">{t('chartTitle')}</h2>
        <div className="flex rounded-lg border border-border-light p-0.5 bg-surface-50" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'daily'}
            onClick={() => setViewMode('daily')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none ${
              viewMode === 'daily'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
            }`}
          >
            {t('chartViewDaily')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'weekly'}
            onClick={() => setViewMode('weekly')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none ${
              viewMode === 'weekly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
            }`}
          >
            {t('chartViewWeekly')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'monthly'}
            onClick={() => setViewMode('monthly')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none ${
              viewMode === 'monthly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-100'
            }`}
          >
            {t('chartViewMonthly')}
          </button>
        </div>
      </div>

      {!hasAnyInvoices ? (
        <p className="text-sm text-text-tertiary py-8 text-center rounded-xl bg-surface-50 border border-border-light">
          {t('chartEmpty')}
        </p>
      ) : (
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6B6560' }}
                axisLine={{ stroke: '#E0DDD8' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6B6560' }}
                axisLine={false}
                tickLine={{ stroke: '#E0DDD8' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--ds-bg-card)',
                  border: '1px solid var(--ds-border-light)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
                labelStyle={{ color: 'var(--ds-text-secondary)', fontWeight: 600 }}
                formatter={(value) => [value ?? 0, '']}
                labelFormatter={(_, payload) => (payload?.[0]?.payload as { label?: string } | undefined)?.label ?? ''}
              />
              <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
