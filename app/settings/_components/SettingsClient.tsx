"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, RotateCcw, Save, Clock, Download } from "lucide-react";
import { PushNotifications } from "@/app/dashboard/_components/PushNotifications";
import { HealthIntegrations } from "./HealthIntegrations";

interface ProfileData {
  heightCm: number;
  birthDate: string;
  gender: string;
  goalWeightKg: number | null;
  targetDate: string;
  activityLevel: string;
  timezone: string;
  emailDigest: boolean;
}

interface CalorieBankData {
  dailyTarget: number;
  allowNegative: boolean;
  expireAfterDays: number;
  autoAdjustTarget: boolean;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  currentBalance: number;
  totalBanked: number;
  totalSpent: number;
}

interface MetabolicSummary {
  trueMetabolicRate: number;
  predictionAccuracy: number;
  predictionsMade: number;
  lastCalculatedAt: string;
  calculationMethod: string;
}

interface SettingsClientProps {
  initialProfile: ProfileData;
  initialCalorieBank: CalorieBankData;
  initialMetabolic: MetabolicSummary | null;
}

type FeedbackArea = "profile" | "goals" | "bank" | "notifications" | "maintenance";

interface FeedbackState {
  area: FeedbackArea;
  message: string;
  tone: "success" | "notice" | "error";
}

function SectionFeedback({ area, feedback }: { area: FeedbackArea; feedback: FeedbackState | null }) {
  if (!feedback || feedback.area !== area) return null;

  return (
    <p
      role={feedback.tone === "error" ? "alert" : "status"}
      className={`border-l-2 px-3 py-2 text-sm ${feedback.tone === "error" ? "border-destructive text-destructive" : "border-[var(--brass)] text-foreground"}`}
    >
      {feedback.message}
    </p>
  );
}

