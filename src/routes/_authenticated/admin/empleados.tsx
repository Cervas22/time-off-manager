import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Upload, UserX, UserCheck } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { registrarAuditoria, useAreas, useReglasAntiguedad } from "@/lib/datos";
import { diasPorAntiguedad, type ReglaAntiguedad } from "@/lib/reglas";
import { supabase } from "@/integrations/supabase/client";
import { agregarDias, antiguedadAnios, fechaLarga, hoyISO } from "@/lib/tz";
import { guardarCuentaEmpleado, rolesPorCorreo } from "@/lib/cuentas.functions";

export const Route = createFileRoute("/_authenticated/admin/empleados")({
  head: () => ({
    meta: [
      { title: "Empleados | Administración" },
      {
        name: "description",
        content: "Alta, edición, baja y carga masiva del personal con ciclos de vacaciones automáticos.",
      },
      { property: "og:title", content: "Empleados" },
      { property: "og:description", content: "Padrón de personal y generación de ciclos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminEmpleados,
});

const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const DIAS_CSV = ["LUN", "MAR", "MIE", "JUE", "VIE", "SAB", "DOM"];
const PATRON = "Patrón / Dueño";
type Rol = "admin" | "jefe" | "empleado";

type Emp = {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  position: string | null;
  area_id: string | null;
  hire_date: string;
  is_active: boolean;
  is_owner: boolean;
  work_days: number[];
  user_id: string | null;
};

type Form = {
  employee_number: string;
  full_name: string;
  email: string;
  position: string;
  area_id: string;
  hire_date: string;
  work_days: number[];
  role: Rol;
  password: string;
  is_owner: boolean;
};

const vacio = (): Form => ({
  employee_number: "",
  full_name: "",
  email: "",
  position: "",
  area_id: "",
  hire_date: hoyISO(),
  work_days: [0, 1, 2, 3, 4],
  role: "empleado",
  password: "",
  is_owner: false,
});

async function crearCicloInicial(empId: string, ingreso: string, reglas: ReglaAntiguedad[]) {
  const anios = Math.max(1, antiguedadAnios(ingreso));
  const dias = diasPorAntiguedad(reglas, anios);
  const hoy = hoyISO();
  const mmdd = ingreso.slice(5);
  const anio = Number(hoy.slice(0, 4));
  const inicio = `${anio}-${mmdd}` <= hoy ? `${anio}-${mmdd}` : `${anio - 1}-${mmdd}`;
  const fin = agregarDias(`${Number(inicio.slice(0, 4)) + 1}-${mmdd}`, -1);
  const { error } = await supabase.from("vacation_cycles").insert({
    employee_id: empId,
    cycle_start: inicio,
    cycle_end: fin,
    anniversary_date: inicio,
    seniority_years: anios,
    assigned_days: dias,
  });
  if (error) throw error;
  return dias;
}

function AdminEmpleados() {
  const { user } = useAuth();
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: areas } = useAreas();
  const { data: reglas } = useReglasAntiguedad();
  const qc = useQueryClient();
  const guardarCuenta = useServerFn(guardarCuentaEmpleado);
  const leerRoles = useServerFn(rolesPorCorreo);

  const { data: empleados, isLoading } = useQuery({
    queryKey: ["empleados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as Emp[];
    },
  });
  const { data: roles } = useQuery({
    queryKey: ["roles-empleados"],
    enabled: esAdmin,
    queryFn: () => leerRoles(),
  });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Emp | null>(null);
  const [form, setForm] = useState<Form>(vacio());
  const [busqueda, setBusqueda] = useState("");
  const [verBajas, setVerBajas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const areaMap = useMemo(() => new Map((areas ?? []).map((a) => [a.id, a])), [areas]);
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["empleados"] });
    qc.invalidateQueries({ queryKey: ["roles-empleados"] });
    qc.invalidateQueries({ queryKey: ["ciclo-vigente"] });
  };

  const abrirNuevo = () => {
    setEditando(null);
    setForm(vacio());
    setAbierto(true);
  };
  const abrirEditar = (e: Emp) => {
    setEditando(e);
    setForm({
      employee_number: e.employee_number,
      full_name: e.full_name,
      email: e.email,
      position: e.position ?? "",
      area_id: e.area_id ?? "",
      hire_date: e.hire_date,
      work_days: e.work_days ?? [0, 1, 2, 3, 4],
      role: ((e.user_id && roles?.[e.user_id]) as Rol) || "empleado",
      password: "",
      is_owner: e.is_owner,
    });
    setAbierto(true);
  };

  const guardar = async () => {
    if (!form.employee_number || !form.full_name || !form.email) {
      toast.error("Número, nombre y correo son obligatorios");
      return;
    }
    if (form.password && form.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setGuardando(true);
    const fila = {
      employee_number: form.employee_number.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      position: form.is_owner ? PATRON : form.position.trim() || null,
      area_id: form.area_id || null,
      hire_date: form.hire_date,
      work_days: form.work_days,
      is_owner: form.is_owner,
    };
    try {
      let id = editando?.id;
      if (editando) {
        const { error } = await supabase.from("employees").update(fila as never).eq("id", editando.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("employees").insert(fila as never).select().single();
        if (error) throw error;
        id = data.id as string;
      }
      await guardarCuenta({
        data: {
          email: fila.email,
          oldEmail: editando?.email,
          password: form.password || undefined,
          fullName: fila.full_name,
          role: form.is_owner ? "admin" : form.role,
        },
      });
      let extra = "";
      if (!editando && !form.is_owner) {
        const dias = await crearCicloInicial(id!, fila.hire_date, reglas ?? []);
        extra = ` Ciclo generado con ${dias} día(s).`;
      }
      await registrarAuditoria({
        actorUserId: user?.id ?? null,
        accion: editando ? "editar_empleado" : "crear_empleado",
        entidad: "employees",
        entidadId: id ?? null,
        antes: editando,
        despues: fila,
      });
      toast.success((editando ? "Empleado actualizado." : "Empleado registrado.") + extra);
      setAbierto(false);
      refrescar();
    } catch (e) {
      toast.error("No se pudo guardar", { description: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (e: Emp) => {
    const activo = !e.is_active;
    if (!activo && !confirm(`¿Dar de baja a ${e.full_name}? Su historial se conserva.`)) return;
    const { error } = await supabase.from("employees").update({ is_active: activo }).eq("id", e.id);
    if (error) { toast.error("No se pudo actualizar", { description: error.message }); return; }
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: activo ? "reactivar_empleado" : "baja_empleado",
      entidad: "employees",
      entidadId: e.id,
    });
    toast.success(activo ? "Empleado reactivado" : "Empleado dado de baja");
    refrescar();
  };

  const generarCiclo = async (e: Emp) => {
    try {
      const dias = await crearCicloInicial(e.id, e.hire_date, reglas ?? []);
      toast.success(`Ciclo generado con ${dias} día(s)`);
      refrescar();
    } catch (err) {
      toast.error("No se pudo generar el ciclo", { description: (err as Error).message });
    }
  };

  const descargarPlantilla = () => {
    const csv =
      "numero,nombre,correo,puesto,area,fecha_ingreso,dias_laborables,rol,contrasena\n" +
      `001,Juan Pérez,juan@empresa.mx,Vendedor,${areas?.[0]?.name ?? "Ventas"},2022-03-15,LUN MAR MIE JUE VIE,empleado,Empresa2026!\n` +
      `002,Ana López,ana@empresa.mx,Supervisora,${areas?.[0]?.name ?? "Ventas"},2019-08-01,LUN MAR MIE JUE VIE SAB,jefe,\n`;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla_empleados.csv";
    a.click();
  };

  const cargarArchivo = async (f: File) => {
    const texto = (await f.text()).replace(/^\uFEFF/, "");
    const sep = texto.split("\n")[0]!.includes(";") ? ";" : ",";
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
    const cab = lineas.shift()!.split(sep).map((c) => c.trim().toLowerCase());
    const col = (fila: string[], n: string) => (fila[cab.indexOf(n)] ?? "").trim();
    let ok = 0;
    const errores: string[] = [];
    setGuardando(true);
    for (const [i, l] of lineas.entries()) {
      const c = l.split(sep);
      const nombre = col(c, "nombre");
      try {
        const correo = col(c, "correo").toLowerCase();
        const fecha = col(c, "fecha_ingreso");
        if (!col(c, "numero") || !nombre || !correo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
          throw new Error("faltan datos o la fecha no es AAAA-MM-DD");
        const diasTxt = col(c, "dias_laborables")
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const work_days = diasTxt
          ? DIAS_CSV.map((d, idx) => (diasTxt.includes(d) ? idx : -1)).filter((x) => x >= 0)
          : [0, 1, 2, 3, 4];
        const areaNombre = col(c, "area").toLowerCase();
        const area = (areas ?? []).find((a) => a.name.toLowerCase() === areaNombre);
        const rolTxt = col(c, "rol").toLowerCase();
        const esPatron = rolTxt.startsWith("patr") || rolTxt.includes("dueñ");
        const rol: Rol = esPatron || rolTxt.startsWith("admin") ? "admin" : rolTxt.startsWith("jefe") ? "jefe" : "empleado";
        const { data, error } = await supabase
          .from("employees")
          .insert({
            employee_number: col(c, "numero"),
            full_name: nombre,
            email: correo,
            position: esPatron ? PATRON : col(c, "puesto") || null,
            area_id: area?.id ?? null,
            hire_date: fecha,
            work_days,
            is_owner: esPatron,
          } as never)
          .select()
          .single();
        if (error) throw error;
        const pass = col(c, "contrasena");
        await guardarCuenta({
          data: { email: correo, password: pass.length >= 8 ? pass : undefined, fullName: nombre, role: rol },
        });
        if (!esPatron) await crearCicloInicial(data.id as string, fecha, reglas ?? []);
        ok++;
      } catch (e) {
        errores.push(`Fila ${i + 2} (${nombre || "sin nombre"}): ${(e as Error).message}`);
      }
    }
    setGuardando(false);
    refrescar();
    if (ok) toast.success(`${ok} empleado(s) cargados con su ciclo`);
    if (errores.length)
      toast.error(`${errores.length} fila(s) con error`, {
        description: errores.slice(0, 5).join("\n"),
        duration: 15000,
      });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  const lista = (empleados ?? []).filter(
    (e) =>
      e.is_active !== verBajas &&
      `${e.full_name} ${e.employee_number} ${e.email}`.toLowerCase().includes(busqueda.toLowerCase()),
  );
  const etiquetaRol = (e: Emp) => {
    if (e.is_owner) return PATRON;
    const r = e.user_id ? roles?.[e.user_id] : null;
    return r === "admin" ? "Administrador" : r === "jefe" ? "Jefe de área" : "Empleado";
  };

  return (
    <>
      <PageHeader
        titulo="Empleados"
        descripcion={`${(empleados ?? []).filter((e) => e.is_active).length} activo(s) en el padrón.`}
        accion={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={descargarPlantilla}>
              <Download className="mr-2 size-4" /> Plantilla
            </Button>
            <Button variant="outline" disabled={guardando} onClick={() => archivo.current?.click()}>
              <Upload className="mr-2 size-4" /> Carga masiva
            </Button>
            <input
              ref={archivo}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) cargarArchivo(f);
                e.target.value = "";
              }}
            />
            <Button onClick={abrirNuevo}>
              <Plus className="mr-2 size-4" /> Nuevo empleado
            </Button>
          </div>
        }
      />

      <p className="mb-3 text-xs text-muted-foreground">
        Carga masiva: descarga la plantilla, llénala en Excel y guárdala como “CSV UTF-8”. Días
        laborables separados por espacio (LUN MAR MIE JUE VIE SAB DOM). Rol: empleado, jefe, admin o
        patron. La contraseña es opcional (mínimo 8 caracteres).
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          placeholder="Buscar por nombre, número o correo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-md"
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={verBajas} onCheckedChange={setVerBajas} /> Ver dados de baja
        </label>
      </div>

      {lista.length === 0 ? (
        <VacioEstado titulo="Sin empleados" descripcion="No hay registros en esta vista." />
      ) : (
        <div className="space-y-2">
          {lista.map((e) => (
            <div key={e.id} className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {e.full_name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">#{e.employee_number}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {e.position ?? "Sin puesto"} ·{" "}
                  {e.area_id ? (areaMap.get(e.area_id)?.name ?? "Sin área") : "Sin área"} · Ingreso{" "}
                  {fechaLarga(e.hire_date)} · {antiguedadAnios(e.hire_date)} año(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.email} · {etiquetaRol(e)} ·{" "}
                  {(e.work_days ?? []).map((d) => DIAS[d]).join(" ")} ·{" "}
                  {e.user_id ? "Con acceso" : "Sin acceso"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!e.is_owner && e.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => generarCiclo(e)}>
                    Generar ciclo
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => abrirEditar(e)}>
                  <Pencil className="mr-1 size-4" /> Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => cambiarEstado(e)}>
                  {e.is_active ? (
                    <>
                      <UserX className="mr-1 size-4" /> Dar de baja
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-1 size-4" /> Reactivar
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar empleado" : "Alta de empleado"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Deja la contraseña vacía para no cambiarla."
                : "Su ciclo de vacaciones se calcula automáticamente al guardar."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ["employee_number", "Número de empleado"],
                ["full_name", "Nombre completo"],
                ["email", "Correo electrónico"],
              ] as const
            ).map(([campo, etiqueta]) => (
              <div key={campo} className="space-y-1.5">
                <Label htmlFor={campo}>{etiqueta}</Label>
                <Input
                  id={campo}
                  value={form[campo]}
                  onChange={(ev) => setForm((f) => ({ ...f, [campo]: ev.target.value }))}
                />
              </div>
            ))}
            <label className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <span>
                <span className="font-medium">{PATRON}</span>
                <span className="block text-xs text-muted-foreground">
                  Administrador completo, sin ciclos ni saldo de vacaciones.
                </span>
              </span>
              <Switch
                checked={form.is_owner}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_owner: v, role: v ? "admin" : f.role }))}
              />
            </label>
            {!form.is_owner && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="position">Puesto</Label>
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(ev) => setForm((f) => ({ ...f, position: ev.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol en el sistema</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Rol }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="jefe">Jefe de área</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={form.area_id} onValueChange={(v) => setForm((f) => ({ ...f, area_id: v }))}>
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
              <Label>Días laborables</Label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS.map((d, i) => {
                  const on = form.work_days.includes(i);
                  return (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          work_days: on
                            ? f.work_days.filter((x) => x !== i)
                            : [...f.work_days, i].sort(),
                        }))
                      }
                    >
                      {d}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Los días sin marcar son de descanso.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hire">Fecha de ingreso</Label>
              <Input
                id="hire"
                type="date"
                value={form.hire_date}
                onChange={(ev) => setForm((f) => ({ ...f, hire_date: ev.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pass">{editando ? "Nueva contraseña (opcional)" : "Contraseña inicial"}</Label>
              <Input
                id="pass"
                type="text"
                value={form.password}
                placeholder="Mínimo 8 caracteres"
                onChange={(ev) => setForm((f) => ({ ...f, password: ev.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Anótala y compártela con el empleado; por seguridad no se puede volver a consultar.
              </p>
            </div>
            <Button className="w-full" onClick={guardar} disabled={guardando}>
              {editando ? "Guardar cambios" : "Guardar empleado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
