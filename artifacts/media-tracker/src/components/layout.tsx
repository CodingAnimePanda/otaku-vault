// artifacts/media-tracker/src/components/layout.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import {
  Library, ListPlus, LayoutList, Star, AlertTriangle,
  Menu, BookOpen, Heart, Lock, X, Plus, Trash2, Globe,
  Settings, Tv, Clapperboard, Sparkles, Quote, LogOut,
  Palette, Camera, Upload, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";

// ── Reading Sites ─────────────────────────────────────────────────────────────
export interface ReadingSite { label: string; url: string; emoji: string; }
const DEFAULT_SITES: ReadingSite[] = [
  { label: "Webtoon",   url: "https://www.webtoons.com", emoji: "📱" },
  { label: "MangaFire", url: "https://mangafire.to",     emoji: "🔥" },
  { label: "VyManga",   url: "https://vymanga.com",      emoji: "📚" },
];
function loadSites(): ReadingSite[] {
  try { const s = localStorage.getItem("ov_reading_sites"); if (s) return JSON.parse(s); } catch {}
  return DEFAULT_SITES;
}
function saveSites(sites: ReadingSite[]) {
  try { localStorage.setItem("ov_reading_sites", JSON.stringify(sites)); } catch {}
}

// ── Background Settings ───────────────────────────────────────────────────────
export interface BgSettings {
  type: "none" | "solid" | "gradient" | "image";
  value: string; // hex color, gradient string, or image URL/base64
}
const DEFAULT_BG: BgSettings = { type: "none", value: "" };

function loadBg(userId: string): BgSettings {
  try { const s = localStorage.getItem(`ov_bg_${userId}`); if (s) return JSON.parse(s); } catch {}
  return DEFAULT_BG;
}
function saveBg(userId: string, bg: BgSettings) {
  try { localStorage.setItem(`ov_bg_${userId}`, JSON.stringify(bg)); } catch {}
}

