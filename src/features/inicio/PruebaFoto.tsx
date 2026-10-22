
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text } from "react-native";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import {
  prepararImagen,
  type ImagenPreparada,
  type ModoImagen,
} from "../../services/PrepararImagen";
import { useSession } from "../../services/session";
import {
  crearSubidaImagen,
  subirImagen,
  type SubidaImagen,
} from "../../services/subirImagen";
import { colors, font, spacing } from "../../theme";
import { PruebaLeccion } from "./PruebaLeccion";

const megas = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function PruebaFoto() {
  const { userId } = useSession();
  const subidaActual = useRef<SubidaImagen | null>(null);
  const [materialId, setMaterialId] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const iaActiva = useRef(false);
  const [iaOcupada, cambiarIaOcupada] = useState(false);
  const ocupado = useRef(false);
  const montado = useRef(false);
  const copia = useRef<ImagenPreparada | null>(null);

  const [origen, setOrigen] = useState("");
  const [imagen, setImagen] = useState<ImagenPreparada | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ampliada, setAmpliada] = useState(false);
  const [error, setError] = useState("");

  const bloqueado = cargando || iaOcupada;
  const setIaOcupada = useCallback((valor: boolean) => {
    iaActiva.current = valor;
    if (montado.current) cambiarIaOcupada(valor);
  }, []);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
      copia.current?.limpiar();
      copia.current = null;
    };
  }, []);

  async function probar(
    modo: ModoImagen,
    fuente?: "galeria" | "camara"
  ) {
    if (!montado.current || ocupado.current || iaActiva.current) return;

    ocupado.current = true;
    setCargando(true);
    setError("");

    try {
      let uri = origen;

      if (fuente) {
        if (fuente === "camara") {
          const permiso =
            await ImagePicker.requestCameraPermissionsAsync();

          if (!montado.current) return;

          if (!permiso.granted) {
            throw new Error(
              permiso.canAskAgain
                ? "Permite el acceso a la cámara para tomar una fotografía."
                : "Activa el permiso de cámara en los ajustes de la aplicación."
            );
          }
        }

        const opciones: ImagePicker.ImagePickerOptions = {
          mediaTypes: ["images"],
          allowsEditing: false,
          allowsMultipleSelection: false,
          quality: 1,
        };

        const seleccion =
          fuente === "camara"
            ? await ImagePicker.launchCameraAsync(opciones)
            : await ImagePicker.launchImageLibraryAsync(opciones);

        if (seleccion.canceled || !montado.current) return;

        const foto = seleccion.assets[0];

        if (!foto?.uri) {
          throw new Error(
            "No se recibió una fotografía. Inténtalo de nuevo."
          );
        }

        uri = foto.uri;
      }

      if (!uri || !montado.current) return;

      const preparada = await prepararImagen(uri, modo);

      if (!montado.current) {
        preparada.limpiar();
        return;
      }

      const anterior = copia.current;

      subidaActual.current = null;
      setMaterialId("");
      copia.current = preparada;
      setOrigen(uri);
      setImagen(preparada);
      setAmpliada(false);

      anterior?.limpiar();
    } catch (error) {
      if (montado.current) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo preparar la fotografía."
        );
      }
    } finally {
      ocupado.current = false;

      if (montado.current) {
        setCargando(false);
      }
    }
  }

  async function enviarFoto() {
    if (
      !montado.current ||
      ocupado.current ||
      iaActiva.current ||
      !imagen ||
      !userId ||
      materialId
    ) return;

    ocupado.current = true;
    setCargando(true);
    setSubiendo(true);
    setError("");

    try {
      const subida =
        subidaActual.current ?? crearSubidaImagen(userId, imagen);
      subidaActual.current = subida;

      const id = await subirImagen(subida);

      if (montado.current) setMaterialId(id);
    } catch (error) {
      if (montado.current) {
        setError(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la fotografía. Puedes reintentar."
        );
      }
    } finally {
      ocupado.current = false;

      if (montado.current) {
        setCargando(false);
        setSubiendo(false);
      }
    }
  }

  return (
    <Card>
      <Text
        style={{
          color: colors.text,
          fontSize: font.subtitle,
        }}
      >
        Prueba de fotografías
      </Text>

      <Text style={{ color: colors.textMuted }}>
        Toma o elige una foto y comprueba su lectura. Al pulsar
        «Subir fotografía» se guardará en tu cuenta para analizarla
        con IA.
      </Text>

      <Button
        label="Tomar foto"
        onPress={() => probar("normal", "camara")}
        disabled={bloqueado}
      />

      <Button
        label="Elegir fotografía"
        onPress={() => probar("normal", "galeria")}
        disabled={bloqueado}
        variant="secondary"
      />

      {origen ? (
        <>
          <Button
            label="Preparar en modo normal"
            onPress={() => probar("normal")}
            variant="secondary"
            disabled={bloqueado}
          />
          <Button
            label="Preparar con más detalle"
            onPress={() => probar("detalle")}
            disabled={bloqueado}
            variant="secondary"
          />
        </>
      ) : null}

      {cargando ? (
        <Text style={{ color: colors.textMuted }}>
          {subiendo ? "Guardando fotografía…" : "Preparando fotografía…"}
        </Text>
      ) : null}

      {error ? (
        <Text selectable style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}

      {imagen ? (
        <>
          <Text style={{ color: colors.text }}>
            Antes: {imagen.original.width} × {imagen.original.height}
            {" · "}
            {megas(imagen.original.bytes)}
          </Text>

          <Text style={{ color: colors.text }}>
            Después: {imagen.width} × {imagen.height}
            {" · "}
            {megas(imagen.bytes)}
          </Text>

          <Button
            label={
              ampliada
                ? "Ver foto completa"
                : "Ampliar para revisar letras"
            }
            variant="secondary"
            onPress={() => setAmpliada(!ampliada)}
          />

          {ampliada ? (
            <ScrollView
              nestedScrollEnabled
              style={{ height: spacing.xxl * 10 }}
            >
              <ScrollView horizontal nestedScrollEnabled>
                <Image
                  source={{ uri: imagen.uri }}
                  style={{
                    width: imagen.width,
                    height: imagen.height,
                  }}
                  contentFit="contain"
                  accessibilityLabel="Fotografía preparada ampliada"
                />
              </ScrollView>
            </ScrollView>
          ) : (
            <Image
              source={{ uri: imagen.uri }}
              style={{
                width: "100%",
                height: spacing.xxl * 8,
              }}
              contentFit="contain"
              accessibilityLabel="Fotografía preparada"
            />
          )}

          <Text style={{ color: colors.textMuted }}>
            Revisa letras pequeñas, signos, fracciones y orientación.
            Si perdió detalle, prueba la otra opción o toma una foto
            más cerca.
          </Text>
        </>
      ) : null}
      {imagen ? (
        <Button
          label={materialId ? "Fotografía guardada" : "Subir fotografía"}
          onPress={enviarFoto}
          disabled={!userId || bloqueado || !!materialId}
          loading={subiendo}
        />
      ) : null}

      {materialId ? (
        <PruebaLeccion
          key={materialId}
          materialId={materialId}
          onBusyChange={setIaOcupada}
        />
      ) : null}
    </Card>
  );
}