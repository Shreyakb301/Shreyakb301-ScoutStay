export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} StayCompare</p>
        <p>Compare stays. Book with confidence.</p>
      </div>
    </footer>
  );
}