function bgStyle(bg: BgSettings): React.CSSProperties {
  if (bg.type === "none") return {};
  if (bg.type === "solid") return { backgroundColor: bg.value };
  if (bg.type === "gradient") return { background: bg.value };
  if (bg.type === "image") return {
    backgroundImage: `url(${bg.value})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
  return {};
}

// ── Preset gradients ──────────────────────────────────────────────────────────
const PRESET_GRADIENTS = [
  { label: "Midnight", value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
  { label: "Aurora",   value: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)" },
  { label: "Sakura",   value: "linear-gradient(135deg, #2d1b2e, #4a1942, #8b2252)" },
  { label: "Neon",     value: "linear-gradient(135deg, #0a0a0a, #1a0533, #0d1b2a)" },
  { label: "Sunset",   value: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)" },
  { label: "Forest",   value: "linear-gradient(135deg, #0a1628, #0d2137, #0a2e1e)" },
];

const PRESET_COLORS = [
  "#0f0f11", "#1a1a2e", "#16213e", "#0d0d1a",
  "#1a0a0a", "#0a1a0a", "#1a1a0a", "#0a0a1a",
];

// ── Background Dialog ─────────────────────────────────────────────────────────
function BgDialog({ open, onClose, userId, bg, onChange }: {
  open: boolean; onClose: () => void; userId: string;
  bg: BgSettings; onChange: (bg: BgSettings) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"none" | "solid" | "gradient" | "image">(bg.type);
  const [colorInput, setColorInput] = useState(bg.type === "solid" ? bg.value : "#1a1a2e");
  const [imgUrl, setImgUrl] = useState(bg.type === "image" && !bg.value.startsWith("data:") ? bg.value : "");
  const { toast } = useToast();

  const apply = (newBg: BgSettings) => {
    onChange(newBg);
    saveBg(userId, newBg);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => apply({ type: "image", value: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" /> Customize Background
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {(["none", "solid", "gradient", "image"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all",
                tab === t ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}>{t === "none" ? "Default" : t}</button>
          ))}
        </div>

        {tab === "none" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Use the default app background.</p>
            <Button className="w-full" onClick={() => { apply(DEFAULT_BG); onClose(); }}>Apply Default</Button>
          </div>
        )}

        {tab === "solid" && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => { setColorInput(c); apply({ type: "solid", value: c }); }}
                  className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-105"
                  style={{ backgroundColor: c, borderColor: colorInput === c ? "white" : "transparent" }} />
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input type="color" value={colorInput} onChange={(e) => setColorInput(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border" />
              <Input value={colorInput} onChange={(e) => setColorInput(e.target.value)} className="flex-1 text-xs font-mono" placeholder="#1a1a2e" />
              <Button size="sm" onClick={() => { apply({ type: "solid", value: colorInput }); onClose(); }}>Apply</Button>
            </div>
          </div>
        )}

        {tab === "gradient" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {PRESET_GRADIENTS.map((g) => (
                <button key={g.label} onClick={() => { apply({ type: "gradient", value: g.value }); onClose(); }}
                  className="h-16 rounded-xl border border-border hover:border-primary/50 transition-all hover:scale-[1.02] flex items-end p-2"
                  style={{ background: g.value }}>
                  <span className="text-[10px] text-white/80 font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "image" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="https://..." value={imgUrl} onChange={(e) => setImgUrl(e.target.value)}
                className="flex-1 text-xs" />
              <Button size="sm" onClick={() => { if (imgUrl) { apply({ type: "image", value: imgUrl }); onClose(); } }}>Use URL</Button>
            </div>
            <div className="text-center text-xs text-muted-foreground">or</div>
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <Upload className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Click to upload image</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG up to 5MB</p>
            </button>
            {bg.type === "image" && (
              <div className="flex gap-2 items-center">
                <img src={bg.value} alt="Current bg" className="w-16 h-10 object-cover rounded border border-border" />
                <Button size="sm" variant="destructive" onClick={() => apply(DEFAULT_BG)}>Remove</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Profile Picture ───────────────────────────────────────────────────────────
function ProfileSection({ onOpenBg }: { onOpenBg: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await user.setProfileImage({ file });
      toast({ title: "Profile picture updated!" });
    } catch {
      toast({ title: "Failed to upload", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initials = user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="px-3 pb-4 flex-shrink-0 border-t border-border pt-3 space-y-2">
      {/* Profile row */}
      <div className="flex items-center gap-2.5 px-1">
        <div className="relative group/avatar flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center ring-2 ring-border">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">
            {user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? "User"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {user?.emailAddresses?.[0]?.emailAddress ?? ""}
          </p>
        </div>
      </div>

      {/* Actions */}
      <button onClick={onOpenBg}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors">
        <Palette className="w-3.5 h-3.5" />
        Customize Background
      </button>
      <button onClick={() => signOut({ redirectUrl: "/sign-in" })}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
    </div>
  );
}

// ── Sites Dialog ──────────────────────────────────────────────────────────────
function SitesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sites, setSites] = useState<ReadingSite[]>(loadSites);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEmoji, setNewEmoji] = useState("🌐");

  const handleAdd = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    const updated = [...sites, { label: newLabel.trim(), url, emoji: newEmoji }];
    setSites(updated); saveSites(updated);
    setNewLabel(""); setNewUrl(""); setNewEmoji("🌐");
  };
  const handleRemove = (idx: number) => {
    const updated = sites.filter((_, i) => i !== idx);
    setSites(updated); saveSites(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Reading Sites
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">These appear as quick-pick buttons when adding media.</p>
        <div className="space-y-2 mt-2">
          {sites.map((site, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
              <span className="text-lg">{site.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{site.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{site.url}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0" onClick={() => handleRemove(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-sm font-medium">Add a new site</p>
          <div className="flex gap-2">
            <Input placeholder="Emoji" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-16 text-center" />
            <Input placeholder="Site name" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="flex-1" />
          </div>
          <Input placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Button className="w-full gap-2" onClick={handleAdd} disabled={!newLabel.trim() || !newUrl.trim()}>
            <Plus className="w-4 h-4" /> Add Site
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [logoClicks, setLogoClicks] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const { user } = useUser();
  const { getToken } = useAuth();
  const userId = user?.id ?? "guest";

  const [bg, setBg] = useState<BgSettings>(() => loadBg(userId));

  // Reload bg when user changes
  useEffect(() => { if (user?.id) setBg(loadBg(user.id)); }, [user?.id]);

  const [blUnlocked, setBlUnlocked] = useState(() => {
    try { return localStorage.getItem("ovbl") === "1"; } catch { return false; }
  });

  useEffect(() => { setMobileSidebarOpen(false); }, [location]);
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (blUnlocked) {
          setBlUnlocked(false);
          try { localStorage.removeItem("ovbl"); } catch {}
        } else {
          setBlUnlocked(true);
          try { localStorage.setItem("ovbl", "1"); } catch {}
        }
        return 0;
      }
      return next;
    });
  };

  const [friendBadge, setFriendBadge] = useState(0);

useEffect(() => {
  const fetchBadge = async () => {
    try {
      const token = await getToken();
      const baseUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
      const res = await fetch(`${baseUrl}/api/friends/notifications/count`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFriendBadge(data.total ?? 0);
      }
    } catch {}
  };
  if (user?.id) {
    fetchBadge();
    const interval = setInterval(fetchBadge, 60_000);
    return () => clearInterval(interval);
  }
}, [user?.id]);

  const mainNavItems = [
    { href: "/", label: "Library", icon: Library },
    { href: "/tierlist/webtoon", label: "Tier Lists", icon: LayoutList },
    { href: "/recommended", label: "Recommended", icon: Star },
    { href: "/to-read", label: "To Read", icon: ListPlus },
    { href: "/to-watch", label: "To Watch", icon: Tv },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/avoid", label: "Avoid", icon: AlertTriangle, className: "text-destructive" },
  ];

  const extraNavItems = [
    { href: "/moments", label: "Fav Moments", icon: Sparkles },
    { href: "/quotes", label: "Quotes", icon: Quote },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const NavLink = ({ href, label, icon: Icon, className, badge }: {
  href: string; label: string; icon: any; className?: string; badge?: number;
}) => (
  <Link href={href}
    className={cn(
      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
      isActive(href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      className
    )}>
    <Icon className={cn("w-5 h-5 mr-3 flex-shrink-0 transition-colors",
      isActive(href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
      className
    )} />
    {label}
    {badge ? (
      <span className="ml-auto bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
        {badge}
      </span>
    ) : null}
  </Link>
);

  const SidebarContent = () => (
    <>
      <button onClick={handleLogoClick}
        className="h-16 flex items-center px-6 border-b border-border w-full text-left select-none focus:outline-none flex-shrink-0">
        <BookOpen className="w-6 h-6 text-primary mr-3 flex-shrink-0" />
        <h1 className="font-display font-bold text-xl text-primary tracking-wide">OtakuVault</h1>
      </button>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink key={item.href} {...item} badge={item.href === "/friends" ? (friendBadge || undefined) : undefined} />
        ))}

        {blUnlocked && (
          <Link href="/bl-vault"
            className={cn("flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group mt-2",
              location === "/bl-vault" ? "bg-rose-500/15 text-rose-400" : "text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400"
            )}>
            <Heart className={cn("w-4 h-4 mr-3 flex-shrink-0", location === "/bl-vault" ? "text-rose-400 fill-rose-400" : "text-rose-400/50")} />
            <span className="opacity-80">Secret Vault</span>
            <Lock className="w-3 h-3 ml-auto opacity-40" />
          </Link>
        )}

        <div className="pt-3 mt-2 border-t border-border space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 pb-1">Collections</p>
          {extraNavItems.map((item) => <NavLink key={item.href} {...item} />)}
        </div>

        <div className="pt-3 mt-1 border-t border-border">
          <Link href="/normie"
            className={cn("flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
              location.startsWith("/normie") ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}>
            <Clapperboard className={cn("w-5 h-5 mr-3 flex-shrink-0", location.startsWith("/normie") ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            The Normie Stuff
          </Link>
        </div>
      </nav>

      {logoClicks > 0 && logoClicks < 5 && (
        <div className="flex justify-center gap-1 pb-1 flex-shrink-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={cn("w-1 h-1 rounded-full transition-colors", i < logoClicks ? "bg-rose-400/60" : "bg-muted")} />
          ))}
        </div>
      )}

      <div className="px-3 pb-2 flex-shrink-0">
        <button onClick={() => setSitesOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors">
          <Settings className="w-3.5 h-3.5" />
          Manage Reading Sites
        </button>
      </div>

      <ProfileSection onOpenBg={() => setBgOpen(true)} />
    </>
  );

  // Sidebar tint based on bg
  const sidebarStyle: React.CSSProperties = bg.type !== "none" ? {
    backgroundColor: bg.type === "solid"
      ? bg.value + "cc"
      : bg.type === "gradient"
      ? undefined
      : undefined,
    backdropFilter: bg.type !== "none" ? "blur(20px)" : undefined,
  } : {};

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex-col hidden md:flex" style={sidebarStyle}>
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col md:hidden transition-transform duration-300 ease-in-out",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={sidebarStyle}>
        <button className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => setMobileSidebarOpen(false)}>
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={bgStyle(bg)}>
        {/* Overlay to ensure text readability over any background */}
        {bg.type !== "none" && (
          <div className="absolute inset-0 bg-background/40 pointer-events-none" />
        )}

        <header className="relative h-16 flex items-center justify-between px-4 border-b border-border md:hidden flex-shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-lg text-primary">OtakuVault</h1>
          </div>
        </header>

        <div className="relative flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>

      <SitesDialog open={sitesOpen} onClose={() => setSitesOpen(false)} />
      <BgDialog open={bgOpen} onClose={() => setBgOpen(false)} userId={userId} bg={bg} onChange={setBg} />
    </div>
  );
}