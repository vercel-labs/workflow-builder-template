import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { BrandfetchCredentials } from "../credentials";

const BRANDFETCH_API_URL = "https://api.brandfetch.io/v2";

type BrandfetchLogo = {
  type: string;
  theme: string;
  formats: Array<{
    src: string;
    format: string;
  }>;
};

type BrandfetchColor = {
  hex: string;
  type: string;
  brightness: number;
};

type BrandfetchLink = {
  name: string;
  url: string;
};

type BrandfetchIndustry = {
  name: string;
  slug: string;
  score: number;
};

type BrandfetchResponse = {
  id: string;
  name: string;
  domain: string;
  description?: string;
  longDescription?: string;
  logos?: BrandfetchLogo[];
  colors?: BrandfetchColor[];
  links?: BrandfetchLink[];
  company?: {
    industries?: BrandfetchIndustry[];
  };
};

type GetBrandResult =
  | {
      success: true;
      name: string;
      domain: string;
      description: string;
      logoUrl: string;
      iconUrl: string;
      colors: string[];
      links: Array<{ name: string; url: string }>;
      industry: string;
    }
  | { success: false; error: string };

export type GetBrandCoreInput = {
  identifierType: "domain" | "ticker" | "isin";
  identifier: string;
};

export type GetBrandInput = StepInput &
  GetBrandCoreInput & {
    integrationId?: string;
  };

function findLogoUrl(logos: BrandfetchLogo[] | undefined, type: string): string {
  if (!logos) return "";

  const logo = logos.find((l) => l.type === type);
  if (!logo || !logo.formats || logo.formats.length === 0) return "";

  // Prefer PNG or SVG
  const pngFormat = logo.formats.find((f) => f.format === "png");
  if (pngFormat) return pngFormat.src;

  const svgFormat = logo.formats.find((f) => f.format === "svg");
  if (svgFormat) return svgFormat.src;

  return logo.formats[0].src;
}

async function stepHandler(
  input: GetBrandCoreInput,
  credentials: BrandfetchCredentials
): Promise<GetBrandResult> {
  const apiKey = credentials.BRANDFETCH_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "BRANDFETCH_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.identifier) {
    return {
      success: false,
      error: "Identifier is required",
    };
  }

  // Validate identifier format based on type
  let identifier = input.identifier.trim();
  const identifierType = input.identifierType || "domain";

  if (identifierType === "domain") {
    // Validate domain format: must have at least one character before and after the dot, no spaces, no leading/trailing dot
    if (
      !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/.test(identifier)
    ) {
      return {
        success: false,
        error: "Invalid domain format. Expected format: example.com",
      };
    }
  } else if (identifierType === "ticker") {
    identifier = identifier.toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(identifier)) {
      return {
        success: false,
        error: "Invalid ticker format. Expected 1-5 uppercase letters (e.g., NKE)",
      };
    }
  } else if (identifierType === "isin") {
    identifier = identifier.toUpperCase();
    if (!/^[A-Z]{2}[A-Z0-9]{10}$/.test(identifier)) {
      return {
        success: false,
        error: "Invalid ISIN format. Expected 12 characters starting with country code (e.g., US6541061031)",
      };
    }
  }

  try {
    const response = await fetch(
      `${BRANDFETCH_API_URL}/brands/${encodeURIComponent(identifier)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `Brand not found for: ${identifier}`,
        };
      }
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const brand = (await response.json()) as BrandfetchResponse;

    // Extract primary logo and icon URLs
    const logoUrl = findLogoUrl(brand.logos, "logo");
    const iconUrl = findLogoUrl(brand.logos, "icon") || findLogoUrl(brand.logos, "symbol");

    // Extract colors (just hex values)
    const colors = brand.colors?.map((c) => c.hex) || [];

    // Extract links
    const links = brand.links?.map((l) => ({ name: l.name, url: l.url })) || [];

    // Get primary industry
    const industry = brand.company?.industries?.[0]?.name || "";

    return {
      success: true,
      name: brand.name || "",
      domain: brand.domain || "",
      description: brand.description || brand.longDescription || "",
      logoUrl,
      iconUrl,
      colors,
      links,
      industry,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get brand: ${getErrorMessage(error)}`,
    };
  }
}

export async function getBrandStep(
  input: GetBrandInput
): Promise<GetBrandResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getBrandStep.maxRetries = 0;

export const _integrationType = "brandfetch";
