import { redirect } from "next/navigation";
import IntegrationsDevPanel from "./integrations-dev";

/** Developer-only — hidden from Settings nav in production. */
export default function IntegrationsSettingsPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.SHOW_DEV_INTEGRATIONS !== "true"
  ) {
    redirect("/settings/profile");
  }

  return <IntegrationsDevPanel />;
}
