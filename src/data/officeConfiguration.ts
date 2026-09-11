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

export function getOperationalTurns(turn: TurnType): OperationalTurn[] {
  if (turn === 'Ambos') return ['Matutino', 'Vespertino'];
  if (turn === 'Vespertino') return ['Vespertino'];
  if (turn === 'Matutino') return ['Matutino'];
  return [];
}

export function getDoctorAvailabilityQuestion(turn: OperationalTurn, day: string) {
  return `¿Cuenta con médico general? ${turn} - ${day}`;
}

export function isDoctorAvailabilityQuestion(question: string) {
  return question.startsWith('¿Cuenta con médico general? ');
}

export function getRequiredOfficeConfigurationQuestions(turn: TurnType, isEnabled?: number | null) {
  if (isEnabled !== 1) return [OFFICE_ENABLED_QUESTION];

  return [
    OFFICE_ENABLED_QUESTION,
    TURN_SELECTION_QUESTION,
    GENERAL_DOCTOR_COUNT_QUESTION,
    ...getOperationalTurns(turn).flatMap((operationalTurn) =>
      WEEK_DAYS.map((day) => getDoctorAvailabilityQuestion(operationalTurn, day.key))
    )
  ];
}