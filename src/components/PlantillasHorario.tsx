import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VacioEstado } from "@/components/estados";
import { supabase } from "@/integrations/supabase/client";

const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export type Plantilla = {
  id: string;
  name: string;
  description: string | null;
  is_rotating: boolean;
  is_night_shift: boolean;
  dias: number[];
  entrada: string;
  salida: string;
  comida: number;
};

export function usePlantillas(enabled = true) {
  return useQuery({
    queryKey: ["horarios"],
    enabled,
    queryFn: async (): Promise<Plantilla[]> => {
      const { data, error } = await supabase
        .from("schedule_templates")
        .select("*, schedule_days(*)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t: any) => {
        const ds = (t.schedule_days ?? []).filter((d: any) => d.is_working_day);
        const p = ds[0];
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          is_rotating: t.is_rotating,
          is_night_shift: t.is_night_shift,
          dias: ds.map((d: any) => d.weekday).sort(),
          entrada: p?.start_time?.slice(0, 5) ?? "09:00",
          salida: p?.end_time?.slice(0, 5) ?? "18:00",
          comida: p?.lunch_minutes ?? 60,
        };
      });
    },
  });
}

function horas(e: string, s: string, comida: number) {
  const [a, b] = e.split(":").map(Number);
  const [c, d] = s.split(":").map(Number);
  let m = c * 60 + d - (a * 60 + b);
  if (m <= 0) m += 1440;
  return Math.max(0, (m - comida) / 60);
}

type Form = Omit<Plantilla, "id"> & { id?: string };
const nuevo = (): Form => ({
  name: "", description: "", is_rotating: false, is_night_shift: false,
  dias: [0, 1, 2, 3, 4], entrada: "09:00", salida: "18:00", comida: 60,
});

export function PlantillasHorario() {
  const qc = useQueryClient();
  const { data: plantillas } = usePlantillas();
  const { data: emps } = useQuery({
    queryKey: ["empleados-horario"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees").select("id, full_name, schedule_template_id").eq("is_active", true);
      return data ?? [];
    },
  });
  const [form, setForm] = useState<Form | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  const guardar = async () => {
    if (!form) return;
    if (!form.name.trim()) return toast.error("Escribe un nombre");
    if (form.dias.length === 0) return toast.error("Marca al menos un día");
    const datos = {
      name: form.name.trim(), description: form.description?.trim() || null,
      is_rotating: form.is_rotating, is_night_shift: form.is_night_shift,
    };
    let id = form.id;
    if (id) {
      const { error } = await supabase.from("schedule_templates").update(datos).eq("id", id);
      if (error) return toast.error("No se pudo guardar", { description: error.message });
      await supabase.from("schedule_days").delete().eq("template_id", id);
    } else {
      const { data, error } = await supabase.from("schedule_templates").insert(datos as never).select("id").single();
      if (error) return toast.error("No se pudo guardar", { description: error.message });
      id = data.id;
    }
    const cruza = form.salida <= form.entrada;
    const { error } = await supabase.from("schedule_days").insert(
      DIAS.map((_, i) => ({
        template_id: id!, weekday: i, is_working_day: form.dias.includes(i),
        start_time: form.dias.includes(i) ? form.entrada : null,
        end_time: form.dias.includes(i) ? form.salida : null,
        lunch_minutes: form.comida, crosses_midnight: cruza,
      })) as never,
    );
    if (error) return toast.error("No se pudieron guardar los días", { description: error.message });
    toast.success("Plantilla guardada");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["horarios"] });
  };

  const eliminar = async (p: Plantilla) => {
    if (!confirm(`¿Eliminar la plantilla "${p.name}"? El personal asignado quedará sin horario.`)) return;
    const { error } = await supabase.from("schedule_templates").delete().eq("id", p.id);
    if (error) return toast.error("No se pudo eliminar", { description: error.message });
    toast.success("Plantilla eliminada");
    qc.invalidateQueries({ queryKey: ["horarios"] });
    qc.invalidateQueries({ queryKey: ["empleados-horario"] });
  };

  return (
    <>
      <div className="mb-3 mt-8 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Plantillas de horario</h2>
        <Button size="sm" onClick={() => setForm(nuevo())}>
          <Plus className="mr-1 size-4" /> Nueva plantilla
        </Button>
      </div>
      {(plantillas ?? []).length === 0 ? (
        <VacioEstado titulo="Sin plantillas de horario" descripcion="Crea un horario (ej. Oficina 9 a 6) y asígnalo al personal desde Empleados." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(plantillas ?? []).map((p) => {
            const asignados = (emps ?? []).filter((e) => e.schedule_template_id === p.id);
            return (
              <div key={p.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.entrada} – {p.salida} · {horas(p.entrada, p.salida, p.comida).toFixed(1)} h
                      {p.comida ? ` · comida ${p.comida} min` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm({ ...p })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => eliminar(p)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {DIAS.map((d, i) => (
                    <span key={d} className={`rounded px-1.5 py-0.5 text-xs ${p.dias.includes(i) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{d}</span>
                  ))}
                  {p.is_rotating && <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">Rotativo</span>}
                  {p.is_night_shift && <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">Nocturno</span>}
                </div>
                <button type="button" className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => setAbierta(abierta === p.id ? null : p.id)}>
                  <Users className="size-4" /> {asignados.length} persona(s) asignada(s)
                </button>
                {abierta === p.id && (
                  <p className="mt-2 text-sm">{asignados.map((e) => e.full_name).join(", ") || "Nadie todavía. Asígnalo desde Empleados → Editar."}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input placeholder="Ej. Oficina 9 a 6" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5"><Label>Entrada</Label><Input type="time" value={form.entrada} onChange={(e) => setForm({ ...form, entrada: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Salida</Label><Input type="time" value={form.salida} onChange={(e) => setForm({ ...form, salida: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Comida (min)</Label><Input type="number" min={0} value={form.comida} onChange={(e) => setForm({ ...form, comida: Number(e.target.value) })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Jornada: {horas(form.entrada, form.salida, form.comida).toFixed(1)} horas por día</p>
              <div className="space-y-1.5">
                <Label>Días laborables</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DIAS.map((d, i) => {
                    const on = form.dias.includes(i);
                    return (
                      <Button key={d} type="button" size="sm" variant={on ? "default" : "outline"}
                        onClick={() => setForm({ ...form, dias: on ? form.dias.filter((x) => x !== i) : [...form.dias, i].sort() })}>{d}</Button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between"><Label>Turno rotativo</Label><Switch checked={form.is_rotating} onCheckedChange={(v) => setForm({ ...form, is_rotating: v })} /></div>
              <div className="flex items-center justify-between"><Label>Turno nocturno</Label><Switch checked={form.is_night_shift} onCheckedChange={(v) => setForm({ ...form, is_night_shift: v })} /></div>
              <Button className="w-full" onClick={guardar}>Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
