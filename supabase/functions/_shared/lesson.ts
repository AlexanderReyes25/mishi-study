export interface LessonStep {
  text: string;
  latex?: string;
}

export type LessonBlock =
  | { type: "text"; content: string }
  | { type: "formula"; latex: string }
  | { type: "example"; title: string; steps: LessonStep[] }
  | { type: "tip"; content: string };

export interface GeneratedLesson {
  title: string;
  blocks: LessonBlock[];
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("La IA devolvió una estructura de lección inválida.");
  }
  return value as Record<string, unknown>;
}

function readText(value: unknown, field: string, max = 6000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`La IA devolvió un campo inválido: ${field}.`);
  }
  return value.trim();
}

export function parseLesson(value: unknown): GeneratedLesson {
  const lesson = readObject(value);
  const title = readText(lesson.title, "title", 120);

  if (
    !Array.isArray(lesson.blocks) ||
    lesson.blocks.length === 0 ||
    lesson.blocks.length > 40
  ) {
    throw new Error("La lección debe contener entre 1 y 40 bloques.");
  }

  const blocks: LessonBlock[] = lesson.blocks.map((value): LessonBlock => {
    const block = readObject(value);

    switch (block.type) {
      case "text":
      case "tip":
        return {
          type: block.type,
          content: readText(block.content, "content"),
        };

      case "formula":
        return {
          type: "formula",
          latex: readText(block.latex, "latex", 2000),
        };

      case "example": {
        const exampleTitle = readText(block.title, "example.title", 120);

        if (
          !Array.isArray(block.steps) ||
          block.steps.length === 0 ||
          block.steps.length > 20
        ) {
          throw new Error("Cada ejemplo debe contener entre 1 y 20 pasos.");
        }

        const steps: LessonStep[] = block.steps.map((value) => {
          const step = readObject(value);
          const text = readText(step.text, "step.text");

          return step.latex === undefined
            ? { text }
            : { text, latex: readText(step.latex, "step.latex", 2000) };
        });

        return { type: "example", title: exampleTitle, steps };
      }

      default:
        throw new Error("La IA devolvió un tipo de bloque desconocido.");
    }
  });

  return { title, blocks };
}

export function lessonToMarkdown(lesson: GeneratedLesson): string {
  return lesson.blocks.map((block) => {
    switch (block.type) {
      case "text":
        return block.content;

      case "formula":
        return `$$${block.latex}$$`;

      case "tip":
         return `**Consejo**\n\n${block.content}`;

      case "example": {
        const steps = block.steps.map((step, index) => {
          const formula = step.latex ? `\n\n$$${step.latex}$$` : "";
          
          const prefijo = new RegExp(
            `^(?:${index + 1}[.)]\\s+)+(?=[\\p{L}¿¡])`,
            "u",
          );

          const texto = step.text.replace(prefijo, "");

          return `${index + 1}. ${texto}${formula}`;
        });
        
         return `### ${block.title}\n\n${steps.join("\n\n")}`;
       }
    }
  }).join("\n\n");
}