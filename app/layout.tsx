import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_NAME = "Rudra Chatbot";
const SITE_DESCRIPTION =
  "A fast, streaming AI chat interface powered by any OpenAI-compatible free LLM API.";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

/**
 * Applies the saved theme before first paint so there is no flash of the wrong
 * theme. Kept inline and tiny on purpose — it must run synchronously in <head>.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('rudra-chat-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
