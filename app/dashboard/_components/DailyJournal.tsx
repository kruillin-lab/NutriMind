"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Save, BookOpen } from "lucide-react";
import { formatLocalDateKey } from "@/lib/date-utils";

interface DailyJournalProps {
  initialDate?: string;
}

export function DailyJournal({ initialDate }: DailyJournalProps) {
  const [notes, setNotes] = useState("");
  const [originalNotes, setOriginalNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dateStr = initialDate || formatLocalDateKey(new Date());

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/daily-notes?date=${dateStr}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || "");
        setOriginalNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/daily-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, date: dateStr }),
      });

      if (response.ok) {
        setOriginalNotes(notes);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = notes !== originalNotes;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          Daily Journal
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="journal-notes" className="text-xs text-muted-foreground">
                How are you feeling today? Note your mood, energy, hunger, or anything else.
              </Label>
              <Textarea
                id="journal-notes"
                placeholder="Feeling energetic today. Had a good workout. Not too hungry in the evening..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] resize-none mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {notes.length > 0 ? `${notes.length} characters` : "No notes yet"}
              </p>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saved ? "Saved!" : "Save"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
