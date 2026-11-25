# Stage 10.2: Performance Testing Guide

## Overview
This document provides a comprehensive guide for testing the performance of the Hatsi360 Commodity Intelligence Platform. Performance testing ensures the platform meets user expectations for speed and responsiveness.

---

## Performance Targets

### Core Web Vitals
| Metric | Target | Measurement |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Loading performance |
| **INP** (Interaction to Next Paint) | < 200ms | Interactivity |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability |

### Lighthouse Scores
| Category | Target | Minimum |
|----------|--------|---------|
| Performance | 90+ | 75 |
| Accessibility | 100 | 95 |
| Best Practices | 95+ | 90 |
| SEO | 100 | 95 |

### Application Metrics
| Metric | Target | Notes |
|--------|--------|-------|
| Time to First Byte (TTFB) | < 600ms | Server response time |
| First Contentful Paint (FCP) | < 1.8s | Initial content visible |
| Time to Interactive (TTI) | < 3.8s | Page fully interactive |
| Total Blocking Time (TBT) | < 200ms | Main thread blocking |
| Speed Index | < 3.4s | Visual completeness |

---

## Testing Tools

### Browser DevTools
- **Chrome DevTools**: Performance tab, Lighthouse, Network throttling
- **Firefox DevTools**: Performance tab, Network throttling
- **Safari DevTools**: Timeline, Network throttling

### Online Tools
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **WebPageTest**: https://www.webpagetest.org/
- **GTmetrix**: https://gtmetrix.com/
- **Pingdom**: https://tools.pingdom.com/

### CLI Tools
```bash
# Lighthouse CLI
npm install -g lighthouse
lighthouse https://hatsi360.com/commodities/wheat --view

# WebPageTest API
curl "https://www.webpagetest.org/runtest.php?url=https://hatsi360.com&k=YOUR_API_KEY"
```

### Node.js Tools
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun

# Bundle analyzer
npm install -D webpack-bundle-analyzer
```

---

## Testing Scenarios

### 1. Desktop Testing (Chrome)

#### Step 1: Open DevTools
1. Open Chrome DevTools (F12 or Ctrl+Shift+I)
2. Go to "Network" tab
3. Select throttling profile

#### Step 2: Network Throttling
Test with the following profiles:
- **Fast 3G**: 1.6 Mbps down, 750 Kbps up, 150ms RTT
- **Slow 3G**: 400 Kbps down, 400 Kbps up, 400ms RTT
- **Offline**: Test service worker caching

#### Step 3: CPU Throttling
1. Go to "Performance" tab
2. Click settings (gear icon)
3. Select CPU throttling:
   - **No throttling**: Baseline
   - **4x slowdown**: Mid-range devices
   - **6x slowdown**: Low-end devices

#### Step 4: Run Lighthouse
1. Go to "Lighthouse" tab
2. Select categories: Performance, Accessibility, Best Practices, SEO
3. Select device: Mobile or Desktop
4. Click "Analyze page load"

#### Step 5: Record Results
```
Test: Desktop - No Throttling
Date: _________________
Lighthouse Performance Score: _____/100
LCP: _____s
INP: _____ms
CLS: _____

Test: Desktop - Fast 3G
Date: _________________
Lighthouse Performance Score: _____/100
LCP: _____s
INP: _____ms
CLS: _____

Test: Desktop - Slow 3G
Date: _________________
Lighthouse Performance Score: _____/100
LCP: _____s
INP: _____ms
CLS: _____
```

### 2. Mobile Testing (Chrome DevTools)

#### Step 1: Device Mode
1. Open Chrome DevTools
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device: iPhone 12 Pro, Pixel 5, etc.

#### Step 2: Network Throttling
Test with mobile profiles:
- **Fast 4G**: 4 Mbps down, 3 Mbps up, 20ms RTT
- **Regular 4G**: 1.5 Mbps down, 750 Kbps up, 40ms RTT
- **Fast 3G**: 1.6 Mbps down, 750 Kbps up, 150ms RTT

#### Step 3: CPU Throttling
Test with CPU throttling:
- **4x slowdown**: Mid-range mobile devices
- **6x slowdown**: Low-end mobile devices

#### Step 4: Run Lighthouse
1. Select device: Mobile
2. Run Lighthouse analysis
3. Record results

#### Step 5: Record Results
```
Test: Mobile - iPhone 12 Pro - Fast 4G
Date: _________________
Lighthouse Performance Score: _____/100
LCP: _____s
INP: _____ms
CLS: _____

