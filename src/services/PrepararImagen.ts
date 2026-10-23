import { File } from "expo-file-system";
import {
    ImageManipulator,
    SaveFormat,
    type ImageRef,
} from "expo-image-manipulator";

export type ModoImagen = "normal" | "detalle";

export type ImagenPreparada = {
  uri: string;
  width: number;
  height: number;
  bytes: number;
  mimeType: "image/jpeg";
  original: {
    width: number;
    height: number;
    bytes: number;
  };
  limpiar: () => void;
};

const MAX_BYTES = 10 * 1024 * 1024;

const AJUSTES = {
  normal: { lado: 2048, calidad: 0.85 },
  detalle: { lado: 3072, calidad: 0.92 },
};

function borrarTemporal(uri: string) {
  try {
    const archivo = new File(uri);

    if (archivo.exists) {
      archivo.delete();
    }
  } catch {
    // Una limpieza fallida no debe cerrar la pantalla.
  }
}

export async function prepararImagen(
  uri: string,
  modo: ModoImagen = "normal"
): Promise<ImagenPreparada> {
  if (!uri.trim()) {
    throw new Error("Selecciona una fotografía.");
  }

  const archivoOriginal = new File(uri);

  if (!archivoOriginal.exists) {
    throw new Error(
      "La fotografía ya no está disponible. Selecciónala de nuevo."
    );
  }

  const bytesOriginales = archivoOriginal.size;
  const ajustes = AJUSTES[modo];
  const contexto = ImageManipulator.manipulate(uri);

  let original: ImageRef | undefined;
  let reducida: ImageRef | undefined;
  let temporal: string | undefined;

  try {
    original = await contexto.renderAsync();

    const { width, height } = original;

    if (![width, height].every((n) => Number.isFinite(n) && n > 0)) {
      throw new Error(
        "No se pudieron leer las dimensiones de la fotografía."
      );
    }

    // Conserva la proporción y no agranda fotografías pequeñas.
    if (Math.max(width, height) > ajustes.lado) {
      contexto.resize(
        width >= height
          ? { width: ajustes.lado }
          : { height: ajustes.lado }
      );

      reducida = await contexto.renderAsync();
    }

    const resultado = await (reducida ?? original).saveAsync({
      format: SaveFormat.JPEG,
      compress: ajustes.calidad,
      base64: false,
    });

    if (resultado.uri === uri) {
      throw new Error(
        "No se pudo crear una copia de la fotografía."
      );
    }

    temporal = resultado.uri;

    const archivo = new File(temporal);
    const bytes = archivo.size;

    if (!archivo.exists || !Number.isFinite(bytes) || bytes <= 0) {
      throw new Error(
        "No se pudo guardar la fotografía preparada."
      );
    }

    if (bytes > MAX_BYTES) {
      throw new Error(
        "La copia supera los 10 MB. Prueba el modo normal o fotografía una parte de la hoja."
      );
    }

    return {
      uri: resultado.uri,
      width: resultado.width,
      height: resultado.height,
      bytes,
      mimeType: "image/jpeg",
      original: {
        width,
        height,
        bytes: bytesOriginales,
      },
      limpiar: () => borrarTemporal(resultado.uri),
    };
  } catch (error) {
    if (temporal) {
      borrarTemporal(temporal);
    }

    throw error;
  } finally {
    for (const recurso of new Set([reducida, original, contexto])) {
      try {
        recurso?.release();
      } catch {
        // Liberar memoria no debe interrumpir otras limpiezas.
      }
    }
  }
}