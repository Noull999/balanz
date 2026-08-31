import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Balanz",
    short_name: "Balanz",
    description:
      "Control de gastos personales que analiza tus movimientos y te avisa lo que no ves.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
