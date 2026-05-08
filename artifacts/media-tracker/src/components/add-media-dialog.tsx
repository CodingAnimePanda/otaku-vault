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
import { Search, Check, Image, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime"] as const;
const LIST_TYPES = ["library", "to_read", "avoid"] as const;
const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORIES),
  listType: z.enum(LIST_TYPES),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
  addedBy: z.string().optional(),
  currentChapter: z.string().optional(),
  customCoverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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
      currentChapter: "",
      customCoverUrl: "",
    },
  });

  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");

  const searchParams = coverSearch
    ? { title: coverSearch.title, category: coverSearch.category as typeof CATEGORIES[number] }
    : { title: "", category: "manhwa" as const };

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

  const handleSearchCover = () => {
    if (watchedTitle) {
      setCoverSearch({ title: watchedTitle, category: watchedCategory });
      setSelectedCover(null);
    }
  };

  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedCover(null);
      setCoverSearch(null);
    }
  }, [open]);

  const onSubmit = (values: FormValues) => {
    const coverUrl = selectedCover || (values.customCoverUrl || null);
    createMedia.mutate(
      {
        data: {
          title: values.title,
          category: values.category,
          listType: values.listType,
          status: values.status ?? null,
          coverUrl,
          genres: [],
          notes: values.notes || null,
          addedBy: values.addedBy || null,
          currentChapter: values.currentChapter || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
          toast({ title: "Added!", description: `${values.title} has been added to your ${values.listType.replace("_", " ")}.` });
          onClose();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add media. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  const listType = form.watch("listType");
  const showStatus = listType === "library";
  const showAddedBy = listType === "to_read" || listType === "avoid";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Title</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Solo Leveling"
                        {...field}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="listType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-list-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="library">Library</SelectItem>
                        <SelectItem value="to_read">To-Read</SelectItem>
                        <SelectItem value="avoid">Avoid List</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showStatus && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showAddedBy && (
                <FormField
                  control={form.control}
                  name="addedBy"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        {listType === "avoid" ? "Warned by" : "Recommended by"}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Friend's name" {...field} data-testid="input-added-by" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showStatus && (
                <FormField
                  control={form.control}
                  name="currentChapter"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Current Chapter/Episode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chapter 45 or S2 Ep7" {...field} data-testid="input-chapter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Cover search */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cover Image</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 h-8"
                  onClick={handleSearchCover}
                  disabled={!watchedTitle || coverFetching}
                  data-testid="button-search-cover"
                >
                  {coverFetching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  Search Covers
                </Button>
              </div>

              {coverResults && coverResults.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {coverResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedCover(result.coverUrl)}
                      data-testid={`cover-option-${idx}`}
                      className={cn(
                        "relative w-16 h-24 rounded-lg overflow-hidden ring-2 transition-all",
                        selectedCover === result.coverUrl
                          ? "ring-primary"
                          : "ring-transparent hover:ring-border"
                      )}
                    >
                      <img
                        src={result.coverUrl}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                      {selectedCover === result.coverUrl && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {coverSearch && coverResults && coverResults.length === 0 && !coverFetching && (
                <p className="text-xs text-muted-foreground">No covers found. Try the manual URL below.</p>
              )}

              <FormField
                control={form.control}
                name="customCoverUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Or paste a custom cover URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://..."
                        {...field}
                        data-testid="input-custom-cover"
                        className="text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedCover || form.watch("customCoverUrl")) && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <img
                    src={selectedCover || form.watch("customCoverUrl") || ""}
                    alt="Selected cover"
                    className="w-10 h-14 object-cover rounded-md"
                  />
                  <p className="text-xs text-muted-foreground">Cover selected</p>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this title..."
                      className="resize-none text-sm"
                      rows={2}
                      {...field}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMedia.isPending}
                data-testid="button-submit"
              >
                {createMedia.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Add Title
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
