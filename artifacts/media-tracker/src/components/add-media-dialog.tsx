// artifacts/media-tracker/src/components/add-media-dialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateMedia,
  useSearchCover,
  getListMediaQueryKey,
  getGetMediaStatsQueryKey,
  getSearchCoverQueryKey,
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
import { Search, Check, Loader2, ExternalLink, Link } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["webtoon", "manhwa", "manhua", "manga", "anime"] as const;
const LIST_TYPES = ["library", "to_read", "avoid", "bl"] as const;
const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;

const READING_SITES = [
  { label: "Webtoon",   url: "https://www.webtoons.com",  color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-400/50",   emoji: "📱" },
  { label: "MangaFire", url: "https://mangafire.to",      color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:border-orange-400/50", emoji: "🔥" },
  { label: "VyManga",   url: "https://vymanga.com",       color: "bg-purple-500/10 text-purple-400 border-purple-500/20 hover:border-purple-400/50", emoji: "📚" },
];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORIES),
  listType: z.enum(LIST_TYPES),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
  addedBy: z.string().optional(),
  customCoverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "manhwa",
      listType: defaultListType,
      status: undefined,
      notes: "",
      addedBy: "",
      customCoverUrl: "",
      readingUrl: "",
    },
  });

  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");
  const watchedReadingUrl = form.watch("readingUrl");

  const searchParams = coverSearch ? { title: coverSearch.title, category: coverSearch.category as typeof CATEGORIES[number] } : { title: "", category: "manhwa" as const };
  const { data: coverResults, isFetching: coverFetching } = useSearchCover(
    searchParams,
    {
      query: {
        enabled: !!coverSearch && !!coverSearch.title,
        queryKey: getSearchCoverQueryKey(searchParams),
      },
    }
  );

  const createMedia = useCreateMedia();

  useEffect(() => {
    if (open) {
      form.reset({ title: "", category: "manhwa", listType: defaultListType, status: undefined, notes: "", addedBy: "", customCoverUrl: "", readingUrl: "" });
      setSelectedCover(null);
      setCoverSearch(null);
    }
  }, [open, form, defaultListType]);

  const onSubmit = (values: FormValues) => {
    createMedia.mutate(
      { data: { ...values, coverUrl: selectedCover || values.customCoverUrl || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
          toast({ title: "Added!", description: `${values.title} has been added.` });
          onClose();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const isNormie = form.watch("listType") === "normie_tv" || form.watch("listType") === "normie_movie";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Title</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl><Input placeholder="e.g. Omniscient Reader" {...field} data-testid="input-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
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
                <Select onValueChange={field.onChange} value={field.value || ""}>
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

            {!isNormie && (
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
            )}

            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Cover Image</FormLabel>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setCoverSearch({ title: watchedTitle, category: watchedCategory })}
                  disabled={!watchedTitle || coverFetching}>
                  {coverFetching ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Search className="w-3 h-3 mr-1.5" />}
                  Search
                </Button>
              </div>

              {coverResults && coverResults.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
                  {coverResults.map((result, i) => (
                    <button key={i} type="button" onClick={() => setSelectedCover(result.url)}
                      className={cn("relative w-16 h-24 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all snap-start",
                        selectedCover === result.url ? "border-primary scale-105" : "border-transparent hover:border-primary/50")}>
                      <img src={result.url} alt="Cover" className="w-full h-full object-cover" />
                      {selectedCover === result.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <FormField control={form.control} name="customCoverUrl" render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl><Input placeholder="Or paste custom image URL..." {...field} className="text-xs" onChange={(e) => { field.onChange(e); setSelectedCover(null); }} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {(selectedCover || form.watch("customCoverUrl")) && (
                <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <img src={selectedCover || form.watch("customCoverUrl") || ""} alt="Selected cover" className="w-10 h-14 object-cover rounded-md" />
                  <p className="text-xs text-muted-foreground">Cover selected</p>
                </div>
              )}
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any notes about this title..." className="resize-none text-sm" rows={2} {...field} data-testid="textarea-notes" />
                </FormControl>
                <FormMessage />
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