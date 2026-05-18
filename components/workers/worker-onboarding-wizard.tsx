"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { submitComplianceDoc } from "@/app/(app)/workers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  COMPLIANCE_DOC_LABELS,
  MANDATORY_COMPLIANCE_DOCS,
  type ComplianceDocType,
} from "@/lib/types/workers";

const STEPS = [
  "Personal details",
  "Bank & super",
  "Emergency contact",
  "Mandatory documents",
  "Skills & certifications",
  "Submit",
] as const;

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

export function WorkerOnboardingWizard({
  profileId,
  workerId,
}: {
  profileId: string;
  workerId: string;
}) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<Set<ComplianceDocType>>(new Set());
  const [docExpiries, setDocExpiries] = useState<Partial<Record<ComplianceDocType, string>>>({});

  const canProceedFromDocs = MANDATORY_COMPLIANCE_DOCS.every((t) =>
    uploadedDocs.has(t)
  );

  const handleDocUpload = async (docType: ComplianceDocType) => {
    const expiry = docExpiries[docType];
    if (!expiry) {
      toast.error("Enter an expiry date first");
      return;
    }
    const fd = new FormData();
    fd.set("workerId", workerId);
    fd.set("docType", docType);
    fd.set("docName", COMPLIANCE_DOC_LABELS[docType]);
    fd.set("expiryDate", expiry);
    const result = await submitComplianceDoc(fd);
    if (result.success) {
      setUploadedDocs((prev) => new Set(prev).add(docType));
      toast.success(`${COMPLIANCE_DOC_LABELS[docType]} submitted`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-heading">
          Welcome to Silman
        </CardTitle>
        <CardDescription>
          Complete your worker profile — step {step + 1} of {STEPS.length}
        </CardDescription>
        <div className="flex gap-1 pt-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-[280px] space-y-4"
          >
            {step === 0 ? (
              <>
                <Label htmlFor="phone">Mobile phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+61 400 000 000"
                />
              </>
            ) : null}

            {step === 1 ? (
              <p className="text-sm text-muted-foreground">
                Bank and super details can be added now or skipped and completed
                later in your profile.
              </p>
            ) : null}

            {step === 2 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ec-name">Emergency contact name</Label>
                  <Input
                    id="ec-name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec-phone">Emergency contact phone</Label>
                  <Input
                    id="ec-phone"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload each mandatory document with its expiry date. You cannot
                  proceed until all are submitted.
                </p>
                {MANDATORY_COMPLIANCE_DOCS.map((docType) => (
                  <div
                    key={docType}
                    className="space-y-2 rounded-xl border p-4"
                  >
                    <p className="font-medium">{COMPLIANCE_DOC_LABELS[docType]}</p>
                    <Input
                      type="date"
                      value={docExpiries[docType] ?? ""}
                      onChange={(e) =>
                        setDocExpiries((prev) => ({
                          ...prev,
                          [docType]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      variant={uploadedDocs.has(docType) ? "secondary" : "outline"}
                      onClick={() => void handleDocUpload(docType)}
                      disabled={uploadedDocs.has(docType)}
                    >
                      {uploadedDocs.has(docType) ? (
                        <>
                          <Check className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                          Submitted
                        </>
                      ) : (
                        <>
                          <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <p className="text-sm text-muted-foreground">
                Optional certifications (manual handling, PEG feeding, etc.) can be
                added from My Compliance after onboarding.
              </p>
            ) : null}

            {step === 5 ? (
              <div className="rounded-2xl bg-muted/50 p-6 text-center">
                <Check className="mx-auto mb-3 h-10 w-10 text-success" strokeWidth={1.5} />
                <p className="font-medium">Ready to submit</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your profile will be reviewed by a team leader. You&apos;ll be
                  notified when approved.
                </p>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 3 && !canProceedFromDocs}
            >
              Continue
              <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button
              onClick={() => {
                toast.success("Onboarding submitted — awaiting manager approval");
                window.location.href = "/my-compliance";
              }}
            >
              Submit for approval
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
