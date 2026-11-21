import type { Incident } from "./reducer";

// Presentation only: the reducer remains the sole authority for valid actions.
export function workflowStage(incident: Incident | null): number {
  if (!incident) return 1;
  if (incident.status === "cleared" || incident.status === "clearance_eligible")
    return 7;
  if (incident.status === "detected") return 4;
  if (incident.status === "approved" || !incident.checklist.repair) return 5;
  return 6;
}
export function monitoringAlert(incident: Incident | null): boolean {
  return !!incident && incident.status !== "cleared";
}
