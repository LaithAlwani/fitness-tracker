import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import { RegisterSW } from "@/components/register-sw";
import { AppleSplash } from "@/components/apple-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Liftify — Track workouts fast",
  description: "Log workouts in seconds and watch your progress over time.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png", // iOS home-screen + splash icon (logo on dark)
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liftify",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "#16161f",
          colorText: "#fafafa",
          colorInputBackground: "#0a0a0f",
          colorInputText: "#fafafa",
          colorNeutral: "#fafafa",
        },
      }}
    >
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <AppleSplash />
          {/* Apply the saved text size before paint to avoid a flash. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var s=localStorage.getItem('liftify:font-size');var m={sm:'14px',base:'16px',lg:'18px'};if(s&&m[s]){document.documentElement.style.fontSize=m[s];}}catch(e){}})();",
            }}
          />
          <Providers>{children}</Providers>
          <RegisterSW />
        </body>
      </html>
    </ClerkProvider>
  );
}
