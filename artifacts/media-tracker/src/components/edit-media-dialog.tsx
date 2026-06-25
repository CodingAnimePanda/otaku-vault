// artifacts/media-tracker/src/components/edit-media-dialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateMedia, getListMediaQueryKey, getGetMediaStatsQueryKey,
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
import { Loader2, ExternalLink, Heart, Star, X, Plus, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;
const LIST_TYPES = ["library", "to_read", "avoid"] as const;
const CATEGORIES = ["webtoon", "manhwa", "manhua", "manga", "anime"] as const;

function loadRatings(mediaId: number) {
  try { const s = localStorage.getItem(`ov_ratings_${mediaId}`); if (s) return JSON.parse(s); } catch {}
  return { story: 0, art: 0, character: 0, worldBuilding: 0, uniqueness: 0, enjoyment: 0 };
}
function saveRatings(mediaId: number, ratings: any) {
  try { localStorage.setItem(`ov_ratings_${mediaId}`, JSON.stringify(ratings)); } catch {}
}

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
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {genres.map((g) => (
          <span key={g} className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", genreColor(g))}>
            {g}
            <button type="button" onClick={() => removeGenre(g)} className="hover:opacity-70 transition-opacity"><X className="w-2.5 h-2.5" /></button>
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
  status: z.enum(STATUSES).optional(),
  listType: z.enum(LIST_TYPES),
  notes: z.string().optional(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  reviewText: z.string().optional(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface MediaItem {
  id: number; title: string; category: string; listType: string;
  status?: string | null; notes?: string | null; coverUrl?: string | null;
  readingUrl?: string | null; genres?: string[];
}

interface Props {
  open: boolean; onClose: () => void; media: MediaItem | null;
  favorites?: Set<number>; onToggleFavorite?: (id: number) => void;
  dropReasons?: Record<number, string>; onSaveDropReason?: (id: number, reason: string) => void;
}

export function EditMediaDialog({ open, onClose, media, favorites, onToggleFavorite, dropReasons, onSaveDropReason }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMedia = useUpdateMedia();

  const [dropReason, setDropReason] = useState("");
  const [ratings, setRatings] = useState(() => loadRatings(media?.id ?? 0));
  const [genres, setGenres] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [candidates, setCandidates] = useState<MangaCandidate[] | null>(null);
  const isFavorite = media ? (favorites?.has(media.id) ?? false) : false;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", category: "manhwa", listType: "library", status: undefined, notes: "", coverUrl: "", readingUrl: "", reviewText: "", description: "" },
  });

  useEffect(() => {
    if (media && open) {
      form.reset({
        title: media.title, category: media.category as any, listType: media.listType as any,
        status: (media.status as any) || undefined, notes: media.notes || "",
        coverUrl: media.coverUrl || "", readingUrl: media.readingUrl || "",
        reviewText: (media as any).reviewText || "",
        description: (media as any).description || "",
      });
      setDropReason(dropReasons?.[media.id] ?? "");
      setRatings(loadRatings(media.id));
      setGenres((media as any).genres ?? []);
      setCandidates(null);
    }
  }, [media, open]);

  const watchedStatus = form.watch("status");
  const watchedReadingUrl = form.watch("readingUrl");
  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");

  const calculateAverage = () => {
    const vals = [ratings.story, ratings.art, ratings.character, ratings.worldBuilding, ratings.uniqueness, ratings.enjoyment].filter(r => r > 0);
    return vals.length === 0 ? "0.0" : (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const handleFetchGenres = async () => {
    if (!watchedTitle) return;
    if (watchedCategory === "anime") {
      setFetching(true);
      const fetched = await fetchGenresJikan(watchedTitle);
      setFetching(false);
      if (fetched.length > 0) {
        setGenres(fetched);
        toast({ title: "Genres fetched!", description: `Found ${fetched.length} genre tags.` });
      } else {
        toast({ title: "No genres found", description: "Try editing the title slightly.", variant: "destructive" });
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
    setCandidates(null);
    toast({ title: "Match confirmed!", description: `Using genres from "${c.title}".` });
  };

  const onSubmit = (values: FormValues) => {
    if (!media) return;
    if (values.status === "dropped" && onSaveDropReason) onSaveDropReason(media.id, dropReason.trim());
    saveRatings(media.id, ratings);
    updateMedia.mutate({
      id: media.id,
      data: {
        title: values.title, category: values.category, status: (values.status as any) ?? null,
        listType: values.listType, notes: values.notes || null, coverUrl: values.coverUrl || null,
        readingUrl: values.readingUrl || null, reviewText: values.reviewText || null,
        description: (values as any).description || null,
        rating: parseFloat(calculateAverage()), genres,
      } as any,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
        toast({ title: "Updated!", description: `${values.title} has been updated.` });
        onClose();
      },
      onError: () => { toast({ title: "Error", description: "Failed to update.", variant: "destructive" }); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Media</DialogTitle>
        </DialogHeader>

        <Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

    {/* Cover */}
    <FormField control={form.control} name="coverUrl" render={({ field }) => (
      <FormItem>
        <FormLabel>Cover URL</FormLabel>
        <FormControl><Input placeholder="https://..." {...field} className="text-xs" /></FormControl>
        <FormMessage />
        {field.value && <img src={field.value} alt="Cover preview" className="w-12 h-16 object-cover rounded-md mt-1 border border-border" />}
      </FormItem>
    )} />

    {/* Title */}
    <FormField control={form.control} name="title" render={({ field }) => (
      <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
    )} />

    {/* Category + List */}
    <div className="grid grid-cols-2 gap-3">
      <FormField control={form.control} name="category" render={({ field }) => (
        <FormItem>
          <FormLabel>Category</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>{CATEGORIES.map((cat) => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}</SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="listType" render={({ field }) => (
        <FormItem>
          <FormLabel>List</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>{LIST_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
    </div>

    {/* Status */}
    <FormField control={form.control} name="status" render={({ field }) => (
      <FormItem>
        <FormLabel>Status</FormLabel>
        <Select onValueChange={field.onChange} value={field.value || "none"}>
          <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
          <SelectContent>
            <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />

    {/* Drop Reason */}
    {watchedStatus === "dropped" && (
      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
        <label className="text-sm font-medium leading-none text-red-400 flex items-center gap-1.5 mb-1.5">
          Drop Reason <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea placeholder="Why did you drop this?" className="resize-none text-sm border-red-500/20 focus-visible:ring-red-500/30" rows={2}
          value={dropReason} onChange={(e) => setDropReason(e.target.value)} />
      </div>
    )}

    {/* Genre Tags */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Genre Tags</label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5"
          onClick={handleFetchGenres} disabled={fetching || !watchedTitle}>
          {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Fetch Genres
        </Button>
      </div>
      {candidates && (
        <MatchPicker candidates={candidates} onPick={handlePickCandidate} onSkip={() => setCandidates(null)} />
      )}
      <GenreTagEditor genres={genres} onChange={setGenres} />
    </div>

    {/* Description */}
    <FormField control={form.control} name="description" render={({ field }) => (
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl><Textarea placeholder="Brief synopsis or description..." className="resize-none text-sm" rows={3} {...field} /></FormControl>
      </FormItem>
    )} />

    {/* Review text */}
    <FormField control={form.control} name="reviewText" render={({ field }) => (
      <FormItem>
        <FormLabel>Your Review</FormLabel>
        <FormControl><Textarea placeholder="What did you think?" className="resize-none text-sm" rows={3} {...field} /></FormControl>
      </FormItem>
    )} />

    {/* Ratings */}
    <div className="p-4 rounded-xl border border-border bg-card/50 space-y-4 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-sm">Ratings</h3>
        </div>
        <div className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">{calculateAverage()} / 10</div>
      </div>
      {[
  { key: "story", label: "Story & Pacing", desc: "Does the plot hook you early? Evaluate pacing, transitions, and whether arcs overstay their welcome." },
  { key: "art", label: "Art Style & Coloring", desc: "Rate linework, background detail, and how well the art captures action and emotion." },
  { key: "character", label: "Character Development", desc: "Are characters multi-dimensional? Judge cast chemistry, motivations, and villain depth." },
  { key: "worldBuilding", label: "World-Building", desc: "How fleshed out is the universe? Rate the clarity of lore, systems, and internal rules." },
  { key: "uniqueness", label: "Uniqueness & Execution", desc: "How does it stand out? Even common tropes can shine — judge how well they're executed." },
  { key: "enjoyment", label: "Enjoyment Factor", desc: "The subjective fun metric. How eager were you to hit the next chapter button?" },
].map((cat) => (
  <div key={cat.key} className="space-y-1">
    <div className="flex justify-between items-start text-xs gap-2">
      <div>
        <p className="font-medium text-foreground">{cat.label}</p>
        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{cat.desc}</p>
      </div>
      <span className="font-medium flex-shrink-0 mt-0.5">{(ratings as any)[cat.key] > 0 ? `${(ratings as any)[cat.key]}/10` : "Unrated"}</span>
    </div>
    <input type="range" min="0" max="10" step="1" value={(ratings as any)[cat.key]}
      onChange={(e) => setRatings((prev: any) => ({ ...prev, [cat.key]: parseInt(e.target.value) }))}
      className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer" />
  </div>
))}
    </div>

    {/* Reading Link */}
    <FormField control={form.control} name="readingUrl" render={({ field }) => (
      <FormItem>
        <FormLabel>Reading Link</FormLabel>
        <FormControl>
          <div className="flex gap-2">
            <Input placeholder="https://..." {...field} className="flex-1 text-xs" />
            {watchedReadingUrl && (
              <a href={watchedReadingUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center w-9 flex-shrink-0 bg-muted hover:bg-muted/80 rounded-md border border-border transition-colors">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            )}
          </div>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    {/* Notes */}
    <FormField control={form.control} name="notes" render={({ field }) => (
      <FormItem>
        <FormLabel>Notes</FormLabel>
        <FormControl><Textarea placeholder="Any notes..." className="resize-none text-sm" rows={2} {...field} /></FormControl>
      </FormItem>
    )} />

    {/* Favorite toggle */}
    {media && onToggleFavorite && (
      <Button type="button" variant="outline"
        className={cn("w-full gap-2 border", isFavorite ? "border-rose-400/50 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "")}
        onClick={() => onToggleFavorite(media.id)}>
        <Heart className={cn("w-4 h-4", isFavorite ? "fill-current" : "")} />
        {isFavorite ? "Favorited" : "Add to Favorites"}
      </Button>
    )}

    <div className="flex justify-end gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={updateMedia.isPending}>
        {updateMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Changes
      </Button>
    </div>
  </form>
</Form>
      </DialogContent>
    </Dialog>
  );
}