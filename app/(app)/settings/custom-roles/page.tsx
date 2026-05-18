import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { KeyRound } from "lucide-react";

export const metadata = { title: "Custom roles — Settings — Silman" };

export default function CustomRolesSettingsPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading">
          Custom roles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={KeyRound}
          title="Custom roles coming soon"
          description="Create named roles with tailored permission sets. Owners can configure this in a future release."
        />
      </CardContent>
    </Card>
  );
}
