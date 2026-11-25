'use client';

import { useEffect } from 'react';

/** Last-resort boundary for failures in the root layout itself. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled root application error:', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          background: '#101713',
          color: '#f3f6f2',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <main
          role="alert"
          aria-live="assertive"
          style={{ maxWidth: '38rem', textAlign: 'center' }}
        >
          <p style={{ color: '#e9c97e', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Hatsi360 · error
          </p>
          <h1 style={{ margin: '1rem 0', fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', lineHeight: 1.15 }}>
            We could not load this page
          </h1>
          <p style={{ color: '#cbd5cd', lineHeight: 1.7 }}>
            The request did not complete. No price data has been changed. Try again, or return to
            the public market pages.
          </p>
          {error.digest ? (
            <p style={{ color: '#a8b5aa', fontSize: '0.8rem' }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="button"
              onClick={reset}
              style={{ border: 0, borderRadius: '999px', padding: '0.75rem 1.25rem', background: '#e9c97e', color: '#101713', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
            >
              Try again
            </button>
            <form action="/">
              <button
                type="submit"
                style={{ border: '1px solid #637166', borderRadius: '999px', padding: '0.75rem 1.25rem', background: 'transparent', color: '#f3f6f2', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
              >
                Back to markets
              </button>
            </form>
          </div>
        </main>
      </body>
    </html>
  );
}
