const SECTION_LINKS = [
  { id: "summary", label: "Summary" },
  { id: "timeline", label: "Timeline" },
  { id: "related", label: "Related officers" },
  { id: "career-signals", label: "Career signals" },
  { id: "learn-more", label: "Learn more" }
];

export function ProfileSectionNav(): JSX.Element {
  return (
    <nav data-testid="profile-section-nav" className="panel p-3">
      <p className="text-label">Jump to section</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SECTION_LINKS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="pill transition hover:border-accent/30 hover:text-accent"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
