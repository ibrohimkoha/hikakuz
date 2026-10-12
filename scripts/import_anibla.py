#!/usr/bin/env python3
import urllib.request
import json
import subprocess
import os

headers = {"User-Agent": "Mozilla/5.0"}

print("1. Anibla API dan seriallarni yuklash...")
req_s = urllib.request.Request("https://amediatv.up-it.uz/api/v1/series?page=1&limit=1000", headers=headers)
with urllib.request.urlopen(req_s, timeout=20) as res:
    series = json.loads(res.read().decode("utf-8"))["data"]
print(f"-> {len(series)} ta serial yuklandi.")

print("2. Anibla API dan filmlarni yuklash...")
req_m = urllib.request.Request("https://amediatv.up-it.uz/api/v1/movies?page=1&limit=1000", headers=headers)
with urllib.request.urlopen(req_m, timeout=20) as res:
    movies = json.loads(res.read().decode("utf-8"))["data"]
print(f"-> {len(movies)} ta film yuklandi.")

all_items = series + movies
print(f"-> Jami {len(all_items)} ta anime qayta ishlanmoqda...")

sql_lines = ["BEGIN;"]
seen_slugs = set()

for i, it in enumerate(all_items):
    raw_slug = it.get("slug", "").strip()
    if not raw_slug:
        continue
    slug = raw_slug.lower().replace(" ", "-")
    if slug in seen_slugs:
        slug = f"{slug}-{i}"
    seen_slugs.add(slug)

    title_uz = it.get("uz", {}).get("title", "").strip() or slug
    title_ru = it.get("ru", {}).get("title", "").strip()
    synopsis = it.get("uz", {}).get("description", "").strip() or it.get("ru", {}).get("description", "").strip()

    thumb = it.get("thumbnail", "").strip()
    poster_url = ("https://amediatv.up-it.uz/" + thumb.lstrip("/")) if thumb else ""

    cover = it.get("cover", "").strip()
    banner_url = ("https://amediatv.up-it.uz/" + cover.lstrip("/")) if cover else ""

    try:
        year = int(it.get("published_year") or 2024)
    except:
        year = 2024

    try:
        ep_count = int(it.get("total_episodes") or 12)
    except:
        ep_count = 12

    try:
        curr_ep = int(it.get("available_episodes") or ep_count)
    except:
        curr_ep = ep_count

    status = "Completed" if curr_ep >= ep_count else "Ongoing"

    studio_obj = it.get("studio")
    studio = studio_obj.get("name", "Mappa") if isinstance(studio_obj, dict) else "Mappa"
    if not studio:
        studio = "Mappa"

    tag = f"tag_{i}"
    genres = [g.get("name", {}).get("uz", "").strip() for g in it.get("genres", []) if isinstance(g, dict) and g.get("name", {}).get("uz")]
    genres_items = ", ".join(f"${tag}${g}${tag}$" for g in genres if g)
    genres_sql = f"ARRAY[{genres_items}]::text[]" if genres_items else "ARRAY[]::text[]"
    stmt = (
        f"INSERT INTO anivorm_animes ("
        f"title_uz, title_en, title_jp, slug, synopsis, poster_url, banner_url, "
        f"score, episodes_count, current_episode, status, season, year, studio, genres"
        f") VALUES ("
        f"${tag}${title_uz}${tag}$, "
        f"${tag}${title_ru}${tag}$, "
        f"${tag}${title_ru}${tag}$, "
        f"${tag}${slug}${tag}$, "
        f"${tag}${synopsis}${tag}$, "
        f"${tag}${poster_url}${tag}$, "
        f"${tag}${banner_url}${tag}$, "
        f"8.5, {ep_count}, {curr_ep}, '{status}', 'Winter {year}', {year}, ${tag}${studio}${tag}$, "
        f"{genres_sql}"
        f") ON CONFLICT (slug) DO UPDATE SET "
        f"title_uz = EXCLUDED.title_uz, "
        f"synopsis = EXCLUDED.synopsis, "
        f"poster_url = COALESCE(NULLIF(anivorm_animes.poster_url, ''), EXCLUDED.poster_url), "
        f"banner_url = COALESCE(NULLIF(anivorm_animes.banner_url, ''), EXCLUDED.banner_url), "
        f"genres = EXCLUDED.genres, "
        f"studio = EXCLUDED.studio, "
        f"year = EXCLUDED.year, "
        f"episodes_count = EXCLUDED.episodes_count, "
        f"current_episode = EXCLUDED.current_episode, "
        f"status = EXCLUDED.status;\n"
    )
    sql_lines.append(stmt)

sql_lines.append("COMMIT;")

sql_file = "/tmp/import_anibla.sql"
with open(sql_file, "w", encoding="utf-8") as f:
    f.writelines(sql_lines)

print("3. SQL fayl tayyorlandi. PostgreSQL ga kiritilmoqda...")
os.system(f"sudo -u postgres psql -d nokori_go -f {sql_file} > /tmp/import.log 2>&1")

print("4. Muvaffaqiyatli yakunlandi! Bazadagi yangi natijalar:")
os.system("sudo -u postgres psql -d nokori_go -c 'SELECT count(*) as jami_animelar FROM anivorm_animes;'")
os.system("sudo -u postgres psql -d nokori_go -c 'SELECT id, title_uz, year, episodes_count, status FROM anivorm_animes ORDER BY id DESC LIMIT 5;'")
os.remove(sql_file)
