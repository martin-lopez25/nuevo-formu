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
  saveLocalGeneralData,
  getLocalGeneralData,
  getLocalAnswersForUnit,
  replaceLocalAnswersForUnit,
  addToSyncQueue,
  getPendingSyncQueue,
  removeSyncQueueItem,
  saveAppDraft,
  getAppDraft,
  makeAnswerKey,
  deleteLocalAnswersForUnit,
  deleteLocalTurnSchedules
} from '../services/db.ts';
import {
  checkServerHealth,
  saveSingleAnswer,
  saveUnitGeneral,
  syncBatchQueue,
  fetchUnitResponses,
  deleteUnitAnswers,
  deleteOfficeTurnSchedules
} from '../services/api.ts';
import { EQUIPMENT_CATALOG } from '../data/equipmentCatalog.ts';
import {
  DISABLED_CAUSE_CONFIRMATION_QUESTION,
  getRequiredOfficeConfigurationQuestions,
  isDoctorAvailabilityQuestion,
  isOfficeScheduleQuestion,
  OFFICE_ENABLED_QUESTION,
  TURN_SELECTION_QUESTION,
  type OperationalTurn
} from '../data/officeConfiguration.ts';

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
  completedUnitName: string | null;
  setCompletedUnitName: (name: string | null) => void;
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
  handleSetGeneralOfficeAvailability: (
    status: 'SI' | 'NO',
    enabledOffices: number | null,
    unoperatedOffices: number | null
  ) => Promise<void>;
  handleSetTurn: (officeNumber: number, turn: TurnType) => Promise<void>;
  handleSaveAnswer: (officeNumber: number, question: string, value: number, silentSuccess?: boolean) => Promise<void>;
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
  hasTemporarilyClosedOffices: 'PENDIENTE',
  enabledOffices: null,
  unoperatedOffices: null,
  totalGeneralOffices: null,
  configuredOffices: null,
  turns: {},
  updatedAt: new Date().toISOString()
};

