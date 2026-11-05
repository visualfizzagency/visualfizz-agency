/**
 * Vercel Serverless Function — api/behance.js
 * Fetches real Behance projects from founder profile: behance.net/mdayubmondol0
 * Zero dependencies, built-in Node fetch, with AbortController timeout & silent fallback.
 */

const FALLBACK_PROJECTS = [
  {
    id: "256445097",
    title: "Creative Smartphone Advertisement Poster",
    category: "social",
    date: "Sep 30, 2026",
    url: "https://www.behance.net/gallery/256445097/Creative-Smartphone-Advertisement-Poster",
    cover: null,
    icon: "smartphone"
  },
  {
    id: "252327431",
    title: "Creative Mobile Phone Advertisement Posters",
    category: "social",
    date: "Jul 7, 2026",
    url: "https://www.behance.net/gallery/252327431/Creative-Mobile-Phone-Advertisement-Posters",
    cover: null,
    icon: "smartphone"
  },
  {
    id: "250870757",
    title: "FIFA World Cup 2026 Match Fixtures",
    category: "campaign",
    date: "Jun 10, 2026",
    url: "https://www.behance.net/gallery/250870757/FIFA-World-Cup-2026-Match-Fixtures",
    cover: null,
    icon: "trophy"
  },
  {
    id: "250701061",
    title: "Bike Creative Social Media post | Ads | Creative Banner",
    category: "social",
    date: "Jun 7, 2026",
    url: "https://www.behance.net/gallery/250701061/Bike-Creative-Social-Media-post-Ads-Creative-Banner",
    cover: null,
    icon: "bike"
  },
  {
    id: "250658769",
    title: "Match Day Poster Design",
    category: "campaign",
    date: "Jun 6, 2026",
    url: "https://www.behance.net/gallery/250658769/Match-Day-Poster-Design",
    cover: null,
    icon: "trophy"
  },
  {
    id: "248730655",
    title: "Helio Billboard Design - Bold, Dynamic Visuals",
    category: "branding",
    date: "May 4, 2026",
    url: "https://www.behance.net/gallery/248730655/Helio-Billboard-Design-Bold-Dynamic-Visuals",
    cover: null,
    icon: "building-2"
  },
  {
    id: "247509035",
    title: "Mobile Phone Social Media Post Design",
    category: "social",
    date: "Apr 13, 2026",
    url: "https://www.behance.net/gallery/247509035/Mobile-Phone-Social-Media-Post-Design",
    cover: null,
    icon: "smartphone"
  },
  {
    id: "246670821",
    title: "Educational Reels Editing Portfolio | Study Abroad",
    category: "video",
    date: "Mar 30, 2026",
    url: "https://www.behance.net/gallery/246670821/Educational-Reels-Editing-Portfolio-Study-Abroad",
    cover: null,
    icon: "clapperboard"
  },
  {
    id: "245523325",
    title: "Global Horizons | Study Abroad Branding & Reel Series",
    category: "branding",
    date: "Mar 10, 2026",
    url: "https://www.behance.net/gallery/245523325/Global-Horizons-Study-Abroad-Branding-Reel-Series",
    cover: null,
    icon: "globe"
  },
  {
    id: "245397077",
    title: "Women's Day Social Media Banner",
    category: "social",
    date: "Mar 8, 2026",
    url: "https://www.behance.net/gallery/245397077/Womens-Day-Social-Media-Banner",
    cover: null,
    icon: "flower-2"
  },
  {
    id: "241176295",
    title: "Bangladesh National Football Team Campaign",
    category: "campaign",
    date: "Dec 28, 2025",
    url: "https://www.behance.net/gallery/241176295/Bangladesh-National-Football-Team-Campaign",
    cover: null,
    icon: "flag"
  },
  {
    id: "240043843",
    title: "আসছে থার্টি ফার্স্ট নাইটে – শব্দ দূষণ না করি Typography",
    category: "branding",
    date: "Dec 8, 2025",
    url: "https://www.behance.net/gallery/240043843/-Typography",
    cover: null,
    icon: "pen-tool"
  },
  {
    id: "239593123",
    title: "Australia Education Expo 2025 | Study Abroad",
    category: "campaign",
    date: "Dec 1, 2025",
    url: "https://www.behance.net/gallery/239593123/Australia-Education-Expo-2025-Study-Abroad",
    cover: null,
    icon: "graduation-cap"
  }
];

const FALLBACK_BY_ID = new Map(FALLBACK_PROJECTS.map(p => [p.id, p]));

function cleanTitle(raw) {
  if (!raw) return "";
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseBehanceHtml(html) {
  const projects = [];
  const seenIds = new Set();
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*class="[^"]*js-cover-image[^"]*"[^>]*alt="([^"]*)"/g;
  let m;

  while ((m = imgRegex.exec(html)) !== null) {
    const rawCover = m[1];
    const rawAlt = m[2];
    const searchSlice = html.substring(m.index, m.index + 5000);
    const linkMatch = searchSlice.match(/href="(\/gallery\/(\d+)\/([^"\s>]+))"/);

    if (linkMatch) {
      const id = linkMatch[2];
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const fallback = FALLBACK_BY_ID.get(id);

        // A cover is valid ONLY if hosted on mir-s3-cdn-cf.behance.net and does NOT contain "blocked"
        const isBlockedOrInvalid = !rawCover ||
          !rawCover.includes("mir-s3-cdn-cf.behance.net") ||
          rawCover.toLowerCase().includes("blocked");

        let cover = null;
        let icon = fallback ? fallback.icon : null;

        if (!isBlockedOrInvalid) {
          const cover808 = rawCover.replace("/projects/404/", "/projects/808/");
          if (!cover808.toLowerCase().includes("blocked") && cover808.includes("mir-s3-cdn-cf.behance.net")) {
            cover = cover808;
          }
        }

        const project = {
          id,
          title: cleanTitle(rawAlt) || (fallback ? fallback.title : ""),
          url: "https://www.behance.net" + linkMatch[1],
          cover: cover
        };

        if (icon) {
          project.icon = icon;
        }

        projects.push(project);
        if (projects.length >= 24) break;
      }
    }
  }

  return projects;
}

module.exports = async function handler(req, res) {
  // CORS & Caching headers
  if (res.setHeader) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  if (req.method === "OPTIONS") {
    if (res.status) res.status(200);
    if (res.end) res.end();
    return;
  }

  const profileUrl = "https://www.behance.net/mdayubmondol0";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(profileUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Behance profile returned HTTP ${response.status}`);
    }

    const html = await response.text();
    const projects = parseBehanceHtml(html);

    if (!projects || projects.length === 0) {
      throw new Error("No projects found in Behance HTML");
    }

    if (res.setHeader) {
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    }
    if (res.status) res.status(200);

    const body = JSON.stringify({
      source: "behance",
      count: projects.length,
      projects
    });

    if (res.send) {
      res.send(body);
    } else if (res.end) {
      res.end(body);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[api/behance] Live fetch failed, serving curated fallback:", err.message);

    if (res.setHeader) {
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    }
    if (res.status) res.status(200);

    const fallbackBody = JSON.stringify({
      source: "fallback",
      count: FALLBACK_PROJECTS.length,
      projects: FALLBACK_PROJECTS
    });

    if (res.send) {
      res.send(fallbackBody);
    } else if (res.end) {
      res.end(fallbackBody);
    }
  }
};