Test: Mobile - Pixel 5 - Regular 4G
Date: _________________
Lighthouse Performance Score: _____/100
LCP: _____s
INP: _____ms
CLS: _____
```

---

## Page-Specific Testing

### Critical Pages to Test

#### 1. Commodity List Page
**URL:** `/commodities`
**Expected Load Time:** < 2s
**Key Metrics:**
- List renders within 1s
- Images lazy load correctly
- Filters work smoothly

**Testing Checklist:**
- [ ] Page loads in < 2s on Fast 3G
- [ ] Commodity cards render immediately
- [ ] Images have proper dimensions (no CLS)
- [ ] Filters respond within 200ms
- [ ] Pagination works smoothly

#### 2. Commodity Detail Page
**URL:** `/commodities/wheat`
**Expected Load Time:** < 3s
**Key Metrics:**
- Hero section loads in < 1.5s
- Charts render in < 2s
- Tables are interactive in < 3s

**Testing Checklist:**
- [ ] Hero section loads in < 1.5s
- [ ] Price charts render in < 2s
- [ ] Market comparison table loads in < 2.5s
- [ ] All sections are interactive in < 3s
- [ ] No layout shifts during loading

#### 3. Price History Page
**URL:** `/prices/wheat`
**Expected Load Time:** < 2.5s
**Key Metrics:**
- Chart renders in < 2s
- Date range changes in < 500ms
- Table pagination in < 1s

**Testing Checklist:**
- [ ] Chart renders in < 2s
- [ ] Date range changes in < 500ms
- [ ] Table loads in < 1.5s
- [ ] Pagination works smoothly
- [ ] Filters respond in < 500ms

#### 4. Market Detail Page
**URL:** `/markets/dawanau`
**Expected Load Time:** < 2s
**Key Metrics:**
- Market info loads in < 1s
- Commodity list renders in < 1.5s
- Charts render in < 2s

**Testing Checklist:**
- [ ] Market info loads in < 1s
- [ ] Commodity list renders in < 1.5s
- [ ] Charts render in < 2s
- [ ] All data loads correctly

#### 5. Research Page
**URL:** `/research`
**Expected Load Time:** < 2s
**Key Metrics:**
- Report list loads in < 1s
- Filters work in < 500ms
- Report detail loads in < 1.5s

**Testing Checklist:**
- [ ] Report list loads in < 1s
- [ ] Filters work in < 500ms
- [ ] Report detail loads in < 1.5s
- [ ] Search works smoothly

---

## Load Testing

### Tools
- **Artillery**: https://artillery.io/
- **k6**: https://k6.io/
- **Loader.io**: https://loader.io/

### Load Testing Scenarios

#### Scenario 1: Normal Load
**Users:** 100 concurrent
**Duration:** 10 minutes
**Ramp-up:** 10 users/second

```yaml
# artillery.yml
config:
  target: "https://hatsi360.com"
  phases:
    - duration: 600
      arrivalRate: 10
      name: "Normal load"
scenarios:
  - flow:
      - get:
          url: "/commodities"
      - get:
          url: "/commodities/wheat"
      - get:
          url: "/prices/wheat"
```

#### Scenario 2: Peak Load
**Users:** 500 concurrent
**Duration:** 15 minutes
**Ramp-up:** 50 users/second

```yaml
# artillery.yml
config:
  target: "https://hatsi360.com"
  phases:
    - duration: 900
      arrivalRate: 50
      name: "Peak load"
scenarios:
  - flow:
      - get:
          url: "/commodities"
      - get:
          url: "/commodities/wheat"
      - get:
          url: "/prices/wheat"
```

#### Scenario 3: Stress Test
**Users:** 1000 concurrent
**Duration:** 20 minutes
**Ramp-up:** 100 users/second

```yaml
# artillery.yml
config:
  target: "https://hatsi360.com"
  phases:
    - duration: 1200
      arrivalRate: 100
      name: "Stress test"
scenarios:
  - flow:
      - get:
          url: "/commodities"
      - get:
          url: "/commodities/wheat"
      - get:
          url: "/prices/wheat"
