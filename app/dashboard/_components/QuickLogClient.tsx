"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mic,
  Camera,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Utensils,
  Coffee,
  Apple,
  Pizza,
  Loader2,
  X,
  AlertCircle,
  RotateCcw,
  TrendingUp,
} from "lucide-react";

interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence: number;
}

interface CachedFood {
  id: string;
  normalizedKey: string;
  originalText: string;
  name: string;
  calories: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  aiConfidence: number;
  source: string;
  hitCount: number;
  lastUsedAt: string;
  createdAt: string;
}

interface QuickLogClientProps {
  userId: string;
}

export function QuickLogClient({ userId }: QuickLogClientProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedFoods, setParsedFoods] = useState<ParsedFood[]>([]);
  const [showParsed, setShowParsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [popularFoods, setPopularFoods] = useState<CachedFood[]>([]);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000; // 1 second

  // Fetch popular foods on mount
  useEffect(() => {
    const fetchPopularFoods = async () => {
      setIsLoadingPopular(true);
      try {
        const response = await fetch("/api/cached-foods?limit=6");
        if (!response.ok) throw new Error("Failed to fetch popular foods");
        const data = await response.json();
        if (data.success) {
          setPopularFoods(data.foods);
        }
      } catch (err) {
        console.error("Failed to fetch popular foods:", err);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    fetchPopularFoods();
  }, []);

  const suggestions = [
    "Had a grilled chicken salad with avocado and olive oil dressing",
    "Coffee with oat milk and a banana",
    "Large pepperoni pizza, 2 slices",
    "Salmon fillet with quinoa and steamed broccoli",
    "Protein shake after gym",
  ];

  const quickItems = [
    { icon: Coffee, label: "Coffee", calories: 5 },
    { icon: Apple, label: "Apple", calories: 95 },
    { icon: Utensils, label: "Egg", calories: 70 },
    { icon: Pizza, label: "Pizza Slice", calories: 285 },
  ];

  const handleParse = async (attemptNumber: number = 0) => {
    if (!input.trim()) return;

    setIsLoading(true);
    setParsedFoods([]);
    setShowParsed(false);
    setError(null);

    try {
      const response = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to parse meal");
      }

      setParsedFoods(data.foods);
      setShowParsed(true);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse meal";
      console.error("Failed to parse meal:", errorMessage);

      // Retry logic with exponential backoff
      if (attemptNumber < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber);
        console.log(`Retrying in ${delay}ms (attempt ${attemptNumber + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        setRetryCount(attemptNumber + 1);
        return handleParse(attemptNumber + 1);
      }

      setError(errorMessage);
      setRetryCount(MAX_RETRIES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitError(null);
    const totalCalories = parsedFoods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = parsedFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
    const totalCarbs = parsedFoods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    const totalFat = parsedFoods.reduce((sum, f) => sum + (f.fat || 0), 0);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsedFoods.map((f) => f.name).join(", "),
          calories: totalCalories,
          proteinG: totalProtein,
          carbsG: totalCarbs,
          fatG: totalFat,
          mealType: "OTHER",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to log meal (${response.status})`);
      }

      setInput("");
      setParsedFoods([]);
      setShowParsed(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to log meal";
      console.error("Failed to log meal:", errorMessage);
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (item: { label: string; calories: number }) => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.label,
          calories: item.calories,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          mealType: "SNACK",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to log meal (${response.status})`);
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to log meal";
      console.error("Failed to log meal:", errorMessage);
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setIsExpanded(true);
  };

  const handlePopularFoodClick = (food: CachedFood) => {
    setInput(food.originalText);
    setIsExpanded(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Quick Log
          <Badge variant="secondary" className="text-xs">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Natural Language Input */}
        <div className="relative">
          <Textarea
            placeholder="Describe what you ate in natural language..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[100px] resize-none pr-12"
          />
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Voice input (coming soon)"
              disabled
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Photo recognition (coming soon)"
              disabled
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Parse Button */}
        <Button
          onClick={() => handleParse(0)}
          disabled={!input.trim() || isLoading || isSubmitting}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Parse with AI
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-red-900 dark:text-red-100 text-sm">
                  Failed to parse meal
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                  {error}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleParse(0)}
              disabled={isLoading}
              className="w-full border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Retry Status */}
        {isLoading && retryCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Retrying... ({retryCount}/{MAX_RETRIES})
          </p>
        )}

        {/* Parsed Results */}
        {showParsed && parsedFoods.length > 0 && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Detected items:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParsed(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[120px]">
              <div className="space-y-2">
                {parsedFoods.map((food, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded bg-background"
                  >
                    <div>
                      <p className="font-medium text-sm">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        P: {food.protein}g · C: {food.carbs}g · F: {food.fat}g
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{food.calories} kcal</p>
                      <p className="text-xs text-green-600">
                        {Math.round(food.confidence * 100)}% match
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-semibold">
                Total: {parsedFoods.reduce((sum, f) => sum + f.calories, 0)} kcal
              </span>
              <Button size="sm" onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Log Meal
              </Button>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100 text-sm">
                  Failed to save meal
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">
                  {submitError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Add Buttons */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {quickItems.map((item) => (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdd(item)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <item.icon className="mr-1 h-3 w-3" />
                )}
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Popular Foods */}
        {(isLoadingPopular || popularFoods.length > 0) && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <TrendingUp className="h-3 w-3" />
              <span>Popular foods:</span>
            </div>
            {isLoadingPopular ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading popular foods...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {popularFoods.map((food) => (
                  <Button
                    key={food.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePopularFoodClick(food)}
                    disabled={isSubmitting}
                    className="text-xs h-7 px-2"
                    title={`${food.calories} kcal · Used ${food.hitCount} times`}
                  >
                    {food.name}
                    <span className="ml-1 text-muted-foreground">
                      {food.calories}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        <div className="pt-2 border-t">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide suggestions
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show example phrases
              </>
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="block w-full text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 transition-colors"
                >
                  &quot;{suggestion}&quot;
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
          <p className="text-blue-900 dark:text-blue-100">
            <span className="font-medium">💡 Tip:</span> Be specific for better
            results! Include portion sizes, brands, or preparation methods.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
