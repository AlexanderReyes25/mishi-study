import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import {
  MaterialItem,
  deleteMaterial,
  getMaterialsList,
  processMaterialTopics,
  updateRawText,
  uploadImage,
  uploadPdf,
  uploadRawText,
} from '../../features/materiales/materials.service';
import { useSession } from '../../services/session';
import { colors, font } from '../../theme';

type FilterType = 'all' | 'pdf' | 'text' | 'ready';

export default function MaterialesScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Modal para apunte de texto nuevo
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [rawText, setRawText] = useState('');

  // Modal para ver / editar / eliminar material
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!userId) return;
    try {
      if (!silent) setLoading(true);
      const data = await getMaterialsList(userId);
      setMaterials(data);
    } catch (err: any) {
      if (!silent) {
        Alert.alert('Error', err.message || 'No se pudieron cargar los materiales');
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling automático mientras existan materiales pendientes o en proceso
  useEffect(() => {
    const hasActiveProcessing = materials.some(
      (m) => m.status === 'processing' || m.status === 'pending'
    );
    if (!hasActiveProcessing) return;

    const interval = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [materials, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handlePostUpload = async (materialId: string | null) => {
    if (!materialId) return;
    await loadData(true);
    try {
      await processMaterialTopics(materialId);
      await loadData(true);
    } catch (e: any) {
      console.warn('Error procesando IA:', e.message);
      Alert.alert(
        'Aviso de análisis',
        'El material se guardó, pero la IA no pudo extraer temas. Puedes editarlo para ampliar el contenido.'
      );
      await loadData(true);
    }
  };

  const handleUploadPdf = async () => {
    if (!userId) return;
    try {
      setUploading(true);
      const id = await uploadPdf(userId);
      if (id) {
        Alert.alert('Éxito', 'Documento PDF subido correctamente.');
        await handlePostUpload(id);
      }
    } catch (err: any) {
      Alert.alert('Error al subir PDF', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImage = async (source: 'camera' | 'library') => {
    if (!userId) return;
    try {
      setUploading(true);
      const id = await uploadImage(userId, source);
      if (id) {
        Alert.alert('Éxito', 'Imagen subida correctamente.');
        await handlePostUpload(id);
      }
    } catch (err: any) {
      Alert.alert('Error al subir imagen', err.message);
    } finally {
      setUploading(false);
    }
  };

  const wordCount = useMemo(() => {
    const clean = rawText.trim();
    return clean ? clean.split(/\s+/).length : 0;
  }, [rawText]);

  const handleUploadText = async () => {
    if (!userId) return;
    if (!textTitle.trim()) {
      Alert.alert('Falta título', 'Por favor ingresa un título para el material.');
      return;
    }
    if (!rawText.trim()) {
      Alert.alert('Texto vacío', 'Por favor ingresa el contenido de tus notas.');
      return;
    }

    try {
      setUploading(true);
      const id = await uploadRawText(userId, textTitle, rawText);
      setTextModalVisible(false);
      setTextTitle('');
      setRawText('');
      Alert.alert('Éxito', 'Apunte de texto guardado.');
      await handlePostUpload(id);
    } catch (err: any) {
      Alert.alert('Error al guardar texto', err.message);
    } finally {
      setUploading(false);
    }
  };

  const openDetail = (item: MaterialItem) => {
    setSelectedMaterial(item);
    setEditTitle(item.title);
    setEditText(item.raw_text ?? '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedMaterial) return;
    try {
      setActionLoading(true);
      await updateRawText(selectedMaterial.id, editTitle, editText);
      Alert.alert('Actualizado', 'Material actualizado. Se volverá a procesar con la IA.');
      const matId = selectedMaterial.id;
      setSelectedMaterial(null);
      await handlePostUpload(matId);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryAi = async () => {
    if (!selectedMaterial) return;
    try {
      setActionLoading(true);
      await processMaterialTopics(selectedMaterial.id);
      Alert.alert('Éxito', 'Temas detectados correctamente.');
      setSelectedMaterial(null);
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Aviso', err.message || 'No se pudieron extraer temas.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedMaterial) return;
    Alert.alert(
      'Eliminar material',
      `¿Seguro que deseas eliminar "${selectedMaterial.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await deleteMaterial(selectedMaterial.id, selectedMaterial.file_path);
              setSelectedMaterial(null);
              await loadData(true);
              Alert.alert('Eliminado', 'El material ha sido eliminado.');
            } catch (err: any) {
              Alert.alert('Error al eliminar', err.message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      if (activeFilter === 'pdf') return item.file_type === 'pdf';
      if (activeFilter === 'text') return item.file_type === 'text';
      if (activeFilter === 'ready') return item.status === 'ready';
      return true;
    });
  }, [materials, activeFilter]);

  const renderBadge = (status: MaterialItem['status']) => {
    if (status === 'processing') {
      return (
        <View style={[styles.badge, { backgroundColor: '#FFF8E1', flexDirection: 'row', gap: 4 }]}>
          <ActivityIndicator size={10} color="#F57F17" />
          <Text style={[styles.badgeText, { color: '#F57F17' }]}>Analizando...</Text>
        </View>
      );
    }

    const config = {
      ready: { bg: '#E8F5E9', text: '#2E7D32', label: 'Listo' },
      pending: { bg: '#E1F5FE', text: '#0288D1', label: 'Pendiente' },
      error: { bg: '#FFEBEE', text: '#C62828', label: 'Error' },
    }[status] ?? { bg: '#EEE', text: '#666', label: status };

    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
      </View>
    );
  };

  return (
    <Screen title="Materiales" subtitle="Sube apuntes, guías y fotos para que la IA los procese">
      <Card>
        <Text style={styles.sectionTitle}>Subir nuevo material</Text>
        {uploading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Subiendo archivo...</Text>
          </View>
        ) : (
          <View style={styles.actionsGrid}>
            <View style={styles.buttonWrapper}>
              <Button label="📄 Subir PDF" onPress={handleUploadPdf} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button label="📷 Cámara" onPress={() => handleUploadImage('camera')} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button label="🖼️ Galería" onPress={() => handleUploadImage('library')} />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                label="✍️ Pegar texto"
                variant="secondary"
                onPress={() => setTextModalVisible(true)}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Barra de Filtros Rápidos */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Tus materiales ({filteredMaterials.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'pdf', label: '📄 PDFs' },
              { id: 'text', label: '✍️ Textos' },
              { id: 'ready', label: '✅ Listos' },
            ] as const
          ).map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
              >
                <Text
                  style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : filteredMaterials.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            {activeFilter === 'all'
              ? 'No tienes materiales subidos todavía. Presiona una opción de arriba para comenzar.'
              : 'No hay materiales que coincidan con este filtro.'}
          </Text>
        </Card>
      ) : (
        <View style={styles.materialsList}>
          {filteredMaterials.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => openDetail(item)}
            >
              <Card>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemSubtitle}>
                      Tipo: {item.file_type.toUpperCase()} •{' '}
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                    {item.topics && item.topics.length > 0 && (
                      <Text style={styles.topicsText}>
                        Temas: {item.topics.slice(0, 3).join(', ')}
                        {item.topics.length > 3 ? '...' : ''}
                      </Text>
                    )}
                  </View>
                  {renderBadge(item.status)}
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Modal: Crear apunte de texto */}
      <Modal visible={textModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo apunte de texto</Text>

            <Text style={styles.inputLabel}>Título del material</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Resumen Cálculo II"
              value={textTitle}
              onChangeText={setTextTitle}
            />

            <View style={styles.rowBetween}>
              <Text style={styles.inputLabel}>Contenido del apunte</Text>
              <Text
                style={[
                  styles.counterText,
                  wordCount < 15 && rawText.length > 0 && styles.counterWarning,
                ]}
              >
                {wordCount} palabras {wordCount < 15 && rawText.length > 0 ? '(muy corto)' : ''}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Pega aquí el contenido, notas o temario..."
              value={rawText}
              onChangeText={setRawText}
              multiline
              numberOfLines={6}
            />

            <View style={styles.modalButtons}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Button
                  label="Cancelar"
                  variant="secondary"
                  onPress={() => setTextModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Button label="Guardar" onPress={handleUploadText} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Detalle, Edición y Eliminación */}
      <Modal visible={!!selectedMaterial} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            {selectedMaterial && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <Text style={styles.modalTitle}>
                    {isEditing ? 'Editar material' : selectedMaterial.title}
                  </Text>
                  {renderBadge(selectedMaterial.status)}
                </View>

                {isEditing ? (
                  <View>
                    <Text style={styles.inputLabel}>Título</Text>
                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                    />

                    <Text style={styles.inputLabel}>Contenido</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaLarge]}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                    />

                    <View style={styles.modalButtons}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Button
                          label="Cancelar"
                          variant="secondary"
                          onPress={() => setIsEditing(false)}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Button
                          label={actionLoading ? 'Guardando...' : 'Guardar y analizar'}
                          onPress={handleSaveEdit}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.itemSubtitle}>
                      Tipo: {selectedMaterial.file_type.toUpperCase()} • Fecha:{' '}
                      {new Date(selectedMaterial.created_at).toLocaleString()}
                    </Text>

                    {selectedMaterial.topics && selectedMaterial.topics.length > 0 && (
                      <View style={styles.topicsBox}>
                        <Text style={styles.topicsHeader}>Temas detectados por IA:</Text>
                        {selectedMaterial.topics.map((top, idx) => (
                          <Text key={idx} style={styles.topicBullet}>
                            • {top}
                          </Text>
                        ))}
                      </View>
                    )}

                    {selectedMaterial.raw_text ? (
                      <View style={styles.contentBox}>
                        <Text style={styles.inputLabel}>Contenido:</Text>
                        <Text style={styles.contentText}>{selectedMaterial.raw_text}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.emptyText, { textAlign: 'left', marginVertical: 8 }]}>
                        Este material es un archivo ({selectedMaterial.file_type}).
                      </Text>
                    )}

                    <View style={{ marginTop: 16, gap: 8 }}>
                      {selectedMaterial.file_type === 'text' && (
                        <Button
                          label="✏️ Editar contenido"
                          variant="secondary"
                          onPress={() => setIsEditing(true)}
                        />
                      )}

                      {selectedMaterial.status === 'error' && (
                        <Button
                          label={actionLoading ? 'Reintentando...' : '🔄 Reintentar análisis IA'}
                          onPress={handleRetryAi}
                        />
                      )}

                      <Button
                        label={actionLoading ? 'Eliminando...' : '🗑️ Eliminar material'}
                        variant="secondary"
                        onPress={handleDelete}
                      />

                      <Button
                        label="Cerrar"
                        variant="secondary"
                        onPress={() => setSelectedMaterial(null)}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: font.subtitle,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  actionsGrid: {
    gap: 8,
  },
  buttonWrapper: {
    marginVertical: 2,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    fontSize: font.small,
    color: colors.neutral ?? '#666',
  },
  listHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ECEFF1',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  materialsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: font.small,
    color: colors.neutral ?? '#666',
    marginTop: 2,
  },
  topicsText: {
    fontSize: font.small,
    color: colors.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: font.body,
    color: colors.neutral ?? '#666',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  counterText: {
    fontSize: 11,
    color: colors.neutral ?? '#888',
  },
  counterWarning: {
    color: '#D84315',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    fontSize: font.body,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 180,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  topicsBox: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  topicsHeader: {
    fontSize: font.small,
    fontWeight: '700',
    color: colors.primaryDark ?? '#000',
    marginBottom: 4,
  },
  topicBullet: {
    fontSize: font.small,
    color: colors.text,
    marginLeft: 4,
    marginVertical: 1,
  },
  contentBox: {
    marginVertical: 8,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  contentText: {
    fontSize: font.body,
    color: colors.text,
    lineHeight: 20,
  },
});