/**
 * ResearchSection — Research reports and premium content
 *
 * Stage 8 of commodity intelligence transformation.
 * Displays related research reports with premium access indicators.
 */

import Link from 'next/link';
import {
  FileText,
  Lock,
  Calendar,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import type { ResearchReportSummary } from '@/lib/intelligence/research-queries';

interface ResearchSectionProps {
  reports: ResearchReportSummary[];
  hasPremiumAccess: boolean;
  commodityName: string;
  commoditySlug: string;
}

export function ResearchSection({
  reports,
  hasPremiumAccess,
  commodityName,
  commoditySlug,
}: ResearchSectionProps) {
  const hasReports = reports.length > 0;

  if (!hasReports) {
    return (
      <section aria-label="Research & Reports">
        <div className="terminal-panel p-6">
          <div className="flex items-start gap-4">
            <BookOpen className="mt-0.5 size-6 shrink-0 text-terminal-text-muted" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-terminal-text">
                Research & Reports
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-terminal-text-secondary">
                Market research and analytical reports for {commodityName} will appear here as they
                are published. Premium reports provide deep-dive analysis and extended historical
                data.
              </p>
              <div className="mt-4">
                <Link
                  href="/client/research"
                  className="inline-flex items-center gap-2 text-xs font-medium text-harvest-400 hover:text-harvest-300"
                >
                  Browse all research
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const premiumCount = reports.filter((r) => r.isPremium).length;
  const freeCount = reports.length - premiumCount;

  return (
    <section aria-label="Research & Reports" className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-terminal-text">
            Research & Reports
          </h2>
          <p className="mt-1 text-xs text-terminal-text-muted">
            {reports.length} report{reports.length === 1 ? '' : 's'} related to {commodityName}
            {premiumCount > 0 && !hasPremiumAccess && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Lock className="size-3" />
                {premiumCount} premium
              </span>
            )}
          </p>
        </div>
        <Link
          href="/client/research"
          className="inline-flex items-center gap-1.5 rounded-lg border border-terminal-border px-3 py-1.5 text-xs font-medium text-terminal-text transition-colors hover:border-harvest-500/40 hover:text-harvest-300"
        >
          View all research
          <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            hasPremiumAccess={hasPremiumAccess}
          />
        ))}
      </div>

      {/* Premium Access Prompt */}
      {premiumCount > 0 && !hasPremiumAccess && (
        <PremiumAccessPrompt commodityName={commodityName} />
      )}

      {/* Footer Stats */}
      <div className="terminal-panel p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-terminal-text-secondary">
          <div className="flex items-center gap-1.5">
            <FileText className="size-3.5 text-terminal-text-muted" />
            <span>
              {freeCount} free report{freeCount === 1 ? '' : 's'}
            </span>
          </div>
          {premiumCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-harvest-400" />
              <span>
                {premiumCount} premium report{premiumCount === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-terminal-text-muted" />
            <span>
              Latest:{' '}
              {reports[0]?.publishedAt
                ? new Date(reports[0].publishedAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Recently'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Report Card ───────────────────────────────────────────────────────────── */

function ReportCard({
  report,
  hasPremiumAccess,
}: {
  report: ResearchReportSummary;
  hasPremiumAccess: boolean;
}) {
  const isLocked = report.isPremium && !hasPremiumAccess;

  return (
    <div className="terminal-panel group relative flex flex-col p-4 transition-shadow hover:shadow-md">
      {/* Premium Badge */}
      {report.isPremium && (
        <div className="absolute right-3 top-3">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-harvest-400/10 px-2 py-0.5 text-[0.625rem] font-medium text-harvest-400">
              <Lock className="size-2.5" />
              Premium
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[0.625rem] font-medium text-success-500">
              <Sparkles className="size-2.5" />
              Premium
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1">
        <div className="mb-2 flex items-start gap-2">
          <FileText className="mt-0.5 size-4 shrink-0 text-terminal-text-muted" />
          <h3 className="text-sm font-semibold text-terminal-text line-clamp-2">
            {report.title}
          </h3>
        </div>

        {report.summary && (
          <p className="mb-3 text-xs leading-relaxed text-terminal-text-secondary line-clamp-3">
            {report.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.6875rem] text-terminal-text-muted">
          {report.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>
                {new Date(report.publishedAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
          {report.marketName && (
            <div>
              <span className="text-terminal-text-muted">Market: </span>
              <span className="text-terminal-text-secondary">{report.marketName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="mt-3 border-t border-terminal-border pt-3">
        {isLocked ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-harvest-400 hover:text-harvest-300"
          >
            <Lock className="size-3" />
            Upgrade to access
            <ArrowRight className="size-3" />
          </Link>
        ) : (
          <Link
            href={`/client/research/${report.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-harvest-400 hover:text-harvest-300"
          >
            Read report
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Premium Access Prompt ─────────────────────────────────────────────────── */

function PremiumAccessPrompt({ commodityName }: { commodityName: string }) {
  return (
    <div className="terminal-panel border-harvest-400/30 bg-gradient-to-br from-harvest-400/5 to-transparent p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-harvest-400/10 p-2">
          <Sparkles className="size-5 text-harvest-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-terminal-text">
            Unlock Premium Research
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-terminal-text-secondary">
            Get access to in-depth analysis, extended historical data, and expert insights for{' '}
            {commodityName} and other commodities. Premium reports are written by our research team
            and provide actionable market intelligence.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-harvest-400 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-harvest-500"
            >
              View pricing
              <ArrowRight className="size-3" />
            </Link>
            <Link
              href="/pricing#features"
              className="inline-flex items-center gap-1.5 rounded-lg border border-terminal-border px-3 py-1.5 text-xs font-medium text-terminal-text transition-colors hover:border-harvest-500/40 hover:text-harvest-300"
            >
              See what's included
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
