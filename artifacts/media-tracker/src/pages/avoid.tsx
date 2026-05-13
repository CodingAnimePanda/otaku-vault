// artifacts/media-tracker/src/pages/avoid.tsx
import React, { useState } from "react";
import {
  useListMedia,
  useDeleteMedia,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skull, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, proxyImage } from "@/lib/utils";
import { EditMediaDialog } from "@/components/edit-media-dialog";

export default function Avoid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editItem, setEditItem] = useState<any | null>(null);

  const { data: avoidList, isLoading } = useListMedia({ listType: "avoid" });
  const deleteMedia = useDeleteMedia();

  const handleRemove = (id: number, title: string) => {
    deleteMedia.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "avoid" }) });
        toast({ title: "Removed", description: `${title} removed from avoid list.` });
      },
    });
  };

  const avoidArray = Array.isArray(avoidList) ? avoidList : [];

  const grouped = avoidArray.reduce<Record<string, typeof avoidArray>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category]!.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl bg-destructive/5 border border-destructive/20 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -translate-y-8 translate-x-8 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <Skull className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-destructive">Avoid Like the Plague</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Media you have been warned to stay away from.</p>
          </div>
          {avoidArray.length > 0 && (
            <Badge className="ml-auto bg-destructive/10 text-destructive border-destructive/20 text-sm px-3 py-1">
              {avoidArray.length} titles
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : avoidArray.length === 0 ? (
        <Card className="border-dashed border-destructive/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">No warnings yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">When friends warn you about something terrible, record it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive/70" />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <div key={item.id} data-testid={`avoid-card-${item.id}`}
                    className="relative flex gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 hover:border-destructive/40 transition-all group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-destructive/40 rounded-l-xl" />
                    <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted ml-2">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Skull className="w-6 h-6 text-destructive/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1 text-foreground/80 line-through decoration-destructive/50">
                          {item.title}
                        </h3>
                        {item.addedBy && (
                          <p className="text-xs text-muted-foreground">
                            Warned by <span className="text-destructive font-medium">{item.addedBy}</span>
                          </p>
                        )}
                        {item.notes && <p className="text-[10px] text-destructive/70 mt-1 line-clamp-2 italic">"{item.notes}"</p>}
                        {item.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.genres.slice(0, 2).map((g) => (
                              <span key={g} className="text-[9px] bg-destructive/10 px-1.5 py-0.5 rounded text-destructive/70">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemove(item.id, item.title)}>
                          <Trash2 className="w-3 h-3" /> Remove
                        </Button>
                        <Button size="sm" variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary ml-auto"
                          onClick={() => setEditItem(item)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditMediaDialog open={!!editItem} onClose={() => setEditItem(null)} media={editItem} />
    </div>
  );
}