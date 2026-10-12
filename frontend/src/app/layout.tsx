import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { SearchProvider } from "@/context/search-context";
import { SearchModal } from "@/components/search-modal";
import { AuthModal } from "@/components/auth-modal";
import { GlobalFooter } from "@/components/global-footer";
import { CacheConsentBanner } from "@/components/cache-consent-banner";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hikaku.uz"),
  title: {
    default: "Hikaku Anime — O'zbekistonda Eng Zamonaviy Anime Platformasi",
    template: "%s | Hikaku Anime",
  },
  description: "Hikaku Anime — Yuqori tezlikdagi, sifatli o'zbekcha dublyaj va subtitrlardagi animelarni bepul onlayn tomosha qiling.",
  keywords: [
    "hikaku",
    "hikaku uz",
    "hikaku anime",
    "anime uzbek tilida",
    "uzbekcha anime",
    "uzbek dublyaj anime",
    "anime online uzbekistan",
    "o'zbekcha anime ko'rish",
    "bepul anime ko'rish",
    "hikakuz",
    "anivorm",
  ],
  authors: [{ name: "Hikaku Team", url: "https://hikaku.uz" }],
  creator: "Hikaku",
  publisher: "Hikaku",
  openGraph: {
    title: "Hikaku Anime — O'zbekistonda Eng Zamonaviy Anime Platformasi",
    description: "Yuqori sifatli o'zbekcha dublyajdagi animelarni bepul onlayn tomosha qiling.",
    url: "https://hikaku.uz",
    siteName: "Hikaku Anime",
    locale: "uz_UZ",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Hikaku Anime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hikaku Anime — O'zbekistonda Eng Zamonaviy Anime Platformasi",
    description: "Yuqori sifatli o'zbekcha dublyajdagi animelarni onlayn tomosha qiling.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-placeholder",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className={`dark overflow-x-hidden w-full max-w-full ${plusJakarta.variable} ${outfit.variable}`}>
      <head />
      <body className="font-sans bg-[#060911] text-[#f1f5f9] min-h-screen flex flex-col antialiased selection:bg-rose-600 selection:text-white pb-20 md:pb-0 overflow-x-hidden w-full max-w-full relative">
        <AuthProvider>
          <SearchProvider>
            {children}
            <GlobalFooter />
            <SearchModal />
            <AuthModal />
            <CacheConsentBanner />
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
