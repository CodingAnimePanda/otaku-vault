import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Library, 
  ListPlus, 
  LayoutList, 
  Star, 
  AlertTriangle, 
  BellRing,
  Menu,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
        <div className="h-16 flex items-center px-6 border-b border-border">
          <BookOpen className="w-6 h-6 text-primary mr-3" />
          <h1 className="font-display font-bold text-xl text-primary tracking-wide">OtakuVault</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
              location === item.href || (item.href !== "/" && location.startsWith(item.href))
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              item.className
            )}>
              <item.icon className={cn(
                "w-5 h-5 mr-3 flex-shrink-0 transition-colors",
                location === item.href || (item.href !== "/" && location.startsWith(item.href))
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
                item.className
              )} />
              {item.label}
            </Link>
          ))}
        </nav>
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
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
