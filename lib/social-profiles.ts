export type SocialProfile = {
  platform: "instagram" | "facebook" | "tiktok" | "linkedin";
  label: string;
  url: string;
};

const platforms = {
  instagram: { label: "Instagram", hosts: ["instagram.com", "www.instagram.com"] },
  facebook: { label: "Facebook", hosts: ["facebook.com", "www.facebook.com", "m.facebook.com"] },
  tiktok: { label: "TikTok", hosts: ["tiktok.com", "www.tiktok.com"] },
  linkedin: { label: "LinkedIn", hosts: ["linkedin.com", "www.linkedin.com"] },
} as const;

export function parseSocialProfiles(value: unknown): SocialProfile[] {
  if (typeof value !== "string") return [];
  const found = new Map<SocialProfile["platform"], SocialProfile>();
  for (const line of value.split(/\r?\n/)) {
    const match = line.match(/https?:\/\/[^\s]+/i);
    if (!match) continue;
    let url: URL;
    try {
      url = new URL(match[0].replace(/[),.;]+$/, ""));
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const platform = (Object.entries(platforms) as [SocialProfile["platform"], (typeof platforms)[keyof typeof platforms]][])
      .find(([, config]) => config.hosts.includes(url.hostname.toLowerCase() as never))?.[0];
    if (!platform || found.has(platform)) continue;
    found.set(platform, { platform, label: platforms[platform].label, url: url.toString() });
  }
  return [...found.values()];
}
