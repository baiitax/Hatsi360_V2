/**
 * GradeIntelligence — Grade specifications and quality parameters
 *
 * Stage 7 of commodity intelligence transformation.
 * Shows grades observed in price data and their quality specifications.
 */

import { Award, AlertCircle, ExternalLink } from 'lucide-react';
import type { CommodityGrade, GradeSpecification } from '@/lib/intelligence/quality-queries';

interface GradeIntelligenceProps {
  grades: CommodityGrade[];
  specifications: GradeSpecification[];
  commodityName: string;
}

export function GradeIntelligence({
  grades,
  specifications,
  commodityName,
}: GradeIntelligenceProps) {
  const hasGrades = grades.length > 0;
  const hasSpecifications = specifications.length > 0;

  if (!hasGrades && !hasSpecifications) {
    return (
      <section aria-label="Grade & Quality Intelligence">
        <div className="terminal-panel p-6">
          <div className="flex items-start gap-4">
            <Award className="mt-0.5 size-6 shrink-0 text-terminal-text-muted" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-terminal-text">
                Grade & Quality Intelligence
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-terminal-text-secondary">
                Quality specifications and grade definitions for {commodityName} will appear here as
                they are documented. This section shows the grades observed in price data and their
                quality parameters when available.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Group specifications by grade
  const specsByGrade = new Map<number | null, GradeSpecification[]>();
  for (const spec of specifications) {
    const gradeId = spec.gradeId;
    if (!specsByGrade.has(gradeId)) {
      specsByGrade.set(gradeId, []);
    }
    specsByGrade.get(gradeId)!.push(spec);
  }

  return (
    <section aria-label="Grade & Quality Intelligence" className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-lg font-semibold text-terminal-text">
          Grade & Quality Intelligence
        </h2>
        <p className="mt-1 text-xs text-terminal-text-muted">
          Grades observed in price data and quality specifications
        </p>
      </div>

      {/* Grades Observed */}
      {hasGrades && (
        <GradesObservedCard grades={grades} commodityName={commodityName} />
      )}

      {/* Quality Specifications */}
      {hasSpecifications && (
        <QualitySpecificationsCard
          specifications={specifications}
          specsByGrade={specsByGrade}
          commodityName={commodityName}
        />
      )}
    </section>
  );
}

/* ── Grades Observed Card ──────────────────────────────────────────────────── */

function GradesObservedCard({
  grades,
  commodityName,
}: {
  grades: CommodityGrade[];
  commodityName: string;
}) {
  // Sort by observation count (descending)
  const sorted = [...grades].sort((a, b) => b.observationCount - a.observationCount);
  const totalObservations = sorted.reduce((sum, g) => sum + g.observationCount, 0);

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-harvest-400" />
          <h3 className="text-sm font-semibold text-terminal-text">Grades Observed</h3>
        </div>
        <span className="text-xs text-terminal-text-muted">
          {sorted.length} grade{sorted.length === 1 ? '' : 's'} · {totalObservations} observations
        </span>
      </div>

      <div className="space-y-3">
        {sorted.map((grade) => {
          const percentage =
            totalObservations > 0 ? (grade.observationCount / totalObservations) * 100 : 0;

          return (
            <div key={grade.id} className="group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-terminal-text">{grade.name}</span>
                  <span className="text-terminal-text-muted">
                    {grade.marketCount} market{grade.marketCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-terminal-text-muted">
                    {percentage.toFixed(1)}%
                  </span>
                  <span className="font-bold tabular-nums text-terminal-text">
                    {grade.observationCount}
                  </span>
                </div>
              </div>
              {grade.description && (
                <p className="mt-1 text-xs text-terminal-text-secondary">{grade.description}</p>
              )}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-terminal-surface">
                <div
                  className="h-full rounded-full bg-harvest-400 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        Grades observed in {commodityName} price data · Sorted by observation count
      </p>
    </div>
  );
}

/* ── Quality Specifications Card ───────────────────────────────────────────── */

function QualitySpecificationsCard({
  specifications,
  specsByGrade,
  commodityName,
}: {
  specifications: GradeSpecification[];
  specsByGrade: Map<number | null, GradeSpecification[]>;
  commodityName: string;
}) {
  // Get unique grades with specs
  const gradeIds = Array.from(specsByGrade.keys());

  return (
    <div className="terminal-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="size-5 text-harvest-400" />
        <h3 className="text-sm font-semibold text-terminal-text">Quality Specifications</h3>
      </div>

      <div className="space-y-6">
        {gradeIds.map((gradeId) => {
          const specs = specsByGrade.get(gradeId) ?? [];
          const gradeName = specs[0]?.gradeName ?? 'General';

          return (
            <div key={gradeId ?? 'general'}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-terminal-text-muted">
                {gradeName}
              </h4>

              <div className="space-y-2">
                {specs.map((spec) => (
                  <SpecificationRow key={spec.id} spec={spec} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-terminal-text-muted">
        Quality parameters for {commodityName} · Basis: official (standards body), commercial
        (trade practice), or indicative (guidance only)
      </p>
    </div>
  );
}

/* ── Specification Row ─────────────────────────────────────────────────────── */

function SpecificationRow({ spec }: { spec: GradeSpecification }) {
  const basisColor =
    spec.basis === 'official'
      ? 'bg-success-500/10 text-success-500 border-success-500/20'
      : spec.basis === 'commercial'
        ? 'bg-harvest-400/10 text-harvest-400 border-harvest-400/20'
        : 'bg-warning-500/10 text-warning-500 border-warning-500/20';

  const basisLabel =
    spec.basis === 'official'
      ? 'Official'
      : spec.basis === 'commercial'
        ? 'Commercial'
        : 'Indicative';

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-terminal-border bg-terminal-surface p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-terminal-text">{spec.parameter}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[0.625rem] font-medium ${basisColor}`}>
            {basisLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-terminal-text-secondary">{spec.requirement}</p>
      </div>

      {spec.sourceName && (
        <div className="shrink-0 text-right">
          {spec.sourceUrl ? (
            <a
              href={spec.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-harvest-400 hover:text-harvest-300"
            >
              {spec.sourceName}
              <ExternalLink className="size-3" />
            </a>
          ) : (
            <span className="text-xs text-terminal-text-muted">{spec.sourceName}</span>
          )}
        </div>
      )}
    </div>
  );
}
