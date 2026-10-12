import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://hikaku.uz";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/fandubs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/homiylik`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/dmca`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  let animePages: MetadataRoute.Sitemap = [];
  let fandubPages: MetadataRoute.Sitemap = [];

  try {
    const res = await fetch("http://127.0.0.1:8199/api/v1/anime/catalog?limit=1000&archive=all", {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const animes = json.data || [];
      animePages = animes.map((anime: { slug: string; created_at?: string }) => ({
        url: `${baseUrl}/watch/${anime.slug}`,
        lastModified: anime.created_at ? new Date(anime.created_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      }));
    }
  } catch (error) {
    console.error("Error generating anime sitemap:", error);
  }

  try {
    const res = await fetch("http://127.0.0.1:8199/api/v1/fandubs", {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const fandubs = json.data || [];
      fandubPages = fandubs.map((f: { slug: string }) => ({
        url: `${baseUrl}/fandubs/${f.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error("Error generating fandub sitemap:", error);
  }

  return [...staticPages, ...fandubPages, ...animePages];
}
