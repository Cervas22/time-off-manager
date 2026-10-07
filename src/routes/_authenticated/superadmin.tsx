import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cargando } from "@/components/estados";
import { supabase } from "@/integrations/supabase/client";
import { estadoLicencia, useCobro, useEsSuperadmin, type Cobro } from "@/lib/licencia";
import { hoyISO } from "@/lib/licencia-fecha";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/superadmin")({
  head: () => ({
    meta: [
      { title: "Panel de licencias | Control de Vacaciones y Permisos" },
      { name: "description", content: "Administra empresas, licencias, códigos de activación y datos de cobro." },
      { property: "og:title", content: "Panel de licencias" },
      { property: "og:description", content: "Empresas registradas y vigencia de sus licencias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuperAdmin,
});

type Fila = {
  id: string; nombre: string; rfc: string | null; correo_contacto: string | null; telefono: string | null;
  estatus: string; fecha_vencimiento: string; admin_email: string | null; empleados: number;
};

function sumarDias(base: string, dias: number) {
  const d = new Date(base + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function SuperAdmin() {
  const esSuper = useEsSuperadmin();
  const qc = useQueryClient();
  const { data: filas, isLoading } = useQuery({
    queryKey: ["superadmin-empresas"],
    enabled: esSuper,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("superadmin_empresas");
      if (error) throw error;
      return data as Fila[];
    },
  });

  if (!esSuper) return <p className="text-muted-foreground">Acceso restringido.</p>;
  if (isLoading) return <Cargando />;

  const actualizar = async (f: Fila, cambios: { estatus?: string; fecha_vencimiento?: string }) => {
    const { error } = await supabase.from("empresas").update(cambios).eq("id", f.id);
    if (error) return toast.error("No se pudo actualizar", { description: error.message });
    toast.success(`${f.nombre} actualizada`);
    qc.invalidateQueries();
  };
  const extender = (f: Fila, dias: number, estatus: string) => {
    const hoy = hoyISO();
    const base = f.fecha_vencimiento > hoy ? f.fecha_vencimiento : hoy;
    actualizar(f, { estatus, fecha_vencimiento: sumarDias(base, dias) });
  };

  const total = filas ?? [];
  const conteo = { verde: 0, amarillo: 0, rojo: 0 };
  total.forEach((f) => conteo[estadoLicencia(f).nivel]++);

  return (
    <div className="space-y-8">
      <PageHeader titulo="Panel de licencias" descripcion="Todas las empresas que usan el sistema." />
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-lg border p-3"><p className="text-2xl font-bold text-success">{conteo.verde}</p>Vigentes</div>
        <div className="rounded-lg border p-3"><p className="text-2xl font-bold text-warning">{conteo.amarillo}</p>Por vencer</div>
        <div className="rounded-lg border p-3"><p className="text-2xl font-bold text-destructive">{conteo.rojo}</p>Vencidas / suspendidas</div>
      </div>

      <div className="space-y-3">
        {total.map((f) => {
          const est = estadoLicencia(f);
          return (
            <div key={f.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{f.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.admin_email ?? f.correo_contacto ?? "Sin admin"} · {f.empleados} empleados{f.telefono ? ` · ${f.telefono}` : ""}{f.rfc ? ` · ${f.rfc}` : ""}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold",
                  est.nivel === "verde" && "bg-success/15 text-success",
                  est.nivel === "amarillo" && "bg-warning/15 text-warning",
                  est.nivel === "rojo" && "bg-destructive/15 text-destructive")}>
                  {est.etiqueta} · {est.dias >= 0 ? `${est.dias} días` : `vencida hace ${-est.dias} días`} · {f.fecha_vencimiento}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => extender(f, 15, "prueba")}>+15 días prueba</Button>
                <Button size="sm" variant="outline" onClick={() => extender(f, 30, "activa")}>+30 días</Button>
                <Button size="sm" variant="outline" onClick={() => extender(f, 365, "activa")}>+1 año</Button>
                {f.estatus === "suspendida" ? (
                  <Button size="sm" onClick={() => actualizar(f, { estatus: "activa" })}>Reactivar</Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={() => actualizar(f, { estatus: "suspendida" })}>Suspender</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Codigos />
      <DatosCobro />
    </div>
  );
}

function Codigos() {
  const qc = useQueryClient();
  const [dias, setDias] = useState(30);
  const [nota, setNota] = useState("");
  const { data } = useQuery({
    queryKey: ["codigos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("codigos_activacion").select("*, empresas(nombre)").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as { id: string; codigo: string; dias: number; nota: string | null; usado_en: string | null; empresas: { nombre: string } | null }[];
    },
  });
  const generar = async () => {
    const rnd = Array.from(crypto.getRandomValues(new Uint8Array(6))).map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    const codigo = `LIC-${dias}D-${rnd}`;
    const { error } = await supabase.from("codigos_activacion").insert({ codigo, dias, nota: nota || null });
    if (error) return toast.error("No se pudo generar", { description: error.message });
    navigator.clipboard?.writeText(codigo).catch(() => {});
    toast.success(`Código ${codigo} generado y copiado`);
    setNota("");
    qc.invalidateQueries({ queryKey: ["codigos"] });
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Códigos de activación</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div><Label>Días</Label>
          <div className="flex gap-1">
            {[15, 30, 365].map((d) => <Button key={d} size="sm" variant={dias === d ? "default" : "outline"} onClick={() => setDias(d)}>{d === 365 ? "1 año" : `${d} días`}</Button>)}
            <Input type="number" min={1} className="w-20" value={dias} onChange={(e) => setDias(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
        <div className="flex-1"><Label>Nota (opcional)</Label><Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Empresa X, pago SPEI" /></div>
        <Button onClick={generar}>Generar código</Button>
      </div>
      <div className="divide-y text-sm">
        {(data ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span className="font-mono">{c.codigo}</span>
            <span className="text-muted-foreground">{c.dias} días · {c.nota ?? ""} · {c.usado_en ? `Usado por ${c.empresas?.nombre ?? "—"}` : "Disponible"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const CAMPOS: [keyof Cobro, string][] = [
  ["paypal_url", "Enlace de PayPal (ej. https://paypal.me/tuusuario)"],
  ["precio_mensual", "Precio mensual (texto)"],
  ["precio_anual", "Precio anual (texto)"],
  ["banco", "Banco"], ["titular", "Titular"], ["clabe", "CLABE SPEI"],
  ["oxxo_tarjeta", "Número de tarjeta para OXXO"],
  ["whatsapp", "WhatsApp para comprobantes"], ["correo", "Correo para comprobantes"],
];

function DatosCobro() {
  const { data } = useCobro();
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<Cobro>>({});
  useEffect(() => { if (data) setF(data); }, [data]);
  const guardar = async () => {
    const cambios = Object.fromEntries(CAMPOS.map(([k]) => [k, (f[k] ?? "").toString().trim() || null]));
    const { error } = await supabase.from("plataforma_cobro").update(cambios).eq("id", 1);
    if (error) return toast.error("No se pudo guardar", { description: error.message });
    toast.success("Datos de cobro guardados");
    qc.invalidateQueries({ queryKey: ["cobro"] });
  };
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Datos de cobro</h2>
      <p className="text-sm text-muted-foreground">Se muestran a las empresas cuando su licencia vence.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS.map(([k, label]) => (
          <div key={k}><Label>{label}</Label><Input value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></div>
        ))}
      </div>
      <Button onClick={guardar}>Guardar</Button>
    </section>
  );
}
