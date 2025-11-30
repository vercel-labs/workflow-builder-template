import { Database, Flame, Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface IntegrationIconProps {
  integration: "linear" | "resend" | "slack" | "vercel" | "database" | "ai-gateway" | "firecrawl" | "superagent";
  className?: string;
}

// Inline SVG components for icons that need currentColor support
function ResendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      height="12"
      viewBox="0 0 600 600"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M186 447.471V154H318.062C336.788 154 353.697 158.053 368.79 166.158C384.163 174.263 396.181 185.443 404.845 199.698C413.51 213.672 417.842 229.604 417.842 247.491C417.842 265.938 413.51 282.568 404.845 297.381C396.181 311.915 384.302 323.375 369.209 331.759C354.117 340.144 337.067 344.337 318.062 344.337H253.917V447.471H186ZM348.667 447.471L274.041 314.99L346.99 304.509L430 447.471H348.667ZM253.917 289.835H311.773C319.04 289.835 325.329 288.298 330.639 285.223C336.229 281.869 340.421 277.258 343.216 271.388C346.291 265.519 347.828 258.811 347.828 251.265C347.828 243.718 346.151 237.15 342.797 231.56C339.443 225.691 334.552 221.219 328.124 218.144C321.975 215.07 314.428 213.533 305.484 213.533H253.917V289.835Z" />
    </svg>
  );
}

function VercelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      height="12"
      viewBox="0 0 1155 1000"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m577.3 0 577.4 1000H0z" />
    </svg>
  );
}

function FirecrawlIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      height="12"
      viewBox="0 0 50 72"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M41.7154 23.1929C38.9531 24.0129 36.8707 25.8677 35.3457 27.8826C35.0183 28.3151 34.3358 27.9901 34.4658 27.4601C37.3856 15.4534 33.5283 5.47401 21.5039 0.561817C20.894 0.311833 20.259 0.859299 20.419 1.49926C25.8887 23.4604 2.88236 21.608 5.78971 46.504C5.83971 46.9314 5.35973 47.2239 5.00975 46.9739C3.9198 46.1915 2.70237 44.5591 1.86741 43.4116C1.62242 43.0742 1.09245 43.1692 0.979951 43.5716C0.314984 45.9765 0 48.2413 0 50.4912C0 59.2407 4.49727 66.9427 11.3044 71.4074C11.6944 71.6624 12.1944 71.2974 12.0619 70.8499C11.7119 69.675 11.5144 68.4351 11.4994 67.1527C11.4994 66.3652 11.5494 65.5603 11.6719 64.8103C11.9569 62.9254 12.6119 61.1305 13.7118 59.4957C17.4841 53.8335 25.0462 48.3638 23.8388 40.9368C23.7613 40.4668 24.3163 40.1569 24.6663 40.4793C29.9935 45.3465 31.0485 51.8936 30.1735 57.7658C30.0985 58.2757 30.7385 58.5482 31.061 58.1482C31.8759 57.1283 32.8709 56.2334 33.9533 55.5609C34.2233 55.3934 34.5833 55.5209 34.6858 55.8209C35.2882 57.5733 36.1832 59.2182 37.0281 60.8631C38.0381 62.8404 38.5756 65.0978 38.4906 67.4877C38.4481 68.6501 38.2556 69.775 37.9331 70.8449C37.7956 71.2974 38.2906 71.6749 38.6881 71.4149C45.5002 66.9502 50 59.2482 50 50.4937C50 47.4514 49.4675 44.4691 48.4601 41.6743C46.3477 35.8121 40.988 31.4099 42.3429 23.7704C42.4079 23.4054 42.0704 23.0879 41.7154 23.1929Z"
        fill="#FA5D19"
      />
    </svg>
  );
}

export function IntegrationIcon({
  integration,
  className = "h-3 w-3",
}: IntegrationIconProps) {
  const iconMap = {
    linear: "/integrations/linear.svg",
    slack: "/integrations/slack.svg",
    superagent: "/integrations/superagent.svg",
  };

  // Use inline SVG for resend and vercel to support currentColor
  if (integration === "resend") {
    return <ResendIcon className={cn("text-foreground", className)} />;
  }

  if (integration === "vercel") {
    return <VercelIcon className={cn("text-foreground", className)} />;
  }

  if (integration === "database") {
    return <Database className={cn("text-foreground", className)} />;
  }

  if (integration === "ai-gateway") {
    return <Sparkles className={cn("text-foreground", className)} />;
  }

  if (integration === "firecrawl") {
    return <FirecrawlIcon className={cn("text-foreground", className)} />;
  }

  if (integration === "superagent") {
    return (
      <Image
        alt="Superagent logo"
        className={className}
        height={12}
        src={iconMap.superagent}
        width={12}
      />
    );
  }

  return (
    <Image
      alt={`${integration} logo`}
      className={className}
      height={12}
      src={iconMap[integration as "linear" | "slack"]}
      width={12}
    />
  );
}
