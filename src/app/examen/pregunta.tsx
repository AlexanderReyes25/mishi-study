// Una pregunta por pantalla, con retroalimentación inmediata en un panel inferior fijo.
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Page as Screen, Tag } from '../../components/MishiUI';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { RichText } from '../../components/MathText';
import { normalizeAnswer, type PlayableQuestion } from '../../services/exams';
import { useExam, type ExamRun } from '../../features/examenes/ExamProvider';
import { OptionButton, type OptionState } from '../../features/examenes/components/OptionButton';
import { FeedbackPanel } from '../../features/examenes/components/FeedbackPanel';
import { colors, font, spacing } from '../../theme';

export default function Pregunta() {
  const { run } = useExam();
  if (!run) return <Redirect href="/examen" />;
  const question = run.session.questions[run.index];
  // key: al cambiar de pregunta se reinicia la selección local
  return <QuestionView key={question.id} run={run} question={question} />;
}

function QuestionView({ run, question }: { run: ExamRun; question: PlayableQuestion }) {
  const { checkAnswer, goNext, finishExam } = useExam();
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const total = run.session.questions.length;
  const number = run.index + 1;
  const isLast = number === total;
  const answer = run.answers[question.id];
  const progress = ((run.index + (answer ? 1 : 0)) / total) * 100;

  function check() {
    if (!choice || checking || answer) return;
    setChecking(true);
    setCheckError(null);
    checkAnswer(question, choice)
      .catch((e: unknown) => {
        setCheckError(e instanceof Error ? e.message : 'No se pudo comprobar tu respuesta.');
      })
      .finally(() => setChecking(false));
  }

  function next() {
    if (!isLast) {
      goNext(question.id);
      return;
    }
    if (finishing) return; // doble toque
    setFinishing(true);
    setFinishError(null);
    finishExam()
      .then(() => router.replace('/examen/resultado'))
      .catch((e: unknown) => {
        setFinishError(e instanceof Error ? e.message : 'No se pudo guardar el examen.');
        setFinishing(false);
      });
  }

  function exit() {
    Alert.alert('¿Salir del examen?', 'Tus respuestas solo se guardan al terminar. Si sales ahora, se pierden.', [
      { text: 'Seguir respondiendo', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => router.dismissTo('/examen') },
    ]);
  }

  function optionLook(option: string): { state: OptionState; tags: string[] } {
    if (!answer) return { state: option === choice ? 'selected' : 'idle', tags: [] };
    const isCorrect = normalizeAnswer(option) === normalizeAnswer(answer.correctAnswer);
    const isMine = option === answer.userAnswer;
    const tags = [...(isCorrect ? ['Correcta'] : []), ...(isMine ? ['Tu respuesta'] : [])];
    return { state: isCorrect ? 'correct' : isMine ? 'wrong' : 'dimmed', tags };
  }

  return (
    <View style={styles.page}>
      <Screen title={`Pregunta ${number} de ${total}`} subtitle={run.session.title}>
        <ProgressBar value={progress} />
        <Tag label={question.topic} tone="coral"/>
        <Card><RichText text={question.question} color={colors.text} /></Card>
        <View style={styles.options} accessibilityRole="radiogroup">
          {question.options.map((option, i) => {
            const look = optionLook(option);
            return (
              <OptionButton
                key={`${i}-${option}`}
                label={option}
                state={look.state}
                tags={look.tags}
                locked={!!answer || checking}
                onPress={() => setChoice(option)}
              />
            );
          })}
        </View>
        {!answer ? <Button label="Salir del examen" variant="secondary" onPress={exit} disabled={checking} /> : null}
      </Screen>

      {answer ? (
        <FeedbackPanel
          answer={answer}
          isLast={isLast}
          busy={finishing}
          error={finishError}
          onContinue={next}
          bottomInset={insets.bottom}
        />
      ) : (
        <View style={[styles.bottom, { paddingBottom: spacing.lg + insets.bottom }]}>
          {checkError ? (
            <Text style={styles.error} accessibilityRole="alert">
              {checkError}
            </Text>
          ) : null}
          <Button label="Comprobar" onPress={check} disabled={!choice} loading={checking} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  topic: { fontSize: font.small, fontWeight: '800', color: colors.textMuted },
  options: { gap: spacing.md },
  bottom: {
    width: '100%', maxWidth: 760, alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: spacing.xs / 4,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  error: { fontSize: font.small, color: colors.error, fontWeight: '600' },
});
