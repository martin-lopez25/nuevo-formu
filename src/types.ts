export interface MexicanEntity {
  id: string;
  name: string;
  code: string;
  totalUnits?: number;
}

export interface MedicalUnit {
  clues: string;
  name: string;
  category?: string;
  entity: string;
  municipality?: string;
  hasInternet?: 'SI' | 'NO' | 'PENDIENTE';
  enabledOffices?: number;
  unoperatedOffices?: number;
  totalOffices?: number;
  lastUpdated?: string;
}

export type TurnType = 'Matutino' | 'Vespertino' | 'Ambos' | '';

export interface QuestionAnswer {
  id?: string;
  clues: string;
  officeNumber: number;
  question: string;
  value: number | null; // null represents PENDIENTE, 0 or >0
  status: 'pending' | 'saving' | 'saved_cloud' | 'local_only' | 'error';
  turn?: TurnType;
  updatedAt: string;
  syncedAt?: string;
  version?: number;
}

export interface UnitGeneralData {
  clues: string;
  entidad?: string;
  usuarioNombre?: string;
  hasInternet: 'SI' | 'NO' | 'PENDIENTE';
  enabledOffices: number;
  unoperatedOffices: number;
  configuredOffices: number;
  turns: Record<number, TurnType>; // officeNumber -> TurnType
  updatedAt: string;
}

export interface UserRegistration {
  name: string;
  email: string;
  entity: string;
  validatedAt: string;
}

export interface EquipmentItem {
  id: number;
  name: string;
  category?: string;
  normativeRef?: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'save_answer' | 'save_general' | 'save_turn';
  clues: string;
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface ConflictData {
  clues: string;
  officeNumber: number;
  question: string;
  localValue: number | null;
  localDate: string;
  serverValue: number | null;
  serverDate: string;
  onResolve: (chosen: 'local' | 'server') => void;
}

export type VisualState = 'ROJO' | 'AZUL' | 'VERDE' | 'DORADO';
