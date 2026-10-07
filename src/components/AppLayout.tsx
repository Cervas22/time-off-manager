import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  Cog,
  FileClock,
  Home,
  LogOut,
  Menu,
  Palmtree,
  ScrollText,
  UserCircle2,
  Users,
  Wallet,
  Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMiEmpleado, useNotificacionesNoLeidas, useRolPrincipal } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAjustes } from "@/lib/datos";
import { aplicarTema } from "@/lib/marca";
import { KeyRound } from "lucide-react";
import { LicenciaGate } from "@/components/LicenciaGate";
import { estadoLicencia, useEsSuperadmin, useMiEmpresa } from "@/lib/licencia";

type Item = { to: string; label: string; icon: typeof Home };

const ITEMS_EMPLEADO: Item[] = [
  { to: "/panel", label: "Inicio", icon: Home },
  { to: "/mis-vacaciones", label: "Mis vacaciones", icon: Palmtree },
  { to: "/mis-solicitudes", label: "Mis solicitudes", icon: ClipboardList },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell },
  { to: "/perfil", label: "Mi perfil", icon: UserCircle2 },
];

const ITEMS_ADMIN: Item[] = [
  { to: "/admin/solicitudes", label: "Solicitudes", icon: ClipboardList },
  { to: "/admin/empleados", label: "Empleados", icon: Users },
  { to: "/admin/areas", label: "Áreas y horarios", icon: Cog },
  { to: "/admin/pagos", label: "Pagos programados", icon: Wallet },
  { to: "/admin/configuracion", label: "Configuración", icon: ScrollText },
  { to: "/admin/auditoria", label: "Auditoría", icon: FileClock },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { esAdmin } = useRolPrincipal();
  const esSuper = useEsSuperadmin();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const render = (items: Item[]) =>
    items.map(({ to, label, icon: Icon }) => {
      const activo = path === to || path.startsWith(to + "/");
      return (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            activo
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      );
    });

  return (
    <nav className="flex flex-col gap-1">
      {render(ITEMS_EMPLEADO)}
      {esAdmin && (
        <>
          <p className="mt-5 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Administración
          </p>
          {render(ITEMS_ADMIN)}
        </>
      )}
      {esSuper && render([{ to: "/superadmin", label: "Panel de licencias", icon: KeyRound }])}
      <IndicadorLicencia />
    </nav>
  );
}

function IndicadorLicencia() {
  const { data: empresa } = useMiEmpresa();
  if (!empresa) return null;
  const est = estadoLicencia(empresa);
  return (
    <p className="mt-4 px-3 text-xs text-sidebar-foreground/60">
      Licencia {est.etiqueta.toLowerCase()} · {est.dias >= 0 ? `${est.dias} días restantes` : "vencida"}
      <br />
      Vence: {new Date(empresa.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-MX")}
    </p>
  );
}

function Marca() {
  const { data: ajustes } = useAjustes();
  const logo = typeof ajustes?.["brand_logo_url"] === "string" ? (ajustes["brand_logo_url"] as string) : null;
  const nombre =
    typeof ajustes?.["brand_name"] === "string" && ajustes["brand_name"]
      ? (ajustes["brand_name"] as string)
      : "Control de Vacaciones y Permisos";

  useEffect(() => {
    aplicarTema(ajustes?.["brand_theme"] as string | undefined);
  }, [ajustes]);

  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      {logo ? (
        <img
          src={logo}
          alt="Logotipo de la empresa"
          className="size-9 shrink-0 rounded-lg bg-sidebar-primary object-contain p-0.5"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Palmtree className="size-5" />
        </span>
      )}
      <span className="text-sm font-semibold leading-tight text-sidebar-foreground">{nombre}</span>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const { data: empleado } = useMiEmpleado();
  const { rol } = useRolPrincipal();
  const noLeidas = useNotificacionesNoLeidas();
  const { data: ajustes } = useAjustes();

  useEffect(() => {
    aplicarTema(ajustes?.["brand_theme"] as string | undefined);
  }, [ajustes]);

  const salir = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const etiquetaRol =
    rol === "admin" ? "Administrador" : rol === "jefe" ? "Jefe de área" : "Empleado";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-sidebar p-3 lg:flex">
        <div>
          <Marca />
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border pt-3">
          <p className="px-3 text-sm font-medium text-sidebar-foreground">
            {empleado?.full_name ?? "Usuario"}
          </p>
          <p className="px-3 pb-2 text-xs text-sidebar-foreground/60">{etiquetaRol}</p>
          <button
            onClick={salir}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none bg-sidebar p-3">
              <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
              <Marca />
              <NavLinks onNavigate={() => setAbierto(false)} />
              <button
                onClick={salir}
                className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
              >
                <LogOut className="size-4" /> Cerrar sesión
              </button>
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-semibold">Vacaciones y Permisos</span>
          <Link to="/notificaciones" className="relative p-2" aria-label="Notificaciones">
            <Bell className="size-5" />
            {noLeidas > 0 && (
              <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 pb-20 sm:p-6 lg:pb-6">
          <LicenciaGate>{children}</LicenciaGate>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
