export function FalIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-label="fal.ai logo"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>fal.ai</title>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-2.54c-2.24-.59-4-2.57-4-4.96 0-.34.03-.67.09-1h1.99c-.05.33-.08.66-.08 1 0 1.93 1.57 3.5 3.5 3.5h.5v2.54c-1.04-.13-2-.41-2.86-.81zm3-5.5c0-1.93-1.57-3.5-3.5-3.5H10V6c1.04.13 2 .41 2.86.81L13 5.5v2.54c2.24.59 4 2.57 4 4.96 0 .34-.03.67-.09 1h-1.99c.05-.33.08-.66.08-1z" />
    </svg>
  );
}
