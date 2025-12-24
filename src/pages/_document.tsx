/**
 * Custom Document
 *
 * Adds the theme initialization script to prevent flash of wrong theme (FOWT).
 * This script runs before React hydration to set the correct theme class immediately.
 */

import { Html, Head, Main, NextScript } from 'next/document';
import { themeScript } from '@/hooks/useTheme';

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        {/* Theme initialization script - runs before React to prevent flash */}
        <script
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
