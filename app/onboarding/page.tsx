"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";

const STEPS = [
  { n: "01", label: "About you" },
  { n: "02", label: "Weight goal" },
  { n: "03", label: "Activity" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    heightCm: "",
    birthDate: "",
    gender: "MALE",
    goalWeightKg: "",
    activityLevel: "SEDENTARY",
  });
  const [currentWeight, setCurrentWeight] = useState("");
  const [currentBodyFat, setCurrentBodyFat] = useState("");

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const calculateBMR = () => {
    // Harris-Benedict equation
    const height = parseFloat(profile.heightCm);
    const weight = parseFloat(currentWeight);
    const birthDate = new Date(profile.birthDate);
    const age = new Date().getFullYear() - birthDate.getFullYear();

    if (profile.gender === "MALE") {
      return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    } else {
      return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    }
  };

  const calculateTDEE = (bmr: number) => {
    const multipliers: Record<string, number> = {
      SEDENTARY: 1.2,
      LIGHTLY_ACTIVE: 1.375,
      MODERATELY_ACTIVE: 1.55,
      VERY_ACTIVE: 1.725,
      EXTRA_ACTIVE: 1.9,
    };
    return Math.round(bmr * multipliers[profile.activityLevel]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const bmr = calculateBMR();
      const tdee = calculateTDEE(bmr);

      // Check for test user ID (set by E2E tests)
      const testUserId = (window as unknown as Record<string, string | undefined>).__TEST_USER_ID__;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (testUserId) {
        headers["X-Test-User-Id"] = testUserId;
      }

      const response = await fetch("/api/user/initialize", {
        method: "POST",
        headers,
        body: JSON.stringify({
          profile: {
            ...profile,
            heightCm: parseFloat(profile.heightCm),
            birthDate: new Date(profile.birthDate).toISOString(),
            goalWeightKg: parseFloat(profile.goalWeightKg),
          },
          metabolicProfile: {
            trueMetabolicRate: tdee,
            bmrEstimate: Math.round(bmr),
          },
          calorieBank: {
            dailyTarget: tdee,
          },
          weightEntry: {
            weightKg: parseFloat(currentWeight),
            bodyFatPercent: currentBodyFat ? parseFloat(currentBodyFat) : null,
          },
        }),
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        let errorData: Record<string, string | number | undefined> = {};
        const contentType = response.headers.get("content-type");
        try {
          if (contentType?.includes("application/json")) {
            errorData = await response.json();
          } else {
            const text = await response.text();
            errorData = { error: "Request failed", status: response.status, body: text.slice(0, 500) };
          }
        } catch (parseError) {
          void parseError;
          errorData = { error: "Failed to parse response", status: response.status };
        }
        console.error("Failed to initialize user:", errorData);
        // Store error on window for E2E tests to capture
        (window as unknown as Record<string, string | undefined>).__lastError__ = JSON.stringify(errorData);
        setSubmitError(String(errorData.error || errorData.message || "Something went wrong. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-hero min-h-screen px-4 py-10 sm:px-8 lg:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header>
          <span className="seal h-11 w-11 text-[10px] font-bold tracking-tight">NM</span>
          <p className="smallcaps mt-10 text-foreground">NutriMind Reserve · Account opening</p>
          <h1
            id="account-opening-title"
            className="text-display mt-4 font-bold text-foreground"
          >
            Establish your daily reserve.
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-[1.7] text-muted-foreground">
            Three short entries set your opening allowance. NutriMind uses them to estimate a starting target; you remain in control of every setting afterward.
          </p>

          <div className="mt-10 border-y border-border py-4">
            <div className="ledger-row border-t-0">
              <span className="smallcaps">Application</span>
              <span className="num text-sm text-foreground">NM-NEW</span>
            </div>
            <div className="ledger-row">
              <span className="smallcaps">Entries required</span>
              <span className="num text-sm text-foreground">03</span>
            </div>
            <div className="ledger-row">
              <span className="smallcaps">Opening balance</span>
              <span className="num text-sm text-foreground">0 kcal</span>
            </div>
          </div>
        </header>

        <section className="surface mt-10 overflow-hidden" aria-label="Calorie reserve application">
          <div className="foil" />
          <div className="p-5 sm:p-8">
            <div className="border-b border-border pb-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="smallcaps">Reserve application</p>
                <span className="num text-xs text-muted-foreground">Step {step}/3</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">
                Set up your Calorie Bank
              </h2>
            </div>

            <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Account setup progress">
              {STEPS.map((s, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === step;
                const isDone = stepNum < step;
                return (
                  <li
                    key={s.n}
                    aria-current={isActive ? "step" : undefined}
                    className={`border-t-2 pt-3 ${isActive || isDone ? "border-[var(--brass)]" : "border-border"}`}
                  >
                    <span className="num text-sm font-semibold text-foreground">{s.n}</span>
                    <span className={`smallcaps mt-1 block ${isActive ? "text-foreground" : ""}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div
              className="track mt-4"
              role="progressbar"
              aria-label="Account setup progress"
              aria-valuemin={1}
              aria-valuemax={STEPS.length}
              aria-valuenow={step}
            >
              <div className="fill-indigo" style={{ width: `${(step / STEPS.length) * 100}%` }} />
            </div>

            <div className="mt-8" aria-live="polite">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <p className="smallcaps text-foreground">01 · Account holder</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Basic details establish the first metabolic estimate.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="height" className="smallcaps">Height (cm)</Label>
                      <Input id="height" type="number" value={profile.heightCm} onChange={(e) => setProfile({ ...profile, heightCm: e.target.value })} placeholder="175" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="birthDate" className="smallcaps">Birth date</Label>
                      <Input id="birthDate" type="date" value={profile.birthDate} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} className="mt-1.5" />
                    </div>
                  </div>
                  <fieldset>
                    <legend className="smallcaps">Gender</legend>
                    <RadioGroup value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v as "MALE" | "FEMALE" })} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="flex min-h-11 items-center space-x-3 border border-border bg-card px-3 py-2">
                        <RadioGroupItem value="MALE" id="male" />
                        <Label htmlFor="male" className="flex-1">Male</Label>
                      </div>
                      <div className="flex min-h-11 items-center space-x-3 border border-border bg-card px-3 py-2">
                        <RadioGroupItem value="FEMALE" id="female" />
                        <Label htmlFor="female" className="flex-1">Female</Label>
                      </div>
                    </RadioGroup>
                  </fieldset>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="smallcaps text-foreground">02 · Goal mandate</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Record today&apos;s position and the weight you are working toward.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="currentWeight" className="smallcaps">Current weight (kg)</Label>
                      <Input id="currentWeight" type="number" step="0.1" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} placeholder="75.5" className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="goalWeight" className="smallcaps">Goal weight (kg)</Label>
                      <Input id="goalWeight" type="number" step="0.1" value={profile.goalWeightKg} onChange={(e) => setProfile({ ...profile, goalWeightKg: e.target.value })} placeholder="70" className="mt-1.5" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bodyFat" className="smallcaps">Body fat % (optional)</Label>
                    <Input id="bodyFat" type="number" step="0.1" value={currentBodyFat} onChange={(e) => setCurrentBodyFat(e.target.value)} placeholder="18" className="mt-1.5" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <p className="smallcaps text-foreground">03 · Activity profile</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Choose the level that best reflects an ordinary week.
                    </p>
                  </div>
                  <fieldset>
                    <legend className="sr-only">Activity level</legend>
                    <RadioGroup value={profile.activityLevel} onValueChange={(v) => setProfile({ ...profile, activityLevel: v as typeof profile.activityLevel })} className="grid gap-2">
                      {[
                        { value: "SEDENTARY", label: "Sedentary (desk job)" },
                        { value: "LIGHTLY_ACTIVE", label: "Lightly Active (1-2 days/week)" },
                        { value: "MODERATELY_ACTIVE", label: "Moderately Active (3-5 days/week)" },
                        { value: "VERY_ACTIVE", label: "Very Active (6-7 days/week)" },
                        { value: "EXTRA_ACTIVE", label: "Extra Active (athlete)" },
                      ].map((option) => (
                        <div key={option.value} className="flex min-h-11 items-center space-x-3 border border-border bg-card px-3 py-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value} className="flex-1">{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>

                  {profile.heightCm && currentWeight && profile.birthDate && (
                    <div className="surface-raised border-t-2 border-t-foreground p-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="smallcaps">Opening daily allowance</p>
                        <p className="num-display text-2xl text-foreground">
                          {calculateTDEE(calculateBMR())} <span className="text-sm font-normal text-muted-foreground">cal</span>
                        </p>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        This is your starting budget. You can revise it later in Account Controls.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {submitError && (
                <p className="mt-5 border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}

              <div className="mt-8 flex justify-between border-t border-border pt-6">
                {step > 1 && <button type="button" onClick={handleBack} className="btn-ghost">Back</button>}
                {step < 3 ? (
                  <button type="button" onClick={handleNext} className={`btn-primary disabled:pointer-events-none disabled:opacity-50 ${step === 1 ? "ml-auto" : ""}`} disabled={(step === 1 && (!profile.heightCm || !profile.birthDate)) || (step === 2 && (!currentWeight || !profile.goalWeightKg))}>
                    Next
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} disabled={loading} aria-busy={loading} className="btn-primary disabled:pointer-events-none disabled:opacity-50">
                    {loading ? "Setting up..." : "Get started"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
