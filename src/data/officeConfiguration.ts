import { TurnType } from '../types.ts';

export type OperationalTurn = 'Matutino' | 'Vespertino';

export const WEEK_DAYS = [
  { key: 'lunes', label: 'Lu' },
  { key: 'martes', label: 'Ma' },
  { key: 'miercoles', label: 'Mi' },
  { key: 'jueves', label: 'Ju' },
  { key: 'viernes', label: 'Vi' },
  { key: 'sabado', label: 'Sa' },
  { key: 'domingo', label: 'Do' }
] as const;

export const GENERAL_DOCTOR_COUNT_QUESTION = '¿Cuántos médicos generales tiene?';
export const TURN_SELECTION_QUESTION = 'Seleccione el turno';
export const OFFICE_ENABLED_QUESTION = '¿Está habilitado?';
export const DISABLED_CAUSE_CONFIRMATION_QUESTION = 'Causas de inhabilitación confirmadas';
export const DISABLED_OFFICE_CAUSES = [
  { key: 'infraestructura', label: 'Infraestructura', question: 'Causa de inhabilitación: Infraestructura' },
  { key: 'equipamiento', label: 'Equipamiento', question: 'Causa de inhabilitación: Equipamiento' },
  { key: 'recursos_humanos', label: 'Recursos Humanos', question: 'Causa de inhabilitación: Recursos Humanos' }
] as const;

export function getOperationalTurns(turn: TurnType): OperationalTurn[] {
  if (turn === 'Ambos') return ['Matutino', 'Vespertino'];
  if (turn === 'Vespertino') return ['Vespertino'];
  if (turn === 'Matutino') return ['Matutino'];
  return [];
}

export function getDoctorAvailabilityQuestion(turn: OperationalTurn, day: string) {
  return `¿Cuenta con médico general? ${turn} - ${day}`;
}

export function getOfficeScheduleQuestion(turn: OperationalTurn, day: string) {
  return `¿Opera en este horario? ${turn} - ${day}`;
}

export function isDoctorAvailabilityQuestion(question: string) {
  return question.startsWith('¿Cuenta con médico general? ');
}

export function isOfficeScheduleQuestion(question: string) {
  return question.startsWith('¿Opera en este horario? ');
}

export function getDisabledCauseFromQuestion(question: string) {
  return DISABLED_OFFICE_CAUSES.find((cause) => cause.question === question);
}

export function parseOfficeScheduleQuestion(question: string) {
  const match = question.match(/^¿Opera en este horario\? (Matutino|Vespertino) - (.+)$/);
  return match ? { turn: match[1] as OperationalTurn, day: match[2] } : null;
}

export function parseDoctorAvailabilityQuestion(question: string) {
  const match = question.match(/^¿Cuenta con médico general\? (Matutino|Vespertino) - (.+)$/);
  return match ? { turn: match[1] as OperationalTurn, day: match[2] } : null;
}

export function getRequiredOfficeConfigurationQuestions(turn: TurnType, isEnabled?: number | null) {
  if (isEnabled === 0) {
    return [OFFICE_ENABLED_QUESTION, DISABLED_CAUSE_CONFIRMATION_QUESTION];
  }
  if (isEnabled !== 1) return [OFFICE_ENABLED_QUESTION];

  return [
    OFFICE_ENABLED_QUESTION,
    TURN_SELECTION_QUESTION,
    GENERAL_DOCTOR_COUNT_QUESTION,
    ...getOperationalTurns(turn).flatMap((operationalTurn) =>
      WEEK_DAYS.flatMap((day) => [
        getOfficeScheduleQuestion(operationalTurn, day.key),
        getDoctorAvailabilityQuestion(operationalTurn, day.key)
      ])
    )
  ];
}