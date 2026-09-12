import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Layers, Clock, GripVertical, Trash2, Save, ArrowLeft, RefreshCw, ShieldCheck, Code } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Playlist, PlaylistItem } from '@shared/types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
function SortableItem({ item, onRemove, onChange }: { item: PlaylistItem, onRemove: () => void, onChange: (updates: Partial<PlaylistItem>) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [isHashing, setIsHashing] = useState(false);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1
  };
  const generateIntegrity = async () => {
    if (!item.url) return toast.error('Source URL required for hashing');
    setIsHashing(true);
    try {
      const res = await fetch(item.url);
      if(!res.ok) throw new Error('Network error');
      const buf = await res.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      onChange({ integrity: hashHex });
      toast.success('SHA256 Content Integrity Generated');
    } catch (e) {
      toast.error('Hashing failed: ' + (e as Error).message);
    } finally {
      setIsHashing(false);
    }
  };
  return (
    <div ref={setNodeRef} style={style} className="flex flex-col bg-card border rounded-xl p-3.5 sm:p-5 mb-4 group shadow-sm hover:shadow-md transition-shadow relative">
      <div className="flex items-center gap-2 sm:gap-4 mb-3">
        <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground touch-none p-1 shrink-0"><GripVertical className="h-5 w-5" /></div>
        <div className="h-10 w-14 sm:h-12 sm:w-20 bg-muted rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-dashed font-bold text-[9px] sm:text-[10px] text-muted-foreground uppercase">
          {item.type}
        </div>
        <div className="flex-grow min-w-0">
          <Input placeholder="Asset Source URL" value={item.url} onChange={(e) => onChange({ url: e.target.value })} className="h-9 text-xs" />
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="text-rose-500 hover:bg-rose-50 shrink-0 h-9 w-9"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 items-end">
        <div>
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Content Type</Label>
          <Select value={item.type} onValueChange={(v) => onChange({ type: v as any })}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="html">HTML Fragment</SelectItem>
              <SelectItem value="url">External URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter">Duration (ms)</Label>
          <Input type="number" value={item.durationMs} onChange={(e) => onChange({ durationMs: parseInt(e.target.value) || 0 })} className="h-9 text-xs" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-tighter flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> SHA256 Integrity Hash
          </Label>
          <div className="flex gap-2">
            <Input value={item.integrity} readOnly className="h-9 font-mono text-[10px] bg-muted/50 truncate min-w-0" />
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={generateIntegrity} disabled={isHashing}>
              <RefreshCw className={`h-3 w-3 ${isHashing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      {item.type === 'html' && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">HTML Payload Editor</Label>
          <Textarea
            value={item.htmlContent || ''}
            onChange={(e) => onChange({ htmlContent: e.target.value })}
            className="mt-1 font-mono text-xs min-h-[120px] bg-background"
            placeholder="<div class='custom-widget'>...</div>"
          />
        </div>
      )}
    </div>
  );
}
export function PlaylistsPage() {
  const queryClient = useQueryClient();
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { data: playlistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => api<{ items: Playlist[] }>('/v1/playlists'),
  });
  const publishMutation = useMutation({
    mutationFn: (playlist: Playlist) => {
      const pending = playlist.items.some(i => !i.integrity || i.integrity === 'pending');
      if (pending) throw new Error("Verification Failed: All layers must have a SHA256 content signature before publishing.");
      return api(`/v1/playlists/${playlist.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ items: playlist.items })
      });
    },
    onSuccess: () => {
      toast.success('Manifest Signed & Distributed to Edge Nodes');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setEditingPlaylist(null);
    },
    onError: (e) => toast.error(e.message)
  });
  const newPlaylistMutation = useMutation({
    mutationFn: (name: string) => api<Playlist>('/v1/playlists', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),
    onSuccess: (data) => {
      toast.success('Playlist Initialized');
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setEditingPlaylist(data);
      setNewPlaylistOpen(false);
    },
    onError: (e) => toast.error(e.message || 'Creation failed')
  });
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !editingPlaylist) return;
    if (active.id !== over.id) {
      const oldIndex = editingPlaylist.items.findIndex(i => i.id === active.id);
      const newIndex = editingPlaylist.items.findIndex(i => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setEditingPlaylist({
          ...editingPlaylist,
          items: arrayMove(editingPlaylist.items, oldIndex, newIndex)
        });
      }
    }
  };
  const playlists = playlistsData?.items ?? [];
  if (editingPlaylist) {
    return (
      <AppLayout container>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 sm:pb-6 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => setEditingPlaylist(null)} className="rounded-full shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{editingPlaylist.name}</h1>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono shrink-0">REV_{editingPlaylist.version}</Badge>
                  <span className="hidden sm:inline">Secure Manifest Revision Control</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)} className="h-9">
                <Code className="h-4 w-4 sm:mr-2"/> <span className="hidden sm:inline">Raw</span>
              </Button>
              <Button onClick={() => publishMutation.mutate(editingPlaylist)} disabled={publishMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 shadow-primary h-9 text-xs sm:text-sm">
                <Save className="mr-1.5 sm:mr-2 h-4 w-4" /> Publish & Sign
              </Button>
            </div>
          </div>
          {showRaw && (
            <Card className="bg-slate-950 text-slate-50 font-mono text-[10px] p-4 overflow-x-auto shadow-2xl">
              <pre>{JSON.stringify(editingPlaylist, null, 2)}</pre>
            </Card>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={editingPlaylist.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {editingPlaylist.items.map((item, idx) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onRemove={() => {
                      const newItems = [...editingPlaylist.items];
                      newItems.splice(idx, 1);
                      setEditingPlaylist({ ...editingPlaylist, items: newItems });
                    }}
                    onChange={(updates) => {
                      const newItems = [...editingPlaylist.items];
                      newItems[idx] = { ...newItems[idx], ...updates };
                      setEditingPlaylist({ ...editingPlaylist, items: newItems });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" className="w-full border-dashed border-2 py-8 sm:py-12 bg-muted/10 hover:bg-muted/30 transition-all rounded-xl text-xs sm:text-sm font-bold" onClick={() => {
            setEditingPlaylist({ ...editingPlaylist, items: [...editingPlaylist.items, { id: crypto.randomUUID(), type: 'image', url: '', integrity: 'pending', durationMs: 10000 }] });
          }}>
            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5 opacity-50" /> Insert New Content Layer
          </Button>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout container>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground uppercase">Manifest Library</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-lg font-medium">Author and sign deterministic content manifests.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg h-10 sm:h-12 px-5 sm:px-8 rounded-xl font-black uppercase text-[10px] tracking-widest w-full sm:w-auto" onClick={() => { setNewPlaylistOpen(true); setNewPlaylistName(''); }}>
            <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Initialize Manifest
          </Button>
        </div>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Card key={playlist.id} className="group hover:ring-2 hover:ring-indigo-500/50 transition-all duration-300 shadow-soft border-slate-200 overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-xl font-black tracking-tight uppercase leading-tight">{playlist.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800">REV_{playlist.version}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pb-4">
                <div className="flex gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> {playlist.items?.length || 0} Layers</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {(playlist.items || []).reduce((a, b) => a + (b.durationMs || 0), 0) / 1000}s</div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 dark:bg-slate-900/50 p-4 border-t">
                <Button variant="ghost" size="sm" className="w-full font-black text-[10px] uppercase tracking-widest group-hover:text-indigo-600 group-hover:bg-indigo-50/50" onClick={() => setEditingPlaylist(playlist)}>
                  Enter Manifest Editor
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <Sheet open={newPlaylistOpen} onOpenChange={setNewPlaylistOpen}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-2xl font-black uppercase tracking-tight">New Manifest</SheetTitle>
              <SheetDescription className="font-medium text-slate-500">Initialize a new secure content sequence.</SheetDescription>
            </SheetHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manifest Identity</Label>
                <Input
                  placeholder="e.g. 'Retail_Flagship_Main'"
                  value={newPlaylistName}
                  onChange={e => setNewPlaylistName(e.target.value)}
                  className="h-12 text-sm"
                />
              </div>
              <Button
                disabled={!newPlaylistName.trim() || newPlaylistMutation.isPending}
                onClick={() => newPlaylistMutation.mutate(newPlaylistName)}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] shadow-primary"
              >
                {newPlaylistMutation.isPending ? 'Orchestrating...' : 'Initialize Manifest'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}