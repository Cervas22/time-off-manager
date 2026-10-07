import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { CanjearCodigo, FormasDePago } from "@/components/LicenciaGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cargando, VacioEstado } from "@/components/estados";
import { useAuth, useRolPrincipal } from "@/hooks/useAuth";
import {
  registrarAuditoria,
  useAjustes,
  useCategorias,
  useFestivos,
  useReglasAntiguedad,
  useTipos,
} from "@/lib/datos";
import { supabase } from "@/integrations/supabase/client";
import { fechaLarga } from "@/lib/tz";
import { TEMAS, aplicarTema, prepararLogo } from "@/lib/marca";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración de reglas | Administración" },
      {
        name: "description",
        content:
          "Ajusta la tabla de antigüedad, políticas de vacaciones, días festivos y tipos de permiso.",
      },
      { property: "og:title", content: "Configuración de reglas" },
      { property: "og:description", content: "Reglas legales y políticas internas configurables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConfiguracion,
});

const INTERRUPTORES: { key: string; etiqueta: string; ayuda: string }[] = [
  {
    key: "vacation_start_monday",
    etiqueta: "Las vacaciones deben iniciar en lunes",
    ayuda: "Política interna de la empresa, no un requisito legal.",
  },
  {
    key: "payment_day_rule_enabled",
    etiqueta: "Aplicar regla de día de pago",
    ayuda: "Activa la validación de la fecha de pago al solicitar vacaciones.",
  },
  {
    key: "payment_day_friday",
    etiqueta: "Los pagos se programan en viernes",
    ayuda: "Solo aplica si la regla de día de pago está activa.",
  },
  {
    key: "allow_expired_accrual",
    etiqueta: "Permitir acumular días vencidos",
    ayuda: "Configurable por empleado desde su expediente.",
  },
];

const NUMERICOS: { key: string; etiqueta: string; ayuda: string }[] = [
  {
    key: "min_continuous_days",
    etiqueta: "Mínimo de días continuos de vacaciones",
    ayuda: "Se valida al enviar la solicitud.",
  },
  {
    key: "max_permission_days_deducted",
    etiqueta: "Máximo de días de permiso descontables de vacaciones",
    ayuda: "Aplica a los tipos marcados como descontables.",
  },
];

