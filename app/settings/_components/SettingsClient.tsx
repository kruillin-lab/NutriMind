"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, RotateCcw, Save, User, Target, Settings as SettingsIcon, Clock, Download, Bell } from "lucide-react";
import { PushNotifications } from "@/app/dashboard/_components/PushNotifications";

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

export function SettingsClient({
  initialProfile,
  initialCalorieBank,
  initialMetabolic,
}: SettingsClientProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [calorieBank, setCalorieBank] = useState<CalorieBankData>(initialCalorieBank);
  const metabolic = initialMetabolic;
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "goals" | "bank" | "notifications" | "export">("profile");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expireResult, setExpireResult] = useState<string | null>(null);
  const [isExpiring, setIsExpiring] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [exportDays, setExportDays] = useState(90);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });

      if (response.ok) {
        setSaveMessage("Profile saved successfully!");
      } else {
        setSaveMessage("Failed to save profile.");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage("Error saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoals = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: { goalWeightKg: profile.goalWeightKg, targetDate: profile.targetDate } }),
      });

      if (response.ok) {
        setSaveMessage("Goals saved successfully!");
      } else {
        setSaveMessage("Failed to save goals.");
      }
    } catch (error) {
      console.error("Error saving goals:", error);
      setSaveMessage("Error saving goals.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBank = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calorieBank }),
      });

      if (response.ok) {
        setSaveMessage("Calorie bank settings saved!");
      } else {
        setSaveMessage("Failed to save bank settings.");
      }
    } catch (error) {
      console.error("Error saving bank settings:", error);
      setSaveMessage("Error saving bank settings.");
    } finally {
      setIsSaving(false);
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
      setSaveMessage("Click reset again to confirm. This clears your bank balance totals, not meal history.");
      return;
    }

    setIsResetting(true);
    setSaveMessage(null);

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
        setSaveMessage("Calorie bank reset to zero.");
        setResetConfirm(false);
      } else {
        setSaveMessage("Failed to reset calorie bank.");
      }
    } catch (error) {
      console.error("Error resetting calorie bank:", error);
      setSaveMessage("Error resetting calorie bank.");
    } finally {
      setIsResetting(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "goals" as const, label: "Goals", icon: Target },
    { id: "bank" as const, label: "Calorie Bank", icon: SettingsIcon },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "export" as const, label: "Export", icon: Download },
  ];

  const saveMessageClass = saveMessage?.startsWith("Click reset")
    ? "border border-[#FFB000]/30 bg-[#FFB000]/14 text-[#FFE8A8]"
    : saveMessage?.includes("success") || saveMessage?.includes("saved") || saveMessage === "Calorie bank reset to zero."
      ? "border border-[#DFFF35]/30 bg-[#DFFF35]/18 text-[#DFFF35]"
      : "border border-[#FF5A3D]/30 bg-[#FF5A3D]/14 text-[#FFB4A4]";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border-2 border-[#18120E] bg-[#FFF8E7] p-1 shadow-[5px_5px_0_#18120E]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSaveMessage(null);
            }}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-[#18120E] bg-[#DFFF35] text-[#18120E] shadow-[2px_2px_0_#18120E]"
                : "border-transparent text-[#6B5738] hover:bg-[#FFE8A8] hover:text-[#18120E]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessageClass}`}>
          {saveMessage}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <Card className="surface border-0 shadow-none">
          <CardHeader>
            <CardTitle>Physical Profile</CardTitle>
            <CardDescription>
              Update your height, birth date, gender, and activity level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.heightCm}
                  onChange={(e) =>
                    setProfile({ ...profile, heightCm: parseFloat(e.target.value) || 0 })
                  }
                  min="100"
                  max="250"
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={profile.gender}
                onValueChange={(v) => setProfile({ ...profile, gender: v || "OTHER" })}
              >
                <SelectTrigger id="gender">
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
              <Label htmlFor="activityLevel">Activity Level</Label>
              <Select
                value={profile.activityLevel}
                onValueChange={(v) => setProfile({ ...profile, activityLevel: v || "SEDENTARY" })}
              >
                <SelectTrigger id="activityLevel">
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
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                placeholder={Intl.DateTimeFormat().resolvedOptions().timeZone}
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <Card className="surface border-0 shadow-none">
          <CardHeader>
            <CardTitle>Weight Goals</CardTitle>
            <CardDescription>
              Set your target weight and goal date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goalWeight">Goal Weight (kg)</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={profile.targetDate}
                  onChange={(e) => setProfile({ ...profile, targetDate: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleSaveGoals} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Goals
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Calorie Bank Tab */}
      {activeTab === "bank" && (
        <Card className="surface border-0 shadow-none">
          <CardHeader>
            <CardTitle>Calorie Bank Settings</CardTitle>
            <CardDescription>
              Configure your daily calorie target and bank behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Balance", value: calorieBank.currentBalance },
                { label: "Banked", value: calorieBank.totalBanked },
                { label: "Spent", value: calorieBank.totalSpent },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border-2 border-[#18120E]/18 bg-[#FFF0B8] p-3 shadow-[2px_2px_0_#18120E]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B5738]">{item.label}</p>
                  <p className="num mt-1 text-lg font-semibold text-[#18120E]">{Math.round(item.value)} kcal</p>
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="dailyTarget">Daily Calorie Target</Label>
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
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your daily calorie budget. Underspent calories are banked.
              </p>
            </div>

            <div>
              <Label htmlFor="expireDays">Calorie Expiration (days)</Label>
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
              />
              <p className="text-xs text-muted-foreground mt-1">
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
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Label htmlFor="allowNegative" className="text-sm">
                Allow negative bank balance (go into debt)
              </Label>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="autoAdjustTarget"
                  checked={calorieBank.autoAdjustTarget}
                  onChange={(e) =>
                    setCalorieBank({ ...calorieBank, autoAdjustTarget: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <Label htmlFor="autoAdjustTarget" className="text-sm font-medium">
                    Auto-adjust my daily target
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recalculate weekly from observed weight and intake. Only applies once your metabolic estimate has stabilised.
                  </p>
                </div>
              </div>
              {metabolic && (
                <div className="text-xs text-muted-foreground border-t pt-2 grid grid-cols-2 gap-y-1">
                  <span>Estimated metabolic rate</span>
                  <span className="text-right font-medium text-foreground">
                    {Math.round(metabolic.trueMetabolicRate)} kcal/day
                  </span>
                  <span>Prediction accuracy</span>
                  <span className="text-right font-medium text-foreground">
                    {metabolic.predictionsMade === 0
                      ? "—"
                      : `${Math.round(metabolic.predictionAccuracy * 100)}% (${metabolic.predictionsMade} cycle${metabolic.predictionsMade === 1 ? "" : "s"})`}
                  </span>
                  <span>Last recalculated</span>
                  <span className="text-right font-medium text-foreground">
                    {new Date(metabolic.lastCalculatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Macro Targets (grams/day)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="proteinTarget" className="text-xs text-muted-foreground">
                    Protein (g)
                  </Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="carbsTarget" className="text-xs text-muted-foreground">
                    Carbs (g)
                  </Label>
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
                  />
                </div>
                <div>
                  <Label htmlFor="fatTarget" className="text-xs text-muted-foreground">
                    Fat (g)
                  </Label>
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
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Set to 0 to disable. When set, daily macros will show progress bars.
              </p>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#FF5A3D]" />
                <p className="text-sm font-medium">Reset Bank</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Set the current balance and lifetime bank totals back to zero. Meal logs and daily nutrition history stay intact.
              </p>
              <Button
                variant={resetConfirm ? "destructive" : "outline"}
                onClick={handleResetCalorieBank}
                disabled={isResetting}
                className="w-full"
              >
                {isResetting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {resetConfirm ? "Confirm Reset Calorie Bank" : "Reset Calorie Bank"}
              </Button>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Manual Expiration</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Expire banked calories older than {calorieBank.expireAfterDays} days.
                Normally runs daily at midnight.
              </p>
              <Button
                variant="outline"
                onClick={handleExpireCalories}
                disabled={isExpiring}
                className="w-full"
              >
                {isExpiring ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-4 w-4" />
                )}
                Run Expiration Now
              </Button>
              {expireResult && (
                <p className="text-xs text-center text-muted-foreground">
                  {expireResult}
                </p>
              )}
            </div>

            <Button onClick={handleSaveBank} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Bank Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          <PushNotifications />
          <div className="rounded-2xl border border-[#18120E]/12 bg-[#FFF8E7] p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-[#18120E]">Daily Email Digest</h3>
              <p className="mt-1 text-sm text-[#6B5738]">
                Receive a daily summary of yesterday&apos;s calories, macros, and bank balance at 8 AM UTC.
                Requires <code className="text-xs bg-[#FFF0B8] px-1 py-0.5 rounded">RESEND_API_KEY</code> to be configured.
              </p>
            </div>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className="text-sm font-medium text-[#18120E]">Enable daily digest email</span>
              <button
                onClick={async () => {
                  const next = !profile.emailDigest;
                  setProfile((p) => ({ ...p, emailDigest: next }));
                  await fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profile: { emailDigest: next } }),
                  });
                }}
                className={`relative h-6 w-11 rounded-full border-2 border-[#18120E] transition-colors ${
                  profile.emailDigest ? "bg-[#00C875]" : "bg-[#FFF0B8]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full border border-[#18120E] bg-[#FFF8E7] transition-transform ${
                    profile.emailDigest ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === "export" && (
        <Card className="surface border-0 shadow-none">
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>
              Download your nutrition data as a CSV file for personal records or sharing with a nutritionist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="export-days">Date Range</Label>
              <Select
                value={exportDays.toString()}
                onValueChange={(v) => setExportDays(parseInt(v || "90", 10) || 90)}
              >
                <SelectTrigger id="export-days">
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

            <div className="space-y-2">
              <p className="text-sm font-medium">What&apos;s included:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Meals (name, macros, source, timestamps)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Daily logs (calories, macros, water, exercise, notes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Weight entries</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Exercise log</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Journal entries</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => {
                window.open(`/api/export?days=${exportDays}`, "_blank");
              }}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
