import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {texto}
    </div>
  );
}

export function VacioEstado({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 p-10 text-center">
      <Inbox className="size-8 text-muted-foreground" />
      <p className="font-semibold">{titulo}</p>
      {descripcion && <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>}
      {accion}
    </div>
  );
}

export function ErrorEstado({ mensaje }: { mensaje?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive-soft p-4 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>{mensaje ?? "Ocurrió un error al cargar la información."}</p>
    </div>
  );
}
