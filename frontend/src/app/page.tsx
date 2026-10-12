import { Anime } from "@/types/anime";
import { HomePageClient } from "@/components/home-page-client";

// Revalidate every 60 seconds (Incremental Static Regeneration)
export const revalidate = 60;

async function getRecentAnimes(): Promise<Anime[]> {
  try {
    const res = await fetch("http://127.0.0.1:8199/api/v1/anime/recent?limit=24", {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json)) return json;
    if (json.data && Array.isArray(json.data)) return json.data;
    return [];
  } catch (err) {
    console.error("Failed to fetch recent animes server-side:", err);
    return [];
  }
}

export default async function Page() {
  const initialAnimes = await getRecentAnimes();
  return <HomePageClient initialAnimes={initialAnimes} />;
}
