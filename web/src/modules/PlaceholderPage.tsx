import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useViewTitle } from '@/hooks/useViewTitle';

/**
 * Übergangs-Platzhalter für noch nicht portierte Module (Phase 2/3).
 * Setzt den Header-Titel und zeigt eine Info-Karte.
 */
export function PlaceholderPage({ title }: { title: string }) {
    useViewTitle(title);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
                Dieses Modul wird im Rahmen der Migration (Phase 2/3) portiert.
            </CardContent>
        </Card>
    );
}
