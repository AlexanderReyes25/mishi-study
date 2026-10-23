import { File } from "expo-file-system";
import { uuid } from "expo-modules-core";
import type { ImagenPreparada } from "./PrepararImagen";
import { supabase } from "./supabase";

export type SubidaImagen = Readonly<{
  id: string;
  userId: string;
  uri: string;
  title: string;
  path: string;
}>;

const MAX_BYTES = 10 * 1024 * 1024;

// Crea una operación una sola vez por foto. Conserva este objeto al reintentar.
export function crearSubidaImagen(
  userId: string,
  imagen: ImagenPreparada
): SubidaImagen {
  if (!userId || !imagen.uri.trim()) {
    throw new Error("Inicia sesión y prepara una fotografía primero.");
  }
  if (imagen.mimeType !== "image/jpeg") {
    throw new Error("Prepara la fotografía como JPEG antes de subirla.");
  }
  const id = uuid.v4();
  return Object.freeze({
    id,
    userId,
    uri: imagen.uri,
    title: "Fotografía de apuntes",
    path: `${userId}/${id}.jpg`,
  });
}

async function comprobarUsuario(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error("No se pudo comprobar tu sesión. Reintenta cuando tengas conexión.");
  }
  if (!data.user) throw new Error("Inicia sesión para subir la fotografía.");
  if (data.user.id !== userId) {
    throw new Error("La cuenta cambió. Vuelve a preparar la fotografía con la cuenta actual.");
  }
}

async function materialYaGuardado(subida: SubidaImagen): Promise<boolean> {
  const { data, error } = await supabase
    .from("materials")
    .select("id,user_id,file_path,file_type")
    .eq("id", subida.id)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo comprobar el material guardado. Reintenta con la misma fotografía.");
  }
  if (!data) return false;
  if (
    data.user_id !== subida.userId ||
    data.file_path !== subida.path ||
    data.file_type !== "image"
  ) {
    throw new Error("La operación no coincide con el material existente.");
  }
  return true;
}

export async function subirImagen(subida: SubidaImagen): Promise<string> {
  if (subida.path !== `${subida.userId}/${subida.id}.jpg`) {
    throw new Error("La ruta de la fotografía no es válida.");
  }
  await comprobarUsuario(subida.userId);

  // Si la respuesta anterior se perdió, recupera la fila sin repetir ni reiniciar la IA.
  if (await materialYaGuardado(subida)) return subida.id;

  const archivo = new File(subida.uri);
  const bytes = archivo.size;
  if (!archivo.exists || !Number.isFinite(bytes) || bytes <= 0) {
    throw new Error("La copia preparada ya no está disponible. Prepara otra fotografía.");
  }
  if (bytes > MAX_BYTES) throw new Error("La fotografía supera los 10 MB.");

  const contenido = await archivo.arrayBuffer();
  if (contenido.byteLength <= 0 || contenido.byteLength > MAX_BYTES) {
    throw new Error("La fotografía está vacía o supera los 10 MB.");
  }
  const encabezado = new Uint8Array(contenido, 0, Math.min(3, contenido.byteLength));
  if (encabezado[0] !== 0xff || encabezado[1] !== 0xd8 || encabezado[2] !== 0xff) {
    throw new Error("El archivo preparado no parece una fotografía JPEG.");
  }

  await comprobarUsuario(subida.userId);
  const bucket = supabase.storage.from("materials");
  let confirmarArchivo = false;
  try {
    const { error } = await bucket.upload(subida.path, contenido, {
      contentType: "image/jpeg",
      upsert: false,
    });
    confirmarArchivo = Boolean(error);
  } catch {
    confirmarArchivo = true;
  }

  // Un duplicado o una respuesta perdida pueden corresponder a esta misma subida.
  if (confirmarArchivo) {
    const { data, error } = await bucket.info(subida.path);
    if (
      error ||
      !data ||
      data.size !== contenido.byteLength ||
      data.contentType?.split(";")[0].trim().toLowerCase() !== "image/jpeg"
    ) {
      throw new Error("No se pudo confirmar la subida. Reintenta con la misma fotografía.");
    }
  }

  await comprobarUsuario(subida.userId);
  let confirmarMaterial = false;
  try {
    const { error } = await supabase.from("materials").insert({
      id: subida.id,
      user_id: subida.userId,
      title: subida.title,
      file_path: subida.path,
      file_type: "image",
      status: "pending",
    });
    confirmarMaterial = Boolean(error);
  } catch {
    confirmarMaterial = true;
  }

  if (confirmarMaterial && !(await materialYaGuardado(subida))) {
    // No borrar el archivo: una respuesta perdida no demuestra que el insert falló.
    throw new Error("El archivo se subió, pero no se pudo confirmar el material. Reintenta con la misma fotografía.");
  }
  return subida.id;
}