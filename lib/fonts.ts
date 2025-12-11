import {
  Geist_Mono as createMono,
  Anek_Latin as createSans,
} from "next/font/google";

export const sans = createSans({
  variable: "--font-anek-latin",
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
