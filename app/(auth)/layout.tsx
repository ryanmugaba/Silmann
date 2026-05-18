import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-accent/15 px-4 py-12">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-accent/60 blur-3xl" />
      {children}
      <footer className="relative mt-8 flex w-full max-w-md justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground hover:underline">
          Terms
        </Link>
      </footer>
    </div>
  );
}
