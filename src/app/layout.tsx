import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@/styles/tokens.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import Chatbot from "@/components/Chatbot/Chatbot";
import ScrollRevealProvider from "@/components/ScrollRevealProvider";
import PassionFireBackground from "@/components/PassionFireBackground";
import MobileInstallPrompt from "@/components/MobileInstallPrompt";
import SoftLocationPrompt from "@/components/SoftLocationPrompt";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Cavallery.id",
    template: "Cavallery | %s",
  },
  description:
    "Cavallery adalah fanbase resmi Erine JKT48. Temukan berita, jadwal show theater, live, games, dan proyek eksklusif.",
  keywords: ["Cavallery", "Erine JKT48", "Catherina Vallencia", "JKT48 fanbase"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cavallery",
  },
  icons: {
    icon: "/images/cava-logo-round.png",
    apple: "/images/cava-logo-round.png",
  },
  openGraph: {
    title: "Cavallery",
    description: "Fanbase resmi Erine JKT48",
    type: "website",
    images: ["/images/cava-logo-round.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="font-sans dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0c0a09" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f7f1e8" media="(prefers-color-scheme: light)" />
        {/* Apply the saved / system theme before first paint (no flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":!window.matchMedia("(prefers-color-scheme: light)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cavallery" />
        <link rel="apple-touch-icon" href="/images/cava-logo-round.png" />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Display: Anton (condensed, Team Passion poster energy) · Body: Plus Jakarta Sans.
            Remaining families are still used by individual project pages. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Plus+Jakarta+Sans:wght@400..800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Montserrat:wght@300..800&family=Caveat:wght@400..700&family=Patrick+Hand&family=Cinzel:wght@600..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <PassionFireBackground />
        <SplashScreen />
        <ScrollRevealProvider />
        <Navbar />
        <main className="relative">{children}</main>
        <Footer />
        <Chatbot />
        <MobileInstallPrompt />
        <SoftLocationPrompt />
      </body>
    </html>
  );
}
