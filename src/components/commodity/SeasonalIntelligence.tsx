/**
 * SeasonalIntelligence — Seasonal calendar and supply effects
 *
 * Stage 7 of commodity intelligence transformation.
 * Shows seasonal phases, timing, and supply/price effects.
 */

import { Calendar, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import type { SeasonalPhase } from '@/lib/intelligence/quality-queries';

interface SeasonalIntelligenceProps {
  phases: SeasonalPhase[];
  commodityName: string;
}

export function SeasonalIntelligence({
  phases,
  commodityName,
}: SeasonalIntelligenceProps) {
  const hasPhases = phases.length > 0;

  if (!hasPhases) {
    return (
      <section aria-label="Seasonal Intelligence">
        <div className="terminal-panel p-6">
          <div className="flex items-start gap-4">
            <Calendar className="mt-0.5 size-6 shrink-0 text-terminal-text-muted" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-terminal-text">Seasonal Intelligence</h3>
              <p className="mt-2 text-sm leading-relaxed text-terminal-text-secondary">
                Seasonal patterns for {commodityName} require 12+ months of comparable price data to
                identify. This section will display the agricultural calendar and its effects on
                supply and price once sufficient observation history is available.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Group phases by state (or "National" if stateId is null)
  const phasesByState = new Map<string, SeasonalPhase[]>();
  for (const phase of phases) {
    const stateKey = phase.stateName ?? 'National';
    if (!phasesByState.has(stateKey)) {
      phasesByState.set(stateKey, []);
    }
    phasesByState.get(stateKey)!.push(phase);
  }

  return (
    <section aria-label="Seasonal Intelligence" className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-terminal-text">Seasonal Intelligence</h2>
        <p className="mt-1 text-xs text-terminal-text-muted">
          Agricultural calendar and supply effects by region
        </p>
      </div>

      {/* Seasonal Calendar by State */}
      <div className="space-y-6">
        {Array.from(phasesByState.entries()).map(([stateName, statePhases]) => (
          <SeasonalCalendarCard
            key={stateName}
            stateName={stateName}
            phases={statePhases}
            commodityName={commodityName}
          />
        ))}
      </div>

      {/* Data Provenance */}
      <div className="terminal-panel p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-terminal-text-muted" />
          <div className="flex-1">
            <p className="text-xs leading-relaxed text-terminal-text-secondary">
              <span className="font-medium text-terminal-text">Data sources: </span>
              {getUniqueSources(phases).join(', ') || 'Regional agricultural calendars'}
            </p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
              Seasonal phases are based on official, commercial, or indicative sources. Timing may
              vary by location and year. Supply and price effects describe typical patterns, not
              forecasts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Seasonal Calendar Card ────────────────────────────────────────────────── */

function SeasonalCalendarCard({
  stateName,
  phases,
  commodityName,
}: {
  stateName: string;
  phases: SeasonalPhase[];
  commodityName: string;
}) {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-harvest-400" />
          <h3 className="text-sm font-semibold text-terminal-text">{stateName}</h3>
        </div>
        <span className="text-xs text-terminal-text-muted">
          {phases.length} phase{phases.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Visual Calendar */}
      <div className="mb-6 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Month Headers */}
          <div className="mb-2 grid grid-cols-12 gap-1" role="row">
            {monthNames.map((month) => (
              <div
                key={month}
                className="text-center text-[0.625rem] font-medium text-terminal-text-muted"
                role="columnheader"
                aria-label={`${month} column`}
              >
                {month}
              </div>
            ))}
          </div>

          {/* Phase Bars */}
          <div className="space-y-1">
            {phases.map((phase) => (
              <div key={phase.id} className="grid grid-cols-12 gap-1">
                {Array.from({ length: 12 }, (_, idx) => {
                  const month = idx + 1;
                  const isInPhase = isMonthInPhase(month, phase.startMonth, phase.endMonth);

                  return (
                    <div
                      key={month}
                      className={`h-6 rounded ${
                        isInPhase ? getPhaseColor(phase.phase) : 'bg-terminal-surface/30'
                      }`}
                      title={
                        isInPhase
                          ? `${phase.phase.replace(/_/g, ' ')} — Month ${month}`
                          : undefined
                      }
                      aria-label={
                        isInPhase
                          ? `${monthNames[month - 1]}: ${phase.phase.replace(/_/g, ' ')}`
                          : `${monthNames[month - 1]}: No activity`
                      }
                      role="gridcell"
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {Array.from(new Set(phases.map((p) => p.phase))).map((phase) => (
              <div key={phase} className="flex items-center gap-1.5">
                <div className={`size-3 rounded ${getPhaseColor(phase)}`} />
                <span className="text-[0.625rem] text-terminal-text-secondary">
                  {formatPhaseName(phase)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase Details */}
      <div className="space-y-3">
        {phases.map((phase) => (
          <PhaseDetail key={phase.id} phase={phase} />
        ))}
      </div>
    </div>
  );
}

/* ── Phase Detail ──────────────────────────────────────────────────────────── */

function PhaseDetail({ phase }: { phase: SeasonalPhase }) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const startMonthName = monthNames[phase.startMonth - 1];
  const endMonthName = monthNames[phase.endMonth - 1];

  const supplyIcon = phase.supplyEffect ? getSupplyIcon(phase.supplyEffect) : null;
  const priceIcon = phase.priceEffect ? getPriceIcon(phase.priceEffect) : null;

  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-terminal-text">
              {formatPhaseName(phase.phase)}
            </span>
            <span className="text-xs text-terminal-text-muted">
              {startMonthName} — {endMonthName}
            </span>
          </div>

          {phase.supplyEffect && (
            <div className="mt-2 flex items-start gap-1.5">
              {supplyIcon}
              <p className="text-xs text-terminal-text-secondary">
                <span className="font-medium text-terminal-text">Supply: </span>
                {phase.supplyEffect}
              </p>
            </div>
          )}

          {phase.priceEffect && (
            <div className="mt-1.5 flex items-start gap-1.5">
              {priceIcon}
              <p className="text-xs text-terminal-text-secondary">
                <span className="font-medium text-terminal-text">Price: </span>
                {phase.priceEffect}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <span
            className={`rounded-full border px-2 py-0.5 text-[0.625rem] font-medium ${getBasisColor(phase.basis)}`}
          >
            {formatBasis(phase.basis)}
          </span>
          {phase.sourceName && (
            <p className="mt-1 text-[0.625rem] text-terminal-text-muted">{phase.sourceName}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function isMonthInPhase(month: number, startMonth: number, endMonth: number): boolean {
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }
  // Wraps around year end (e.g., Dec to Feb)
  return month >= startMonth || month <= endMonth;
}

function getPhaseColor(phase: SeasonalPhase['phase']): string {
  const colors: Record<SeasonalPhase['phase'], string> = {
    land_preparation: 'bg-amber-400/60',
    planting: 'bg-blue-400/60',
    growing: 'bg-green-400/60',
    harvest: 'bg-success-500/60',
    post_harvest: 'bg-harvest-400/60',
    lean_season: 'bg-error-500/60',
    off_season: 'bg-terminal-text-muted/30',
  };
  return colors[phase];
}

function formatPhaseName(phase: string): string {
  return phase
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatBasis(basis: SeasonalPhase['basis']): string {
  return basis.charAt(0).toUpperCase() + basis.slice(1);
}

function getBasisColor(basis: SeasonalPhase['basis']): string {
  const colors: Record<SeasonalPhase['basis'], string> = {
    official: 'bg-success-500/10 text-success-500 border-success-500/20',
    commercial: 'bg-harvest-400/10 text-harvest-400 border-harvest-400/20',
    indicative: 'bg-warning-500/10 text-warning-500 border-warning-500/20',
  };
  return colors[basis];
}

function getSupplyIcon(effect: string): React.ReactNode {
  const lower = effect.toLowerCase();
  if (lower.includes('increase') || lower.includes('rise') || lower.includes('high')) {
    return <TrendingUp className="mt-0.5 size-3 shrink-0 text-success-500" />;
  }
  if (lower.includes('decrease') || lower.includes('fall') || lower.includes('low')) {
    return <TrendingDown className="mt-0.5 size-3 shrink-0 text-error-500" />;
  }
  return <Minus className="mt-0.5 size-3 shrink-0 text-warning-500" />;
}

function getPriceIcon(effect: string): React.ReactNode {
  const lower = effect.toLowerCase();
  if (lower.includes('increase') || lower.includes('rise') || lower.includes('high')) {
    return <TrendingUp className="mt-0.5 size-3 shrink-0 text-error-500" />;
  }
  if (lower.includes('decrease') || lower.includes('fall') || lower.includes('low')) {
    return <TrendingDown className="mt-0.5 size-3 shrink-0 text-success-500" />;
  }
  return <Minus className="mt-0.5 size-3 shrink-0 text-warning-500" />;
}

function getUniqueSources(phases: SeasonalPhase[]): string[] {
  const sources = new Set<string>();
  for (const phase of phases) {
    if (phase.sourceName) {
      sources.add(phase.sourceName);
    }
  }
  return Array.from(sources);
}
