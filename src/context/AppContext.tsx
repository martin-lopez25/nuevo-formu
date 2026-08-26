import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  MexicanEntity,
  MedicalUnit,
  QuestionAnswer,
  UnitGeneralData,
  UserRegistration,
  TurnType,
  ConflictData
} from '../types.ts';
import {
  saveLocalAnswer,
  getLocalAnswersForUnit,
  saveLocalGeneralData,
  getLocalGeneralData,
  addToSyncQueue,
  getPendingSyncQueue,
  removeSyncQueueItem,
  saveAppDraft,
  getAppDraft,
  makeAnswerKey,
  deleteLocalAnswersForUnit
} from '../services/db.ts';
import {
  checkServerHealth,
  saveSingleAnswer,
  saveUnitGeneral,
  syncBatchQueue,
  fetchUnitResponses,
  deleteUnitAnswers
} from '../services/api.ts';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';

export type AppSection = 'inicio' | 'instrucciones' | 'instrucciones_2' | 'formulario';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'sync';
  title: string;
  description?: string;
  duration?: number;
}

interface AppContextType {
  activeSection: AppSection;
  setActiveSection: (sec: AppSection) => void;
  selectedEntity: string | null;
  setSelectedEntity: (ent: string | null) => void;
  user: UserRegistration | null;
  setUser: (user: UserRegistration | null) => void;
  selectedUnit: MedicalUnit | null;
  setSelectedUnit: (unit: MedicalUnit | null) => void;
  isUnitLocked: boolean;
  setIsUnitLocked: (locked: boolean) => void;
  generalData: UnitGeneralData;
  answers: Record<string, QuestionAnswer>;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  editingCellKey: string | null;
  toasts: ToastMessage[];
  isDetailsModalOpen: boolean;
  setIsDetailsModalOpen: (open: boolean) => void;
  isZeroOfficesModalOpen: boolean;
  setIsZeroOfficesModalOpen: (open: boolean) => void;
  conflictData: ConflictData | null;
  setConflictData: (conflict: ConflictData | null) => void;

  // Actions
  handleSelectEntity: (entityName: string) => void;
  handleSaveUser: (userData: { name: string; email: string }) => void;
  handleSelectUnit: (unit: MedicalUnit) => Promise<void>;
  handleUnlockUnit: () => void;
  handleConfigureOffices: (count: number) => void;
  handleConfirmZeroOffices: () => Promise<void>;
  handleSetInternet: (status: 'SI' | 'NO' | 'PENDIENTE') => Promise<void>;
  handleSetEnabledOffices: (val: number) => Promise<void>;
  handleSetTurn: (officeNumber: number, turn: TurnType) => Promise<void>;
  handleSaveAnswer: (officeNumber: number, question: string, value: number | null) => Promise<void>;
  setEditingCell: (key: string | null) => void;
  addToast: (title: string, type?: ToastMessage['type'], description?: string) => void;
  removeToast: (id: string) => void;
  triggerManualSync: () => Promise<void>;
  resetQuestionnaireState: () => void;
  handleChangeEntity: () => void;

  // Progress metrics
  stats: {
    totalQuestions: number;
    answeredCount: number;
    pendingCount: number;
    progressPercentage: number;
    officeProgress: Record<number, { percentage: number; missing: number; total: number }>;
    isFullySaved: boolean;
  };
}

