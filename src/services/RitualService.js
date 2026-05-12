import * as ApiService from './ApiService';

export async function getRelationshipRitualSummary(contactId) {
  const result = await ApiService.getRitualSummary(contactId);
  return {
    ...result,
    milestones: result.milestones || [],
    calendarDays: result.calendar_days || [],
  };
}
