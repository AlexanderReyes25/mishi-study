// Los parámetros de ruta pueden llegar como texto o como lista: nos quedamos con el primero.
export function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}
