import React, { useState } from "react";
import {
  useGetMediaUpdates,
  useListMedia,
  useCheckMediaUpdate,
  getGetMediaUpdatesQueryKey,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, proxyImage } from "@/lib/utils";

export default function Updates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [checking, setChecking] = useState<Set<number>>(new Set());

  const { data: updatedMedia, isLoading: updatesLoading } = useGetMediaUpdates();
  const { data: libraryMedia, isLoading: libraryLoading } = useListMedia({ listType: "library" });
  const checkUpdate = useCheckMediaUpdate();

  const isLoading = updatesLoading || libraryLoading;

  const updatedArray = Array.isArray(updatedMedia) ? updatedMedia : [];
  const libraryArray = Array.isArray(libraryMedia) ? libraryMedia : [];

  const handleCheckUpdate = (id: number, title: string) => {
    setChecking((prev) => new Set([...prev, id]));
    checkUpdate.mutate(
      { id },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getGetMediaUpdatesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "library" }) });
          if (result.hasUpdate) {
            toast({
              title: "Update available!",
              description: `${title} has a new chapter/episode${result.latestChapter ? `: ${result.latestChapter}` : ""}.`,
            });
          } else {
            toast({ title: "Up to date", description: `${title} has no new updates.` });
          }
        },
        onSettled: () => {
          setChecking((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      }
    );
  };

  const handleCheckAll = async () => {
    const activeItems = libraryArray.filter(
      (m) => m.status === "reading" || m.status === "watching"
    );
    for (const item of activeItems) {
      handleCheckUpdate(item.id, item.title);
    }
  };

  const activeReading = libraryArray.filter(
    (m) => m.status === "reading" || m.status === "watching"
  );

  const hasUpdatesSet = new Set(updatedArray.map((m) => m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center relative">
            <BellRing className="w-5 h-5 text-green-400" />
            {updatedArray.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {updatedArray.length}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Updates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Check for new chapters and episodes</p>
          </div>
        </div>
        {activeReading.length > 0 && (
          <Button variant="outline" className="gap-2" onClick={handleCheckAll} data-testid="check-all-updates">
            <RefreshCw className="w-4 h-4" />
            Check All
          </Button>
        )}
      </div>

      {/* Updates Available */}
      {updatedArray.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            New Updates Available
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {updatedArray.map((item) => (
              <div key={item.id} data-testid={`update-card-${item.id}`}
                className="flex gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all">
                <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {item.coverUrl || item.customCoverUrl ? (
                    <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground text-center px-1">No cover</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-sm leading-tight line-clamp-1">{item.title}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1 capitalize">{item.category}</Badge>
                    {item.currentChapter && (
                      <p className="text-xs text-muted-foreground mt-1">Current: {item.currentChapter}</p>
                    )}
                    {item.lastCheckedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(item.lastCheckedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Currently Reading/Watching */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          Currently Active
          <span className="text-foreground font-bold">{activeReading.length}</span>
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : activeReading.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">No active series right now.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Mark titles as "reading" or "watching" to track updates here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReading.map((item) => {
              const hasUpdate = hasUpdatesSet.has(item.id);
              const isChecking = checking.has(item.id);
              return (
                <div key={item.id} data-testid={`active-card-${item.id}`}
                  className={cn("flex gap-3 p-3 rounded-xl border transition-all",
                    hasUpdate ? "bg-green-500/5 border-green-500/20" : "bg-card border-border")}>
                  <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    {item.coverUrl || item.customCoverUrl ? (
                      <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground text-center px-1">No cover</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-medium text-sm leading-tight line-clamp-1">{item.title}</h3>
                        {hasUpdate && (
                          <span className="flex-shrink-0 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">NEW</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[9px] capitalize">{item.category}</Badge>
                        {item.currentChapter && (
                          <span className="text-[10px] text-muted-foreground">{item.currentChapter}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn("h-7 px-2 text-xs gap-1.5 self-start mt-1", isChecking && "opacity-60")}
                      disabled={isChecking}
                      onClick={() => handleCheckUpdate(item.id, item.title)}
                      data-testid={`check-update-${item.id}`}
                    >
                      <RefreshCw className={cn("w-3 h-3", isChecking && "animate-spin")} />
                      {isChecking ? "Checking..." : "Check"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}