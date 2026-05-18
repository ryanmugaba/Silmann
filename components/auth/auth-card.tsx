import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  wide?: boolean;
};

export function AuthWordmark() {
  return (
    <Link href="/" className="group mb-8 flex flex-col items-center gap-1">
      <span className="font-display text-2xl font-semibold tracking-heading text-foreground">
        Silman
      </span>
      <span className="text-sm text-muted-foreground">
        NDIS Supported Independent Living
      </span>
    </Link>
  );
}

export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
  wide = false,
}: AuthCardProps) {
  return (
    <div className={cn("w-full", wide ? "max-w-2xl" : "max-w-md")}>
      <AuthWordmark />
      <Card className={cn("shadow-card", className)}>
        <CardHeader className="space-y-1 pb-4">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? (
          <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
