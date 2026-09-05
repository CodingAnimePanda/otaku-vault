import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHARACTER_ROLES = ["Protagonist", "Deuteragonist", "Villain/Antagonist", "Best Girl", "Best Boy", "Comic Relief", "Mentor", "Underrated Gem", "Waifu/Husbando", "Redemption Arc MVP"];
const BASE_URL = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";

export default function CharactersPage() {
  const { getToken } = useAuth();
  const [characters, setCharacters] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", imageUrl: "", mediaTitle: "", role: "Protagonist", note: "" });

  const apiFetch = useCallback(async (path: string, opts: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    });
    return res.ok ? res.json() : null;
  }, [getToken]);

  const load = useCallback(() => {
    apiFetch("/api/favorite-characters").then((d) => setCharacters(Array.isArray(d) ? d : []));
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const addCharacter = async () => {
    if (!form.name.trim()) return;
    await apiFetch("/api/favorite-characters", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", imageUrl: "", mediaTitle: "", role: "Protagonist", note: "" });
    setDialogOpen(false);
    load();
  };

  const deleteCharacter = async (id: number) => {
    await apiFetch(`/api/favorite-characters/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
          <h1 className="text-2xl font-display font-bold">Favorite Characters</h1>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>+ Add</Button>
      </div>

      {characters.length === 0 ? (
        <p className="text-sm text-muted-foreground">No favorite characters yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="group relative rounded-xl border border-border bg-card/50 overflow-hidden">
              <div className="aspect-square bg-muted">
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Heart className="w-6 h-6 text-muted-foreground/30" /></div>}
              </div>
              <div className="p-2.5 space-y-0.5">
                <p className="text-sm font-semibold leading-tight">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.mediaTitle}</p>
                {c.role && <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary mt-1">{c.role}</span>}
                {c.note && <p className="text-[10px] text-muted-foreground italic mt-1 line-clamp-2">"{c.note}"</p>}
              </div>
              <button onClick={() => deleteCharacter(c.id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDialogOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold">Add Favorite Character</h3>
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <input className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" placeholder="From (title)" value={form.mediaTitle} onChange={(e) => setForm({ ...form, mediaTitle: e.target.value })} />
            <select className="w-full h-9 px-3 rounded-md bg-muted border border-border text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {CHARACTER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <textarea className="w-full px-3 py-2 rounded-md bg-muted border border-border text-sm" placeholder="Why you love them (optional)" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <Button className="w-full" onClick={addCharacter}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}