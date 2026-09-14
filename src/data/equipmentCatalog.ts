import { EquipmentItem } from '../types.ts';
import questions from './questions.json';

export const EQUIPMENT_CATALOG: EquipmentItem[] = questions;

const equipmentByName = new Map(EQUIPMENT_CATALOG.map((item) => [item.name, item]));

export function getEquipmentId(question: string): string | null {
	return equipmentByName.get(question)?.id.toString() ?? null;
}

export function getEquipmentColumn(id: string | number): string {
	return `p_${id}`;
}
