import { createId, nowIso } from "@/server/lib/utils";
import { DataStore } from "@/server/types";

export function recordAuditLog(
  store: DataStore,
  input: {
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    details?: Record<string, unknown>;
  },
) {
  store.auditLogs.unshift({
    id: createId(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actor: input.actor,
    createdAt: nowIso(),
    details: input.details ?? {},
  });
  store.auditLogs = store.auditLogs.slice(0, 200);
}

export function incrementMetric(store: DataStore, metric: string, amount = 1) {
  store.metrics[metric] = (store.metrics[metric] ?? 0) + amount;
}
