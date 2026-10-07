import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Building2, CreditCard, KeyRound, Landmark, MessageCircle, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cargando } from "@/components/estados";
import { useRolPrincipal } from "@/hooks/useAuth";
import { estadoLicencia, useCobro, useEsSuperadmin, useMiEmpresa, type Empresa } from "@/lib/licencia";

function fecha(f: string) {
  return new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export function LicenciaGate({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const esSuper = useEsSuperadmin();
  const { data: empresa, isLoading } = useMiEmpresa();

  if (esSuper && path.startsWith("/superadmin")) return <>{children}</>;
  if (isLoading) return <Cargando />;
  if (!empresa) return esSuper ? <>{children}</> : <RegistrarEmpresa />;

  const est = estadoLicencia(empresa);
  if (!est.vigente) return <LicenciaVencida empresa={empresa} />;

  return (
    <>
      {est.dias <= 7 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {est.etiqueta === "Prueba" ? "Tu periodo de prueba" : "Tu licencia"} vence en {est.dias} día(s) ({fecha(empresa.fecha_vencimiento)}).
        </div>
      )}
      {children}
    </>
  );
}

function RegistrarEmpresa() {
  const qc = useQueryClient();
  const [f, setF] = useState({ nombre: "", rfc: "", telefono: "" });
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.rpc("registrar_empresa", { _nombre: f.nombre, _rfc: f.rfc, _telefono: f.telefono });
    setEnviando(false);
    if (error) { toast.error("No se pudo registrar", { description: error.message }); return; }
    toast.success("¡Empresa registrada! Tienes 15 días de prueba.");
    await qc.invalidateQueries();
  };
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-card p-6">
      <Building2 className="mb-3 size-8 text-primary" />
      <h1 className="text-xl font-bold">Registra tu empresa</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Si eres empleado, pide a tu administrador que te dé de alta con este correo. Si eres el dueño o administrador, registra tu empresa y obtén 15 días de prueba gratis.
      </p>
      <form onSubmit={enviar} className="mt-4 space-y-3">
        <div><Label>Nombre de la empresa</Label><Input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></div>
        <div><Label>RFC (opcional)</Label><Input value={f.rfc} onChange={(e) => setF({ ...f, rfc: e.target.value })} /></div>
        <div><Label>Teléfono (opcional)</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
        <Button type="submit" className="w-full" disabled={enviando}>{enviando ? "Registrando…" : "Comenzar prueba de 15 días"}</Button>
      </form>
    </div>
  );
}

export function FormasDePago() {
  const { data: c } = useCobro();
  if (!c) return null;
  return (
    <div className="space-y-3 text-sm">
      {(c.precio_mensual || c.precio_anual) && (
        <p className="font-medium">
          {c.precio_mensual && <>Mensual: {c.precio_mensual}. </>}
          {c.precio_anual && <>Anual: {c.precio_anual}.</>}
        </p>
      )}
      {c.paypal_url && (
        <Button asChild className="w-full">
          <a href={c.paypal_url} target="_blank" rel="noreferrer"><CreditCard className="size-4" /> Pagar con PayPal o tarjeta</a>
        </Button>
      )}
      {c.clabe && (
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-2 font-semibold"><Landmark className="size-4" /> Transferencia SPEI</p>
          {c.banco && <p>Banco: {c.banco}</p>}
          {c.titular && <p>Titular: {c.titular}</p>}
          <p>CLABE: <span className="font-mono">{c.clabe}</span></p>
        </div>
      )}
      {c.oxxo_tarjeta && (
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-2 font-semibold"><Store className="size-4" /> Depósito en OXXO</p>
          <p>Tarjeta: <span className="font-mono">{c.oxxo_tarjeta}</span></p>
        </div>
      )}
      {(c.whatsapp || c.correo) && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <MessageCircle className="size-4" /> Envía tu comprobante a{" "}
          {c.whatsapp && <a className="underline" href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {c.whatsapp && c.correo && " o "}
          {c.correo && <a className="underline" href={`mailto:${c.correo}`}>{c.correo}</a>}
        </p>
      )}
    </div>
  );
}

export function CanjearCodigo() {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const canjear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { data, error } = await supabase.rpc("canjear_codigo", { _codigo: codigo });
    setEnviando(false);
    if (error) { toast.error("No se pudo activar", { description: error.message }); return; }
    toast.success(`Licencia activada hasta el ${fecha(data as string)}`);
    setCodigo("");
    await qc.invalidateQueries();
  };
  return (
    <form onSubmit={canjear} className="flex gap-2">
      <Input placeholder="Código de activación" value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
      <Button type="submit" disabled={enviando}><KeyRound className="size-4" /> Activar</Button>
    </form>
  );
}

function LicenciaVencida({ empresa }: { empresa: Empresa }) {
  const { esAdmin } = useRolPrincipal();
  const est = estadoLicencia(empresa);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-card p-6">
      <AlertTriangle className="size-8 text-destructive" />
      <h1 className="text-xl font-bold">Licencia {est.etiqueta.toLowerCase()}</h1>
      <p className="text-sm text-muted-foreground">
        {est.etiqueta === "Suspendida"
          ? `El acceso de ${empresa.nombre} está suspendido.`
          : `La licencia de ${empresa.nombre} venció el ${fecha(empresa.fecha_vencimiento)}.`}{" "}
        {esAdmin ? "Realiza tu pago y activa tu licencia con el código que te enviaremos." : "Pide a tu administrador que renueve la licencia."}
      </p>
      {esAdmin && (
        <>
          <FormasDePago />
          <CanjearCodigo />
        </>
      )}
    </div>
  );
}
