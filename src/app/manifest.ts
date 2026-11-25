import type { MetadataRoute } from 'next';
<<<<<<< HEAD
import { BRAND } from '@/lib/brand';
=======
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2

/**
 * The installable web application manifest.
 *
 * The icons are the owner's supplied artwork, served from `public/brand/`.
 * The application is not a native application and does not pretend to be
 * one; the manifest exists so that a browser can install the platform and
 * open it with the right mark and the right colours.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
<<<<<<< HEAD
    name: `${BRAND.name} — ${BRAND.descriptor}`,
    short_name: BRAND.name,
    description:
      'Agricultural commodity prices, market comparison and verified market intelligence.',
=======
    name: 'Hatsi360 Markets — African Agricultural Market Intelligence',
    short_name: 'Hatsi360 Markets',
    description:
      'Agricultural commodity prices, market intelligence, price analytics, commodity research and trade insights across African agricultural markets.',
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
<<<<<<< HEAD
    background_color: '#F7F8F5',
    theme_color: '#123B2A',
=======
    background_color: '#F7F9F7',
    theme_color: '#103C2D',
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
    categories: ['business', 'productivity', 'news'],
    icons: [
      {
        src: '/brand/hatsi360-favicon-32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/brand/hatsi360-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/hatsi360-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
