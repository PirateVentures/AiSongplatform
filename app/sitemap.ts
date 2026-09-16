import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/whop";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const lastModified = new Date("2026-09-16");
  const paths: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/create", priority: 0.9 },
    { path: "/birthday", priority: 0.8 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
    { path: "/refunds", priority: 0.4 },
  ];
  return paths.map(({ path, priority }) => ({
    url: `${base}${path || "/"}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
