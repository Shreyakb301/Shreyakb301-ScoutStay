export function SiteFooter() {
  return (
    <footer className="border-t border-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <p className="eyebrow">
          © {new Date().getFullYear()} ScoutStay
        </p>
        <p className="eyebrow">Location data, OpenStreetMap</p>
      </div>
    </footer>
  );
}
