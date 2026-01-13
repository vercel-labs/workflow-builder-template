import Image from "next/image";

/**
 * Apify Icon Component
 * Used as the icon for Run Actor action
 */
export function ApifyIcon({ className }: { className?: string }) {
  return (
    <Image
      alt="Apify logo"
      className={className}
      height={24}
      src="/integrations/apify.svg"
      width={24}
    />
  );
}
