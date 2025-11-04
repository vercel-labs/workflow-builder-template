import {
  Geist_Mono as createMono,
  Geist as createSans,
} from "next/font/google";

export const sans = createSans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

export const mono = createMono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});