const defaultGeneralData: UnitGeneralData = {
  clues: '',
  hasInternet: 'PENDIENTE',
  enabledOffices: 1,
  unoperatedOffices: 0,
  configuredOffices: 1,
  turns: { 1: 'Matutino' },
  updatedAt: new Date().toISOString()
};

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<AppSection>('inicio');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [user, setUser] = useState<UserRegistration | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<MedicalUnit | null>(null);
  const [isUnitLocked, setIsUnitLocked] = useState<boolean>(false);
  const [generalData, setGeneralData] = useState<UnitGeneralData>(defaultGeneralData);
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isZeroOfficesModalOpen, setIsZeroOfficesModalOpen] = useState<boolean>(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const addToast = useCallback((title: string, type: ToastMessage['type'] = 'info', description?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, title, type, description, duration: 4000 }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check pending sync queue count
  const refreshPendingCount = useCallback(async () => {
    const queue = await getPendingSyncQueue();
    setPendingSyncCount(queue.length);
  }, []);

  // Synchronize pending queue items
  const triggerManualSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const isLive = await checkServerHealth();
      setIsOnline(isLive);
      if (!isLive) {
        addToast('No fue posible conectar con el servidor', 'error', 'El servidor aún no responde.');
        setIsSyncing(false);
        return;
      }

      const queue = await getPendingSyncQueue();
      if (queue.length === 0) {
        addToast('Sincronizado', 'success', 'Todos los datos están al día con la nube.');
        setIsSyncing(false);
        return;
      }

      addToast('Sincronizando...', 'sync', `Enviando ${queue.length} cambio(s) pendientes a la nube.`);
      const res = await syncBatchQueue(queue);

      if (res.success && res.data?.syncedIds) {
        for (const sId of res.data.syncedIds) {
          await removeSyncQueueItem(sId);
        }
        await refreshPendingCount();

        // Update in-memory answer statuses to saved_cloud
        setAnswers((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (next[k].status === 'local_only' || next[k].status === 'saving') {
              next[k] = { ...next[k], status: 'saved_cloud' };
            }
          });
          return next;
        });

        addToast('Sincronización completada', 'success', 'Todos los registros han sido confirmados en la nube.');
      } else {
        addToast('Error al sincronizar', 'warning', res.message || 'Algunos elementos no pudieron sincronizarse.');
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      addToast('Error de conexión', 'error', 'Los cambios continuarán protegidos en tu almacenamiento local.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, addToast, refreshPendingCount]);

  // Online / Offline event listeners + Health check periodic interval
  useEffect(() => {
    const handleOnline = async () => {
      const live = await checkServerHealth();
      setIsOnline(live);
      if (live) {
        addToast('Conexión reestablecida', 'success', 'Sincronizando cambios locales con la nube...');
        triggerManualSync();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast('Sin conexión a Internet', 'warning', 'Tus respuestas se guardarán de forma segura en este dispositivo.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const live = await checkServerHealth();
        setIsOnline(live);
      } else {
        setIsOnline(false);
      }
      refreshPendingCount();
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [addToast, triggerManualSync, refreshPendingCount]);

  // Load initial draft state on app boot
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const draft = await getAppDraft<{
          selectedEntity: string;
          user: UserRegistration;
          selectedUnit: MedicalUnit;
          isUnitLocked: boolean;
        }>('current_session');

        if (draft) {
          if (draft.selectedEntity) setSelectedEntity(draft.selectedEntity);
          if (draft.user) setUser(draft.user);
          if (draft.selectedUnit) {
            setSelectedUnit(draft.selectedUnit);
            setIsUnitLocked(draft.isUnitLocked ?? true);
            const localAns = await getLocalAnswersForUnit(draft.selectedUnit.clues);
            const gen = await getLocalGeneralData(draft.selectedUnit.clues);
            const serverRes = await fetchUnitResponses(draft.selectedUnit.clues);

            Object.entries(serverRes.answers).forEach(([key, serverAnswer]) => {
              if (!localAns[key] || localAns[key].status === 'saved_cloud') {
                localAns[key] = serverAnswer;
              }
            });

            setAnswers(localAns);
            if (gen || serverRes.general) {
              setGeneralData({
                ...defaultGeneralData,
                ...(gen || {}),
                ...(serverRes.general || {})
              });
            }
          }
        }
      } catch (err) {
        console.warn('Error restoring session draft:', err);
      }
    };
    restoreDraft();
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Handle entity selection
  const handleSelectEntity = useCallback((entityName: string) => {
    setSelectedEntity(entityName);
    setSelectedUnit(null);
    setIsUnitLocked(false);
    setAnswers({});
    setGeneralData(defaultGeneralData);
    saveAppDraft('current_session', {
      selectedEntity: entityName,
      user,
      selectedUnit: null,
      isUnitLocked: false
    });
  }, [user]);

  // Handle User Registration
  const handleSaveUser = useCallback((userData: { name: string; email: string }) => {
    if (!selectedEntity) return;
    const reg: UserRegistration = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      entity: selectedEntity,
      validatedAt: new Date().toISOString()
    };
    setUser(reg);
    saveAppDraft('current_session', { selectedEntity, user: reg, selectedUnit, isUnitLocked });
    addToast('Usuario registrado correctamente', 'success', `Bienvenido ${reg.name}`);
  }, [selectedEntity, selectedUnit, isUnitLocked, addToast]);

  // Handle Unit Selection with comprehensive preloading
  const handleSelectUnit = useCallback(async (unit: MedicalUnit) => {
    setSelectedUnit(unit);
    setIsUnitLocked(true);

    addToast('Cargando información de la unidad...', 'info', unit.name);

    // 1. Check local IndexedDB first
    const localAnswers = await getLocalAnswersForUnit(unit.clues);
    const localGeneral = await getLocalGeneralData(unit.clues);

    let mergedGeneral: UnitGeneralData = {
      clues: unit.clues,
      entidad: selectedEntity || unit.entity,
      usuarioNombre: user?.name || '',
      hasInternet: unit.hasInternet || 'PENDIENTE',
      enabledOffices: unit.enabledOffices ?? 1,
      unoperatedOffices: unit.unoperatedOffices ?? 0,
      configuredOffices: unit.totalOffices ?? unit.enabledOffices ?? 1,
      turns: { 1: 'Matutino' },
      updatedAt: new Date().toISOString()
    };

    if (localGeneral) {
      mergedGeneral = { ...mergedGeneral, ...localGeneral };
    }

    // 2. Query server for previous answers and configurations
    try {
      const serverRes = await fetchUnitResponses(unit.clues);
      if (serverRes.answers && Object.keys(serverRes.answers).length > 0) {
        // Merge without overwriting unsynced local pending answers
        Object.entries(serverRes.answers).forEach(([k, sAns]) => {
          if (!localAnswers[k] || localAnswers[k].status === 'saved_cloud') {
            localAnswers[k] = sAns;
          }
        });
      }
      if (serverRes.general) {
        mergedGeneral = {
          ...mergedGeneral,
          ...serverRes.general,
          entidad: selectedEntity || unit.entity,
          usuarioNombre: user?.name || serverRes.general.usuarioNombre || '',
          configuredOffices: serverRes.general.configuredOffices ?? mergedGeneral.configuredOffices
        };
      }
    } catch (err) {
      console.warn('Server fetch unit responses error:', err);
    }

    setGeneralData(mergedGeneral);
    setAnswers(localAnswers);
    await saveLocalGeneralData(mergedGeneral);

    saveAppDraft('current_session', {
      selectedEntity,
      user,
      selectedUnit: unit,
      isUnitLocked: true
    });

    addToast('Unidad médica cargada', 'success', `CLUES: ${unit.clues}`);
  }, [selectedEntity, user, addToast]);

  // Return to unit selection
  const handleUnlockUnit = useCallback(() => {
    setIsUnitLocked(false);
    setSelectedUnit(null);
    setAnswers({});
    setGeneralData(defaultGeneralData);
    saveAppDraft('current_session', {
      selectedEntity,
      user,
      selectedUnit: null,
      isUnitLocked: false
    });
    addToast('Cambio de unidad habilitado', 'info', 'Selecciona otra unidad médica.');
  }, [selectedEntity, user, addToast]);

  // Office configuration
  const handleConfigureOffices = useCallback((count: number) => {
    const safeCount = Math.max(0, Math.min(20, Math.floor(count)));
    if (safeCount === 0 && Object.keys(answers).length > 0) {
      setIsZeroOfficesModalOpen(true);
      return;
    }
    setGeneralData((prev) => {
      const newTurns = { ...prev.turns };
      if (safeCount === 0) {
        Object.keys(newTurns).forEach((key) => delete newTurns[Number(key)]);
      }
      for (let i = 1; i <= safeCount; i++) {
        if (!newTurns[i]) newTurns[i] = 'Matutino';
      }
      const updated: UnitGeneralData = {
        ...prev,
        entidad: selectedEntity || selectedUnit?.entity || prev.entidad,
        usuarioNombre: user?.name || prev.usuarioNombre || '',
        configuredOffices: safeCount,
        turns: newTurns,
        updatedAt: new Date().toISOString()
      };
      saveLocalGeneralData(updated);
      if (selectedUnit) {
        saveUnitGeneral(selectedUnit.clues, updated)
          .then(() => addToast(`Consultorios para captura guardados: ${safeCount}`, 'success'))
          .catch(() => {
            addToSyncQueue({
              action: 'save_general',
              clues: selectedUnit.clues,
              payload: updated
            });
            refreshPendingCount();
            addToast('Consultorios guardados localmente', 'warning', 'Se sincronizarán al reconectar.');
          });
      }
      return updated;
    });
  }, [selectedUnit, selectedEntity, user, answers, addToast, refreshPendingCount]);

  const handleConfirmZeroOffices = useCallback(async () => {
    if (!selectedUnit) return;
    try {
      await deleteUnitAnswers(selectedUnit.clues);
      await deleteLocalAnswersForUnit(selectedUnit.clues);
      const updated: UnitGeneralData = {
        ...generalData,
        entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
        usuarioNombre: user?.name || generalData.usuarioNombre || '',
        configuredOffices: 0,
        turns: {},
        updatedAt: new Date().toISOString()
      };
      await saveUnitGeneral(selectedUnit.clues, updated);
      await saveLocalGeneralData(updated);
      setGeneralData(updated);
      setAnswers({});
      setIsZeroOfficesModalOpen(false);
      await refreshPendingCount();
      addToast('Respuestas eliminadas', 'success', 'La unidad quedó configurada con 0 consultorios.');
    } catch (error) {
      addToast('No se eliminaron las respuestas', 'error', 'La base de datos no confirmó la operación. Intenta nuevamente.');
    }
  }, [selectedUnit, selectedEntity, user, generalData, addToast, refreshPendingCount]);

  // General fields update
  const handleSetInternet = useCallback(async (status: 'SI' | 'NO' | 'PENDIENTE') => {
    if (!selectedUnit) return;
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      hasInternet: status,
      updatedAt: new Date().toISOString()
    };
    setGeneralData(updated);
    await saveLocalGeneralData(updated);
    try {
      await saveUnitGeneral(selectedUnit.clues, updated);
      addToast('Servicio de Internet actualizado', 'success');
    } catch {
      await addToSyncQueue({ action: 'save_general', clues: selectedUnit.clues, payload: updated });
      refreshPendingCount();
      addToast('Internet guardado localmente', 'warning', 'Se sincronizará al reconectar.');
    }
  }, [selectedUnit, selectedEntity, user, generalData, addToast, refreshPendingCount]);

  const handleSetEnabledOffices = useCallback(async (val: number) => {
    if (!selectedUnit) return;
    const safe = Math.max(0, Math.floor(val));
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      enabledOffices: safe,
      updatedAt: new Date().toISOString()
    };
    setGeneralData(updated);
    await saveLocalGeneralData(updated);
    try {
      await saveUnitGeneral(selectedUnit.clues, updated);
      addToast(`Consultorios habilitados guardados: ${safe}`, 'success');
    } catch {
      await addToSyncQueue({ action: 'save_general', clues: selectedUnit.clues, payload: updated });
      refreshPendingCount();
      addToast('Consultorios habilitados guardados localmente', 'warning', 'Se sincronizarán al reconectar.');
    }
  }, [selectedUnit, selectedEntity, user, generalData, addToast, refreshPendingCount]);

  // Turn selection for an office
  const handleSetTurn = useCallback(async (officeNumber: number, turn: TurnType) => {
    if (!selectedUnit) return;
    const newTurns = { ...generalData.turns, [officeNumber]: turn };
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      turns: newTurns,
      updatedAt: new Date().toISOString()
    };
    setGeneralData(updated);
    await saveLocalGeneralData(updated);

    const updatedAnswers: Record<string, QuestionAnswer> = { ...answers };
    Object.keys(updatedAnswers).forEach((key) => {
      if (updatedAnswers[key].officeNumber === officeNumber) {
        updatedAnswers[key] = { ...updatedAnswers[key], turn };
      }
    });
    setAnswers(updatedAnswers);
    await Promise.all(
      Object.values(updatedAnswers)
        .filter((answer) => answer.officeNumber === officeNumber)
        .map(saveLocalAnswer)
    );

    try {
      await saveUnitGeneral(selectedUnit.clues, updated);
      addToast(`Turno ${turn} guardado para C${officeNumber}`, 'success');
    } catch {
      await addToSyncQueue({ action: 'save_general', clues: selectedUnit.clues, payload: updated });
      refreshPendingCount();
      addToast(`Turno C${officeNumber} guardado localmente`, 'warning');
    }
  }, [selectedUnit, selectedEntity, user, generalData, answers, addToast, refreshPendingCount]);

  // Save Single Cell Answer (Enter key or Save button)
  const handleSaveAnswer = useCallback(async (officeNumber: number, question: string, value: number | null) => {
    if (!selectedUnit || !user || !selectedEntity) return;

    const cellKey = `${officeNumber}__${question}`;
    const previous = answers[cellKey];

    // Optimistic local update
    const newAnswer: QuestionAnswer = {
      clues: selectedUnit.clues,
      officeNumber,
      question,
      value,
      status: 'saving',
      turn: generalData.turns[officeNumber] || 'Matutino',
      updatedAt: new Date().toISOString(),
      version: (previous?.version || 0) + 1
    };

    setAnswers((prev) => ({ ...prev, [cellKey]: newAnswer }));
    await saveLocalAnswer(newAnswer);
    setEditingCellKey(null);

    const payload = {
      entidad: selectedEntity,
      usuarioNombre: user.name,
      usuarioEmail: user.email,
      clues: selectedUnit.clues,
      nombreUnidad: selectedUnit.name,
      categoria: selectedUnit.category || 'Sin categoría',
      numeroConsultorios: generalData.configuredOffices,
      numeroConsultorio: officeNumber,
      pregunta: question,
      valor: value,
      turno: generalData.turns[officeNumber] || 'Matutino',
      version: newAnswer.version
    };

    try {
      const res = await saveSingleAnswer(payload);
      if (res.success) {
        const cloudSaved: QuestionAnswer = {
          ...newAnswer,
          status: 'saved_cloud',
          syncedAt: res.serverTimestamp || new Date().toISOString()
        };
        setAnswers((prev) => ({ ...prev, [cellKey]: cloudSaved }));
        await saveLocalAnswer(cloudSaved);
        addToast('Respuesta guardada correctamente.', 'success', `${question} (C${officeNumber}) = ${value ?? 'PENDIENTE'}`);
      } else {
        throw new Error(res.message || 'Error del servidor');
      }
    } catch (err: any) {
      console.warn('API save failed, queued locally:', err);
      const localOnly: QuestionAnswer = {
        ...newAnswer,
        status: 'local_only'
      };
      setAnswers((prev) => ({ ...prev, [cellKey]: localOnly }));
      await saveLocalAnswer(localOnly);
      await addToSyncQueue({
        action: 'save_answer',
        clues: selectedUnit.clues,
        payload
      });
      await refreshPendingCount();
      addToast(
        'Respuesta almacenada localmente.',
        'warning',
        'Estamos teniendo fallas de conexión con el servidor. Si nota que alguna pregunta no se llena, vuelva a intentar.'
      );
    }
  }, [selectedUnit, user, selectedEntity, answers, generalData, addToast, refreshPendingCount]);

  const setEditingCell = useCallback((key: string | null) => {
    setEditingCellKey(key);
  }, []);

  const handleChangeEntity = useCallback(() => {
    setSelectedEntity(null);
    setSelectedUnit(null);
    setIsUnitLocked(false);
    setAnswers({});
    setGeneralData(defaultGeneralData);
    saveAppDraft('current_session', {
      selectedEntity: null,
      user,
      selectedUnit: null,
      isUnitLocked: false
    });
    addToast('Seleccione un nuevo estado', 'info');
  }, [user, addToast]);

  const resetQuestionnaireState = useCallback(() => {
    setSelectedEntity(null);
    setSelectedUnit(null);
    setIsUnitLocked(false);
    setAnswers({});
    setGeneralData(defaultGeneralData);
    saveAppDraft('current_session', {
      selectedEntity: null,
      user,
      selectedUnit: null,
      isUnitLocked: false
    });
  }, [user]);

  // Calculate Progress Stats
  const totalQuestions = generalData.configuredOffices * EQUIPMENT_CATALOG.length;
  let answeredCount = 0;
  const officeProgress: Record<number, { percentage: number; missing: number; total: number }> = {};

  for (let c = 1; c <= generalData.configuredOffices; c++) {
    let cAnswered = 0;
    EQUIPMENT_CATALOG.forEach((q) => {
      const ans = answers[`${c}__${q.name}`];
      if (ans && ans.value !== null && ans.value !== undefined) {
        cAnswered++;
        answeredCount++;
      }
    });
    const cTotal = EQUIPMENT_CATALOG.length;
    const cPercent = cTotal > 0 ? (cAnswered / cTotal) * 100 : 0;
    officeProgress[c] = {
      percentage: Number(cPercent.toFixed(1)),
      missing: cTotal - cAnswered,
      total: cTotal
    };
  }

  const progressPercentage = totalQuestions > 0 ? Number(((answeredCount / totalQuestions) * 100).toFixed(1)) : 0;
  const pendingCount = totalQuestions - answeredCount;
  const isFullySaved = totalQuestions > 0 && answeredCount === totalQuestions;

  return (
    <AppContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedEntity,
        setSelectedEntity,
        user,
        setUser,
        selectedUnit,
        setSelectedUnit,
        isUnitLocked,
        setIsUnitLocked,
        generalData,
        answers,
        isOnline,
        isSyncing,
        pendingSyncCount,
        editingCellKey,
        toasts,
        isDetailsModalOpen,
        setIsDetailsModalOpen,
        isZeroOfficesModalOpen,
        setIsZeroOfficesModalOpen,
        conflictData,
        setConflictData,
        handleSelectEntity,
        handleSaveUser,
        handleSelectUnit,
        handleUnlockUnit,
        handleConfigureOffices,
        handleConfirmZeroOffices,
        handleSetInternet,
        handleSetEnabledOffices,
        handleSetTurn,
        handleSaveAnswer,
        setEditingCell,
        addToast,
        removeToast,
        triggerManualSync,
        resetQuestionnaireState,
        handleChangeEntity,
        stats: {
          totalQuestions,
          answeredCount,
          pendingCount,
          progressPercentage,
          officeProgress,
          isFullySaved
        }
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
