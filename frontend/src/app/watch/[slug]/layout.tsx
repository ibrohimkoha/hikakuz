import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`http://127.0.0.1:8199/api/v1/anime/detail?slug=${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return {
        title: "Anime tomosha qilish",
        description: "Hikaku Anime platformasida sifatli dublyajdagi animelarni tomosha qiling.",
      };
    }
    const data = await res.json();
    const anime = data.anime;
    if (!anime) {
      return {
        title: "Anime tomosha qilish",
        description: "Hikaku Anime platformasida sifatli dublyajdagi animelarni tomosha qiling.",
      };
    }

    const title = `${anime.title_uz || anime.title_en}${anime.title_en && anime.title_en !== anime.title_uz ? ` (${anime.title_en})` : ""} — O'zbek tilida barcha qismlari onlayn ko'rish`;
    const desc = anime.synopsis
      ? `${anime.title_uz} animeni Hikaku.uz platformasida 1080p Full HD sifatda, o'zbekcha dublyajda bepul onlayn tomosha qiling. ${anime.synopsis.slice(0, 140)}...`
      : `${anime.title_uz} animesini Hikaku.uz da yuqori sifatda o'zbek tilida bepul onlayn tomosha qiling. Barcha qismlari, professional dublyaj va subtitrlar.`;

    const images = anime.poster_url ? [{ url: anime.poster_url, alt: anime.title_uz }] : [];

    return {
      title,
      description: desc,
      keywords: [
        anime.title_uz,
        anime.title_en,
        `${anime.title_uz} uzbek tilida`,
        `${anime.title_uz} uzbekcha`,
        `${anime.title_uz} barcha qismlari`,
        `${anime.title_uz} onlayn ko'rish`,
        `${anime.title_uz} online tomosha qilish`,
        `${anime.title_uz} skachat`,
        `${anime.title_uz} 1080p`,
        `${anime.title_uz} 1-qism`,
        "hikaku anime",
        "hikaku uz",
        ...(anime.genres || []),
      ].filter(Boolean),
      alternates: {
        canonical: `https://hikaku.uz/watch/${slug}`,
      },
      openGraph: {
        title: `${title} | Hikaku Anime`,
        description: desc,
        url: `https://hikaku.uz/watch/${slug}`,
        siteName: "Hikaku Anime",
        type: "video.tv_show",
        images,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Hikaku Anime`,
        description: desc,
        images: anime.poster_url ? [anime.poster_url] : [],
      },
    };
  } catch {
    return {
      title: "Anime tomosha qilish | Hikaku Anime",
      description: "Hikaku Anime platformasida sifatli dublyajdagi animelarni tomosha qiling.",
    };
  }
}

export default async function WatchLayout({ params, children }: Props) {
  const { slug } = await params;
  let jsonLdSeries = null;
  let jsonLdBreadcrumbs = null;

  try {
    const res = await fetch(`http://127.0.0.1:8199/api/v1/anime/detail?slug=${slug}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      const anime = data.anime;
      if (anime) {
        jsonLdSeries = {
          "@context": "https://schema.org",
          "@type": "TVSeries",
          name: anime.title_uz,
          alternateName: anime.title_en,
          description: anime.synopsis || `${anime.title_uz} uzbek tilida onlayn ko'rish`,
          image: anime.poster_url,
          genre: anime.genres || [],
          numberOfEpisodes: anime.episodes_count || 1,
          aggregateRating: anime.score
            ? {
                "@type": "AggregateRating",
                ratingValue: anime.score,
                bestRating: "10",
                worstRating: "1",
                ratingCount: 15,
              }
            : undefined,
        };

        jsonLdBreadcrumbs = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              "position": 1,
              name: "Bosh sahifa",
              item: "https://hikaku.uz",
            },
            {
              "@type": "ListItem",
              "position": 2,
              name: "Katalog",
              item: "https://hikaku.uz/catalog",
            },
            {
              "@type": "ListItem",
              "position": 3,
              name: anime.title_uz,
              item: `https://hikaku.uz/watch/${slug}`,
            },
          ],
        };
      }
    }
  } catch (e) {
    // ignore
  }

  return (
    <>
      {jsonLdSeries && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSeries) }}
        />
      )}
      {jsonLdBreadcrumbs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
        />
      )}
      {children}
    </>
  );
}
