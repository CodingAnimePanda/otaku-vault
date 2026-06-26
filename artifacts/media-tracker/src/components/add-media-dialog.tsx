// artifacts/media-tracker/src/components/add-media-dialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateMedia, useSearchCover, getListMediaQueryKey,
  getGetMediaStatsQueryKey, getSearchCoverQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Check, Loader2, ExternalLink, X, Plus, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["webtoon", "manhwa", "manhua", "manga", "anime"] as const;
const LIST_TYPES = ["library", "to_read", "avoid", "bl"] as const;
const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;

const READING_SITES = [
  { label: "Webtoon",   url: "https://www.webtoons.com",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-400/50",   emoji: "📱" },
  { label: "MangaFire", url: "https://mangafire.to",      color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-400/50", emoji: "🔥" },
  { label: "VyManga",   url: "https://vymanga.com",       color: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-400/50", emoji: "📚" },
];

const GENRE_COLORS = [
  "bg-sky-500/15 text-sky-400", "bg-violet-500/15 text-violet-400",
  "bg-rose-500/15 text-rose-400", "bg-amber-500/15 text-amber-400",
  "bg-teal-500/15 text-teal-400", "bg-fuchsia-500/15 text-fuchsia-400",
  "bg-lime-500/15 text-lime-400", "bg-cyan-500/15 text-cyan-400",
];
function genreColor(genre: string) {
  let hash = 0;
  for (let i = 0; i < genre.length; i++) hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return GENRE_COLORS[Math.abs(hash) % GENRE_COLORS.length];
}

// ── MangaDex candidate type ───────────────────────────────────────────────────
interface MangaCandidate {
  id: string;
  title: string;
  coverUrl: string | null;
  genres: string[];
}

async function fetchCandidatesMangaDex(title: string): Promise<MangaCandidate[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";
    const res = await fetch(`${apiUrl}/api/media/proxy/mangadex?title=${encodeURIComponent(title)}`);
    if (!res.ok) return [];
    const json = await res.json() as {
      data?: Array<{
        id: string;
        attributes?: {
          title?: Record<string, string>;
          altTitles?: Array<Record<string, string>>;
          tags?: Array<{ attributes?: { name?: { en?: string }; group?: string } }>;
        };
        relationships?: Array<{ type: string; id: string; attributes?: { fileName?: string } }>;
      }>;
    };
    return (json.data ?? []).map((item) => {
      const attrs = item.attributes ?? {};
      const displayTitle = attrs.title?.en ?? attrs.title?.["ja-ro"] ?? Object.values(attrs.title ?? {})[0] ?? "Unknown";
      const coverRel = item.relationships?.find((r) => r.type === "cover_art");
      const coverUrl = coverRel?.attributes?.fileName
        ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg`
        : null;
      const genres = (attrs.tags ?? [])
        .filter((t) => t.attributes?.group === "genre" || t.attributes?.group === "theme")
        .map((t) => t.attributes?.name?.en ?? "")
        .filter(Boolean)
        .slice(0, 8);
      return { id: item.id, title: displayTitle, coverUrl, genres };
    });
  } catch { return []; }
}

async function fetchGenresJikan(title: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`);
    if (!res.ok) return [];
    const json = await res.json() as { data?: Array<{ genres?: Array<{ name: string }> }> };
    return (json.data?.[0]?.genres ?? []).map((g) => g.name).slice(0, 8);
  } catch { return []; }
}

// ── Genre Tag Editor ──────────────────────────────────────────────────────────
function GenreTagEditor({ genres, onChange }: { genres: string[]; onChange: (g: string[]) => void }) {
  const [input, setInput] = useState("");
  const addGenre = (g: string) => {
    const trimmed = g.trim();
    if (!trimmed || genres.includes(trimmed)) return;
    onChange([...genres, trimmed]);
    setInput("");
  };
  const removeGenre = (g: string) => onChange(genres.filter((x) => x !== g));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[32px]">
        {genres.map((g) => (
          <span key={g} className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium", genreColor(g))}>
            {g}
            <button type="button" onClick={() => removeGenre(g)} className="hover:opacity-70 transition-opacity ml-0.5"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
        {genres.length === 0 && <span className="text-xs text-muted-foreground italic">No genres yet</span>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Add a genre..." value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGenre(input); } }}
          className="flex-1 h-7 text-xs" />
        <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => addGenre(input)} disabled={!input.trim()}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Match Picker ──────────────────────────────────────────────────────────────
function MatchPicker({ candidates, onPick, onSkip }: {
  candidates: MangaCandidate[];
  onPick: (c: MangaCandidate) => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <p className="text-xs font-medium text-muted-foreground">Is this the right title? Pick a match:</p>
      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {candidates.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick(c)}
            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left group">
            {c.coverUrl
              ? <img src={c.coverUrl} alt={c.title} className="w-8 h-12 object-cover rounded flex-shrink-0 border border-border" />
              : <div className="w-8 h-12 rounded bg-muted-foreground/20 flex-shrink-0" />}
            <span className="text-xs font-medium flex-1 leading-snug">{c.title}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={onSkip}>
        None of these — skip
      </Button>
    </div>
  );
}

// ── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORIES),
  listType: z.enum(LIST_TYPES),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
  addedBy: z.string().optional(),
  customCoverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultListType?: "library" | "to_read" | "avoid";
}

export function AddMediaDialog({ open, onClose, defaultListType = "library" }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [coverSearch, setCoverSearch] = useState<{ title: string; category: string } | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [candidates, setCandidates] = useState<MangaCandidate[] | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "manhwa", listType: defaultListType, status: undefined, notes: "", addedBy: "", customCoverUrl: "", readingUrl: "", description: "" },
  });

  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");
  const watchedReadingUrl = form.watch("readingUrl");

  const searchParams = coverSearch
    ? { title: coverSearch.title, category: coverSearch.category as typeof CATEGORIES[number] }
    : { title: "", category: "manhwa" as const };

  const { data: coverResults, isFetching: coverFetching } = useSearchCover(searchParams, {
    query: { enabled: !!coverSearch?.title, queryKey: getSearchCoverQueryKey(searchParams) },
  });

  const createMedia = useCreateMedia();

  useEffect(() => {
    if (open) {
      form.reset({ title: "", category: "manhwa", listType: defaultListType, status: undefined, notes: "", addedBy: "", customCoverUrl: "", readingUrl: "", description: "" });
      setSelectedCover(null);
      setCoverSearch(null);
      setGenres([]);
      setCandidates(null);
    }
  }, [open, form, defaultListType]);

  const handleSearch = async () => {
    if (!watchedTitle) return;
    setCoverSearch({ title: watchedTitle, category: watchedCategory });
    if (watchedCategory === "anime") {
      setFetching(true);
      const fetched = await fetchGenresJikan(watchedTitle);
      setFetching(false);
      if (fetched.length > 0) {
        setGenres(fetched);
        toast({ title: "Genres fetched!", description: `Found ${fetched.length} genre tags.` });
      }
    } else {
      setFetching(true);
      const results = await fetchCandidatesMangaDex(watchedTitle);
      setFetching(false);
      if (results.length > 0) {
        setCandidates(results);
      } else {
        toast({ title: "No results found", description: "Try adjusting the title.", variant: "destructive" });
      }
    }
  };

  const handlePickCandidate = (c: MangaCandidate) => {
    setGenres(c.genres);
    if (c.coverUrl && !selectedCover) setSelectedCover(c.coverUrl);
    setCandidates(null);
    toast({ title: "Match confirmed!", description: `Using genres from "${c.title}".` });
  };

  const onSubmit = (values: FormValues) => {
    createMedia.mutate(
      { data: { ...values, coverUrl: selectedCover || values.customCoverUrl || null, genres } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
          toast({ title: "Added!", description: `${values.title} has been added.` });
          onClose();
        },
        onError: () => { toast({ title: "Error", description: "Failed to add.", variant: "destructive" }); },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Title</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g. Omniscient Reader" {...field} data-testid="input-title" /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="listType" render={({ field }) => (
                <FormItem>
                  <FormLabel>List</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>{LIST_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="readingUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Reading / Watching Link</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder="https://..." {...field} className="flex-1 text-xs" />
                      {watchedReadingUrl && (
                        <a href={watchedReadingUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center w-9 flex-shrink-0 bg-muted hover:bg-muted/80 rounded-md border border-border transition-colors">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {READING_SITES.map((site) => (
                        <div key={site.label} className="flex group">
                          <button type="button" onClick={() => form.setValue("readingUrl", site.url)}
                            className={cn("text-[10px] px-2 py-1 rounded-l-md border border-r-0 transition-colors flex items-center gap-1", site.color)}>
                            <span>{site.emoji}</span> {site.label}
                          </button>
                          <button type="button" disabled={!watchedTitle}
                            onClick={() => {
                              const searchUrl = site.url.includes("mangafire")
                                ? `https://mangafire.to/filter?keyword=${encodeURIComponent(watchedTitle)}`
                                : site.url.includes("vymanga")
                                ? `https://vymanga.net/search?q=${encodeURIComponent(watchedTitle)}`
                                : `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(watchedTitle)}`;
                              window.open(searchUrl, "_blank");
                            }}
                            className={cn("text-[10px] px-1.5 py-1 rounded-r-md border transition-colors flex items-center justify-center",
                              site.color, "hover:bg-foreground/5 disabled:opacity-50 disabled:cursor-not-allowed")}>
                            <Search className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Cover + Genre Search */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">Cover & Genres</label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                  onClick={handleSearch} disabled={!watchedTitle || coverFetching || fetching}>
                  {(coverFetching || fetching) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto-fill
                </Button>
              </div>

              {/* Match picker */}
              {candidates && (
                <MatchPicker candidates={candidates} onPick={handlePickCandidate} onSkip={() => setCandidates(null)} />
              )}

              {/* Cover results */}
              {Array.isArray(coverResults) && coverResults.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
                  {coverResults.map((result: any, i: number) => (
                    <button key={i} type="button" onClick={() => setSelectedCover(result.coverUrl ?? result.url)}
                      className={cn("relative w-16 h-24 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all snap-start",
                        selectedCover === (result.coverUrl ?? result.url) ? "border-primary scale-105" : "border-transparent hover:border-primary/50")}>
                      <img src={result.coverUrl ?? result.url} alt="Cover" className="w-full h-full object-cover" />
                      {selectedCover === (result.coverUrl ?? result.url) && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <FormField control={form.control} name="customCoverUrl" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder="https://..." 
                      {...field} 
                      className="text-xs"
                      onBlur={(e) => {
                        const url = e.target.value;
                        if (url.includes("uploads.mangadex.org")) {
                          const proxied = `https://otakuvault-api.onrender.com/api/media/proxy/image?url=${encodeURIComponent(url)}`;
                          field.onChange(proxied);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {(selectedCover || form.watch("customCoverUrl")) && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <img src={selectedCover || form.watch("customCoverUrl") || ""} alt="Selected cover" className="w-10 h-14 object-cover rounded-md" />
                  <p className="text-xs text-muted-foreground">Cover selected</p>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Genre Tags</label>
                  {fetching && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Fetching...</span>}
                </div>
                <GenreTagEditor genres={genres} onChange={setGenres} />
              </div>
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl><Textarea placeholder="Brief synopsis or description..." className="resize-none text-sm" rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Any notes about this title..." className="resize-none text-sm" rows={2} {...field} data-testid="textarea-notes" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                 <FormLabel>Description (optional)</FormLabel>
                 <FormControl><Textarea placeholder="Brief description or synopsis..." className="resize-none text-sm" rows={3} {...field} /></FormControl>
                 </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">Cancel</Button>
              <Button type="submit" disabled={createMedia.isPending} data-testid="button-submit">
                {createMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Title
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}