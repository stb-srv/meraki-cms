import * as React from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiPost, apiPut } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MENU_QUERY_KEY, type Category, type MenuData } from './menu-api';

export function CategoriesTab({ data }: { data: MenuData }) {
    const qc = useQueryClient();
    const refresh = () => qc.invalidateQueries({ queryKey: MENU_QUERY_KEY });
    const categories = data.categories;

    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState<Category | null>(null);
    const [label, setLabel] = React.useState('');
    const [sort, setSort] = React.useState(0);

    function openNew() {
        setEditing(null);
        setLabel('');
        setSort(categories.length);
        setShowForm(true);
    }
    function openEdit(c: Category) {
        setEditing(c);
        setLabel(c.label || '');
        setSort(c.sort_order || 0);
        setShowForm(true);
    }

    async function save() {
        if (!label.trim()) {
            toast.error('Bitte einen Namen eingeben');
            return;
        }
        const cat: Category = {
            id: editing
                ? editing.id
                : label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'),
            label: label.trim(),
            sort_order: sort,
            icon: editing?.icon || 'utensils',
            active: editing ? editing.active !== false : true,
        };
        const res = editing
            ? await apiPut(`categories/${cat.id}`, cat)
            : await apiPost('categories', cat);
        if (res.success !== false) {
            toast.success('Kategorie gespeichert!');
            setShowForm(false);
            refresh();
        } else toast.error(res.reason || 'Fehler beim Speichern');
    }

    async function remove(c: Category) {
        if (
            !window.confirm(
                `„${c.label}" wirklich löschen? Gerichte bleiben erhalten, verlieren aber die Kategorie-Zuordnung.`
            )
        )
            return;
        const res = await apiDelete(`categories/${c.id}`);
        if (res.success !== false) {
            toast.success('Kategorie gelöscht.');
            refresh();
        } else toast.error(res.reason || 'Fehler');
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Kategorien verwalten</h3>
                <Button variant="secondary" onClick={openNew}>
                    <Plus /> Neue Kategorie
                </Button>
            </div>

            {showForm && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        <h4 className="font-semibold">
                            {editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>Name</Label>
                                <Input
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="z.B. Desserts"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Reihenfolge (kleinere Zahl = weiter vorne)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={999}
                                    value={sort}
                                    onChange={(e) => setSort(parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={save}>Speichern</Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Abbrechen
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="flex flex-wrap gap-3 pt-6">
                    {categories.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Noch keine Kategorien vorhanden. Oben eine neue hinzufügen.
                        </p>
                    ) : (
                        categories.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center gap-3 rounded-full border bg-background px-4 py-2"
                            >
                                <span
                                    className="text-xs font-bold opacity-40"
                                    title="Sortier-Reihenfolge"
                                >
                                    {c.sort_order || 0}
                                </span>
                                <span className="font-bold text-primary">{c.label}</span>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => openEdit(c)}
                                        title="Bearbeiten"
                                        className="flex size-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600"
                                    >
                                        <Pencil className="size-3" />
                                    </button>
                                    <button
                                        onClick={() => remove(c)}
                                        title="Löschen"
                                        className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
