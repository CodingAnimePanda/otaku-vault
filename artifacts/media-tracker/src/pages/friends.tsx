import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, UserPlus, Bell, BookOpen, Send, Check, X,
  ChevronRight, Search, Heart, Star, BookMarked, Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: number;
  clerkId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FriendEntry {
  friendshipId: number;
  friend: UserProfile | null;
}

interface FriendRequest {
  id: number;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender: UserProfile | null;
}

interface ReceivedRec {
  id: number;
  fromUserId: string;
  toUserId: string;
  title: string;
  category: string | null;
  coverUrl: string | null;
  readingUrl: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: string;
  from: { username: string; displayName: string | null } | null;
}

interface FriendLibraryItem {
  id: number;
  title: string;
  category: string;
  status: string | null;
  coverUrl: string | null;
  tier: string | null;
  genres: string[];
  currentChapter: string | null;
  readingUrl: string | null;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ profile, size = "md" }: { profile: UserProfile | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-lg" };
  const initials = profile?.displayName?.[0] ?? profile?.username?.[0]?.toUpperCase() ?? "?";
  return (
    <div className={cn("rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border flex-shrink-0 overflow-hidden", sizes[size])}>
      {profile?.avatarUrl
        ? <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
        : <span className="font-bold text-primary">{initials}</span>
      }
    </div>
  );
}

// ── Setup Profile Dialog ──────────────────────────────────────────────────────

