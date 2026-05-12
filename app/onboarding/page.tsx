"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
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
        // Show user-friendly error message
        alert(`Failed to initialize: ${errorData.error || errorData.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to NutriMind</CardTitle>
          <CardDescription>
            Let&apos;s set up your profile to personalize your Calorie Bank
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.heightCm}
                  onChange={(e) =>
                    setProfile({ ...profile, heightCm: e.target.value })
                  }
                  placeholder="175"
                />
              </div>
              <div>
                <Label htmlFor="birthDate">Birth Date</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) =>
                    setProfile({ ...profile, birthDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Gender</Label>
                <RadioGroup
                  value={profile.gender}
                  onValueChange={(v) =>
                    setProfile({ ...profile, gender: v as "MALE" | "FEMALE" })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MALE" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FEMALE" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentWeight">Current Weight (kg)</Label>
                <Input
                  id="currentWeight"
                  type="number"
                  step="0.1"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  placeholder="75.5"
                />
              </div>
              <div>
                <Label htmlFor="goalWeight">Goal Weight (kg)</Label>
                <Input
                  id="goalWeight"
                  type="number"
                  step="0.1"
                  value={profile.goalWeightKg}
                  onChange={(e) =>
                    setProfile({ ...profile, goalWeightKg: e.target.value })
                  }
                  placeholder="70"
                />
              </div>
              <div>
                <Label htmlFor="bodyFat">Body Fat % (optional)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  value={currentBodyFat}
                  onChange={(e) => setCurrentBodyFat(e.target.value)}
                  placeholder="18"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Activity Level</Label>
                <RadioGroup
                  value={profile.activityLevel}
                  onValueChange={(v) =>
                    setProfile({
                      ...profile,
                      activityLevel: v as typeof profile.activityLevel,
                    })
                  }
                >
                  {[
                    { value: "SEDENTARY", label: "Sedentary (desk job)" },
                    { value: "LIGHTLY_ACTIVE", label: "Lightly Active (1-2 days/week)" },
                    { value: "MODERATELY_ACTIVE", label: "Moderately Active (3-5 days/week)" },
                    { value: "VERY_ACTIVE", label: "Very Active (6-7 days/week)" },
                    { value: "EXTRA_ACTIVE", label: "Extra Active (athlete)" },
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value}>{option.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {profile.heightCm && currentWeight && profile.birthDate && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="text-sm text-blue-900 font-medium">
                    Your estimated daily target: {calculateTDEE(calculateBMR())} calories
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This will be your starting budget for the Calorie Bank
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNext}
                className={step === 1 ? "ml-auto" : ""}
                disabled={
                  (step === 1 && (!profile.heightCm || !profile.birthDate)) ||
                  (step === 2 && (!currentWeight || !profile.goalWeightKg))
                }
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className={step === 1 ? "ml-auto" : ""}
              >
                {loading ? "Setting up..." : "Get Started"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
