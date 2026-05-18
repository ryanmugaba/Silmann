import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug } from "lucide-react";

export const metadata = { title: "Integrations — Settings — Silman" };

const INTEGRATIONS = [
  { name: "Resend", description: "Transactional email delivery", status: "planned" },
  { name: "Twilio", description: "SMS notifications (paid add-on)", status: "planned" },
  { name: "OpenAI", description: "AI assistant (@AI mentions)", status: "active" },
];

export default function IntegrationsSettingsPage() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display tracking-heading flex items-center gap-2">
          <Plug className="h-5 w-5" strokeWidth={1.5} />
          Integrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {INTEGRATIONS.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-xl border px-4 py-3"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <Badge
              variant={item.status === "active" ? "default" : "secondary"}
              className="rounded-lg capitalize"
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
