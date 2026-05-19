// artifacts/media-tracker/src/components/layout.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Library,
  ListPlus,
  LayoutList,
  Star,
  AlertTriangle,
  Menu,
  BookOpen,
  Heart,
  Lock,
  X,
  Plus,
  Trash2,
  Globe,
  Settings,
  Tv,
  Clapperboard,
  Sparkles,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useClerk, useUser } from "@clerk/clerk-react";
import { LogOut } from "lucide-react";

export interface ReadingSite {
  label: string;
  url: string;
  emoji: string;
}

const DEFAULT_SITES: ReadingSite[] = [
  { label: "Webtoon",   url: "https://www.webtoons.com", emoji: "📱" },
  { label: "MangaFire", url: "https://mangafire.to",     emoji: "🔥" },
  { label: "VyManga",   url: "https://vymanga.com",      emoji: "📚" },
];

function loadSites(): ReadingSite[] {
  try {
    const stored = localStorage.getItem("ov_reading_sites");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_SITES;
}

function saveSites(sites: ReadingSite[]) {
  try { localStorage.setItem("ov_reading_sites", JSON.stringify(sites)); } catch {}
}

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
    setSites(updated);
    saveSites(updated);
    setNewLabel(""); setNewUrl(""); setNewEmoji("🌐");
  };

  const handleRemove = (idx: number) => {
    const updated = sites.filter((_, i) => i !== idx);
    setSites(updated);
    saveSites(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Reading Sites
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

function UserAccountButton() {
  const { signOut } = useClerk();
  const { user } = useUser();
  return (
    <button
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out {user?.firstName ? `(${user.firstName})` : ""}
    </button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [logoClicks, setLogoClicks] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sitesOpen, setSitesOpen] = useState(false);
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

  const mainNavItems = [
    { href: "/", label: "Library", icon: Library },
    { href: "/tierlist/webtoon", label: "Tier Lists", icon: LayoutList },
    { href: "/recommended", label: "Recommended", icon: Star },
    { href: "/to-read", label: "To Read", icon: ListPlus },
    { href: "/to-watch", label: "To Watch", icon: Tv },
    { href: "/avoid", label: "Avoid", icon: AlertTriangle, className: "text-destructive" },
  ];

  const extraNavItems = [
    { href: "/moments", label: "Fav Moments", icon: Sparkles },
    { href: "/quotes", label: "Quotes", icon: Quote },
  ];

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const NavLink = ({ href, label, icon: Icon, className }: { href: string; label: string; icon: any; className?: string }) => (
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
        {mainNavItems.map((item) => <NavLink key={item.href} {...item} />)}

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

      <div className="px-3 pb-4 flex-shrink-0">
        <button onClick={() => setSitesOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors">
          <Settings className="w-3.5 h-3.5" />
          Manage Reading Sites
        </button>
        <UserAccountButton />
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex-col hidden md:flex">
        <SidebarContent />
      </aside>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col md:hidden transition-transform duration-300 ease-in-out",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => setMobileSidebarOpen(false)}>
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 border-b border-border md:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-lg text-primary">OtakuVault</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>

      <SitesDialog open={sitesOpen} onClose={() => setSitesOpen(false)} />
    </div>
  );

}