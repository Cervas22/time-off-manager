import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, Palmtree } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Acceso | Control de Vacaciones y Permisos" },
      {
        name: "description",
        content:
          "Consulta tus vacaciones disponibles, solicita permisos y revisa la disponibilidad de tu área desde cualquier dispositivo.",
      },
      { property: "og:title", content: "Control de Vacaciones y Permisos" },
      {
        property: "og:description",
        content:
          "Gestión de vacaciones, permisos y disponibilidad de personal con reglas configurables y control por área.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Acceso,
});

function Acceso() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<"login" | "recuperar">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setEnviando(false);
    if (error) {
      toast.error("No se pudo iniciar sesión", {
        description: "Verifica tu correo y contraseña e inténtalo de nuevo.",
      });
      return;
    }
    navigate({ to: "/panel" });
  };

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/perfil`,
    });
    setEnviando(false);
    if (error) {
      toast.error("No se pudo enviar el correo de recuperación");
      return;
    }
    toast.success("Te enviamos un correo para restablecer tu contraseña");
    setModo("login");
  };

  const entrarGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/panel" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="brand-gradient hidden flex-col justify-between p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-foreground/15">
            <Palmtree className="size-6" />
          </span>
          <span className="text-lg font-semibold">Vacaciones y Permisos</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight">
            Vacaciones, permisos y disponibilidad de personal en un solo lugar.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Ciclos automáticos por antigüedad, control de capacidad por área, calendario visual y
            trazabilidad completa de cada acción administrativa.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Reglas legales y políticas internas configurables. Zona horaria de Matamoros, México.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Palmtree className="size-5" />
            </span>
            <span className="font-semibold">Vacaciones y Permisos</span>
          </div>

          <h1 className="text-2xl font-bold">
            {modo === "login" ? "Iniciar sesión" : "Recuperar contraseña"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "login"
              ? "Accede con el correo registrado por tu administrador."
              : "Te enviaremos un enlace para restablecer tu contraseña."}
          </p>

          <form onSubmit={modo === "login" ? entrar : recuperar} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="pl-9"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {modo === "login" && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
              {modo === "login" ? "Entrar" : "Enviar enlace"}
            </Button>
          </form>

          {modo === "login" && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={entrarGoogle}>
                Continuar con Google
              </Button>
            </>
          )}

          <button
            onClick={() => setModo(modo === "login" ? "recuperar" : "login")}
            className="mt-5 w-full text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            {modo === "login" ? "¿Olvidaste tu contraseña?" : "Volver a iniciar sesión"}
          </button>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Las cuentas son creadas por el administrador. Si no puedes acceder, contáctalo.
          </p>
        </div>
      </div>
    </div>
  );
}