function isQuestionnaireComplete(
  data: UnitGeneralData,
  currentAnswers: Record<string, QuestionAnswer>
) {
  const officeCount = data.configuredOffices ?? 0;
  if (officeCount <= 0) return false;

  return Array.from({ length: officeCount }, (_, index) => index + 1).every((officeNumber) => {
    const enabledAnswer = currentAnswers[`${officeNumber}__${OFFICE_ENABLED_QUESTION}`];
    const requiredQuestions = [
      ...getRequiredOfficeConfigurationQuestions(data.turns[officeNumber] || '', enabledAnswer?.value),
      ...(enabledAnswer?.value === 1 ? EQUIPMENT_CATALOG.map((item) => item.name) : [])
    ];
    return requiredQuestions.every((question) => {
      if (question === TURN_SELECTION_QUESTION) return Boolean(data.turns[officeNumber]);
      if (question === DISABLED_CAUSE_CONFIRMATION_QUESTION) {
        return currentAnswers[`${officeNumber}__${question}`]?.value === 1;
      }
      if (isDoctorAvailabilityQuestion(question) || isOfficeScheduleQuestion(question)) return true;
      const answer = currentAnswers[`${officeNumber}__${question}`];
      return answer?.value !== null && answer?.value !== undefined;
    });
  });
}

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
  const [completedUnitName, setCompletedUnitName] = useState<string | null>(null);
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
            try {
              const serverRes = await fetchUnitResponses(draft.selectedUnit.clues);
              const serverGeneral = {
                ...defaultGeneralData,
                clues: draft.selectedUnit.clues,
                entidad: draft.selectedEntity || draft.selectedUnit.entity,
                usuarioNombre: draft.user?.name || '',
                ...(serverRes.general || {}),
                nombreUnidad: draft.selectedUnit.name || serverRes.general?.nombreUnidad || '',
                usuarioEmail: draft.user?.email || serverRes.general?.usuarioEmail || ''
              };
              setAnswers(serverRes.answers || {});
              setGeneralData(serverGeneral);
              await Promise.all([
                saveLocalGeneralData(serverGeneral),
                replaceLocalAnswersForUnit(draft.selectedUnit.clues, serverRes.answers || {})
              ]);
            } catch (serverError) {
              console.warn('Server unavailable while restoring draft:', serverError);
              const [localGeneral, localAnswers] = await Promise.all([
                getLocalGeneralData(draft.selectedUnit.clues),
                getLocalAnswersForUnit(draft.selectedUnit.clues)
              ]);
              setAnswers(localAnswers);
              setGeneralData({
                ...defaultGeneralData,
                clues: draft.selectedUnit.clues,
                entidad: draft.selectedEntity || draft.selectedUnit.entity,
                usuarioNombre: draft.user?.name || '',
                ...(localGeneral || {}),
                nombreUnidad: draft.selectedUnit.name || localGeneral?.nombreUnidad || '',
                usuarioEmail: draft.user?.email || localGeneral?.usuarioEmail || ''
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

    const baseGeneral: UnitGeneralData = {
      clues: unit.clues,
      entidad: selectedEntity || unit.entity,
      nombreUnidad: unit.name,
      usuarioNombre: user?.name || '',
      usuarioEmail: user?.email || '',
      hasInternet: unit.hasInternet || 'PENDIENTE',
      hasTemporarilyClosedOffices: 'PENDIENTE',
      enabledOffices: unit.enabledOffices ?? null,
      unoperatedOffices: unit.unoperatedOffices ?? null,
      totalGeneralOffices: unit.enabledOffices === undefined
        ? null
        : unit.enabledOffices + (unit.unoperatedOffices ?? 0),
      configuredOffices: unit.totalOffices ?? null,
      turns: {},
      updatedAt: new Date().toISOString()
    };

    let loadedGeneral = baseGeneral;
    let loadedAnswers: Record<string, QuestionAnswer> = {};
    try {
      const serverRes = await fetchUnitResponses(unit.clues);
      loadedAnswers = serverRes.answers || {};
      if (serverRes.general) {
        loadedGeneral = {
          ...baseGeneral,
          ...serverRes.general,
          entidad: selectedEntity || unit.entity,
          nombreUnidad: unit.name || serverRes.general.nombreUnidad || '',
          usuarioNombre: user?.name || serverRes.general.usuarioNombre || '',
          usuarioEmail: user?.email || serverRes.general.usuarioEmail || ''
        };
      }
      await Promise.all([
        saveLocalGeneralData(loadedGeneral),
        replaceLocalAnswersForUnit(unit.clues, loadedAnswers)
      ]);
    } catch (serverError) {
      console.warn('Server unavailable; loading local unit data:', serverError);
      const [localGeneral, localAnswers] = await Promise.all([
        getLocalGeneralData(unit.clues),
        getLocalAnswersForUnit(unit.clues)
      ]);
      loadedGeneral = { ...baseGeneral, ...(localGeneral || {}) };
      loadedAnswers = localAnswers;
      addToast('Modo sin conexión', 'warning', 'Se muestran los datos guardados localmente.');
    }

    setGeneralData(loadedGeneral);
    setAnswers(loadedAnswers);

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

  const finishCompletedUnit = useCallback((unitName: string) => {
    setCompletedUnitName(unitName);
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
    addToast('Unidad completada', 'success', `${unitName}. Seleccione la siguiente unidad médica.`);
    setTimeout(() => {
      document.getElementById('unit-selector')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
        if (newTurns[i] === undefined) newTurns[i] = '';
      }
      const updated: UnitGeneralData = {
        ...prev,
        entidad: selectedEntity || selectedUnit?.entity || prev.entidad,
        usuarioNombre: user?.name || prev.usuarioNombre || '',
        usuarioEmail: user?.email || prev.usuarioEmail || '',
        configuredOffices: safeCount,
        turns: newTurns,
        updatedAt: new Date().toISOString()
      };
      saveLocalGeneralData(updated);
      if (selectedUnit) {
        saveUnitGeneral(selectedUnit.clues, updated)
          .then(() => {
            addToast(`Consultorios para captura guardados: ${safeCount}`, 'success');
            if (safeCount === 0) finishCompletedUnit(selectedUnit.name);
          })
          .catch(async () => {
            await addToSyncQueue({
              action: 'save_general',
              clues: selectedUnit.clues,
              payload: updated
            });
            await refreshPendingCount();
            addToast('Consultorios guardados localmente', 'warning', 'Se sincronizarán al reconectar.');
            if (safeCount === 0) finishCompletedUnit(selectedUnit.name);
          });
      }
      return updated;
    });
  }, [selectedUnit, selectedEntity, user, answers, addToast, refreshPendingCount, finishCompletedUnit]);

  const handleConfirmZeroOffices = useCallback(async () => {
    if (!selectedUnit) return;
    try {
      await deleteUnitAnswers(selectedUnit.clues);
      await deleteLocalAnswersForUnit(selectedUnit.clues);
      const updated: UnitGeneralData = {
        ...generalData,
        entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
        usuarioNombre: user?.name || generalData.usuarioNombre || '',
        usuarioEmail: user?.email || generalData.usuarioEmail || '',
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
      finishCompletedUnit(selectedUnit.name);
    } catch (error) {
      addToast('No se eliminaron las respuestas', 'error', 'La base de datos no confirmó la operación. Intenta nuevamente.');
    }
  }, [selectedUnit, selectedEntity, user, generalData, addToast, refreshPendingCount, finishCompletedUnit]);

  // General fields update
  const handleSetInternet = useCallback(async (status: 'SI' | 'NO' | 'PENDIENTE') => {
    if (!selectedUnit) return;
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      usuarioEmail: user?.email || generalData.usuarioEmail || '',
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

  const handleSetGeneralOfficeAvailability = useCallback(async (
    status: 'SI' | 'NO',
    enabledOffices: number | null,
    unoperatedOffices: number | null
  ) => {
    if (!selectedUnit) return;
    const safeEnabled = enabledOffices === null ? null : Math.max(0, Math.floor(enabledOffices));
    const safeUnoperated = status === 'SI'
      ? unoperatedOffices === null ? null : Math.max(0, Math.floor(unoperatedOffices))
      : 0;
    const totalGeneralOffices = safeEnabled === null || safeUnoperated === null
      ? null
      : safeEnabled + safeUnoperated;
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      usuarioEmail: user?.email || generalData.usuarioEmail || '',
      hasTemporarilyClosedOffices: status,
      enabledOffices: safeEnabled,
      unoperatedOffices: safeUnoperated,
      totalGeneralOffices,
      updatedAt: new Date().toISOString()
    };
    setGeneralData(updated);
    await saveLocalGeneralData(updated);
    try {
      await saveUnitGeneral(selectedUnit.clues, updated);
      addToast('Disponibilidad de consultorios guardada', 'success');
    } catch {
      await addToSyncQueue({ action: 'save_general', clues: selectedUnit.clues, payload: updated });
      refreshPendingCount();
      addToast('Disponibilidad guardada localmente', 'warning', 'Se sincronizará al reconectar.');
    }
  }, [selectedUnit, selectedEntity, user, generalData, addToast, refreshPendingCount]);

  // Turn selection for an office
  const handleSetTurn = useCallback(async (officeNumber: number, turn: TurnType) => {
    if (!selectedUnit) return;
    const wasComplete = isQuestionnaireComplete(generalData, answers);
    const previousTurn = generalData.turns[officeNumber];
    const removedTurns: OperationalTurn[] = turn === 'Ambos' || !previousTurn || previousTurn === turn
      ? []
      : previousTurn === 'Ambos'
        ? [turn === 'Matutino' ? 'Vespertino' : 'Matutino']
        : previousTurn === 'Matutino' || previousTurn === 'Vespertino'
          ? [previousTurn]
          : [];
    const newTurns = { ...generalData.turns, [officeNumber]: turn };
    const updated: UnitGeneralData = {
      ...generalData,
      entidad: selectedEntity || selectedUnit.entity || generalData.entidad,
      usuarioNombre: user?.name || generalData.usuarioNombre || '',
      usuarioEmail: user?.email || generalData.usuarioEmail || '',
      turns: newTurns,
      updatedAt: new Date().toISOString()
    };
    setGeneralData(updated);
    await saveLocalGeneralData(updated);

    const updatedAnswers: Record<string, QuestionAnswer> = { ...answers };
    Object.keys(updatedAnswers).forEach((key) => {
      const answer = updatedAnswers[key];
      const schedule = isOfficeScheduleQuestion(answer.question);
      const doctor = isDoctorAvailabilityQuestion(answer.question);
      if (
        answer.officeNumber === officeNumber
        && (schedule || doctor)
        && removedTurns.some((removedTurn) => answer.question.includes(`${removedTurn} - `))
      ) {
        delete updatedAnswers[key];
      } else if (answer.officeNumber === officeNumber) {
        updatedAnswers[key] = { ...updatedAnswers[key], turn };
      }
    });
    setAnswers(updatedAnswers);
    await Promise.all(
      removedTurns.map((removedTurn) => deleteLocalTurnSchedules(selectedUnit.clues, officeNumber, removedTurn))
    );
    await Promise.all(
      Object.values(updatedAnswers)
        .filter((answer) => answer.officeNumber === officeNumber)
        .map(saveLocalAnswer)
    );

    try {
      for (const removedTurn of removedTurns) {
        await deleteOfficeTurnSchedules(selectedUnit.clues, officeNumber, removedTurn);
      }
      await saveUnitGeneral(selectedUnit.clues, updated);
      addToast(`Turno ${turn} guardado para C${officeNumber}`, 'success');
    } catch {
      for (const removedTurn of removedTurns) {
        await addToSyncQueue({
          action: 'delete_turn_schedules',
          clues: selectedUnit.clues,
          payload: { officeNumber, turn: removedTurn }
        });
      }
      await addToSyncQueue({ action: 'save_general', clues: selectedUnit.clues, payload: updated });
      refreshPendingCount();
      addToast(`Turno C${officeNumber} guardado localmente`, 'warning');
    }

    if (!wasComplete && isQuestionnaireComplete(updated, updatedAnswers)) {
      finishCompletedUnit(selectedUnit.name);
    }
  }, [selectedUnit, selectedEntity, user, generalData, answers, addToast, refreshPendingCount, finishCompletedUnit]);

  // Save Single Cell Answer (Enter key or Save button)
  const handleSaveAnswer = useCallback(async (officeNumber: number, question: string, value: number, silentSuccess = false) => {
    if (!selectedUnit || !user || !selectedEntity) return;

    const cellKey = `${officeNumber}__${question}`;
    const previous = answers[cellKey];
    const wasComplete = isQuestionnaireComplete(generalData, answers);

    // Optimistic local update
    const newAnswer: QuestionAnswer = {
      clues: selectedUnit.clues,
      officeNumber,
      question,
      value,
      status: 'saving',
      turn: generalData.turns[officeNumber] || '',
      updatedAt: new Date().toISOString(),
      version: (previous?.version || 0) + 1
    };
    const nextAnswers = { ...answers, [cellKey]: newAnswer };
    const completesUnit = !wasComplete && isQuestionnaireComplete(generalData, nextAnswers);

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
      numeroConsultorios: generalData.configuredOffices ?? 0,
      numeroConsultorio: officeNumber,
      pregunta: question,
      valor: value,
      turno: generalData.turns[officeNumber] || '',
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
        if (!silentSuccess) {
          addToast('Respuesta guardada correctamente.', 'success', `${question} (C${officeNumber}) = ${value}`);
        }
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

    if (completesUnit) {
      finishCompletedUnit(selectedUnit.name);
    }
  }, [selectedUnit, user, selectedEntity, answers, generalData, addToast, refreshPendingCount, finishCompletedUnit]);

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
  let totalQuestions = 0;
  let answeredCount = 0;
  const officeProgress: Record<number, { percentage: number; missing: number; total: number }> = {};

  for (let c = 1; c <= (generalData.configuredOffices ?? 0); c++) {
    const enabledAnswer = answers[`${c}__${OFFICE_ENABLED_QUESTION}`];
    const requiredQuestions = [
      ...getRequiredOfficeConfigurationQuestions(generalData.turns[c] || '', enabledAnswer?.value),
      ...(enabledAnswer?.value === 1 ? EQUIPMENT_CATALOG.map((item) => item.name) : [])
    ];
    const cAnswered = requiredQuestions.reduce((count, question) => {
      if (question === TURN_SELECTION_QUESTION) {
        if (generalData.turns[c]) {
          answeredCount++;
          return count + 1;
        }
        return count;
      }
      if (question === DISABLED_CAUSE_CONFIRMATION_QUESTION) {
        if (answers[`${c}__${question}`]?.value === 1) {
          answeredCount++;
          return count + 1;
        }
        return count;
      }
      if (isDoctorAvailabilityQuestion(question) || isOfficeScheduleQuestion(question)) {
        answeredCount++;
        return count + 1;
      }
      const ans = answers[`${c}__${question}`];
      if (ans && ans.value !== null && ans.value !== undefined) {
        answeredCount++;
        return count + 1;
      }
      return count;
    }, 0);
    const cTotal = requiredQuestions.length;
    totalQuestions += cTotal;
    const cPercent = cTotal > 0 ? (cAnswered / cTotal) * 100 : 0;
    officeProgress[c] = {
      percentage: Number(cPercent.toFixed(1)),
      missing: cTotal - cAnswered,
      total: cTotal
    };
  }

  const progressPercentage = generalData.configuredOffices === 0
    ? 100
    : totalQuestions > 0
      ? Number(((answeredCount / totalQuestions) * 100).toFixed(1))
      : 0;
  const pendingCount = totalQuestions - answeredCount;
  const isFullySaved = generalData.configuredOffices === 0
    || (totalQuestions > 0 && answeredCount === totalQuestions);

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
        completedUnitName,
        setCompletedUnitName,
        conflictData,
        setConflictData,
        handleSelectEntity,
        handleSaveUser,
        handleSelectUnit,
        handleUnlockUnit,
        handleConfigureOffices,
        handleConfirmZeroOffices,
        handleSetInternet,
        handleSetGeneralOfficeAvailability,
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
