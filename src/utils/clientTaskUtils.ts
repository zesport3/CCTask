import { AccountingTask, Client, RecurrenceType } from '../types/accounting';
import { getFiscalObligations, FiscalObligationDefinition } from './fiscalCalendar';
import { adjustToNextBusinessDay, PT_MONTHS, syncRecurringTasks } from './dateUtils';

export interface AssignableObligation {
  id: string; // Series ID or Unique Key
  title: string;
  nominalDay?: number;
  recurrence: RecurrenceType;
  periodicityLabel: string;
  legalEntity?: string;
  category?: string;
  description?: string;
  isFiscalStandard: boolean;
  assignedClientsCount: number;
}

/**
 * Normalizes task titles for matching series across different instances
 */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Returns a comprehensive, deduplicated list of all assignable obligations/tasks.
 * Includes both official Portuguese fiscal obligations and any custom tasks created in the system.
 */
export function getAvailableAssignableObligations(
  tasks: AccountingTask[],
  clients: Client[]
): AssignableObligation[] {
  const result: AssignableObligation[] = [];
  const processedSeriesIds = new Set<string>();
  const processedTitles = new Set<string>();

  // 1. Add standard Fiscal Obligations
  const fiscalDefs = getFiscalObligations();
  for (const def of fiscalDefs) {
    const sId = def.seriesId;
    processedSeriesIds.add(sId);
    processedTitles.add(normalizeTitle(def.title));

    // Calculate how many distinct clients currently have this obligation in tasks
    const clientIdsInSeries = new Set<string>();
    for (const t of tasks) {
      const matches =
        t.recurrenceSeriesId === sId ||
        normalizeTitle(t.title) === normalizeTitle(def.title);
      if (matches) {
        for (const c of t.clients) {
          clientIdsInSeries.add(c.clientId);
        }
      }
    }

    let periodicityLabel = 'Mensal';
    if (def.recurrence === 'monthly') {
      periodicityLabel = `Mensal (Dia ${def.nominalDay})`;
    } else if (def.recurrence === 'quarterly') {
      periodicityLabel = `Trimestral (Dia ${def.nominalDay})`;
    } else if (def.recurrence === 'yearly') {
      const monthName = def.annualMonth !== undefined ? PT_MONTHS[def.annualMonth] : 'Anual';
      periodicityLabel = `Anual (${monthName})`;
    }

    result.push({
      id: sId,
      title: def.title,
      nominalDay: def.nominalDay,
      recurrence: def.recurrence,
      periodicityLabel,
      legalEntity: def.legalEntity,
      category: def.category,
      description: def.description,
      isFiscalStandard: true,
      assignedClientsCount: clientIdsInSeries.size,
    });
  }

  // 2. Add custom or non-standard tasks existing in the system
  for (const t of tasks) {
    const normTitle = normalizeTitle(t.title);
    if (processedTitles.has(normTitle)) continue;

    const sId = t.recurrenceSeriesId || `custom_${normTitle}`;
    if (processedSeriesIds.has(sId)) continue;

    processedSeriesIds.add(sId);
    processedTitles.add(normTitle);

    const clientIdsInSeries = new Set<string>();
    for (const other of tasks) {
      if (
        other.recurrenceSeriesId === sId ||
        normalizeTitle(other.title) === normTitle
      ) {
        for (const c of other.clients) {
          clientIdsInSeries.add(c.clientId);
        }
      }
    }

    let periodicityLabel = 'Pontual';
    if (t.recurrence === 'monthly') {
      periodicityLabel = `Mensal (Dia ${t.nominalDay || t.date.split('-')[2]})`;
    } else if (t.recurrence === 'quarterly') {
      periodicityLabel = 'Trimestral';
    } else if (t.recurrence === 'yearly') {
      periodicityLabel = 'Anual';
    } else if (t.recurrence === 'weekly') {
      periodicityLabel = 'Semanal';
    }

    result.push({
      id: sId,
      title: t.title,
      nominalDay: t.nominalDay,
      recurrence: t.recurrence || 'none',
      periodicityLabel,
      description: t.description,
      isFiscalStandard: false,
      assignedClientsCount: clientIdsInSeries.size,
    });
  }

  return result;
}

/**
 * Returns which task series keys a specific client is currently assigned to.
 */
export function getClientAssignedTaskKeys(
  clientId: string,
  tasks: AccountingTask[],
  client?: Client
): string[] {
  const assigned = new Set<string>();

  // If client already has assignedTasks recorded, add them
  if (client?.assignedTasks && Array.isArray(client.assignedTasks)) {
    for (const key of client.assignedTasks) {
      assigned.add(key);
    }
  }

  // Also inspect actual tasks
  for (const t of tasks) {
    const hasClient = t.clients.some((c) => c.clientId === clientId);
    if (hasClient) {
      if (t.recurrenceSeriesId) {
        assigned.add(t.recurrenceSeriesId);
      }
      // Also match against fiscal series by title
      const fiscalDefs = getFiscalObligations();
      const fiscalDef = fiscalDefs.find(
        (f) => normalizeTitle(f.title) === normalizeTitle(t.title)
      );
      if (fiscalDef) {
        assigned.add(fiscalDef.seriesId);
      } else {
        assigned.add(`custom_${normalizeTitle(t.title)}`);
      }
    }
  }

  return Array.from(assigned);
}

