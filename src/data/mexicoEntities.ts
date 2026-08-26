import { MexicanEntity, MedicalUnit } from '../types.ts';
import entities from './entities.json';
import units from './units.json';

export const MEXICAN_ENTITIES: MexicanEntity[] = entities;
export const INITIAL_MEDICAL_UNITS: MedicalUnit[] = units as MedicalUnit[];

export function getUnitsForEntity(entityName: string): MedicalUnit[] {
  const normalizedEntity = entityName.trim().toUpperCase();
  return INITIAL_MEDICAL_UNITS.filter(
    (unit) => unit.entity.trim().toUpperCase() === normalizedEntity
  );
}