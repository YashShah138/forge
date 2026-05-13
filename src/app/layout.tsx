import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forge",
  description: "Personal fitness and nutrition tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = localStorage.getItem('forge-sidebar-collapsed');
                if (s === 'true') document.documentElement.setAttribute('data-sidebar-collapsed', 'true');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased" style={{ background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-sans)' }}>
        {children}
      </body>
    </html>
  );
}