function SetupProfileDialog({ open, onDone }: { open: boolean; onDone: (profile: UserProfile) => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!username.trim()) { setError("Username is required"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("3–20 chars, letters/numbers/underscores only"); return;
    }
    setLoading(true); setError("");
    try {
      const profile = await apiFetch("/api/friends/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), displayName: displayName.trim() || null }),
      });
      toast({ title: "Profile created!" });
      onDone(profile);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Set Up Your Profile
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Choose a username so friends can find you.</p>
        <div className="space-y-3">
          <div>
            <Input
              placeholder="username (e.g. animepanda)"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
          <Input
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Send Rec Dialog ───────────────────────────────────────────────────────────

function SendRecDialog({ open, onClose, friends, preselectedTitle }: {
  open: boolean; onClose: () => void;
  friends: FriendEntry[];
  preselectedTitle?: string;
}) {
  const [toUsername, setToUsername] = useState("");
  const [title, setTitle] = useState(preselectedTitle ?? "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { if (open) { setToUsername(""); setTitle(preselectedTitle ?? ""); setMessage(""); } }, [open, preselectedTitle]);

  const handleSend = async () => {
    if (!toUsername.trim() || !title.trim()) return;
    setLoading(true);
    try {
      await apiFetch("/api/friends/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUsername: toUsername.trim(), title: title.trim(), message: message.trim() || null }),
      });
      toast({ title: "Recommendation sent! 🎉" });
      onClose();
    } catch (e: any) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Send a Recommendation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Send to (username)</label>
            <select
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={toUsername}
              onChange={(e) => setToUsername(e.target.value)}
            >
              <option value="">Select a friend...</option>
              {friends.map((f) => f.friend && (
                <option key={f.friendshipId} value={f.friend.username}>
                  {f.friend.displayName ? `${f.friend.displayName} (@${f.friend.username})` : `@${f.friend.username}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <Input placeholder="e.g. Omniscient Reader" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message (optional)</label>
            <Input placeholder="You'd love this because..." value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button className="w-full gap-2" onClick={handleSend} disabled={loading || !toUsername || !title}>
            <Send className="w-4 h-4" /> {loading ? "Sending..." : "Send Rec"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Friend Library Modal ──────────────────────────────────────────────────────

function FriendLibraryModal({ friend, onClose, onSendRec }: {
  friend: FriendEntry;
  onClose: () => void;
  onSendRec: (title: string) => void;
}) {
  const [library, setLibrary] = useState<FriendLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!friend.friend) return;
    apiFetch(`/api/friends/${friend.friend.clerkId}/library`)
      .then(setLibrary)
      .catch(() => toast({ title: "Failed to load library", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [friend.friend?.clerkId]);

  const filtered = library.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  const tierColors: Record<string, string> = {
    S: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    A: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    C: "bg-green-500/20 text-green-400 border-green-500/30",
    D: "bg-muted text-muted-foreground border-border",
    F: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {friend.friend?.displayName ?? friend.friend?.username}'s Library
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search their library..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nothing here yet.</p>
          ) : filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors group">
              {item.coverUrl
                ? <img src={item.coverUrl} alt={item.title} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                : <div className="w-10 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0"><BookMarked className="w-4 h-4 text-muted-foreground" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground capitalize">{item.category} · {item.status}</p>
                {item.currentChapter && <p className="text-xs text-muted-foreground">{item.currentChapter}</p>}
              </div>
              {item.tier && (
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", tierColors[item.tier] ?? "bg-muted")}>{item.tier}</span>
              )}
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs gap-1"
                onClick={() => onSendRec(item.title)}>
                <Send className="w-3 h-3" /> Rec back
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">{filtered.length} titles</p>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Friends Page ─────────────────────────────────────────────────────────

type Tab = "friends" | "requests" | "recs";

export default function FriendsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [recs, setRecs] = useState<ReceivedRec[]>([]);

  const [addUsername, setAddUsername] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [viewingFriend, setViewingFriend] = useState<FriendEntry | null>(null);
  const [sendRecOpen, setSendRecOpen] = useState(false);
  const [sendRecTitle, setSendRecTitle] = useState("");

  // Load profile on mount
  useEffect(() => {
    apiFetch("/api/friends/profile/me")
      .then(setProfile)
      .catch(() => setShowSetup(true))
      .finally(() => setProfileLoading(false));
  }, []);

  // Load data when profile exists
  useEffect(() => {
    if (!profile) return;
    loadAll();
  }, [profile]);

  const loadAll = async () => {
    try {
      const [f, r, rec] = await Promise.all([
        apiFetch("/api/friends"),
        apiFetch("/api/friends/requests"),
        apiFetch("/api/friends/recommendations"),
      ]);
      setFriends(f);
      setRequests(r);
      setRecs(rec);
    } catch {
      toast({ title: "Failed to load friends data", variant: "destructive" });
    }
  };

  const handleSendRequest = async () => {
    if (!addUsername.trim()) return;
    setAddLoading(true);
    try {
      await apiFetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUsername.trim() }),
      });
      toast({ title: "Friend request sent!" });
      setAddUsername("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setAddLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await apiFetch(`/api/friends/requests/${id}/accept`, { method: "POST" });
      toast({ title: "Friend request accepted!" });
      loadAll();
    } catch {
      toast({ title: "Failed to accept", variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiFetch(`/api/friends/requests/${id}/reject`, { method: "POST" });
      loadAll();
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  const handleUnfriend = async (friendshipId: number) => {
    try {
      await apiFetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      toast({ title: "Unfriended" });
    } catch {
      toast({ title: "Failed to unfriend", variant: "destructive" });
    }
  };

  const handleMarkRecRead = async (id: number) => {
    try {
      await apiFetch(`/api/friends/recommendations/${id}/read`, { method: "PATCH" });
      setRecs((prev) => prev.map((r) => r.id === id ? { ...r, isRead: true } : r));
    } catch {}
  };

  const unreadRecs = recs.filter((r) => !r.isRead).length;
  const pendingRequests = requests.length;

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "friends", label: "Friends", icon: Users, badge: undefined },
    { id: "requests", label: "Requests", icon: UserPlus, badge: pendingRequests || undefined },
    { id: "recs", label: "Recs Inbox", icon: Inbox, badge: unreadRecs || undefined },
  ];

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Friends</h1>
          {profile && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Your username: <span className="text-primary font-medium">@{profile.username}</span>
            </p>
          )}
        </div>
        <Button className="gap-2" onClick={() => { setSendRecTitle(""); setSendRecOpen(true); }}>
          <Send className="w-4 h-4" /> Send a Rec
        </Button>
      </div>

      {/* Add friend */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Add by username..."
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
          />
        </div>
        <Button onClick={handleSendRequest} disabled={addLoading || !addUsername.trim()}>
          {addLoading ? "Sending..." : "Add Friend"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-0">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge ? (
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "friends" && (
        <div className="space-y-3">
          {friends.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No friends yet</p>
              <p className="text-sm mt-1">Add a friend by username above!</p>
            </div>
          ) : friends.map((f) => (
            <div key={f.friendshipId} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group">
              <Avatar profile={f.friend} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{f.friend?.displayName ?? f.friend?.username}</p>
                <p className="text-xs text-muted-foreground">@{f.friend?.username}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                  onClick={() => setViewingFriend(f)}>
                  <BookOpen className="w-3.5 h-3.5" /> Library
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                  onClick={() => { setSendRecTitle(""); setSendRecOpen(true); }}>
                  <Send className="w-3.5 h-3.5" /> Rec
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleUnfriend(f.friendshipId)}>
                  Unfriend
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No pending requests</p>
            </div>
          ) : requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <Avatar profile={req.sender} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{req.sender?.displayName ?? req.sender?.username}</p>
                <p className="text-xs text-muted-foreground">@{req.sender?.username} wants to be friends</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleAccept(req.id)}>
                  <Check className="w-3.5 h-3.5" /> Accept
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleReject(req.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "recs" && (
        <div className="space-y-3">
          {recs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No recommendations yet</p>
              <p className="text-sm mt-1">When friends send you recs, they'll appear here.</p>
            </div>
          ) : recs.map((rec) => (
            <div key={rec.id}
              className={cn("flex gap-3 p-4 rounded-xl border transition-colors",
                rec.isRead ? "bg-card border-border" : "bg-primary/5 border-primary/30"
              )}>
              {rec.coverUrl
                ? <img src={rec.coverUrl} alt={rec.title} className="w-12 h-16 object-cover rounded flex-shrink-0" />
                : <div className="w-12 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0"><Heart className="w-5 h-5 text-muted-foreground" /></div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{rec.title}</p>
                    {rec.category && <p className="text-xs text-muted-foreground capitalize">{rec.category}</p>}
                  </div>
                  {!rec.isRead && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">New</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  from <span className="text-foreground font-medium">@{rec.from?.username}</span>
                </p>
                {rec.message && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{rec.message}"</p>
                )}
                <div className="flex gap-2 mt-2">
                  {rec.readingUrl && (
                    <a href={rec.readingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <BookOpen className="w-3 h-3" /> Read
                      </Button>
                    </a>
                  )}
                  {!rec.isRead && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                      onClick={() => handleMarkRecRead(rec.id)}>
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SetupProfileDialog open={showSetup} onDone={(p) => { setProfile(p); setShowSetup(false); loadAll(); }} />

      {viewingFriend && (
        <FriendLibraryModal
          friend={viewingFriend}
          onClose={() => setViewingFriend(null)}
          onSendRec={(title) => { setViewingFriend(null); setSendRecTitle(title); setSendRecOpen(true); }}
        />
      )}

      <SendRecDialog
        open={sendRecOpen}
        onClose={() => setSendRecOpen(false)}
        friends={friends}
        preselectedTitle={sendRecTitle}
      />
    </div>
  );
}