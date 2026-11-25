/**
 * Hatsi360 — Refined Hero Section.
 *
 * Premium, visually compelling hero section featuring:
 * - Agricultural market intelligence messaging
 * - African commodity markets focus
 * - Strong typography and visual hierarchy
 * - Professional gradient backgrounds
 * - Premium image treatment with shadow effects
 * - Trust indicators backed by real data
 *
 * Design principles:
 * - Premium yet accessible
 * - Strong visual confidence
 * - Clear information hierarchy
 * - Responsive across all devices
 * - Authentic agricultural focus
 */

import Link from 'next/link';
import { IconArrowRight } from '@/components/ui/icons';

export interface RefinedHeroProps {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  coverageLine: string;
  latestObservedAt: string | null;
}

export function RefinedHero({
  publishedCount,
  commodityCount,
  marketCount,
  coverageLine,
  latestObservedAt,
}: RefinedHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F5F9F8]">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-b from-[#1D805A]/5 to-transparent blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-gradient-to-t from-[#1D805A]/3 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 lg:items-center">
          {/* Left Column — Messaging */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Eyebrow Label */}
            <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#EAF4EE] to-[#D4E9E2] px-5 py-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#1D805A]">
                ✓ African Agricultural Intelligence
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl font-black tracking-tight text-[#0B2A20] sm:text-6xl lg:text-5xl xl:text-6xl lg:leading-[1.15]">
                <span className="bg-gradient-to-r from-[#0B2A20] via-[#1D805A] to-[#0B2A20] bg-clip-text text-transparent">
                  Understand African
                </span>
                <br />
                <span className="text-[#0B2A20]">Agricultural Markets.</span>
                <br />
                <span className="text-[#1D805A]">Make Better Decisions.</span>
              </h1>
            </div>

            {/* Supporting Paragraph */}
            <p className="max-w-lg text-lg leading-relaxed text-[#64736B] lg:text-base">
              Access verified agricultural commodity prices, real-time market intelligence, and 
              actionable trade insights. Hatsi360 helps businesses, traders, and producers across 
              African markets understand price movements, identify profitable opportunities, and 
              make informed decisions with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4">
              <Link
                href="/markets"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1D805A] to-[#0B3D2C] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#1D805A]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#1D805A]/40 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:ring-offset-2"
              >
                Explore Markets
                <IconArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/trade"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#1D805A]/30 bg-white/80 px-8 py-3.5 text-sm font-bold text-[#0B2A20] transition-all duration-300 hover:border-[#1D805A] hover:bg-[#EAF4EE] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1D805A]/20 focus:ring-offset-2 backdrop-blur-sm"
              >
                Trade Intelligence
                <span>→</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            {publishedCount > 0 && (
              <div className="space-y-4 border-t border-[#E3EAE5] pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64736B]">
                  Trusted by agricultural professionals
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gradient-to-br from-white/60 to-white/40 p-4 backdrop-blur-sm border border-[#E3EAE5]/50">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#1D805A]">
                        {(publishedCount / 1000).toFixed(1)}k+
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64736B]">Verified observations</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-white/60 to-white/40 p-4 backdrop-blur-sm border border-[#E3EAE5]/50">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#1D805A]">
                        {commodityCount}+
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64736B]">Commodities tracked</p>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-white/60 to-white/40 p-4 backdrop-blur-sm border border-[#E3EAE5]/50">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#1D805A]">
                        {marketCount}+
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64736B]">Active markets</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column — Hero Image */}
          <div className="relative order-1 lg:order-2">
            <div className="relative">
              {/* Premium image frame with shadow effect */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1D805A]/10 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/20 backdrop-blur-sm">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A20]/20 via-transparent to-transparent pointer-events-none z-10" />
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/hatsi360-hero.png"
                  alt="African agricultural market — farmers and traders in a vibrant, modern market setting"
                  className="h-auto w-full object-cover"
                  width={800}
                  height={600}
                  loading="eager"
                />
              </div>
              
              {/* Decorative corner accent */}
              <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-gradient-to-tl from-[#1D805A]/20 to-transparent blur-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