export function SettingsClient({
  initialProfile,
  initialCalorieBank,
  initialMetabolic,
}: SettingsClientProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [calorieBank, setCalorieBank] = useState<CalorieBankData>(initialCalorieBank);
  const metabolic = initialMetabolic;
  const [savingArea, setSavingArea] = useState<Exclude<FeedbackArea, "maintenance"> | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [expireResult, setExpireResult] = useState<string | null>(null);
  const [isExpiring, setIsExpiring] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [exportDays, setExportDays] = useState(90);
  const isSaving = savingArea !== null;

  const handleSaveProfile = async () => {
    setSavingArea("profile");
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (response.ok) {
        setFeedback({ area: "profile", message: "Profile saved.", tone: "success" });
      } else {
        setFeedback({ area: "profile", message: "Failed to save profile.", tone: "error" });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setFeedback({ area: "profile", message: "Error saving profile.", tone: "error" });
    } finally {
      setSavingArea(null);
    }
  };

  const handleSaveGoals = async () => {
    setSavingArea("goals");
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: { goalWeightKg: profile.goalWeightKg, targetDate: profile.targetDate } }),
      });

      if (response.ok) {
        setFeedback({ area: "goals", message: "Goals saved.", tone: "success" });
      } else {
        setFeedback({ area: "goals", message: "Failed to save goals.", tone: "error" });
      }
    } catch (error) {
      console.error("Error saving goals:", error);
      setFeedback({ area: "goals", message: "Error saving goals.", tone: "error" });
    } finally {
      setSavingArea(null);
    }
  };

  const handleSaveBank = async () => {
    setSavingArea("bank");
    setFeedback(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calorieBank }),
      });

      if (response.ok) {
        setFeedback({ area: "bank", message: "Calorie bank settings saved.", tone: "success" });
      } else {
        setFeedback({ area: "bank", message: "Failed to save bank settings.", tone: "error" });
      }
    } catch (error) {
      console.error("Error saving bank settings:", error);
      setFeedback({ area: "bank", message: "Error saving bank settings.", tone: "error" });
    } finally {
      setSavingArea(null);
    }
  };

  const handleToggleDigest = async () => {
    const next = !profile.emailDigest;
    setSavingArea("notifications");
    setFeedback(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { emailDigest: next } }),
      });

      if (!response.ok) {
        setFeedback({ area: "notifications", message: "Failed to update the daily digest.", tone: "error" });
        return;
      }

      setProfile((current) => ({ ...current, emailDigest: next }));
      setFeedback({
        area: "notifications",
        message: next ? "Daily digest enabled." : "Daily digest disabled.",
        tone: "success",
      });
    } catch (error) {
      console.error("Error updating daily digest:", error);
      setFeedback({ area: "notifications", message: "Error updating the daily digest.", tone: "error" });
    } finally {
      setSavingArea(null);
    }
  };

  const handleExpireCalories = async () => {
    setIsExpiring(true);
    setExpireResult(null);
    try {
      const response = await fetch("/api/cron/expire-calories", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.processed > 0) {
          setExpireResult(`Expired ${data.results.reduce((sum: number, r: { expired: number }) => sum + r.expired, 0)} calories for ${data.processed} user(s).`);
        } else {
          setExpireResult("No calories to expire.");
        }
      } else {
        setExpireResult("Failed to expire calories.");
      }
    } catch (error) {
      console.error("Error expiring calories:", error);
      setExpireResult("Error expiring calories.");
    } finally {
      setIsExpiring(false);
    }
  };

  const handleResetCalorieBank = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setFeedback({ area: "maintenance", message: "Click reset again to confirm. This clears your bank balance totals, not meal history.", tone: "notice" });
      return;
    }

    setIsResetting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/calorie-bank/reset", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setCalorieBank((current) => ({
          ...current,
          currentBalance: data.calorieBank.currentBalance,
          totalBanked: data.calorieBank.totalBanked,
          totalSpent: data.calorieBank.totalSpent,
        }));
        setFeedback({ area: "maintenance", message: "Calorie bank reset to zero.", tone: "success" });
        setResetConfirm(false);
      } else {
        setFeedback({ area: "maintenance", message: "Failed to reset calorie bank.", tone: "error" });
      }
    } catch (error) {
      console.error("Error resetting calorie bank:", error);
      setFeedback({ area: "maintenance", message: "Error resetting calorie bank.", tone: "error" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-24">
        <div className="surface overflow-hidden">
          <div className="foil" />
          <div className="p-4">
            <p className="smallcaps">Reserve position</p>
            <p className="num-display mt-3 text-3xl text-foreground">
              {calorieBank.currentBalance >= 0 ? "+" : "−"}
              {Math.abs(Math.round(calorieBank.currentBalance)).toLocaleString()}
            </p>
            <p className="smallcaps mt-1">kcal available</p>
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="smallcaps">Daily limit</span>
                <span className="num text-xs text-foreground">{calorieBank.dailyTarget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <nav aria-label="Account controls" className="surface p-2">
          {[
            ["#identity", "Identity"],
            ["#goals", "Goal mandate"],
            ["#reserve", "Reserve rules"],
            ["#notifications", "Notifications"],
            ["#integrations", "Integrations"],
            ["#statements", "Statements"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="smallcaps block px-3 py-2.5 transition-colors hover:bg-secondary hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
      {/* Profile */}
      <section id="identity" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">01 · Account identity</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Profile</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Height, birth date, gender, and activity level.
        </p>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="height" className="smallcaps">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.heightCm}
                onChange={(e) =>
                  setProfile({ ...profile, heightCm: parseFloat(e.target.value) || 0 })
                }
                min="100"
                max="250"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="birthDate" className="smallcaps">Birth date</Label>
              <Input
                id="birthDate"
                type="date"
                value={profile.birthDate}
                onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="gender" className="smallcaps">Gender</Label>
            <Select
              value={profile.gender}
              onValueChange={(v) => setProfile({ ...profile, gender: v || "OTHER" })}
            >
              <SelectTrigger id="gender" className="mt-1.5">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="activityLevel" className="smallcaps">Activity level</Label>
            <Select
              value={profile.activityLevel}
              onValueChange={(v) => setProfile({ ...profile, activityLevel: v || "SEDENTARY" })}
            >
              <SelectTrigger id="activityLevel" className="mt-1.5">
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEDENTARY">Sedentary (little or no exercise)</SelectItem>
                <SelectItem value="LIGHT">Lightly active (1-3 days/week)</SelectItem>
                <SelectItem value="MODERATE">Moderately active (3-5 days/week)</SelectItem>
                <SelectItem value="ACTIVE">Very active (6-7 days/week)</SelectItem>
                <SelectItem value="VERY_ACTIVE">Extra active (very hard exercise)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="timezone" className="smallcaps">Timezone</Label>
            <Input
              id="timezone"
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
              className="mt-1.5"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving} aria-busy={savingArea === "profile"} className="btn-primary">
            {savingArea === "profile" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save profile
          </Button>
          <SectionFeedback area="profile" feedback={feedback} />
        </div>
      </section>

      {/* Goals */}
      <section id="goals" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">02 · Goal mandate</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Goals</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Target weight and goal date.
        </p>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="goalWeight" className="smallcaps">Goal weight (kg)</Label>
              <Input
                id="goalWeight"
                type="number"
                value={profile.goalWeightKg || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    goalWeightKg: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                min="30"
                max="300"
                placeholder="70"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="targetDate" className="smallcaps">Target date</Label>
              <Input
                id="targetDate"
                type="date"
                value={profile.targetDate}
                onChange={(e) => setProfile({ ...profile, targetDate: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <Button onClick={handleSaveGoals} disabled={isSaving} aria-busy={savingArea === "goals"} className="btn-primary">
            {savingArea === "goals" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save goals
          </Button>
          <SectionFeedback area="goals" feedback={feedback} />
        </div>
      </section>

      {/* Calorie Bank */}
      <section id="reserve" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">03 · Reserve controls</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Calorie bank</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Daily target and bank behavior.
        </p>

        <div className="mt-6">
          <div className="ledger-row border-t-0">
            <span className="smallcaps">Balance</span>
            <span className="num text-base text-foreground">{Math.round(calorieBank.currentBalance)} kcal</span>
          </div>
          <div className="ledger-row">
            <span className="smallcaps">Banked</span>
            <span className="num text-base text-foreground">{Math.round(calorieBank.totalBanked)} kcal</span>
          </div>
          <div className="ledger-row">
            <span className="smallcaps">Spent</span>
            <span className="num text-base text-foreground">{Math.round(calorieBank.totalSpent)} kcal</span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="dailyTarget" className="smallcaps">Daily calorie target</Label>
            <Input
              id="dailyTarget"
              type="number"
              value={calorieBank.dailyTarget}
              onChange={(e) =>
                setCalorieBank({
                  ...calorieBank,
                  dailyTarget: parseInt(e.target.value, 10) || 2000,
                })
              }
              min="1000"
              max="5000"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your daily calorie budget. Underspent calories are banked.
            </p>
          </div>

          <div>
            <Label htmlFor="expireDays" className="smallcaps">Calorie expiration (days)</Label>
            <Input
              id="expireDays"
              type="number"
              value={calorieBank.expireAfterDays}
              onChange={(e) =>
                setCalorieBank({
                  ...calorieBank,
                  expireAfterDays: parseInt(e.target.value, 10) || 30,
                })
              }
              min="1"
              max="365"
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Banked calories expire after this many days.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowNegative"
              checked={calorieBank.allowNegative}
              onChange={(e) =>
                setCalorieBank({ ...calorieBank, allowNegative: e.target.checked })
              }
              className="h-4 w-4 rounded border-input accent-primary focus:ring-ring"
            />
            <Label htmlFor="allowNegative" className="text-sm">
              Allow negative bank balance (go into debt)
            </Label>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="autoAdjustTarget"
                checked={calorieBank.autoAdjustTarget}
                onChange={(e) =>
                  setCalorieBank({ ...calorieBank, autoAdjustTarget: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary focus:ring-ring"
              />
              <div>
                <Label htmlFor="autoAdjustTarget" className="text-sm font-medium">
                  Automatically adjust my daily target
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Recalculate weekly from your recorded weight and intake after the estimate has enough history to stabilize.
                </p>
              </div>
            </div>

            {metabolic && (
              <dl className="mt-4 divide-y divide-border border-y border-border text-xs">
                <div className="ledger-row border-t-0">
                  <dt className="smallcaps">Estimated metabolic rate</dt>
                  <dd className="num text-foreground">{Math.round(metabolic.trueMetabolicRate)} kcal/day</dd>
                </div>
                <div className="ledger-row">
                  <dt className="smallcaps">Prediction confidence</dt>
                  <dd className="num text-foreground">
                    {metabolic.predictionsMade === 0
                      ? "Pending"
                      : `${Math.round(metabolic.predictionAccuracy * 100)}% · ${metabolic.predictionsMade} cycle${metabolic.predictionsMade === 1 ? "" : "s"}`}
                  </dd>
                </div>
                <div className="ledger-row">
                  <dt className="smallcaps">Last recalculated</dt>
                  <dd className="num text-foreground">{new Date(metabolic.lastCalculatedAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <p className="smallcaps">Macro targets (grams/day)</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="proteinTarget" className="smallcaps">Protein</Label>
                <Input
                  id="proteinTarget"
                  type="number"
                  value={calorieBank.proteinTargetG || ""}
                  onChange={(e) =>
                    setCalorieBank({
                      ...calorieBank,
                      proteinTargetG: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                  max="500"
                  placeholder="150"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="carbsTarget" className="smallcaps">Carbs</Label>
                <Input
                  id="carbsTarget"
                  type="number"
                  value={calorieBank.carbsTargetG || ""}
                  onChange={(e) =>
                    setCalorieBank({
                      ...calorieBank,
                      carbsTargetG: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                  max="500"
                  placeholder="250"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="fatTarget" className="smallcaps">Fat</Label>
                <Input
                  id="fatTarget"
                  type="number"
                  value={calorieBank.fatTargetG || ""}
                  onChange={(e) =>
                    setCalorieBank({
                      ...calorieBank,
                      fatTargetG: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  min="0"
                  max="300"
                  placeholder="65"
                  className="mt-1.5"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Set to 0 to disable. When set, daily macros will show progress bars.
            </p>
          </div>

          <Button onClick={handleSaveBank} disabled={isSaving} aria-busy={savingArea === "bank"} className="btn-primary">
            {savingArea === "bank" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save bank settings
          </Button>
          <SectionFeedback area="bank" feedback={feedback} />

          <div className="border-t border-border pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="smallcaps">Reserve maintenance</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Expire banked calories older than {calorieBank.expireAfterDays} days.
              Normally runs daily at midnight.
            </p>
            <Button
              variant="outline"
              onClick={handleExpireCalories}
              disabled={isExpiring}
              aria-busy={isExpiring}
            >
              {isExpiring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-2 h-4 w-4" />
              )}
              Run expiration now
            </Button>
            {expireResult && <p className="text-xs text-muted-foreground" role="status">{expireResult}</p>}
          </div>

          <div className="space-y-3 border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="smallcaps text-destructive">Danger zone</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Reset the current balance and lifetime bank totals to zero. Meal logs and daily nutrition history stay intact.
            </p>
            <Button
              variant={resetConfirm ? "destructive" : "outline"}
              onClick={handleResetCalorieBank}
              disabled={isResetting}
              aria-busy={isResetting}
            >
              {isResetting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {resetConfirm ? "Confirm reset calorie bank" : "Reset calorie bank"}
            </Button>
            <SectionFeedback area="maintenance" feedback={feedback} />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section id="notifications" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">04 · Account alerts</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Notifications</h2>
        <div className="mt-6 space-y-6">
          <PushNotifications />
          <div className="border-t border-border pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="smallcaps text-foreground">Daily account digest</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Receive yesterday&apos;s calorie position, macros, reserve balance, and logging streak by email at 8:00 AM UTC.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.emailDigest}
                aria-label="Daily digest email"
                onClick={handleToggleDigest}
                disabled={savingArea === "notifications"}
                className={`relative h-7 w-12 shrink-0 rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  profile.emailDigest ? "bg-[var(--ledger-green)]" : "bg-secondary"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-[18px] w-[18px] rounded-full bg-card shadow-sm transition-transform ${
                    profile.emailDigest ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <SectionFeedback area="notifications" feedback={feedback} />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">05 · External records</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Health integrations</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Bring historical weight records into your private nutrition ledger.
        </p>
        <div className="mt-6">
          <HealthIntegrations />
        </div>
      </section>

      {/* Export */}
      <section id="statements" className="surface scroll-mt-24 overflow-hidden p-5 sm:p-7">
        <p className="smallcaps text-foreground">06 · Account statements</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">Export data</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Download your nutrition data as a CSV file for personal records or sharing with a nutritionist.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="export-days" className="smallcaps">Date range</Label>
            <Select
              value={exportDays.toString()}
              onValueChange={(v) => setExportDays(parseInt(v || "90", 10) || 90)}
            >
              <SelectTrigger id="export-days" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="smallcaps">Included</p>
            <ul className="mt-2 space-y-1 text-[15px] text-muted-foreground">
              <li>Meals (name, macros, source, timestamps)</li>
              <li>Daily logs (calories, macros, water, exercise, notes)</li>
              <li>Weight entries</li>
              <li>Exercise log</li>
              <li>Journal entries</li>
            </ul>
          </div>

          <Button
            onClick={() => {
              window.open(`/api/export?days=${exportDays}`, "_blank");
            }}
            className="btn-primary"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </section>
      </div>
    </div>
  );
}
