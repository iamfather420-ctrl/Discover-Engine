/** Daisy flower mark used in the header and favicon. */
export function DaisyLogo({ size = 28 }: { size?: number }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {petals.map((r) => (
        <ellipse key={r} cx="16" cy="7.5" rx="3.6" ry="6.5" fill="#f5f2e8" transform={`rotate(${r} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="5" fill="#f5c542" />
    </svg>
  );
}
