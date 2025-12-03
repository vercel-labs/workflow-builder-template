export function Web3Icon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="Web3"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Web3</title>
      {/* Blockchain/connected blocks icon */}
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l8 4v8.64l-8 4-8-4V8.18l8-4z" />
      <path d="M12 6L6 9v6l6 3 6-3V9l-6-3zm0 2.18l3.82 1.91v3.82L12 15.82l-3.82-1.91V10.09L12 8.18z" />
    </svg>
  );
}
