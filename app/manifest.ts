import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bet Ranch",
    short_name: "Bet Ranch",
    description: "Crypto originals casino with provably fair games.",
    start_url: "/",
    display: "standalone",
    background_color: "#070509",
    theme_color: "#ff3f9e",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
