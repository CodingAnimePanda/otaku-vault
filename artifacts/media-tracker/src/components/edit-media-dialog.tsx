// artifacts/media-tracker/src/components/edit-media-dialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateMedia,
  getListMediaQueryKey,
  getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Link, Pencil, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;
const LIST_TYPES = ["library", "to_read", "avoid"] as const;
const CATEGORIES = ["webtoon", "manhwa", "manhua", "manga", "anime"] as const;

interface ReadingSite { label: string; url: string; emoji: string; }
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

// ── Rating Load/Save Helpers ──
function loadRatings(mediaId: number) {
  try {
    const s = localStorage.getItem(`ov_ratings_${mediaId}`);
    if (s) return JSON.parse(s);
  } catch {}
  return { worldBuilding: 0, art: 0, character: 0, concept: 0, originality: 0, translation: 0 };
}
function saveRatings(mediaId: number, ratings: any) {
  try { localStorage.setItem(`ov_ratings_${mediaId}`, JSON.stringify(ratings)); } catch {}
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES).optional(),
  listType: z.enum(LIST_TYPES),
  notes: z.string().optional(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface MediaItem {
  id: number;
  title: string;
  category: string;
  listType: string;
  status?: string | null;
  notes?: string | null;
  coverUrl?: string | null;
  readingUrl?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  media: MediaItem | null;
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  dropReasons?: Record<number, string>;
  onSaveDropReason?: (id: number, reason: string) => void;
}

export function EditMediaDialog({ open, onClose, media, favorites, onToggleFavorite, dropReasons, onSaveDropReason }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMedia = useUpdateMedia();
  const readingSites = loadSites();

  const [dropReason, setDropReason] = useState("");
  const [ratings, setRatings] = useState(() => loadRatings(media?.id ?? 0));
  const isFavorite = media ? (favorites?.has(media.id) ?? false) : false;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "manhwa",
      listType: "library",
      status: undefined,
      notes: "",
      coverUrl: "",
      readingUrl: "",
    },
  });

  useEffect(() => {
    if (media && open) {
      form.reset({
        title: media.title,
        category: media.category as any,
        listType: media.listType as any,
        status: (media.status as any) || undefined,
        notes: media.notes || "",
        coverUrl: media.coverUrl || "",
        readingUrl: media.readingUrl || "",
      });
      setDropReason(dropReasons?.[media.id] ?? "");
      setRatings(loadRatings(media.id));
    }
  }, [media, open, form, dropReasons]);

  const watchedStatus = form.watch("status");
  const watchedReadingUrl = form.watch("readingUrl");

  // Calculate Overall Average
  const calculateAverage = () => {
    const activeRatings = [ratings.worldBuilding, ratings.art, ratings.character, ratings.concept, ratings.originality].filter(r => r > 0);
    let total = activeRatings.reduce((a, b) => a + b, 0);
    let count = activeRatings.length;
    
    // Translation has a slighly lower weight than the rest, if used
    if (ratings.translation > 0) {
       total += (ratings.translation * 0.5); 
       count += 0.5;
    }
    return count === 0 ? "0.0" : (total / count).toFixed(1);
  };

  const handleRatingChange = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }));
  };

  const onSubmit = (values: FormValues) => {
    if (!media) return;

    if (values.status === "dropped" && onSaveDropReason) {
      onSaveDropReason(media.id, dropReason.trim());
    }
    // Save ratings locally
    saveRatings(media.id, ratings);

    updateMedia.mutate(
      {
        id: media.id,
        data: {
          title: values.title,
          category: values.category, // Specifically fixed!
          status: (values.status as any) ?? null,
          listType: values.listType,
          notes: values.notes || null,
          coverUrl: values.coverUrl || null,
          readingUrl: values.readingUrl || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
          toast({ title: "Updated!", description: `${values.title} has been updated.` });
          onClose();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const averageScore = calculateAverage();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="font-display text-xl">Edit Media</DialogTitle>
          </div>
        </DialogHeader>

        {media && onToggleFavorite && (
          <Button
            type="button"
            variant="outline"
            className={cn("w-full mb-4 gap-2 border", isFavorite ? "border-rose-400/50 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "")}
            onClick={() => onToggleFavorite(media.id)}
          >
            <Heart className={cn("w-4 h-4", isFavorite ? "fill-current" : "")} />
            {isFavorite ? "Favorited" : "Add to Favorites"}
          </Button>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="listType" render={({ field }) => (
                <FormItem>
                  <FormLabel>List</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {LIST_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">{type.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "none"}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground italic">None</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">{status.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {watchedStatus === "dropped" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <FormLabel className="text-red-400 flex items-center gap-1.5 mb-1.5">
                  Drop Reason <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </FormLabel>
                <Textarea
                  placeholder="Why did you drop this?"
                  className="resize-none text-sm border-red-500/20 focus-visible:ring-red-500/30"
                  rows={2}
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                />
              </div>
            )}

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

            {/* ── NEW RATINGS & REVIEW SECTION ── */}
            <div className="p-4 rounded-xl border border-border bg-card/50 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <h3 className="font-semibold text-sm">Ratings & Review</h3>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm">
                  {averageScore} / 10
                </div>
              </div>

              {[
                { key: "worldBuilding", label: "World-building" },
                { key: "art", label: "Art" },
                { key: "character", label: "Character Depth" },
                { key: "concept", label: "Concept" },
                { key: "originality", label: "Originality" },
                { key: "translation", label: "Translation (Optional, affects less)" },
              ].map((cat) => (
                <div key={cat.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{cat.label}</span>
                    <span className="font-medium">{(ratings as any)[cat.key] > 0 ? `${(ratings as any)[cat.key]}/10` : "Unrated"}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={(ratings as any)[cat.key]}
                    onChange={(e) => handleRatingChange(cat.key, parseInt(e.target.value))}
                    className="w-full accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>

            <FormField control={form.control} name="coverUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Cover URL</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} className="text-xs" /></FormControl>
                <FormMessage />
                {field.value && (
                  <img src={field.value} alt="Cover preview" className="w-12 h-16 object-cover rounded-md mt-1 border border-border" />
                )}
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any notes..." className="resize-none text-sm" rows={2} {...field} />
                </FormControl>
              </FormItem>
            )} />

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