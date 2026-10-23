import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { uuid } from 'expo-modules-core';
import { Platform } from 'react-native';

const MAX_BYTES = 10 * 1024 * 1024;

function checkSize(size: number | null | undefined) {
  if (typeof size === 'number' && size > MAX_BYTES) {
    throw new Error('El PDF supera los 10 MB. Elige un archivo más pequeño.');
  }
}

async function readNativePdf(asset: DocumentPicker.DocumentPickerAsset): Promise<ArrayBuffer> {
  const source = new File(asset.uri);
  // En Android usamos el permiso content:// del selector y nuestra propia caché.
  // Así no dependemos de que la caché de DocumentPicker sea legible por Expo Go.
  const temporary = Platform.OS === 'android'
    ? new File(Paths.cache, `mishi-pdf-${uuid.v4()}.pdf`)
    : null;
  const local = temporary ?? source;

  try {
    if (temporary) {
      try {
        await source.copy(temporary);
      } catch (cause) {
        throw new Error('No se pudo preparar una copia del PDF. Vuelve a seleccionarlo desde Descargas y comprueba que tengas espacio libre.', { cause });
      }
    }

    // Un tamaño desconocido no significa que el documento esté vacío.
    checkSize(local.size);
    try {
      return await local.arrayBuffer();
    } catch (cause) {
      throw new Error('No se pudo leer el PDF seleccionado. Vuelve a elegirlo desde Descargas.', { cause });
    }
  } finally {
    if (temporary) {
      try {
        temporary.delete();
      } catch {
        // La limpieza de nuestra copia no debe ocultar el resultado de la lectura.
        // Nunca se elimina el documento original seleccionado.
      }
    }
  }
}

async function readWebPdf(asset: DocumentPicker.DocumentPickerAsset): Promise<ArrayBuffer> {
  if (!asset.file) throw new Error('El navegador no entregó el PDF. Vuelve a seleccionarlo.');
  checkSize(asset.file.size);
  try {
    return await asset.file.arrayBuffer();
  } catch (cause) {
    throw new Error('No se pudo leer el PDF seleccionado. Vuelve a elegirlo.', { cause });
  }
}

export async function seleccionarPdf(): Promise<{ name: string; bytes: ArrayBuffer } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: false,
    // Android: copia explícita y esperada en readNativePdf. iOS: copia del selector.
    copyToCacheDirectory: Platform.OS !== 'android',
    base64: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('No se recibió el PDF seleccionado. Intenta elegirlo de nuevo.');

  checkSize(asset.size);
  const bytes = Platform.OS === 'web' ? await readWebPdf(asset) : await readNativePdf(asset);
  checkSize(bytes.byteLength);
  if (bytes.byteLength === 0) {
    throw new Error('El PDF seleccionado está vacío (0 bytes). Elige otra copia del documento.');
  }
  if (String.fromCharCode(...new Uint8Array(bytes, 0, Math.min(5, bytes.byteLength))) !== '%PDF-') {
    throw new Error('El contenido del archivo no corresponde a un PDF válido.');
  }

  return { name: asset.name, bytes };
}
