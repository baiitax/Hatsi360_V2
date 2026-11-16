'use client';

import Link from 'next/link';
import {
  LineChart,
  BarChart3,
  Star,
  Bell,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface CommodityHeroProps {
  name: string;
  slug: string;
  description?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  synonyms?: string[] | null;
  observationCount: number;
  marketCount: number;
  unitCount: number;
  gradeCount: number;
  latestObservationDate?: string | null;
}

export function CommodityHero({
  name,
  slug,
  description,
  category,
  imageUrl,
  synonyms,
  observationCount,
  marketCount,
  unitCount,
  gradeCount,
  latestObservationDate,
}: CommodityHeroProps) {
  const displayName = name.toUpperCase();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0B2A20] via-[#103C2D] to-[#17241F] text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-start">
          {/* Left: Image */}
          {imageUrl && (
            <div className="lg:col-span-1">
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white/10 border border-white/20">
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Right: Content */}
          <div className={imageUrl ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-1">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/commodities" className="hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-1">Commodities</Link>
              {category && (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{category}</span>
                </>
              )}
              <span aria-hidden="true">/</span>
              <span className="text-white" aria-current="page">{name}</span>
            </nav>

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {displayName}
            </h1>

            {/* Description */}
            {description && (
              <p className="text-lg text-white/80 leading-relaxed mb-6 max-w-2xl">
                {description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 lg:gap-6 mb-8 text-sm">
              {category && (
                <div>
                  <span className="text-white/50 block">Category</span>
                  <span className="font-medium">{category}</span>
                </div>
              )}
              <div>
                <span className="text-white/50 block">Markets</span>
                <span className="font-medium">{marketCount}</span>
              </div>
              <div>
                <span className="text-white/50 block">Observations</span>
                <span className="font-medium">{observationCount}</span>
              </div>
              {unitCount > 0 && (
                <div>
                  <span className="text-white/50 block">Units</span>
                  <span className="font-medium">{unitCount}</span>
                </div>
              )}
              {gradeCount > 0 && (
                <div>
                  <span className="text-white/50 block">Grades</span>
                  <span className="font-medium">{gradeCount}</span>
                </div>
              )}
              {latestObservationDate && (
                <div>
                  <span className="text-white/50 block">Latest</span>
                  <span className="font-medium">
                    {new Date(latestObservationDate).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                href={`/prices/${slug}`}
                aria-label={`View price history for ${name}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white text-[#103C2D] font-medium rounded-lg hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <LineChart className="w-4 h-4" aria-hidden="true" />
                Price History
              </Link>
              <Link
                href={`/charts?commodity=${slug}`}
                aria-label={`View charts for ${name}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
                Chart It
              </Link>
              <Link
                href={`/compare?commodity=${slug}`}
                aria-label={`Compare markets for ${name}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Compare Markets
              </Link>
              <button
                onClick={() => {
                  // Watchlist action - requires auth
                  window.location.href = '/login?returnUrl=/client/watchlists';
                }}
                aria-label={`Add ${name} to watchlist`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <Star className="w-4 h-4" aria-hidden="true" />
                Add to Watchlist
              </button>
              <button
                onClick={() => {
                  // Alert action - requires auth
                  window.location.href = '/login?returnUrl=/client/alerts';
                }}
                aria-label={`Create price alert for ${name}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white/10 text-white font-medium rounded-lg border border-white/20 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                Create Alert
              </button>
            </div>

            {/* Synonyms */}
            {synonyms && synonyms.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-sm text-white/50 mb-2">Also known as</p>
                <p className="text-sm text-white/80">{synonyms.join(' · ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
