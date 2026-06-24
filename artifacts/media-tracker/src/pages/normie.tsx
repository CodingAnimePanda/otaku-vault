// artifacts/media-tracker/src/pages/normie.tsx
import React, { useState, useMemo } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  useListMedia,
  useDeleteMedia,
  useCreateMedia,
  useUpdateMediaTier,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Clapperboard, Tv2, Star, LayoutList, Home, Plus, Trash2,
  Search, Loader2, Menu, X, BookOpen, ChevronLeft,
} from "lucide-react";
import { cn, proxyImage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

type NormieType = "tv" | "movie" | "book";
const TIERS = ["S", "A", "B", "C", "D", "F"] as const;
type Tier = (typeof TIERS)[number];

const TIER_CONFIG: Record<Tier, { color: string; bg: string }> = {
  S: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  A: { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  B: { color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  C: { color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30" },
  D: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  F: { color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
};

// ── Add Normie Dialog ─────────────────────────────────────────────────────────
const addSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["tv", "movie", "book"]),
  customCoverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type AddFormValues = z.infer<typeof addSchema>;

function AddNormieDialog({ open, onClose, defaultType }: { open: boolean; onClose: () => void; defaultType: NormieType }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMedia = useCreateMedia();

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { title: "", type: defaultType, customCoverUrl: "" },
  });

  React.useEffect(() => {
    if (!open) form.reset({ title: "", type: defaultType, customCoverUrl: "" });
  }, [open, defaultType]);

  const onSubmit = (values: AddFormValues) => {
    createMedia.mutate(
      { data: { title: values.title, category: `normie_${values.type}` as any, listType: "library", coverUrl: values.customCoverUrl || null, genres: [], status: null } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          toast({ title: "Added!", description: `${values.title} added to your normie collection.` });
          onClose();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-primary" />
            Add Normie Title
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="e.g. Breaking Bad" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="tv">TV Show</SelectItem>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="customCoverUrl" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground">Cover image URL (optional)</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} className="text-xs" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createMedia.isPending}>
                {createMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Normie Layout ─────────────────────────────────────────────────────────────
function NormieLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  React.useEffect(() => { setMobileOpen(false); }, [location]);

  const navItems = [
    { href: "/normie", label: "Collection", icon: Home },
    { href: "/normie/tierlist/tv", label: "TV Tier List", icon: LayoutList },
    { href: "/normie/tierlist/movie", label: "Movie Tier List", icon: LayoutList },
    { href: "/normie/tierlist/book", label: "Book Tier List", icon: LayoutList },
    { href: "/normie/recommended", label: "Recommended", icon: Star },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <Link href="/"
        className="h-12 flex items-center gap-2 px-4 border-b border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors flex-shrink-0">
        <ChevronLeft className="w-4 h-4" />
        Back to OtakuVault
      </Link>

      <div className="h-14 flex items-center px-6 border-b border-border flex-shrink-0">
        <Clapperboard className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
        <div>
          <h1 className="font-display font-bold text-base text-primary leading-none">Normie Stuff</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">TV, Movies & Books</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors group",
              location === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}>
            <item.icon className={cn("w-5 h-5 mr-3 flex-shrink-0", location === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col md:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center gap-3 px-4 border-b border-border md:hidden flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Clapperboard className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg text-primary">Normie Stuff</h1>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

// ── Normie Collection ─────────────────────────────────────────────────────────
function NormieCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<NormieType>("tv");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "tv" | "movie" | "book">("all");

  const { data: allMedia, isLoading } = useListMedia({ listType: "library" });
  const deleteMedia = useDeleteMedia();

  const normieItems = useMemo(() => {
    const arr = Array.isArray(allMedia) ? allMedia : [];
    return arr.filter((m) => m.category === "normie_tv" || m.category === "normie_movie" || m.category === "normie_book");
  }, [allMedia]);

  const filtered = useMemo(() => {
    let items = normieItems;
    if (tab !== "all") items = items.filter((m) => m.category === `normie_${tab}`);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((m) => m.title.toLowerCase().includes(q));
    }
    return items;
  }, [normieItems, tab, search]);

  const tvCount = normieItems.filter((m) => m.category === "normie_tv").length;
  const movieCount = normieItems.filter((m) => m.category === "normie_movie").length;
  const bookCount = normieItems.filter((m) => m.category === "normie_book").length;

  const handleDelete = (id: number) => {
    deleteMedia.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
        toast({ title: "Removed" });
      },
    });
  };

  const openAdd = (type: NormieType) => { setDefaultType(type); setAddOpen(true); };

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 overflow-hidden">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Clapperboard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">The Normie Stuff</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {tvCount} TV show{tvCount !== 1 ? "s" : ""} · {movieCount} movie{movieCount !== 1 ? "s" : ""} · {bookCount} book{bookCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 hidden sm:flex" onClick={() => openAdd("tv")}>
              <Tv2 className="w-4 h-4" /> Add TV Show
            </Button>
            <Button variant="outline" className="gap-2 hidden sm:flex" onClick={() => openAdd("book")}>
              <BookOpen className="w-4 h-4" /> Add Book
            </Button>
            <Button className="gap-2" onClick={() => openAdd("movie")}>
              <Clapperboard className="w-4 h-4" /> Add Movie
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(["all", "tv", "movie", "book"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border capitalize",
                tab === t ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}>
              {t === "tv" ? "TV Shows" : t === "movie" ? "Movies" : t === "book" ? "Books" : "All"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : normieItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clapperboard className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display font-semibold text-xl mb-2">Nothing here yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Add the TV shows, movies, and books you've watched or read.</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="outline" className="gap-2" onClick={() => openAdd("tv")}><Tv2 className="w-4 h-4" /> Add TV Show</Button>
              <Button variant="outline" className="gap-2" onClick={() => openAdd("book")}><BookOpen className="w-4 h-4" /> Add Book</Button>
              <Button className="gap-2" onClick={() => openAdd("movie")}><Clapperboard className="w-4 h-4" /> Add Movie</Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No results for "{search}"</p>
          <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setSearch("")}>Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filtered.map((item) => (
            <div key={item.id} className="group relative">
              <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-border/50 group-hover:ring-primary/40 transition-all duration-300">
                {item.coverUrl || item.customCoverUrl ? (
                  <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 text-xs p-4 text-center gap-2">
                    {item.category === "normie_tv" ? <Tv2 className="w-5 h-5 text-muted-foreground/50" />
                      : item.category === "normie_book" ? <BookOpen className="w-5 h-5 text-muted-foreground/50" />
                      : <Clapperboard className="w-5 h-5 text-muted-foreground/50" />}
                    <span className="text-muted-foreground">{item.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
                  {item.tier && <span className="text-xs font-display font-bold text-yellow-400">Tier {item.tier}</span>}
                  <Button size="sm" variant="ghost"
                    className="h-7 w-full bg-red-500/20 hover:bg-red-500/40 text-red-300 border-0 text-xs gap-1"
                    onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                </div>
                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9px] font-medium text-white/80">
                  {item.category === "normie_tv" ? "TV" : item.category === "normie_book" ? "Book" : "Movie"}
                </div>
                {item.tier && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs font-display font-black text-yellow-400">{item.tier}</span>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddNormieDialog open={addOpen} onClose={() => setAddOpen(false)} defaultType={defaultType} />
    </div>
  );
}

// ── Normie Tier List ──────────────────────────────────────────────────────────
function NormieTierList({ type }: { type: NormieType }) {
  const queryClient = useQueryClient();
  const { data: allMedia, isLoading } = useListMedia({ listType: "library" });
  const updateTier = useUpdateMediaTier();
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOverTier, setDragOverTier] = useState<Tier | null>(null);

  const mediaArray = useMemo(() => {
    const arr = Array.isArray(allMedia) ? allMedia : [];
    return arr.filter((m) => m.category === `normie_${type}`);
  }, [allMedia, type]);

  const handleDrop = (tier: Tier) => {
    if (dragging == null) return;
    updateTier.mutate({ id: dragging, data: { tier } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
    });
    setDragging(null); setDragOverTier(null);
  };

  const tierGroups: Record<Tier, typeof mediaArray> = { S: [], A: [], B: [], C: [], D: [], F: [] };
  const unranked: typeof mediaArray = [];
  mediaArray.forEach((item) => {
    if (item.tier && item.tier in tierGroups) tierGroups[item.tier as Tier].push(item);
    else unranked.push(item);
  });

  const label = type === "tv" ? "TV Shows" : type === "book" ? "Books" : "Movies";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">{label} Tier List</h1>
        <p className="text-muted-foreground mt-1">Drag titles between tiers to rank them</p>
      </div>
      {isLoading ? (
        <div className="space-y-3">{TIERS.map((t) => <div key={t} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {TIERS.map((tier) => (
            <div key={tier}
              onDragOver={(e) => { e.preventDefault(); setDragOverTier(tier); }}
              onDragLeave={() => setDragOverTier(null)}
              onDrop={() => handleDrop(tier)}
              className={cn("flex gap-3 rounded-xl border p-3 min-h-[88px] transition-all", TIER_CONFIG[tier].bg, dragOverTier === tier && "ring-2 ring-primary/50 scale-[1.01]")}>
              <div className="flex-shrink-0 w-14 flex items-center justify-center">
                <span className={cn("text-4xl font-display font-black", TIER_CONFIG[tier].color)}>{tier}</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-3 items-center">
                {tierGroups[tier].length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">Drop {label.toLowerCase()} here</span>
                ) : (
                  tierGroups[tier].map((item) => (
                    <div key={item.id} draggable
                      onDragStart={() => setDragging(item.id)}
                      onDragEnd={() => { setDragging(null); setDragOverTier(null); }}
                      className={cn("flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing w-16 group", dragging === item.id && "opacity-40")}>
                      <div className="w-16 h-24 rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/50">
                        {item.coverUrl || item.customCoverUrl ? (
                          <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">{item.title}</div>
                        )}
                      </div>
                      <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground">{item.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
          {unranked.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Unranked — drag to a tier above</h3>
              <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-dashed border-border bg-muted/20 min-h-[100px]">
                {unranked.map((item) => (
                  <div key={item.id} draggable
                    onDragStart={() => setDragging(item.id)}
                    onDragEnd={() => { setDragging(null); setDragOverTier(null); }}
                    className={cn("flex flex-col items-center gap-1 cursor-grab w-16 group", dragging === item.id && "opacity-40")}>
                    <div className="w-16 h-24 rounded-md overflow-hidden bg-muted ring-1 ring-border group-hover:ring-primary/50">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground text-center px-1">{item.title}</div>
                      )}
                    </div>
                    <span className="text-[10px] text-center leading-tight line-clamp-2 text-muted-foreground group-hover:text-foreground">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mediaArray.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No {label.toLowerCase()} in your collection yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Normie Recommended ────────────────────────────────────────────────────────
function NormieRecommended() {
  const popular = [
    { title: "Breaking Bad", type: "tv", year: "2008", note: "Crime drama masterpiece" },
    { title: "Succession", type: "tv", year: "2018", note: "Ruthless family drama" },
    { title: "The Bear", type: "tv", year: "2022", note: "Intense kitchen chaos" },
    { title: "Severance", type: "tv", year: "2022", note: "Mind-bending sci-fi" },
    { title: "Oppenheimer", type: "movie", year: "2023", note: "Epic historical drama" },
    { title: "Everything Everywhere All at Once", type: "movie", year: "2022", note: "Multiverse chaos comedy" },
    { title: "Parasite", type: "movie", year: "2019", note: "Korean thriller perfection" },
    { title: "The Shawshank Redemption", type: "movie", year: "1994", note: "All-time classic" },
    { title: "Dune: Part Two", type: "movie", year: "2024", note: "Sci-fi epic" },
    { title: "Shogun", type: "tv", year: "2024", note: "Feudal Japan drama" },
    { title: "The Name of the Wind", type: "book", year: "2007", note: "Fantasy epic by Patrick Rothfuss" },
    { title: "Project Hail Mary", type: "book", year: "2021", note: "Gripping sci-fi survival story" },
    { title: "The Night Circus", type: "book", year: "2011", note: "Lush magical realism" },
    { title: "Piranesi", type: "book", year: "2020", note: "Mysterious and unlike anything else" },
  ];
  const [tab, setTab] = useState<"all" | "tv" | "movie" | "book">("all");
  const filtered = tab === "all" ? popular : popular.filter((p) => p.type === tab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Star className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">Recommended</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Highly rated TV shows, movies & books</p>
        </div>
      </div>
      <div className="flex gap-2">
        {(["all", "tv", "movie", "book"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border capitalize",
              tab === t ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}>
            {t === "tv" ? "TV Shows" : t === "movie" ? "Movies" : t === "book" ? "Books" : "All"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
              {item.type === "tv" ? <Tv2 className="w-5 h-5 text-primary" />
                : item.type === "book" ? <BookOpen className="w-5 h-5 text-primary" />
                : <Clapperboard className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.year} · {item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Route switcher ────────────────────────────────────────────────────────────
export default function NormiePage() {
  const [matchTierTV] = useRoute("/normie/tierlist/tv");
  const [matchTierMovie] = useRoute("/normie/tierlist/movie");
  const [matchTierBook] = useRoute("/normie/tierlist/book");
  const [matchRecommended] = useRoute("/normie/recommended");

  const content = matchTierTV ? <NormieTierList type="tv" />
    : matchTierMovie ? <NormieTierList type="movie" />
    : matchTierBook ? <NormieTierList type="book" />
    : matchRecommended ? <NormieRecommended />
    : <NormieCollection />;

  return <NormieLayout>{content}</NormieLayout>;
}