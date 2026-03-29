"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

interface ParsedFood {
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence: number;
}

interface QuickLogProps {
  onLogMeal: (meal: {
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }) => Promise<void>;
}

export function QuickLog({ onLogMeal }: QuickLogProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedFoods, setParsedFoods] = useState<ParsedFood[]>([]);
  const [showParsed, setShowParsed] = useState(false);

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

  const handleParse = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    // Simulate AI parsing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock parsed results
    const mockResults: ParsedFood[] = [
      {
        name: "Grilled Chicken Breast",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        confidence: 0.95,
      },
      {
        name: "Mixed Green Salad",
        calories: 35,
        protein: 2,
        carbs: 7,
        fat: 0.5,
        confidence: 0.88,
      },
      {
        name: "Olive Oil Dressing (1 tbsp)",
        calories: 120,
        protein: 0,
        carbs: 0,
        fat: 14,
        confidence: 0.92,
      },
    ];

    setParsedFoods(mockResults);
    setShowParsed(true);
    setIsLoading(false);
  };

  const handleConfirm = async () => {
    const totalCalories = parsedFoods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = parsedFoods.reduce((sum, f) => sum + (f.protein || 0), 0);
    const totalCarbs = parsedFoods.reduce((sum, f) => sum + (f.carbs || 0), 0);
    const totalFat = parsedFoods.reduce((sum, f) => sum + (f.fat || 0), 0);

    await onLogMeal({
      name: parsedFoods.map((f) => f.name).join(", "),
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    });

    setInput("");
    setParsedFoods([]);
    setShowParsed(false);
  };

  const handleQuickAdd = async (item: { label: string; calories: number }) => {
    await onLogMeal({
      name: item.label,
      calories: item.calories,
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setIsExpanded(true);
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
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Photo recognition (coming soon)"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Parse Button */}
        <Button
          onClick={handleParse}
          disabled={!input.trim() || isLoading}
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
              <Button size="sm" onClick={handleConfirm}>
                <Send className="mr-2 h-4 w-4" />
                Log Meal
              </Button>
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
              >
                <item.icon className="mr-1 h-3 w-3" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

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
                  "{suggestion}"
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
