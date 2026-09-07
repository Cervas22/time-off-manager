import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useRolPrincipal } from "@/hooks/useAuth";
import { registrarAuditoria, useAreas, useEmpleados, useReglasAntiguedad } from "@/lib/datos";
import { diasPorAntiguedad } from "@/lib/reglas";
import { supabase } from "@/integrations/supabase/client";
import { agregarDias, antiguedadAnios, fechaLarga, hoyISO } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/admin/empleados")({
  head: () => ({
    meta: [
      { title: "Empleados | Administración" },
      {
        name: "description",
        content: "Alta y administración del personal, áreas, antigüedad y ciclos de vacaciones.",
      },
      { property: "og:title", content: "Empleados" },
      { property: "og:description", content: "Padrón de personal y generación de ciclos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminEmpleados,
});

function AdminEmpleados() {
  const { user } = useAuth();
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: empleados, isLoading } = useEmpleados();
  const { data: areas } = useAreas();
  const { data: reglas } = useReglasAntiguedad();
  const qc = useQueryClient();

  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({
    employee_number: "",
    full_name: "",
    email: "",
    position: "",
    area_id: "",
    hire_date: hoyISO(),
  });
  const [guardando, setGuardando] = useState(false);

  const areaMap = useMemo(() => new Map((areas ?? []).map((a) => [a.id, a])), [areas]);

  const crear = async () => {
    if (!form.employee_number || !form.full_name || !form.email) {
      toast.error("Número, nombre y correo son obligatorios");
      return;
    }
    setGuardando(true);
    const { data, error } = await supabase
      .from("employees")
      .insert({
        employee_number: form.employee_number.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        position: form.position.trim() || null,
        area_id: form.area_id || null,
        hire_date: form.hire_date,
      })
      .select()
      .single();
    setGuardando(false);
    if (error) {
      toast.error("No se pudo crear el empleado", { description: error.message });
      return;
    }
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: "crear_empleado",
      entidad: "employees",
      entidadId: data?.id as string,
      despues: data,
    });
    toast.success("Empleado registrado", {
      description: "Al iniciar sesión con ese correo, su cuenta quedará vinculada.",
    });
    setAbierto(false);
    setForm({
      employee_number: "",
      full_name: "",
      email: "",
      position: "",
      area_id: "",
      hire_date: hoyISO(),
    });
    qc.invalidateQueries({ queryKey: ["empleados"] });
  };

  const generarCiclo = async (empId: string, ingreso: string) => {
    const anios = Math.max(1, antiguedadAnios(ingreso));
    const dias = diasPorAntiguedad(reglas ?? [], anios);
    const hoy = hoyISO();
    const aniversario = `${hoy.slice(0, 4)}-${ingreso.slice(5)}`;
    const inicio = aniversario <= hoy ? aniversario : `${Number(hoy.slice(0, 4)) - 1}-${ingreso.slice(5)}`;
    const fin = agregarDias(`${Number(inicio.slice(0, 4)) + 1}-${ingreso.slice(5)}`, -1);

    const { error } = await supabase.from("vacation_cycles").insert({
      employee_id: empId,
      cycle_start: inicio,
      cycle_end: fin,
      anniversary_date: inicio,
      seniority_years: anios,
      assigned_days: dias,
    });
    if (error) {
      toast.error("No se pudo generar el ciclo", { description: error.message });
      return;
    }
    toast.success(`Ciclo generado con ${dias} día(s) asignados`);
    qc.invalidateQueries({ queryKey: ["ciclo-vigente"] });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  const lista = (empleados ?? []).filter((e) =>
    `${e.full_name} ${e.employee_number} ${e.email}`.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        titulo="Empleados"
        descripcion={`${(empleados ?? []).length} registro(s) en el padrón.`}
        accion={
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" /> Nuevo empleado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Alta de empleado</DialogTitle>
                <DialogDescription>
                  El acceso se vincula automáticamente cuando la persona inicia sesión con el mismo
                  correo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {(
                  [
                    ["employee_number", "Número de empleado"],
                    ["full_name", "Nombre completo"],
                    ["email", "Correo electrónico"],
                    ["position", "Puesto"],
                  ] as const
                ).map(([campo, etiqueta]) => (
                  <div key={campo} className="space-y-1.5">
                    <Label htmlFor={campo}>{etiqueta}</Label>
                    <Input
                      id={campo}
                      value={form[campo]}
                      onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Área</Label>
                  <Select
                    value={form.area_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, area_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {(areas ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hire">Fecha de ingreso</Label>
                  <Input
                    id="hire"
                    type="date"
                    value={form.hire_date}
                    onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                  />
                </div>
                <Button className="w-full" onClick={crear} disabled={guardando}>
                  Guardar empleado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        placeholder="Buscar por nombre, número o correo"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4 max-w-md"
      />

      {lista.length === 0 ? (
        <VacioEstado titulo="Sin empleados" descripcion="Registra al primer integrante del equipo." />
      ) : (
        <div className="space-y-2">
          {lista.map((e) => (
            <div key={e.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {e.full_name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    #{e.employee_number}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {e.position ?? "Sin puesto"} ·{" "}
                  {e.area_id ? (areaMap.get(e.area_id)?.name ?? "Sin área") : "Sin área"} · Ingreso{" "}
                  {fechaLarga(e.hire_date)} · {antiguedadAnios(e.hire_date)} año(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.email} · {e.user_id ? "Cuenta vinculada" : "Sin cuenta vinculada"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => generarCiclo(e.id, e.hire_date)}>
                Generar ciclo
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
