import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Users, UserPlus, BookOpen, Send, Check, X, Search, Heart, Inbox, Star, ToggleLeft, ToggleRight, ArrowLeft, Share2, Trophy, Flame, LayoutGrid } from "lucide-react";
import { cn, proxyImage } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile { id: number; clerkId: string; username: string; displayName: string | null; avatarUrl: string | null; }
interface FriendEntry { friendshipId: number; friendId: string; friend: UserProfile | null; }
interface FriendRequest { id: number; senderId: string; receiverId: string; status: string; createdAt: string; sender: UserProfile | null; }
interface ReceivedRec { id: number; fromUserId: string; toUserId: string; title: string; category: string | null; coverUrl: string | null; readingUrl: string | null; message: string | null; isRead: boolean; createdAt: string; from: { username: string; displayName: string | null } | null; }
interface FriendLibraryItem { id: number; title: string; category: string; status: string | null; coverUrl: string | null; customCoverUrl: string | null; tier: string | null; rating: number | null; reviewText: string | null; genres: string[]; currentChapter: string | null; readingUrl: string | null; }
type GroupedLibrary = Record<string, FriendLibraryItem[]>;
type ApiFetch = (path: string, options?: RequestInit) => Promise<any>;

// ── Helper Components ─────────────────────────────────────────────────────────
function Avatar({ profile, size = "md", onClick }: { profile: UserProfile | null; size?: "sm" | "md" | "lg", onClick?: () => void }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-10 h-10 text-sm", lg: "w-24 h-24 text-4xl" };
  const initials = profile?.displayName?.[0] ?? profile?.username?.[0]?.toUpperCase() ?? "?";
  return (
    <div onClick={onClick} className={cn("rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-border flex-shrink-0 overflow-hidden", sizes[size], onClick && "cursor-pointer hover:ring-primary transition-all")}>
      {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" /> : <span className="font-bold text-primary">{initials}</span>}
    </div>
  );
}

function GenreTags({ genres }: { genres: string[] }) {
  if (!genres?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {genres.slice(0, 3).map((g) => (<span key={g} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">{g}</span>))}
      {genres.length > 3 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{genres.length - 3}</span>}
    </div>
  );
}

// ── Setup & Rec Dialogs ───────────────────────────────────────────────────────
function SetupProfileDialog({ open, onDone, apiFetch }: { open: boolean; onDone: (profile: UserProfile) => void; apiFetch: ApiFetch; }) {
  const [username, setUsername] = useState(""); const [displayName, setDisplayName] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const { toast } = useToast();
  const handleSubmit = async () => {
    if (!username.trim()) { setError("Username is required"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setError("3–20 chars, letters/numbers/underscores only"); return; }
    setLoading(true); setError("");
    try {
      const profile = await apiFetch("/api/friends/profile", { method: "POST", body: JSON.stringify({ username: username.trim(), displayName: displayName.trim() || null }) });
      toast({ title: "Profile created!" }); onDone(profile);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Set Up Your Profile</DialogTitle><DialogDescription className="sr-only">Set up your username.</DialogDescription></DialogHeader>
        <p className="text-sm text-muted-foreground">Choose a username so friends can find you.</p>
        <div className="space-y-3">
          <div><Input placeholder="username (e.g. animepanda)" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />{error && <p className="text-xs text-destructive mt-1">{error}</p>}</div>
          <Input placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SendRecDialog({ open, onClose, friends, preselectedTitle, apiFetch }: { open: boolean; onClose: () => void; friends: FriendEntry[]; preselectedTitle?: string; apiFetch: ApiFetch; }) {
  const [toUsername, setToUsername] = useState(""); const [title, setTitle] = useState(preselectedTitle ?? ""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false); const { toast } = useToast();
  useEffect(() => { if (open) { setToUsername(""); setTitle(preselectedTitle ?? ""); setMessage(""); } }, [open, preselectedTitle]);
  const handleSend = async () => {
    if (!toUsername.trim() || !title.trim()) return;
    setLoading(true);
    try {
      await apiFetch("/api/friends/recommendations", { method: "POST", body: JSON.stringify({ toUsername: toUsername.trim(), title: title.trim(), message: message.trim() || null }) });
      toast({ title: "Recommendation sent! 🎉" }); onClose();
    } catch (e: any) { toast({ title: "Failed to send", description: e.message, variant: "destructive" }); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-display text-xl flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Send a Recommendation</DialogTitle><DialogDescription className="sr-only">Send a media recommendation to a friend.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Send to (username)</label>
            <select className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm" value={toUsername} onChange={(e) => setToUsername(e.target.value)}>
              <option value="">Select a friend...</option>
              {friends.map((f) => f.friend && <option key={f.friendshipId} value={f.friend.username}>{f.friend.displayName ? `${f.friend.displayName} (@${f.friend.username})` : `@${f.friend.username}`}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Title</label><Input placeholder="e.g. Omniscient Reader" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Message (optional)</label><Input placeholder="You'd love this because..." value={message} onChange={(e) => setMessage(e.target.value)} /></div>
          <Button className="w-full gap-2" onClick={handleSend} disabled={loading || !toUsername || !title}><Send className="w-4 h-4" /> {loading ? "Sending..." : "Send Rec"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Friend Media Details Dialog ───────────────────────────────────────────────
function FriendMediaDialog({ item, open, onClose, onSendRec }: { item: FriendLibraryItem | null, open: boolean, onClose: () => void, onSendRec: (title: string) => void }) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight pr-4">{item.title}</DialogTitle>
          <DialogDescription className="sr-only">Details and review for {item.title}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-5 mt-2">
          <div className="w-32 h-48 flex-shrink-0 rounded-lg overflow-hidden bg-muted border border-border mx-auto sm:mx-0 shadow-md">
            {item.coverUrl || item.customCoverUrl ? (
              <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div>
               <p className="text-sm font-medium capitalize text-muted-foreground mb-1">{item.category} • {item.status || "Unknown"}</p>
               <GenreTags genres={item.genres} />
            </div>
            
            {(item.tier || item.rating != null) && (
              <div className="flex items-center gap-3 flex-wrap">
                {item.tier && (
                  <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1.5 rounded-md border border-yellow-500/20">
                    <Trophy className="w-4 h-4" />
                    <span className="font-black text-sm">{item.tier} Tier</span>
                  </div>
                )}
                {item.rating != null && (
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1.5 rounded-md border border-primary/20">
                    <Star className="w-4 h-4 fill-primary" />
                    <span className="font-bold text-sm">{item.rating} / 10</span>
                  </div>
                )}
              </div>
            )}

            {item.reviewText ? (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Friend's Review</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.reviewText}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No review provided.</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          {item.readingUrl && (
            <a href={item.readingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2"><BookOpen className="w-4 h-4" /> Open Source Link</Button>
            </a>
          )}
          <Button className="flex-1 gap-2" onClick={() => { onClose(); onSendRec(item.title); }}>
            <Send className="w-4 h-4" /> Send Recommendation Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Friend Profile View ────────────────────────────────────────────────
function FriendProfileView({ friend, onBack, onSendRec, apiFetch }: { friend: FriendEntry; onBack: () => void; onSendRec: (title: string) => void; apiFetch: ApiFetch; }) {
  const [grouped, setGrouped] = useState<GroupedLibrary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notShared, setNotShared] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FriendLibraryItem | null>(null);

  useEffect(() => {
    apiFetch(`/api/friends/${friend.friendId}/library`)
      .then((data) => setGrouped(data.grouped))
      .catch((e) => { if (e.message?.includes("not_shared") || e.message?.includes("403")) setNotShared(true); })
      .finally(() => setLoading(false));
  }, [friend.friendId]);

  const allItems = useMemo(() => Object.values(grouped || {}).flat(), [grouped]);
  const completedCount = allItems.filter(m => m.status === 'completed').length;
  const totalCount = allItems.length;
  const topFavorites = allItems.filter(m => m.tier === "S" || m.rating === 10).slice(0, 3);
  const filteredItems = allItems.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.category.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-12">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-2 -ml-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Friends</Button>

      {/* Profile Header */}
      <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-xl max-w-3xl mx-auto">
        <div className="h-32 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"></div>
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
          <Avatar profile={friend.friend} size="lg" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-display font-bold">{friend.friend?.displayName || "Otaku"}</h1>
            <p className="text-muted-foreground text-sm">@{friend.friend?.username}</p>
          </div>
        </div>
      </div>

      {notShared ? (
        <div className="text-center py-16 text-muted-foreground max-w-3xl mx-auto border border-dashed rounded-xl border-border bg-card/30">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{friend.friend?.displayName ?? friend.friend?.username} hasn't shared their library with you.</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><BookOpen className="w-6 h-6" /></div>
              <div><p className="text-2xl font-black">{totalCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Titles Tracked</p></div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Trophy className="w-6 h-6" /></div>
              <div><p className="text-2xl font-black">{completedCount}</p><p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Completed</p></div>
            </div>
          </div>

          {/* Top 3 Favorites */}
          {topFavorites.length > 0 && (
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /><h2 className="text-xl font-display font-bold">All-Time Favorites</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {topFavorites.map((item) => (
                  <div key={`fav-${item.id}`} onClick={() => setSelectedItem(item)} className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-border shadow-md cursor-pointer">
                    {item.coverUrl || item.customCoverUrl ? <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><BookOpen className="w-8 h-8 text-muted-foreground/30" /></div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                      <span className="text-yellow-400 font-black text-lg mb-1 drop-shadow-md">#1</span>
                      <h3 className="text-white font-semibold leading-tight line-clamp-2 drop-shadow-md">{item.title}</h3>
                      <p className="text-white/70 text-xs capitalize mt-1">{item.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Library Grid */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-display font-bold flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary"/> Full Library</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search their library..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-card" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredItems.map(item => (
                <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedItem(item)}>
                  <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300">
                    {item.coverUrl || item.customCoverUrl ? (
                      <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-xs p-4 text-center gap-2"><BookOpen className="w-5 h-5 text-muted-foreground/50" /><span className="text-muted-foreground">{item.title}</span></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 gap-1.5">
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); onSendRec(item.title); }} className="w-full gap-2 h-8 text-xs bg-primary/90 hover:bg-primary"><Send className="w-3.5 h-3.5"/> Rec Back</Button>
                    </div>
                    {item.tier && <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center"><span className="text-xs font-display font-black text-yellow-400">{item.tier}</span></div>}
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-xs capitalize font-medium text-muted-foreground">{item.category}</p>
                      {item.rating != null && <p className="text-xs flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {item.rating}/10</p>}
                    </div>
                    <GenreTags genres={item.genres} />
                    {item.reviewText && <p className="text-[10px] text-muted-foreground mt-1 italic line-clamp-2">"{item.reviewText}"</p>}
                  </div>
                </div>
              ))}
            </div>
            {filteredItems.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No items match your search.</p>}
          </div>
        </div>
      )}

      <FriendMediaDialog 
        item={selectedItem} 
        open={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onSendRec={(title) => { setSelectedItem(null); onSendRec(title); }} 
      />
    </div>
  );
}

// ── Main Friends Page ─────────────────────────────────────────────────────────
type Tab = "friends" | "requests" | "recs";

export default function FriendsPage() {
  const { user } = useUser(); const { getToken } = useAuth(); const { toast } = useToast();
  const apiFetch: ApiFetch = useCallback(async (path, options) => {
    const token = await getToken(); const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), } });
    if (!res.ok) { const err = await res.json().catch(() => ({ error: "Unknown error" })); throw new Error(err.error ?? "Request failed"); }
    return res.json();
  }, [getToken]);

  const [profile, setProfile] = useState<UserProfile | null>(null); const [profileLoading, setProfileLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false); const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[]>([]); const [requests, setRequests] = useState<FriendRequest[]>([]); const [recs, setRecs] = useState<ReceivedRec[]>([]);
  const [addUsername, setAddUsername] = useState(""); const [addLoading, setAddLoading] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<FriendEntry | null>(null);
  const [sendRecOpen, setSendRecOpen] = useState(false); const [sendRecTitle, setSendRecTitle] = useState("");
  const [shareMap, setShareMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch("/api/friends/profile/me").then((data) => { if (!data) setShowSetup(true); else setProfile(data); })
      .catch(() => setShowSetup(true)).finally(() => setProfileLoading(false));
  }, [apiFetch]);

  useEffect(() => { if (profile) loadAll(); }, [profile]);

  const loadAll = async () => {
    try {
      const [f, r, rec] = await Promise.all([apiFetch("/api/friends"), apiFetch("/api/friends/requests"), apiFetch("/api/friends/recommendations")]);
      setFriends(f); setRequests(r); setRecs(rec);
      const statuses = await Promise.all(f.map(async (entry: FriendEntry) => {
        const s = await apiFetch(`/api/friends/${entry.friendId}/share-status`).catch(() => ({ enabled: false }));
        return [entry.friendId, s.enabled] as const;
      }));
      setShareMap(Object.fromEntries(statuses));
    } catch { toast({ title: "Failed to load friends data", variant: "destructive" }); }
  };

  const handleToggleShare = async (clerkId: string) => {
    const newVal = !shareMap[clerkId]; setShareMap((prev) => ({ ...prev, [clerkId]: newVal }));
    try { await apiFetch(`/api/friends/${clerkId}/share`, { method: "PATCH", body: JSON.stringify({ enabled: newVal }) }); }
    catch { setShareMap((prev) => ({ ...prev, [clerkId]: !newVal })); toast({ title: "Failed to update sharing", variant: "destructive" }); }
  };

  const handleSendRequest = async () => {
    if (!addUsername.trim()) return; setAddLoading(true);
    try { await apiFetch("/api/friends/request", { method: "POST", body: JSON.stringify({ username: addUsername.trim() }) }); toast({ title: "Friend request sent!" }); setAddUsername(""); }
    catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); } finally { setAddLoading(false); }
  };

  const handleAccept = async (id: number) => { try { await apiFetch(`/api/friends/requests/${id}/accept`, { method: "POST" }); toast({ title: "Friend request accepted!" }); loadAll(); } catch { toast({ title: "Failed to accept", variant: "destructive" }); } };
  const handleReject = async (id: number) => { try { await apiFetch(`/api/friends/requests/${id}/reject`, { method: "POST" }); loadAll(); } catch { toast({ title: "Failed to reject", variant: "destructive" }); } };
  const handleUnfriend = async (friendshipId: number) => { try { await apiFetch(`/api/friends/${friendshipId}`, { method: "DELETE" }); setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId)); toast({ title: "Unfriended" }); } catch { toast({ title: "Failed to unfriend", variant: "destructive" }); } };
  const handleMarkRecRead = async (id: number) => { try { await apiFetch(`/api/friends/recommendations/${id}/read`, { method: "PATCH" }); setRecs((prev) => prev.map((r) => r.id === id ? { ...r, isRead: true } : r)); } catch {} };

  const unreadRecs = recs.filter((r) => !r.isRead).length; const pendingRequests = requests.length;
  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "friends", label: "Friends", icon: Users }, { id: "requests", label: "Requests", icon: UserPlus, badge: pendingRequests || undefined }, { id: "recs", label: "Recs Inbox", icon: Inbox, badge: unreadRecs || undefined },
  ];

  if (profileLoading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (viewingFriend) {
    return <FriendProfileView friend={viewingFriend} onBack={() => setViewingFriend(null)} apiFetch={apiFetch} onSendRec={(title) => { setSendRecTitle(title); setSendRecOpen(true); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Friends</h1>
          {profile && <p className="text-sm text-muted-foreground mt-0.5">Your username: <span className="text-primary font-medium">@{profile.username}</span></p>}
        </div>
        <Button className="gap-2" onClick={() => { setSendRecTitle(""); setSendRecOpen(true); }}><Send className="w-4 h-4" /> Send a Rec</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm"><UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Add by username..." value={addUsername} onChange={(e) => setAddUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendRequest()} /></div>
        <Button onClick={handleSendRequest} disabled={addLoading || !addUsername.trim()}>{addLoading ? "Sending..." : "Add Friend"}</Button>
      </div>

      <div className="flex gap-1.5 border-b border-border">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px", tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.badge && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {friends.length === 0 ? (
            <div className="col-span-full text-center py-16 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No friends yet</p></div>
          ) : friends.map((f) => {
            const isSharing = !!shareMap[f.friendId];
            return (
              <div key={f.friendshipId} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-3">
                  <Avatar profile={f.friend} size="md" onClick={() => setViewingFriend(f)} />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingFriend(f)}>
                    {f.friend ? (
                      <><p className="font-medium text-sm group-hover:text-primary transition-colors">{f.friend.displayName ?? f.friend.username}</p><p className="text-xs text-muted-foreground">@{f.friend.username}</p></>
                    ) : (
                      <><p className="font-medium text-sm text-muted-foreground italic">Profile not set up yet</p></>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleUnfriend(f.friendshipId)}><X className="w-4 h-4"/></Button>
                  </div>
                </div>
                <button onClick={() => handleToggleShare(f.friendId)} className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors w-full bg-muted/50 p-2 rounded-lg justify-center">
                  {isSharing ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                  {isSharing ? "Sharing your library" : "Not sharing your library"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-3">
          {requests.length === 0 ? <div className="text-center py-16 text-muted-foreground"><UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No pending requests</p></div> : requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border"><Avatar profile={req.sender} size="md" /><div className="flex-1 min-w-0"><p className="font-medium text-sm">{req.sender?.displayName ?? req.sender?.username}</p><p className="text-xs text-muted-foreground">@{req.sender?.username} wants to be friends</p></div><div className="flex gap-2"><Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleAccept(req.id)}><Check className="w-3.5 h-3.5" /> Accept</Button><Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" onClick={() => handleReject(req.id)}><X className="w-3.5 h-3.5" /></Button></div></div>
          ))}
        </div>
      )}

      {tab === "recs" && (
        <div className="space-y-3">
          {recs.length === 0 ? <div className="text-center py-16 text-muted-foreground"><Inbox className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">No recommendations yet</p></div> : recs.map((rec) => (
            <div key={rec.id} className={cn("flex gap-3 p-4 rounded-xl border transition-colors", rec.isRead ? "bg-card border-border" : "bg-primary/5 border-primary/30")}>
              {rec.coverUrl ? <img src={rec.coverUrl} alt={rec.title} className="w-12 h-16 object-cover rounded flex-shrink-0" /> : <div className="w-12 h-16 bg-muted rounded flex items-center justify-center flex-shrink-0"><Heart className="w-5 h-5 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-sm">{rec.title}</p>{rec.category && <p className="text-xs text-muted-foreground capitalize">{rec.category}</p>}</div>{!rec.isRead && <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">New</span>}</div>
                <p className="text-xs text-muted-foreground mt-1">from <span className="text-foreground font-medium">@{rec.from?.username}</span></p>
                {rec.message && <p className="text-xs text-muted-foreground mt-1 italic">"{rec.message}"</p>}
                <div className="flex gap-2 mt-2">
                  {rec.readingUrl && <a href={rec.readingUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="h-7 text-xs gap-1"><BookOpen className="w-3 h-3" /> Read</Button></a>}
                  {!rec.isRead && <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handleMarkRecRead(rec.id)}>Mark as read</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SetupProfileDialog open={showSetup} onDone={(p) => { setProfile(p); setShowSetup(false); loadAll(); }} apiFetch={apiFetch} />
      <SendRecDialog open={sendRecOpen} onClose={() => setSendRecOpen(false)} friends={friends} preselectedTitle={sendRecTitle} apiFetch={apiFetch} />
    </div>
  );
}