export function PerplexityIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Perplexity logo"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Perplexity</title>
      <path d="M24 4.5v39M13.73 16.573v-9.99L24 16.573m0 14.5L13.73 41.417V27.01L24 16.573m0 0l10.27-9.99v9.99" />
      <path d="M13.73 31.396H9.44V16.573h29.12v14.823h-4.29" />
      <path d="M24 16.573L34.27 27.01v14.407L24 31.073" />
    </svg>
  );
}
