import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Library,
  ListPlus,
  LayoutList,
  Star,
  AlertTriangle,
  BellRing,
  Menu,
  BookOpen,
  Heart,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [logoClicks, setLogoClicks] = useState(0);
  const [blUnlocked, setBlUnlocked] = useState(() => {
    try { return localStorage.getItem("ovbl") === "1"; } catch { return false; }
  });

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setBlUnlocked(true);
        try { localStorage.setItem("ovbl", "1"); } catch {}
        return 0;
      }
      return next;
    });
  };

  const navItems = [
    { href: "/", label: "Library", icon: Library },
    { href: "/tierlist/webtoon", label: "Tier Lists", icon: LayoutList },
    { href: "/recommended", label: "Recommended", icon: Star },
    { href: "/to-read", label: "To Read", icon: ListPlus },
    { href: "/updates", label: "Updates", icon: BellRing },
    { href: "/avoid", label: "Avoid", icon: AlertTriangle, className: "text-destructive" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <button
          onClick={handleLogoClick}
          className="h-16 flex items-center px-6 border-b border-border w-full text-left select-none focus:outline-none"
        >
          <BookOpen className="w-6 h-6 text-primary mr-3 flex-shrink-0" />
          <h1 className="font-display font-bold text-xl text-primary tracking-wide">OtakuVault</h1>
        </button>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
                location === item.href || (item.href !== "/" && location.startsWith(item.href))
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                item.className
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 mr-3 flex-shrink-0 transition-colors",
                  location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                  item.className
                )}
              />
              {item.label}
            </Link>
          ))}

          {blUnlocked && (
            <Link
              href="/bl-vault"
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group mt-2",
                location === "/bl-vault"
                  ? "bg-rose-500/15 text-rose-400"
                  : "text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-400"
              )}
            >
              <Heart
                className={cn(
                  "w-4 h-4 mr-3 flex-shrink-0",
                  location === "/bl-vault" ? "text-rose-400 fill-rose-400" : "text-rose-400/50"
                )}
              />
              <span className="opacity-80">Secret Vault</span>
              <Lock className="w-3 h-3 ml-auto opacity-40" />
            </Link>
          )}
        </nav>

        {/* Subtle hint dots while clicking toward unlock */}
        {logoClicks > 0 && logoClicks < 5 && (
          <div className="flex justify-center gap-1 pb-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 h-1 rounded-full transition-colors",
                  i < logoClicks ? "bg-rose-400/60" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-border md:hidden">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-primary mr-2" />
            <h1 className="font-display font-bold text-lg text-primary">OtakuVault</h1>
          </div>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