/**
 * Applies a client's selected task obligations to all months across the system.
 * If a selected obligation does not exist yet in tasks, it instantiates it for all months of the current year.
 */
export function applyClientObligationsToTasks(
  allTasks: AccountingTask[],
  client: Client,
  selectedSeriesIds: string[],
  currentYear: number,
  currentMonth: number
): AccountingTask[] {
  let updatedTasks = [...allTasks];
  const nowIso = new Date().toISOString();
  const fiscalDefs = getFiscalObligations();

  // Helper to test if a task matches a series ID
  const matchesSeries = (t: AccountingTask, seriesId: string): boolean => {
    if (t.recurrenceSeriesId && t.recurrenceSeriesId === seriesId) return true;
    const fiscalDef = fiscalDefs.find((f) => f.seriesId === seriesId);
    if (fiscalDef && normalizeTitle(t.title) === normalizeTitle(fiscalDef.title)) return true;
    if (seriesId.startsWith('custom_') && `custom_${normalizeTitle(t.title)}` === seriesId) return true;
    return false;
  };

  // 1. Identify selected fiscal series that do not yet have any tasks in updatedTasks
  for (const seriesId of selectedSeriesIds) {
    const hasAnyTask = updatedTasks.some((t) => matchesSeries(t, seriesId));
    if (!hasAnyTask) {
      const fiscalDef = fiscalDefs.find((f) => f.seriesId === seriesId);
      if (fiscalDef) {
        // Generate instances for all applicable months of the year
        const monthsToCreate: number[] = [];
        if (fiscalDef.recurrence === 'monthly') {
          for (let m = 0; m < 12; m++) monthsToCreate.push(m);
        } else if (fiscalDef.recurrence === 'quarterly') {
          monthsToCreate.push(...(fiscalDef.quarterlyMonths || [1, 4, 7, 10]));
        } else if (fiscalDef.recurrence === 'yearly') {
          monthsToCreate.push(fiscalDef.annualMonth ?? 4);
        } else {
          monthsToCreate.push(currentMonth);
        }

        for (const m of monthsToCreate) {
          const monthStr = String(m + 1).padStart(2, '0');
          const maxDays = new Date(currentYear, m + 1, 0).getDate();
          const safeNominalDay = Math.min(fiscalDef.nominalDay, maxDays);
          const nominalDate = `${currentYear}-${monthStr}-${String(safeNominalDay).padStart(2, '0')}`;
          const adj = adjustToNextBusinessDay(nominalDate);

          const newTask: AccountingTask = {
            id: `${fiscalDef.id}_${currentYear}_${monthStr}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            title: fiscalDef.title,
            description: fiscalDef.description,
            date: adj.businessDayDate,
            generalNotes: `${fiscalDef.notes}\n\nEntidade: ${fiscalDef.legalEntity} · Categoria: ${fiscalDef.category}`,
            clients: [
              {
                clientId: client.id,
                clientName: client.name,
                clientNif: client.nif,
                status: 'in_progress',
                notes: '',
              },
            ],
            isCompleted: false,
            recurrence: fiscalDef.recurrence,
            recurrenceSeriesId: fiscalDef.seriesId,
            nominalDay: fiscalDef.nominalDay,
            nominalDate: nominalDate,
            periodLabel: `${PT_MONTHS[m]} de ${currentYear}`,
            createdAt: nowIso,
            updatedAt: nowIso,
          };
          updatedTasks.push(newTask);
        }
      }
    }
  }

  // 2. Update all tasks in updatedTasks
  updatedTasks = updatedTasks.map((t) => {
    // Check if this task matches any of the selected series
    const isSelected = selectedSeriesIds.some((sId) => matchesSeries(t, sId));

    const existingClientIndex = t.clients.findIndex((c) => c.clientId === client.id);

    if (isSelected) {
      if (existingClientIndex >= 0) {
        // Client already present: update their name & nif
        const currentClientItem = t.clients[existingClientIndex];
        if (
          currentClientItem.clientName !== client.name ||
          currentClientItem.clientNif !== client.nif
        ) {
          const newClients = [...t.clients];
          newClients[existingClientIndex] = {
            ...currentClientItem,
            clientName: client.name,
            clientNif: client.nif,
          };
          return { ...t, clients: newClients, updatedAt: nowIso };
        }
        return t;
      } else {
        // Add client to this task occurrence
        return {
          ...t,
          clients: [
            ...t.clients,
            {
              clientId: client.id,
              clientName: client.name,
              clientNif: client.nif,
              status: 'in_progress' as const,
              notes: '',
            },
          ],
          isCompleted: false,
          updatedAt: nowIso,
        };
      }
    } else {
      // If this task was part of a series that is NOT selected, remove the client if present
      // Only remove if this task corresponds to a known series in our list of obligations
      if (existingClientIndex >= 0) {
        return {
          ...t,
          clients: t.clients.filter((c) => c.clientId !== client.id),
          updatedAt: nowIso,
        };
      }
      return t;
    }
  });

  // 3. Automatically run syncRecurringTasks so upcoming months stay synchronized with the updated client list
  const { tasks: synced } = syncRecurringTasks(updatedTasks, currentYear, currentMonth);
  return synced;
}
