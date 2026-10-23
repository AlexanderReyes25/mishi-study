import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../theme';
export type MishiIcon = ComponentProps<typeof Ionicons>['name'];
export function IconTile({ icon, tone = 'soft', small = false }: { icon: MishiIcon; tone?: 'soft' | 'coral' | 'lime' | 'dark'; small?: boolean }) {
  const backgroundColor = { soft: colors.surface, coral: colors.coralSoft, lime: colors.successSoft, dark: colors.primarySoft }[tone];
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[ui.iconTile, { backgroundColor }, small && { width: 36, height: 36, borderRadius: 12 }]}><Ionicons name={icon} size={small ? 18 : 24} color={tone === 'dark' ? colors.white : colors.primary} /></View>;
}
export function Page({ title, eyebrow = 'MISHI STUDY', subtitle, children, action, footer, inStack = false }: { title: string; eyebrow?: string; subtitle?: string; children: ReactNode; action?: ReactNode; footer?: ReactNode; inStack?: boolean }) {
  return <SafeAreaView style={ui.page} edges={inStack ? ['left', 'right', 'bottom'] : ['top', 'left', 'right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
    <View style={ui.hero}><View style={ui.headingRow}><View style={{ flex: 1, gap: spacing.md }}><Text style={ui.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={ui.pageTitle}>{title}</Text></View>{action}</View>{subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : null}</View>
    <View style={ui.content}>{children}{footer}</View></ScrollView></SafeAreaView>;
}
export function IconButton({ icon, label, onPress, light = false, disabled = false }: { icon: MishiIcon; label: string; onPress: () => void; light?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.iconButton, light && { backgroundColor: colors.primarySoft }, (pressed || disabled) && { opacity: 0.5 }]}><Ionicons name={icon} size={22} color={light ? colors.white : colors.primary} /></Pressable>;
}
export function SectionHeading({ title, detail }: { title: string; detail?: string }) { return <View style={ui.headingRow}><Text style={ui.sectionTitle}>{title}</Text>{detail ? <Text style={ui.caption}>{detail}</Text> : null}</View>; }
export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'error' | 'coral' }) {
  const bg = { neutral: colors.neutralSoft, success: colors.successSoft, error: colors.errorSoft, coral: colors.coralSoft }[tone];
  return <View style={[ui.tag, { backgroundColor: bg }]}><Text style={[ui.tagText, tone === 'error' && { color: colors.error }]}>{label}</Text></View>;
}
export function EmptyState({ icon, title, description, children }: { icon: MishiIcon; title: string; description: string; children?: ReactNode }) {
  return <View style={ui.empty}><IconTile icon={icon} tone="lime" /><Text style={ui.emptyTitle}>{title}</Text><Text style={[ui.body, { textAlign: 'center' }]}>{description}</Text>{children}</View>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) { return <View style={[ui.notice, error && { backgroundColor: colors.errorSoft }]}><Ionicons name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={20} color={error ? colors.error : colors.primary} /><Text selectable accessibilityLiveRegion="polite" style={[ui.caption, { flex: 1 }, error && { color: colors.error }]}>{text}</Text></View>; }
export function BusyLine({ text }: { text: string }) { return <View style={ui.notice}><ActivityIndicator color={colors.primary} /><Text style={[ui.body, { flex: 1 }]} accessibilityLiveRegion="polite">{text}</Text></View>; }
export function Sheet({ visible, title, subtitle, onClose, busy = false, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}><KeyboardAvoidingView style={ui.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <SafeAreaView style={ui.sheet} edges={['bottom']}><View style={ui.handle} /><View style={ui.sheetHeader}><Text style={[ui.sectionTitle, { flex: 1 }]}>{title}</Text><IconButton icon="close" label="Cerrar ventana" onPress={onClose} disabled={busy} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.sheetContent}>{subtitle ? <Text style={ui.body}>{subtitle}</Text> : null}{children}</ScrollView></SafeAreaView>
  </KeyboardAvoidingView></Modal>;
}
export function ChoiceTile({ icon, title, description, onPress, disabled = false }: { icon: MishiIcon; title: string; description: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} accessibilityRole="button" onPress={onPress} accessibilityLabel={title + '. ' + description} style={({ pressed }) => [ui.choice, (pressed || disabled) && { opacity: 0.55 }]}><IconTile icon={icon} tone="coral" /><View style={{ flex: 1, gap: spacing.xs }}><Text style={ui.label}>{title}</Text><Text style={ui.caption}>{description}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>;
}
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.primary }, scroll: { flexGrow: 1, backgroundColor: colors.canvas },
  hero: { backgroundColor: colors.primary, padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }, pageTitle: { color: colors.white, fontSize: font.big, fontWeight: '800', letterSpacing: -0.7 },
  eyebrow: { color: colors.success, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, subtitle: { color: colors.neutralSoft, fontSize: 15, lineHeight: 23, maxWidth: 540 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 760, alignSelf: 'center' }, headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, sectionTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.primaryDark, flexShrink: 1 },
  label: { color: colors.primaryDark, fontSize: font.body, fontWeight: '700' }, body: { color: colors.textMuted, fontSize: 15, lineHeight: 23 }, caption: { color: colors.textMuted, fontSize: font.small, lineHeight: 19 },
  iconTile: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, iconButton: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }, tagText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  empty: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md }, emptyTitle: { fontSize: font.subtitle, color: colors.primaryDark, fontWeight: '700', textAlign: 'center' },
  notice: { backgroundColor: colors.successSoft, padding: spacing.lg, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  field: { minHeight: 54, backgroundColor: colors.surface, color: colors.primaryDark, fontSize: font.body, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg },
  scrim: { flex: 1, backgroundColor: '#10242DB8', justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 720, maxHeight: '92%', alignSelf: 'center', backgroundColor: colors.canvas, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.md }, sheetHeader: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, sheetContent: { padding: spacing.xl, gap: spacing.lg },
  choice: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: 84 }, row: { flexDirection: 'row', gap: spacing.md }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
