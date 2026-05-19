"use client";

import { useState, useEffect } from "react";
import { Trophy, Loader2, RefreshCw } from "lucide-react";

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface BadgeDef {
  type: string;
  title: string;
  description: string;
  icon: string;
}

export function AchievementBadges() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [newlyEarned, setNewlyEarned] = useState<string[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      if (data.success) {
        setAchievements(data.achievements);
        setAllBadges(data.allBadges);
      }
    } finally {
      setLoading(false);
    }
  }

  async function check() {
    setChecking(true);
    setNewlyEarned([]);
    try {
      const res = await fetch("/api/achievements", { method: "POST" });
      const data = await res.json();
      if (data.success && data.newlyEarned.length > 0) {
        setNewlyEarned(data.newlyEarned);
        load();
      }
    } finally {
      setChecking(false);
    }
  }

  const unlockedSet = new Set(achievements.map((a) => a.type));
  const locked = allBadges.filter((b) => !unlockedSet.has(b.type));

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-5 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#DFFF35]" />
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B5738]">Achievements</span>
          {achievements.length > 0 && (
            <span className="rounded-full bg-[#DFFF35] px-1.5 py-0.5 text-[10px] font-bold text-[#18120E]">
              {achievements.length}/{allBadges.length}
            </span>
          )}
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg border border-[#18120E]/20 bg-[#FFF0B8] px-2.5 py-1.5 text-[11px] font-medium text-[#18120E] hover:bg-[#DFFF35] transition-colors disabled:opacity-40"
        >
          {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Check
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Newly earned flash */}
        {newlyEarned.length > 0 && (
          <div className="rounded-xl border border-[#DFFF35]/40 bg-[#DFFF35]/15 px-4 py-3">
            <p className="text-sm font-semibold text-[#18120E]">
              🎉 New badge{newlyEarned.length > 1 ? "s" : ""} unlocked!
            </p>
            <p className="text-xs text-[#6B5738] mt-0.5">
              {newlyEarned.map((t) => allBadges.find((b) => b.type === t)?.title ?? t).join(", ")}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[#6B5738]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            {/* Unlocked */}
            {achievements.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B5738] mb-2">
                  Earned ({achievements.length})
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {achievements.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-[#DFFF35]/40 bg-[#DFFF35]/10 p-3 text-center space-y-1"
                      title={new Date(a.unlockedAt).toLocaleDateString()}
                    >
                      <div className="text-2xl">{a.icon}</div>
                      <p className="text-xs font-semibold text-[#18120E] leading-tight">{a.title}</p>
                      <p className="text-[10px] text-[#6B5738] leading-tight">{a.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked */}
            {locked.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A7350] mb-2">
                  Locked ({locked.length})
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {locked.map((b) => (
                    <div
                      key={b.type}
                      className="rounded-xl border border-[#18120E]/8 bg-[#FFF0B8]/50 p-3 text-center space-y-1 opacity-40"
                    >
                      <div className="text-2xl grayscale">{b.icon}</div>
                      <p className="text-xs font-semibold text-[#18120E] leading-tight">{b.title}</p>
                      <p className="text-[10px] text-[#6B5738] leading-tight">{b.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {achievements.length === 0 && locked.length === 0 && (
              <p className="text-sm text-[#6B5738] text-center py-4">No badges defined yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
