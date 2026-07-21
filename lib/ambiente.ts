// Leitura centralizada do ambiente (sem importar pg/bcrypt — seguro para layouts).

export function urlBanco(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** true quando NÃO há banco configurado (modo demonstração em memória). */
export function modoDemonstracao(): boolean {
  return !urlBanco();
}

export function segredoConfigurado(): boolean {
  return !!process.env.AUTH_SECRET;
}
