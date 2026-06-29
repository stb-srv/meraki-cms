import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPut } from '@/lib/api';
import { useViewTitle } from '@/hooks/useViewTitle';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { MENU_QUERY_KEY, getCatLabel, useMenuData, type Dish } from './menu-api';

export function DailyPage() {
    useViewTitle('Tagesgerichte');
    const qc = useQueryClient();
    const { data, isLoading } = useMenuData();

    async function toggle(d: Dish, on: boolean) {
        const res = await apiPut(`menu/${d.id}`, { is_daily_special: on });
        if (res.success !== false) {
            qc.invalidateQueries({ queryKey: MENU_QUERY_KEY });
            toast.success(on ? `„${d.name}" ist Tagesempfehlung` : `„${d.name}" entfernt`);
        } else toast.error(res.reason || 'Fehler');
    }

    if (isLoading || !data) {
        return <Card className="h-96 animate-pulse bg-muted/50" />;
    }

    const specials = data.menu.filter((d) => d.is_daily_special);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold">Tagesgerichte & Empfehlungen</h3>
                <p className="text-sm text-muted-foreground">
                    Gerichte als Tagesempfehlung markieren – sie erhalten auf der Speisekarte ein
                    goldenes Badge. Aktuell markiert: <strong>{specials.length}</strong>
                </p>
            </div>
            <Card className="overflow-hidden p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12" />
                            <TableHead>Nr.</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Kategorie</TableHead>
                            <TableHead>Preis</TableHead>
                            <TableHead className="text-right">Tagesempfehlung</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.menu.map((d) => (
                            <TableRow key={d.id}>
                                <TableCell>
                                    {!!d.is_daily_special && (
                                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                    )}
                                </TableCell>
                                <TableCell className="font-bold text-muted-foreground">
                                    {d.number || '-'}
                                </TableCell>
                                <TableCell className="font-bold text-primary">{d.name}</TableCell>
                                <TableCell>{getCatLabel(d.cat)}</TableCell>
                                <TableCell className="font-mono">{(d.price ?? 0).toFixed(2)}€</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end">
                                        <Switch
                                            checked={!!d.is_daily_special}
                                            onCheckedChange={(c) => toggle(d, c)}
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
