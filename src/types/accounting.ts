export type ClientTaskStatus = 'in_progress' | 'done';

export interface Client {
  id: string;
  name: string;
  nif?: string;
  notes?: string;
  archived?: boolean;
  assignedTasks?: string[];
  createdAt: string;
}

export interface TaskClientItem {
  clientId: string;
  clientName: string;
  clientNif?: string;
  status: ClientTaskStatus;
  notes?: string;
}

export type RecurrenceType = 'none' | 'monthly' | 'quarterly' | 'yearly' | 'weekly' | 'custom';

export interface AccountingTask {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  generalNotes?: string;
  clients: TaskClientItem[];
  isCompleted?: boolean; // For tasks with 0 clients
  recurrence: RecurrenceType;
  recurrenceCustomDays?: number;
  recurrenceSeriesId?: string;
  nominalDay?: number;
  nominalDate?: string;
  periodLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppBackupData {
  version: number;
  exportedAt: string;
  tasks: AccountingTask[];
  clients: Client[];
}

export type GeneralTaskStatus = 'completed' | 'in_progress';

export interface TaskProgressSummary {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  percentage: number;
  generalStatus: GeneralTaskStatus;
}