```

### Load Testing Checklist

#### Before Test
- [ ] Database backups completed
- [ ] Monitoring tools configured
- [ ] Alert thresholds set
- [ ] Test environment ready

#### During Test
- [ ] Monitor CPU usage (< 70%)
- [ ] Monitor memory usage (< 80%)
- [ ] Monitor database connections (< 80% of pool)
- [ ] Monitor API response times (< 2s average)
- [ ] Monitor error rates (< 1%)

#### After Test
- [ ] Review performance metrics
- [ ] Identify bottlenecks
- [ ] Document findings
- [ ] Create optimization plan

---

## Performance Optimization Checklist

### Frontend Optimizations

#### Code Splitting
- [ ] Route-based code splitting implemented
- [ ] Dynamic imports for heavy components
- [ ] Lazy loading for below-fold content
- [ ] Prefetching for likely navigation

#### Bundle Optimization
- [ ] Tree shaking enabled
- [ ] Dead code elimination
- [ ] Minification enabled
- [ ] Compression enabled (gzip/brotli)

#### Image Optimization
- [ ] Next.js Image component used
- [ ] Responsive images with srcSet
- [ ] Lazy loading for images
- [ ] WebP format support
- [ ] Image dimensions specified (no CLS)

#### Font Optimization
- [ ] Font-display: swap used
- [ ] Fonts preloaded
- [ ] Font subsets used
- [ ] System fonts as fallback

#### CSS Optimization
- [ ] Critical CSS inlined
- [ ] Non-critical CSS deferred
- [ ] CSS minified
- [ ] Unused CSS removed

#### JavaScript Optimization
- [ ] JavaScript minified
- [ ] Async/defer for non-critical scripts
- [ ] Code splitting implemented
- [ ] No blocking JavaScript

### Backend Optimizations

#### Database Optimization
- [ ] Indexes on frequently queried columns
- [ ] Query optimization
- [ ] Connection pooling enabled
- [ ] Read replicas for read-heavy workloads

#### Caching
- [ ] Static assets cached (1 year)
- [ ] API responses cached (5-15 minutes)
- [ ] Database query caching
- [ ] CDN caching enabled

#### API Optimization
- [ ] Pagination for large datasets
- [ ] Efficient queries (no N+1)
- [ ] Response compression
- [ ] Rate limiting configured

#### Server Optimization
- [ ] Server response time < 200ms
- [ ] HTTP/2 enabled
- [ ] Keep-alive connections
- [ ] Compression enabled

### Infrastructure Optimizations

#### CDN
- [ ] Static assets served from CDN
- [ ] CDN caching configured
- [ ] CDN compression enabled
- [ ] CDN SSL configured

#### Hosting
- [ ] Appropriate server size
- [ ] Auto-scaling configured
- [ ] Load balancer configured
- [ ] SSL certificate valid

---

## Performance Monitoring

### Real User Monitoring (RUM)

#### Tools
- **Google Analytics**: Core Web Vitals
- **SpeedCurve**: Real user monitoring
- **New Relic**: Application performance monitoring
- **Datadog**: Full-stack monitoring

#### Metrics to Monitor
- **Page Load Time**: Average, P50, P75, P95, P99
- **Time to First Byte (TTFB)**: Server response time
- **First Contentful Paint (FCP)**: Initial content visible
- **Largest Contentful Paint (LCP)**: Main content visible
- **Time to Interactive (TTI)**: Page fully interactive
- **Cumulative Layout Shift (CLS)**: Visual stability
- **Interaction to Next Paint (INP)**: Interactivity

#### Alert Thresholds
- **LCP > 2.5s**: Warning
- **LCP > 4.0s**: Critical
- **INP > 200ms**: Warning
- **INP > 500ms**: Critical
- **CLS > 0.1**: Warning
- **CLS > 0.25**: Critical
- **Error rate > 1%**: Warning
- **Error rate > 5%**: Critical

### Synthetic Monitoring

#### Tools
- **UptimeRobot**: Uptime monitoring
- **Pingdom**: Synthetic monitoring
- **StatusCake**: Uptime and performance monitoring

#### Monitoring Schedule
- **Every 5 minutes**: Critical pages
- **Every 15 minutes**: All pages
- **Every hour**: Full site scan

---

## Performance Testing Report Template

### Executive Summary
```
Test Date: _________________
Test Environment: _________________
Overall Performance Score: _____/100
Status: [PASS/FAIL]

Summary:
[Brief summary of performance test results]
```

### Detailed Results

#### Desktop Performance
| Page | LCP | INP | CLS | Score | Status |
|------|-----|-----|-----|-------|--------|
| /commodities | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /commodities/wheat | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /prices/wheat | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /markets/dawanau | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /research | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |

#### Mobile Performance
| Page | LCP | INP | CLS | Score | Status |
|------|-----|-----|-----|-------|--------|
| /commodities | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /commodities/wheat | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /prices/wheat | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /markets/dawanau | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |
| /research | ___s | ___ms | ___ | ___/100 | [PASS/FAIL] |

#### Load Test Results
| Scenario | Users | Avg Response | P95 Response | Error Rate | Status |
|----------|-------|--------------|--------------|------------|--------|
| Normal | 100 | ___ms | ___ms | ___% | [PASS/FAIL] |
| Peak | 500 | ___ms | ___ms | ___% | [PASS/FAIL] |
| Stress | 1000 | ___ms | ___ms | ___% | [PASS/FAIL] |

### Issues Found
```
[List performance issues found]
```

### Recommendations
```
[List performance optimization recommendations]
```

### Sign-Off
**Performance Engineer:** _________________  
**Date:** _________________  
**Signature:** _________________

---

## Appendix: Performance Resources

### Documentation
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PageSpeed Insights](https://developers.google.com/speed/pagespeed/insights/)
- [WebPageTest](https://www.webpagetest.org/documentation/)

### Tools
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Artillery](https://artillery.io/docs/)
- [k6](https://k6.io/docs/)

### Best Practices
- [Web Performance Best Practices](https://developers.google.com/web/fundamentals/performance)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance](https://reactjs.org/docs/optimizing-performance.html)

---

**Last Updated:** _________________  
**Next Review Date:** _________________
