/**
 * Inline Instagram glyph. `lucide-react@^1.18.0` does not export an `Instagram`
 * icon (see DESIGN.md §11), so the app uses this small shared SVG wherever the
 * Instagram mark is needed (footer, nav, admin tab, post cards).
 */
export function InstagramIcon({
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
