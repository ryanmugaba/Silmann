import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-accent/30 px-4 py-12">
      {children}
      <footer className="mt-8 flex gap-4 text-xs text-muted-foreground">
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
