import { useRef, useState } from "react";
import { Keyboard, Text, TextInput } from "react-native";
import { parseLesson } from "../../../supabase/functions/_shared/lesson";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { RichText } from "../../components/MathText";
import { PantallaCarga } from "../../components/PantallaCarga";
import { runAi, type AiResult } from "../../services/ai";
import { useSession } from "../../services/session";
import { supabase } from "../../services/supabase";
import { colors, font, radius, spacing } from "../../theme";

const MAX_TEXTO = 10000;

type Leccion = AiResult["lesson"];
type Tema = { nombre: string; leccion: Leccion | null };
type Material = { userId: string; texto: string; id: string };

async function leerLeccion(material: Material, tema: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("title, blocks, content, round")
    .eq("user_id", material.userId)
    .eq("material_id", material.id)
    .eq("topic", tema)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  if (typeof data.content !== "string" || !data.content.trim()) {
    throw new Error("La lección guardada no tiene contenido válido.");
  }

  return {
    ...parseLesson(data),
    lesson: data.content,
    round: data.round,
  };
}

export function PruebaLeccion() {
  const { userId } = useSession();
  const ocupado = useRef(false);
  const materialActual = useRef<Material | null>(null);

  const [texto, setTexto] = useState("");
  const [temas, setTemas] = useState<Tema[]>([]);
  const [seleccionado, setSeleccionado] = useState("");
  const [estado, setEstado] = useState("");
  const [mostrarCarga, setMostrarCarga] = useState(false);
  const [error, setError] = useState("");

  const cargando = estado !== "";
  const resultado = temas.find(
    (tema) => tema.nombre === seleccionado
  )?.leccion;

  function cambiarTexto(value: string) {
    if (ocupado.current) return;

    setTexto(value);
    setTemas([]);
    setSeleccionado("");
    setError("");
  }

  function iniciar(mensaje: string) {
    ocupado.current = true;
    Keyboard.dismiss();
    setEstado(mensaje);
    setError("");
  }

  function terminar() {
    ocupado.current = false;
    setEstado("");
    setMostrarCarga(false);
  }

  async function analizar() {
    if (!userId || ocupado.current || temas.length) return;

    const contenido = texto.trim();

    if (!contenido || contenido.length > MAX_TEXTO) {
      setError("Escribe tus apuntes: máximo 10 000 caracteres.");
      return;
    }

    iniciar("Detectando los temas de tus apuntes…");

    try {
      let material = materialActual.current;

      if (
        !material ||
        material.userId !== userId ||
        material.texto !== contenido
      ) {
        const { data, error: crearError } = await supabase
          .from("materials")
          .insert({
            user_id: userId,
            title: `Prueba: ${contenido
              .replace(/\s+/g, " ")
              .slice(0, 70)}`,
            file_type: "text",
            raw_text: contenido,
            topics: [],
          })
          .select("id")
          .single();

        if (crearError || !data) {
          throw new Error(
            crearError?.message ?? "No se pudo guardar el material."
          );
        }

        material = { userId, texto: contenido, id: data.id };
        materialActual.current = material;
      }

      const analisis = await runAi("topics", material.id);

      if (
        !Array.isArray(analisis?.topics) ||
        analisis.topics.length === 0 ||
        analisis.topics.length > 10 ||
        analisis.topics.some(
          (tema) =>
            typeof tema !== "string" ||
            !tema.trim() ||
            tema.length > 100
        )
      ) {
        throw new Error("La IA no devolvió una lista válida de temas.");
      }

      const { data, error: temasError } = await supabase
        .from("materials")
        .select("topics")
        .eq("id", material.id)
        .eq("user_id", userId)
        .single();

      if (
        temasError ||
        JSON.stringify(data?.topics) !== JSON.stringify(analisis.topics)
      ) {
        throw new Error("No se pudo confirmar el guardado de los temas.");
      }

      const vistos = new Set<string>();

      const lista = analisis.topics
        .map((tema) => tema.trim())
        .filter((tema) => {
          const clave = tema.normalize("NFC").toLocaleLowerCase("es");

          if (vistos.has(clave)) return false;

          vistos.add(clave);
          return true;
        });

      setTemas(
        lista.map((nombre) => ({
          nombre,
          leccion: null,
        }))
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron analizar los apuntes."
      );
    } finally {
      terminar();
    }
  }

  async function abrirTema(nombre: string) {
    if (!userId || ocupado.current) return;

    const material = materialActual.current;
    const tema = temas.find((item) => item.nombre === nombre);

    if (
      !material ||
      material.userId !== userId ||
      material.texto !== texto.trim() ||
      !tema
    ) {
      return;
    }

    setSeleccionado(nombre);
    setError("");

    if (tema.leccion) return;

    iniciar(`Preparando: ${nombre}`);
    setMostrarCarga(true);

    try {
      // Recupera una lección ya guardada si antes se perdió la conexión.
      let leccion: Leccion | null = await leerLeccion(material, nombre);

      if (!leccion) {
        const respuesta = await runAi("lesson", material.id, {
          topic: nombre,
        });

        const validada = parseLesson(respuesta);
        const guardada = await leerLeccion(material, nombre);

        if (
          !guardada ||
          guardada.round !== respuesta.round ||
          guardada.lesson !== respuesta.lesson ||
          JSON.stringify(parseLesson(guardada)) !==
            JSON.stringify(validada)
        ) {
          throw new Error(
            "No se pudo confirmar la lección guardada. Intenta abrir este tema de nuevo."
          );
        }

        leccion = guardada;
      }

      setTemas((actuales) =>
        actuales.map((item) =>
          item.nombre === nombre ? { ...item, leccion } : item
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo preparar esta lección."
      );
    } finally {
      terminar();
    }
  }

  return (
    <Card>
      {cargando && mostrarCarga ? (
        <PantallaCarga onClose={() => setMostrarCarga(false)} />
      ) : null}

      {cargando && seleccionado && !mostrarCarga ? (
        <Button
          label="Ver carga"
          onPress={() => setMostrarCarga(true)}
        />
      ) : null}

      <Text style={{ color: colors.text, fontSize: font.subtitle }}>
        Prueba de IA con tus apuntes
      </Text>

      <Text style={{ color: colors.textMuted }}>
        Pega tus apuntes. Detectaremos los temas para crear una lección
        por cada uno.
      </Text>

      <TextInput
        value={texto}
        onChangeText={cambiarTexto}
        editable={!cargando}
        multiline
        maxLength={MAX_TEXTO}
        textAlignVertical="top"
        placeholder="Pega aquí tus apuntes…"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Apuntes para analizar"
        style={{
          minHeight: spacing.xxl * 5,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          color: colors.text,
          backgroundColor: colors.surface,
          fontSize: font.body,
        }}
      />

      <Text style={{ color: colors.textMuted, fontSize: font.small }}>
        {texto.length} / {MAX_TEXTO} caracteres
      </Text>

      <Button
        label={temas.length ? "Temas detectados" : "Detectar temas"}
        onPress={analizar}
        loading={cargando && !seleccionado}
        disabled={
          !userId || cargando || !texto.trim() || temas.length > 0
        }
      />

      {temas.length ? (
        <Text style={{ color: colors.text }}>
          {temas.length} tema(s). Elige cuál estudiar; cada lección se
          guarda por separado.
        </Text>
      ) : null}

      {temas.map((tema) => (
        <Button
          key={tema.nombre}
          label={`${tema.leccion ? "Abrir" : "Preparar"}: ${tema.nombre}`}
          variant={
            seleccionado === tema.nombre ? "primary" : "secondary"
          }
          disabled={!userId || cargando}
          onPress={() => abrirTema(tema.nombre)}
        />
      ))}

      {estado ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.textMuted }}
        >
          {estado}
        </Text>
      ) : null}

      {error ? (
        <Text selectable style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}

      {resultado ? (
        <>
          <Text style={{ color: colors.text }}>
            Guardado confirmado: {seleccionado}.
          </Text>

          <Text style={{ color: colors.text, fontSize: font.subtitle }}>
            {resultado.title}
          </Text>

          <RichText text={resultado.lesson} />
        </>
      ) : null}
    </Card>
  );
}