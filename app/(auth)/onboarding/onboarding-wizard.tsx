"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  Building2,
  Check,
  Copy,
  Home,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createFirstHouse,
  createOrganization,
  sendInvitations,
} from "@/app/(auth)/actions";
import { AuthCard, AuthWordmark } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StartTrialButton } from "@/components/billing/start-trial-button";
import { INVITE_ROLES } from "@/lib/validators/auth";
import type { ActionResult } from "@/lib/actions/result";

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

const ROLE_LABELS: Record<string, string> = {
  team_leader: "Team Leader",
  roster_coordinator: "Roster Coordinator",
  support_worker: "Support Worker",
  read_only: "Read Only / Auditor",
};

type OnboardingWizardProps = {
  userName: string;
  organizationId: string | null;
  stripeConfigured: boolean;
};

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function OnboardingWizard({
  userName,
  organizationId: initialOrgId,
  stripeConfigured,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(initialOrgId ? 2 : 1);
  const [organizationId, setOrganizationId] = useState<string | null>(
    initialOrgId
  );
  const [houseId, setHouseId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<
    { email: string; link: string }[]
  >([]);
  const [inviteRows, setInviteRows] = useState(2);

  const [orgState, orgAction] = useFormState(
    async (prev: ActionResult<{ organizationId: string }> | undefined, fd: FormData) => {
      const result = await createOrganization(prev, fd);
      if (result.success && result.data?.organizationId) {
        setOrganizationId(result.data.organizationId);
        setStep(2);
        toast.success("Organisation created");
      } else if (!result.success) {
        toast.error(result.error);
      }
      return result;
    },
    undefined
  );

  const [houseState, houseAction] = useFormState(
    async (
      prev: ActionResult<{ houseId: string }> | undefined,
      fd: FormData
    ) => {
      if (!organizationId) return prev;
      const result = await createFirstHouse(organizationId, prev, fd);
      if (result.success && result.data?.houseId) {
        setHouseId(result.data.houseId);
        setStep(3);
        toast.success("House added");
      } else if (!result.success) {
        toast.error(result.error);
      }
      return result;
    },
    undefined
  );

  const [inviteState, inviteAction] = useFormState(
    async (
      prev: ActionResult<{ links: { email: string; link: string }[] }> | undefined,
      fd: FormData
    ) => {
      if (!organizationId || !houseId) return prev;
      const result = await sendInvitations(organizationId, houseId, prev, fd);
      if (result.success && result.data?.links) {
        setInviteLinks(result.data.links);
        toast.success("Invitations created — copy links to share");
      } else if (!result.success) {
        toast.error(result.error);
      }
      return result;
    },
    undefined
  );

  const steps = [
    { id: 1, label: "Organisation", icon: Building2 },
    { id: 2, label: "First house", icon: Home },
    { id: 3, label: "Invite team", icon: Users },
    { id: 4, label: "Welcome", icon: Check },
  ];

  return (
    <div className="w-full max-w-2xl">
      <AuthWordmark />
      <div className="mb-8 flex justify-center gap-2">
        {steps.map((s) => (
          <motion.div
            key={s.id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
              step === s.id
                ? "bg-primary/10 text-primary"
                : step > s.id
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
            }`}
          >
            <s.icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">{s.label}</span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <AuthCard
              wide
              title="Your organisation"
              description="NDIS provider details — all data stays in Australia (Sydney)."
            >
              <form action={orgAction} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">Organisation name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN (optional)</Label>
                    <Input id="abn" name="abn" placeholder="12 345 678 901" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ndisRegistrationNumber">
                      NDIS registration (optional)
                    </Label>
                    <Input
                      id="ndisRegistrationNumber"
                      name="ndisRegistrationNumber"
                    />
                  </div>
                  <input type="hidden" name="timezone" value="Australia/Sydney" />
                </div>
                <PendingButton label="Continue" pendingLabel="Saving…" />
              </form>
            </AuthCard>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <AuthCard
              wide
              title="First SIL house"
              description="Add your primary residence. You can add more houses later."
            >
              <form action={houseAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="house-name">House name</Label>
                  <Input id="house-name" name="name" placeholder="Maple House" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Street address</Label>
                    <Input id="address" name="address" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input id="suburb" name="suburb" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" name="state" placeholder="NSW" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input id="postcode" name="postcode" maxLength={4} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxResidents">Max residents</Label>
                    <Input
                      id="maxResidents"
                      name="maxResidents"
                      type="number"
                      min={1}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border bg-muted/30 p-4">
                  <p className="mb-3 text-sm font-medium">Vehicle (optional)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name="vehicleMake" placeholder="Make" />
                    <Input name="vehicleModel" placeholder="Model" />
                    <Input name="vehicleRego" placeholder="Rego" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <PendingButton label="Continue" pendingLabel="Saving…" />
                </div>
              </form>
            </AuthCard>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <AuthCard
              wide
              title="Invite your team"
              description="Add emails now or skip — you can invite people anytime from Settings."
            >
              <form action={inviteAction} className="space-y-4">
                {Array.from({ length: inviteRows }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      name="email"
                      type="email"
                      placeholder="colleague@provider.com.au"
                      className="flex-1"
                    />
                    <Select name="role" defaultValue="support_worker">
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role] ?? role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setInviteRows((n) => Math.min(n + 1, 10))}
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Add another
                </Button>

                {inviteLinks.length > 0 ? (
                  <div className="space-y-2 rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm font-medium">Copy invite links</p>
                    {inviteLinks.map((item) => (
                      <motion.div
                        key={item.email}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 truncate text-muted-foreground">
                          {item.email}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(item.link);
                            toast.success("Link copied");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <PendingButton label="Create invites" pendingLabel="Creating…" />
                  <Button type="button" variant="ghost" onClick={() => setStep(4)}>
                    Skip for now
                  </Button>
                </div>
              </form>
            </AuthCard>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step-4"
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <AuthCard
              wide
              title={`You're all set, ${userName.split(" ")[0]}`}
              description="Start your 14-day free trial, then $29.99/month for your whole organisation."
            >
              <div className="flex flex-col gap-3">
                <StartTrialButton stripeConfigured={stripeConfigured} />
                {!stripeConfigured ? (
                  <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                    Online checkout is not available yet. Skip for now and set up billing
                    under Settings → Billing.
                  </p>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/dashboard">Skip to dashboard</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/settings/billing">Open billing settings</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Manage billing anytime under Settings → Billing.
                </p>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