function AdminConfiguracion() {
  const { user } = useAuth();
  const { esAdmin, cargando } = useRolPrincipal();
  const { data: ajustes, isLoading } = useAjustes();
  const { data: reglas } = useReglasAntiguedad();
  const { data: festivos } = useFestivos();
  const { data: categorias } = useCategorias();
  const { data: tipos } = useTipos();
  const qc = useQueryClient();
  const [guardando, setGuardando] = useState<string | null>(null);

  const guardar = async (key: string, value: unknown) => {
    setGuardando(key);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: value as never, updated_at: new Date().toISOString() })
      .eq("key", key);
    setGuardando(null);
    if (error) {
      toast.error("No se pudo guardar el ajuste", { description: error.message });
      return;
    }
    await registrarAuditoria({
      actorUserId: user?.id ?? null,
      accion: "actualizar_ajuste",
      entidad: "app_settings",
      despues: { key, value },
    });
    toast.success("Configuración actualizada");
    qc.invalidateQueries({ queryKey: ["ajustes"] });
  };

  const guardarDias = async (id: string, dias: number) => {
    const { error } = await supabase.from("seniority_rules").update({ days: dias }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar la tabla de antigüedad");
      return;
    }
    toast.success("Tabla de antigüedad actualizada");
    qc.invalidateQueries({ queryKey: ["reglas-antiguedad"] });
  };

  if (cargando || isLoading) return <Cargando />;
  if (!esAdmin)
    return <VacioEstado titulo="Acceso restringido" descripcion="Solo para administradores." />;

  return (
    <>
      <PageHeader
        titulo="Configuración"
        descripcion="Todas las reglas son editables: nada está fijo en el código."
      />

      <section className="space-y-3 rounded-xl border bg-card p-4"><h2 className="font-semibold">Licencia</h2><p className="text-sm text-muted-foreground">¿Tienes un código de activación o renovación? Ingrésalo aquí.</p><CanjearCodigo /><FormasDePago /></section>
      <SeccionMarca ajustes={ajustes} guardar={guardar} />
      <SeccionPermisos />

      <div className="surface-card mb-6 p-5">
        <p className="mb-4 text-sm font-semibold">Políticas de solicitud</p>
        <div className="space-y-4">
          {INTERRUPTORES.map((i) => (
            <div key={i.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={i.key}>{i.etiqueta}</Label>
                <p className="text-xs text-muted-foreground">{i.ayuda}</p>
              </div>
              <Switch
                id={i.key}
                disabled={guardando === i.key}
                checked={Boolean(ajustes?.[i.key])}
                onCheckedChange={(v) => guardar(i.key, v)}
              />
            </div>
          ))}

          {NUMERICOS.map((n) => (
            <div key={n.key} className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label htmlFor={n.key}>{n.etiqueta}</Label>
                <p className="text-xs text-muted-foreground">{n.ayuda}</p>
              </div>
              <Input
                id={n.key}
                type="number"
                min={0}
                className="w-24"
                defaultValue={Number(ajustes?.[n.key] ?? 0)}
                onBlur={(e) => guardar(n.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card mb-6 p-5">
        <p className="mb-1 text-sm font-semibold">Tabla de antigüedad</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Valores iniciales conforme a la LFT vigente. Puedes ajustarlos si tu empresa otorga más
          días.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(reglas ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm">
                Año {r.year_from}
                {r.year_to && r.year_to !== r.year_from ? `–${r.year_to}` : ""}
              </span>
              <Input
                type="number"
                min={0}
                className="w-20"
                defaultValue={r.days}
                onBlur={(e) => guardarDias(r.id, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SeccionFestivos festivos={festivos ?? []} />


        <div className="surface-card p-5">
          <p className="mb-3 text-sm font-semibold">Categorías y tipos de solicitud</p>
          <div className="max-h-72 space-y-3 overflow-y-auto text-sm">
            {(categorias ?? []).map((c) => (
              <div key={c.id}>
                <p className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </p>
                <ul className="mt-1 space-y-1 pl-5 text-muted-foreground">
                  {(tipos ?? [])
                    .filter((t) => t.category_id === c.id)
                    .map((t) => (
                      <li key={t.id}>
                        {t.name}
                        {t.deducts_vacation ? " · descuenta vacaciones" : ""}
                        {t.requires_document ? " · requiere comprobante" : ""}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SeccionMarca({
  ajustes,
  guardar,
}: {
  ajustes: Record<string, unknown> | undefined;
  guardar: (key: string, value: unknown) => Promise<void>;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const logo = typeof ajustes?.["brand_logo_url"] === "string" ? (ajustes["brand_logo_url"] as string) : null;
  const tema = (ajustes?.["brand_theme"] as string) ?? "azul";

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (archivo.size > 3 * 1024 * 1024) {
      toast.error("La imagen es muy grande (máximo 3 MB)");
      return;
    }
    setSubiendo(true);
    try {
      const dataUrl = await prepararLogo(archivo);
      await guardar("brand_logo_url", dataUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la imagen");
    }
    setSubiendo(false);
  };

  return (
    <div className="surface-card mb-6 p-5">
      <p className="mb-1 text-sm font-semibold">Logotipo y colores</p>
      <p className="mb-4 text-xs text-muted-foreground">
        El logotipo sustituye la palmera del menú. Formatos PNG, JPG o SVG, hasta 3 MB.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
          {logo ? (
            <img src={logo} alt="Logotipo actual de la empresa" className="size-full object-contain p-1" />
          ) : (
            <span className="text-xs text-muted-foreground">Sin logo</span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="w-60"
            disabled={subiendo}
            onChange={(e) => subir(e.target.files?.[0])}
          />
          {logo && (
            <Button variant="outline" size="sm" onClick={() => guardar("brand_logo_url", null)}>
              Quitar
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5">
        <Label htmlFor="brand_name">Nombre que se muestra en el menú</Label>
        <Input
          id="brand_name"
          className="mt-1.5 max-w-sm"
          defaultValue={String(ajustes?.["brand_name"] ?? "Control de Vacaciones y Permisos")}
          onBlur={(e) => guardar("brand_name", e.target.value.trim())}
        />
      </div>

      <div className="mt-5">
        <Label>Gama de colores</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEMAS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                aplicarTema(t.id);
                guardar("brand_theme", t.id);
              }}
              className={
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors " +
                (tema === t.id ? "border-primary bg-primary-soft font-medium" : "border-border hover:bg-muted")
              }
            >
              <span className="size-4 rounded-full" style={{ backgroundColor: t.muestra }} />
              {t.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeccionPermisos() {
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"admin" | "jefe" | "empleado">("admin");
  const [enviando, setEnviando] = useState(false);

  const aplicar = async (otorgar: boolean) => {
    const email = correo.trim().toLowerCase();
    if (!email) {
      toast.error("Escribe el correo de la persona");
      return;
    }
    setEnviando(true);
    const { data, error } = await supabase.rpc("admin_set_role", {
      _email: email,
      _role: rol,
      _grant: otorgar,
    });
    setEnviando(false);
    if (error) {
      toast.error("No se pudo actualizar el permiso", { description: error.message });
      return;
    }
    if (data === "pendiente") {
      toast.success("Permiso programado", {
        description: "Esa persona aún no tiene cuenta; recibirá el permiso al registrarse.",
      });
    } else {
      toast.success(otorgar ? "Permiso otorgado" : "Permiso retirado");
    }
    setCorreo("");
  };

  return (
    <div className="surface-card mb-6 p-5">
      <p className="mb-1 text-sm font-semibold">Permisos de las personas</p>
      <p className="mb-4 text-xs text-muted-foreground">
        Escribe el correo con el que la persona entra a la aplicación. Si todavía no tiene cuenta, el
        permiso se le aplicará automáticamente la primera vez que entre.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="correo-rol">Correo</Label>
          <Input
            id="correo-rol"
            type="email"
            className="mt-1.5"
            placeholder="persona@empresa.mx"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="tipo-rol">Permiso</Label>
          <select
            id="tipo-rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as typeof rol)}
            className="mt-1.5 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="admin">Administrador</option>
            <option value="jefe">Jefe de área</option>
            <option value="empleado">Empleado</option>
          </select>
        </div>
        <Button disabled={enviando} onClick={() => aplicar(true)}>
          Otorgar
        </Button>
        <Button variant="outline" disabled={enviando} onClick={() => aplicar(false)}>
          Quitar
        </Button>
      </div>
    </div>
  );
}

function SeccionFestivos({ festivos }: { festivos: { id: string; holiday_date: string; name: string }[] }) {
  const qc = useQueryClient();
  const [id, setId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const refrescar = () => qc.invalidateQueries({ queryKey: ["festivos"] });
  const limpiar = () => {
    setId(null);
    setNombre("");
    setFecha("");
  };
  const guardarF = async () => {
    if (!nombre.trim() || !fecha) { toast.error("Escribe nombre y fecha"); return; }
    const fila = { name: nombre.trim(), holiday_date: fecha };
    const { error } = id
      ? await supabase.from("holidays").update(fila).eq("id", id)
      : await supabase.from("holidays").insert(fila);
    if (error) { toast.error("No se pudo guardar", { description: error.message }); return; }
    toast.success(id ? "Festivo actualizado" : "Festivo agregado");
    limpiar();
    refrescar();
  };
  const eliminar = async (fid: string) => {
    if (!confirm("¿Eliminar este día festivo?")) return;
    const { error } = await supabase.from("holidays").delete().eq("id", fid);
    if (error) { toast.error("No se pudo eliminar", { description: error.message }); return; }
    refrescar();
  };
  return (
    <div className="surface-card p-5">
      <p className="mb-3 text-sm font-semibold">Días festivos</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className="min-w-40 flex-1" />
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
        <Button size="sm" onClick={guardarF}>{id ? "Guardar" : "Agregar"}</Button>
        {id && <Button size="sm" variant="ghost" onClick={limpiar}>Cancelar</Button>}
      </div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
        {festivos.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
            <span className="min-w-0">
              {f.name} <span className="block text-xs text-muted-foreground">{fechaLarga(f.holiday_date)}</span>
            </span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setId(f.id); setNombre(f.name); setFecha(f.holiday_date); }}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => eliminar(f.id)}>Eliminar</Button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
