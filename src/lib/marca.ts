/**
 * Marca de la empresa: logotipo y gama de colores.
 * El logotipo se guarda como imagen incrustada (data URL) en los ajustes,
 * así no requiere almacenamiento externo ni enlaces que caduquen.
 */

export type TemaId = "azul" | "verde" | "vino" | "grafito" | "naranja";

type Tema = {
  id: TemaId;
  nombre: string;
  muestra: string;
  vars: Record<string, string>;
};

export const TEMAS: Tema[] = [
  {
    id: "azul",
    nombre: "Azul marino",
    muestra: "#1f3557",
    vars: {
      "--primary": "oklch(0.33 0.093 258)",
      "--primary-hover": "oklch(0.28 0.09 258)",
      "--primary-soft": "oklch(0.94 0.022 258)",
      "--ring": "oklch(0.33 0.093 258)",
      "--sidebar": "oklch(0.27 0.075 258)",
      "--sidebar-primary-foreground": "oklch(0.27 0.075 258)",
      "--sidebar-accent": "oklch(0.34 0.08 258)",
      "--sidebar-border": "oklch(0.36 0.06 258)",
    },
  },
  {
    id: "verde",
    nombre: "Verde bosque",
    muestra: "#1f4d3a",
    vars: {
      "--primary": "oklch(0.36 0.08 158)",
      "--primary-hover": "oklch(0.31 0.078 158)",
      "--primary-soft": "oklch(0.94 0.03 158)",
      "--ring": "oklch(0.36 0.08 158)",
      "--sidebar": "oklch(0.29 0.065 158)",
      "--sidebar-primary-foreground": "oklch(0.29 0.065 158)",
      "--sidebar-accent": "oklch(0.36 0.07 158)",
      "--sidebar-border": "oklch(0.38 0.055 158)",
    },
  },
  {
    id: "vino",
    nombre: "Vino",
    muestra: "#5c1f2c",
    vars: {
      "--primary": "oklch(0.35 0.1 15)",
      "--primary-hover": "oklch(0.3 0.098 15)",
      "--primary-soft": "oklch(0.94 0.03 15)",
      "--ring": "oklch(0.35 0.1 15)",
      "--sidebar": "oklch(0.29 0.085 15)",
      "--sidebar-primary-foreground": "oklch(0.29 0.085 15)",
      "--sidebar-accent": "oklch(0.36 0.09 15)",
      "--sidebar-border": "oklch(0.38 0.07 15)",
    },
  },
  {
    id: "grafito",
    nombre: "Grafito",
    muestra: "#33373d",
    vars: {
      "--primary": "oklch(0.34 0.012 260)",
      "--primary-hover": "oklch(0.29 0.012 260)",
      "--primary-soft": "oklch(0.94 0.005 260)",
      "--ring": "oklch(0.34 0.012 260)",
      "--sidebar": "oklch(0.28 0.01 260)",
      "--sidebar-primary-foreground": "oklch(0.28 0.01 260)",
      "--sidebar-accent": "oklch(0.35 0.012 260)",
      "--sidebar-border": "oklch(0.37 0.01 260)",
    },
  },
  {
    id: "naranja",
    nombre: "Ámbar profundo",
    muestra: "#7a3f10",
    vars: {
      "--primary": "oklch(0.42 0.11 55)",
      "--primary-hover": "oklch(0.37 0.108 55)",
      "--primary-soft": "oklch(0.95 0.035 55)",
      "--ring": "oklch(0.42 0.11 55)",
      "--sidebar": "oklch(0.32 0.085 55)",
      "--sidebar-primary-foreground": "oklch(0.32 0.085 55)",
      "--sidebar-accent": "oklch(0.4 0.095 55)",
      "--sidebar-border": "oklch(0.42 0.075 55)",
    },
  },
];

export function aplicarTema(id: string | null | undefined) {
  if (typeof document === "undefined") return;
  const tema = TEMAS.find((t) => t.id === id) ?? TEMAS[0];
  const raiz = document.documentElement;
  for (const [k, v] of Object.entries(tema.vars)) raiz.style.setProperty(k, v);
}

/** Reduce y comprime la imagen del logotipo a un data URL ligero. */
export async function prepararLogo(archivo: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("No se pudo leer la imagen"));
    fr.readAsDataURL(archivo);
  });
  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error("Archivo de imagen no válido"));
  });
  const max = 256;
  const escala = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
