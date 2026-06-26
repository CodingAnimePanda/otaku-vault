import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, BookOpen, Star } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { proxyImage } from "@/lib/utils";

interface RecItem {
  title: string; category: string; coverUrl?: string | null; readingUrl?: string | null;
  rating?: number | null; reviewText?: string | null; genres?: string[];
  ratingStory?: number | null; ratingArt?: number | null; ratingCharacter?: number | null;
  ratingWorldBuilding?: number | null; ratingUniqueness?: number | null; ratingEnjoyment?: number | null;
}
interface Friend { friendshipId: number; friend: { username: string; displayName: string | null } | null; }

export function QuickRecDialog({ open, onClose, item }: { open: boolean; onClose: () => void; item: RecItem | null; }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [toUsername, setToUsername] = useState("");
  const [customUsername, setCustomUsername] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const apiFetch = async (path: string, options?: RequestInit) => {
    const token = await getToken();
    const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) },
    });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown error" })); throw new Error(err.error ?? "Request failed"); }
    return res.json();
  };

  useEffect(() => {
    if (open) {
      setToUsername(""); setCustomUsername(""); setMessage(""); setUseCustom(false);
      apiFetch("/api/friends").then(setFriends).catch(() => {});
    }
  }, [open]);

  if (!item) return null;

  const handleSend = async () => {
    const target = useCustom ? customUsername.trim() : toUsername;
    if (!target) return;
    setLoading(true);
    try {
      await apiFetch("/api/friends/recommendations", {
        method: "POST",
        body: JSON.stringify({
          toUsername: target, title: item.title, category: item.category,
          coverUrl: item.coverUrl ?? null, readingUrl: item.readingUrl ?? null,
          message: message.trim() || null, rating: item.rating ?? null,
          reviewText: item.reviewText ?? null, genres: item.genres ?? [],
          ratingStory: item.ratingStory ?? null, ratingArt: item.ratingArt ?? null,
          ratingCharacter: item.ratingCharacter ?? null, ratingWorldBuilding: item.ratingWorldBuilding ?? null,
          ratingUniqueness: item.ratingUniqueness ?? null, ratingEnjoyment: item.ratingEnjoyment ?? null,
        }),
      });
      toast({ title: "Rec sent! 🎉" }); onClose();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const RATING_KEYS = [
    { key: "ratingStory", label: "Story & Pacing" }, { key: "ratingArt", label: "Art Style" },
    { key: "ratingCharacter", label: "Characters" }, { key: "ratingWorldBuilding", label: "World-Building" },
    { key: "ratingUniqueness", label: "Uniqueness" }, { key: "ratingEnjoyment", label: "Enjoyment" },
  ];
  const hasRatings = RATING_KEYS.some(r => (item as any)[r.key] > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Recommend to a Friend
          </DialogTitle>
          <DialogDescription className="sr-only">Send a recommendation.</DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-border">
          {item.coverUrl
            ? <img src={proxyImage(item.coverUrl) ?? item.coverUrl} alt={item.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
            : <div className="w-12 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0"><BookOpen className="w-4 h-4 text-muted-foreground/40" /></div>}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{item.title}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{item.category}</p>
            {item.rating != null && <p className="text-xs text-primary font-medium mt-1 flex items-center gap-1"><Star className="w-3 h-3 fill-primary" />{item.rating}/10</p>}
            {item.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.genres.slice(0, 3).map(g => <span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{g}</span>)}
              </div>
            )}
          </div>
        </div>

        {hasRatings && (
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Ratings (included)</p>
            {RATING_KEYS.map(({ key, label }) => {
              const val = (item as any)[key];
              if (!val) return null;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-24 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${val * 10}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums w-6 text-right">{val}/10</span>
                </div>
              );
            })}
          </div>
        )}

        {item.reviewText && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Review (included)</p>
            <p className="text-xs text-foreground/80 line-clamp-3 italic">"{item.reviewText}"</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Send to</label>
            {!useCustom
              ? <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" value={toUsername} onChange={(e) => setToUsername(e.target.value)}>
                  <option value="">Select a friend...</option>
                  {friends.map((f) => f.friend && <option key={f.friendshipId} value={f.friend.username}>{f.friend.displayName ? `${f.friend.displayName} (@${f.friend.username})` : `@${f.friend.username}`}</option>)}
                </select>
              : <Input placeholder="Type username..." value={customUsername} onChange={(e) => setCustomUsername(e.target.value)} />}
            <button onClick={() => setUseCustom(v => !v)} className="text-[10px] text-primary mt-1 hover:underline">
              {useCustom ? "← Pick from friends list" : "Type a username instead →"}
            </button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Why they should read it <span className="text-muted-foreground/60">(optional)</span></label>
            <textarea className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={3} placeholder="You'd love this because..." value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button className="w-full gap-2" onClick={handleSend} disabled={loading || (!toUsername && !customUsername.trim())}>
            <Send className="w-4 h-4" /> {loading ? "Sending..." : "Send Rec"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}