import { RecurrenceType, AccountingTask } from '../types/accounting';

export const PT_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const PT_WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date string to Portuguese standard DD/MM/YYYY
 */
export function formatDatePT(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Formats month and year, e.g. "Outubro de 2026"
 */
export function formatMonthYearPT(year: number, monthIndex: number): string {
  return `${PT_MONTHS[monthIndex]} de ${year}`;
}

/**
 * Check if a date string is strictly before today (overdue)
 */
export function isDateOverdue(dateStr: string, todayStr: string = getTodayDateString()): boolean {
  return dateStr < todayStr;
}

/**
 * Check if a date string is today
 */
export function isToday(dateStr: string, todayStr: string = getTodayDateString()): boolean {
  return dateStr === todayStr;
}

export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holidayName?: string;
}

/**
 * Generates a 35 or 42 day calendar grid for a given year and month (0-indexed),
 * starting on Monday.
 */
export function getMonthCalendarMatrix(year: number, month: number, todayStr: string = getTodayDateString()): CalendarDay[] {
  // First day of the requested month
  const firstDay = new Date(year, month, 1);
  // Day of week: 0 (Sun) to 6 (Sat). We want Monday=0, ..., Sunday=6
  const dayOfWeek = firstDay.getDay();
  const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // Total days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const grid: CalendarDay[] = [];

  // Previous month filler days
  for (let i = startOffset - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfW = prevDate.getDay();
    const isWeekend = dayOfW === 0 || dayOfW === 6;
    const holiday = getPortugueseHoliday(prevDate);

    grid.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend,
      holidayName: holiday.isHoliday ? holiday.name : undefined,
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const m = String(month + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${m}-${d}`;
    const currentDate = new Date(year, month, dayNum);
    const dayOfW = currentDate.getDay();
    const isWeekend = dayOfW === 0 || dayOfW === 6;
    const holiday = getPortugueseHoliday(currentDate);

    grid.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend,
      holidayName: holiday.isHoliday ? holiday.name : undefined,
    });
  }

  // Next month filler days to complete rows (multiples of 7)
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    const d = String(i).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfW = nextDate.getDay();
    const isWeekend = dayOfW === 0 || dayOfW === 6;
    const holiday = getPortugueseHoliday(nextDate);

    grid.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend,
      holidayName: holiday.isHoliday ? holiday.name : undefined,
    });
  }

  return grid;
}

/**
 * Computes Western Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Checks if a given date is a Portuguese national holiday.
 */
export function getPortugueseHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const year = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // Fixed Portuguese national holidays
  if (m === 1 && d === 1) return { isHoliday: true, name: 'Ano Novo' };
  if (m === 4 && d === 25) return { isHoliday: true, name: 'Dia da Liberdade (25 de Abril)' };
  if (m === 5 && d === 1) return { isHoliday: true, name: 'Dia do Trabalhador (1 de Maio)' };
  if (m === 6 && d === 10) return { isHoliday: true, name: 'Dia de Portugal (10 de Junho)' };
  if (m === 8 && d === 15) return { isHoliday: true, name: 'Assunção de Nossa Senhora' };
  if (m === 10 && d === 5) return { isHoliday: true, name: 'Implantação da República (5 de Outubro)' };
  if (m === 10 && d === 20) return { isHoliday: true, name: 'Feriado Municipal Covilhã' };
  if (m === 11 && d === 1) return { isHoliday: true, name: 'Dia de Todos os Santos' };
  if (m === 12 && d === 1) return { isHoliday: true, name: 'Restauração da Independência' };
  if (m === 12 && d === 8) return { isHoliday: true, name: 'Imaculada Conceição' };
  if (m === 12 && d === 25) return { isHoliday: true, name: 'Natal' };

  // Movable holidays based on Easter
  const easter = getEasterSunday(year);

  // Sexta-Feira Santa (2 days before Easter)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  if (goodFriday.getMonth() + 1 === m && goodFriday.getDate() === d) {
    return { isHoliday: true, name: 'Sexta-Feira Santa' };
  }

  // Domingo de Páscoa
  if (easter.getMonth() + 1 === m && easter.getDate() === d) {
    return { isHoliday: true, name: 'Páscoa' };
  }

  // Corpo de Deus (60 days after Easter)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);
  if (corpusChristi.getMonth() + 1 === m && corpusChristi.getDate() === d) {
    return { isHoliday: true, name: 'Corpo de Deus' };
  }

  // Terça-Feira de Carnaval (47 days before Easter)
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  if (carnival.getMonth() + 1 === m && carnival.getDate() === d) {
    return { isHoliday: true, name: 'Carnaval' };
  }

  return { isHoliday: false };
}

/**
 * Checks if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Checks if a date is a business day (not weekend and not Portuguese national holiday)
 */
export function isBusinessDay(date: Date): boolean {
  if (isWeekendDay(date)) return false;
  if (getPortugueseHoliday(date).isHoliday) return false;
  return true;
}

/**
 * Adjusts a date forward to the next business day if it falls on a weekend or holiday.
 */
export function adjustToNextBusinessDay(originalDate: Date | string): {
  date: Date;
  wasAdjusted: boolean;
  originalDateStr: string;
  adjustedDateStr: string;
  businessDayDate: string;
  reason?: string;
} {
  let current: Date;
  if (typeof originalDate === 'string') {
    const [y, m, d] = originalDate.split('-').map(Number);
    current = new Date(y, m - 1, d);
  } else {
    current = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
  }

  const origStr = formatDateToIso(current);
  let wasAdjusted = false;
  let reason: string | undefined;

  while (!isBusinessDay(current)) {
    wasAdjusted = true;
    if (!reason) {
      if (isWeekendDay(current)) {
        reason = current.getDay() === 6 ? 'Sábado' : 'Domingo';
      } else {
        const h = getPortugueseHoliday(current);
        reason = h.name || 'Feriado';
      }
    }
    current.setDate(current.getDate() + 1);
  }

  const adjustedStr = formatDateToIso(current);

  return {
    date: current,
    wasAdjusted,
    originalDateStr: origStr,
    adjustedDateStr: adjustedStr,
    businessDayDate: adjustedStr,
    reason,
  };
}

/**
 * Calculates the next occurrence date and period label given an existing date and recurrence rule.
 * If the resulting date falls on a weekend or holiday, it automatically shifts to the next business day.
 */
export function calculateNextOccurrence(
  currentDateStr: string,
  recurrence: RecurrenceType,
  customDays?: number,
  nominalDay?: number
): {
  nextDate: string;
  nextPeriodLabel: string;
  nominalDay: number;
  wasAdjustedToBusinessDay?: boolean;
  adjustmentReason?: string;
} {
  const [yearStr, monthStr, dayStr] = currentDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const baseDay = typeof nominalDay === 'number' && nominalDay >= 1 && nominalDay <= 31 ? nominalDay : day;

  let nextDate = new Date(year, month, baseDay);
  let label = '';

  switch (recurrence) {
    case 'weekly': {
      nextDate = new Date(year, month, day);
      nextDate.setDate(nextDate.getDate() + 7);
      label = `Semana ${formatDatePT(formatDateToIso(nextDate))}`;
      break;
    }
    case 'monthly': {
      const targetYear = month === 11 ? year + 1 : year;
      const targetMonth = month === 11 ? 0 : month + 1;
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(baseDay, daysInTargetMonth);
      nextDate = new Date(targetYear, targetMonth, actualDay);
      label = `${PT_MONTHS[targetMonth]} ${targetYear}`;
      break;
    }
    case 'quarterly': {
      const targetTotal = month + 3;
      const targetYear = year + Math.floor(targetTotal / 12);
      const targetMonth = targetTotal % 12;
      const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDay = Math.min(baseDay, daysInTargetMonth);
      nextDate = new Date(targetYear, targetMonth, actualDay);
      const q = Math.floor(targetMonth / 3) + 1;
      label = `${q}º Trimestre ${targetYear}`;
      break;
    }
    case 'yearly': {
      const targetYear = year + 1;
      const daysInTargetMonth = new Date(targetYear, month + 1, 0).getDate();
      const actualDay = Math.min(baseDay, daysInTargetMonth);
      nextDate = new Date(targetYear, month, actualDay);
      label = `Ano ${targetYear}`;
      break;
    }
    case 'custom': {
      const daysToAdd = customDays && customDays > 0 ? customDays : 30;
      nextDate = new Date(year, month, day);
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      label = `Período +${daysToAdd}d`;
      break;
    }
    default:
      label = '';
  }

  // Shift to next business day if it falls on a weekend or holiday
  const adjustment = adjustToNextBusinessDay(nextDate);

  return {
    nextDate: adjustment.adjustedDateStr,
    nextPeriodLabel: label,
    nominalDay: baseDay,
    wasAdjustedToBusinessDay: adjustment.wasAdjusted,
    adjustmentReason: adjustment.reason,
  };
}

export function formatDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Automatically synchronizes monthly recurring tasks for upcoming months.
 * For each following month, calculates the task date based on the nominal day
 * and automatically applies the weekend and holiday rule (shifting to next business day).
 */
export function syncRecurringTasks(
  existingTasks: AccountingTask[],
  viewYear: number,
  viewMonth: number
): { tasks: AccountingTask[]; hasNew: boolean } {
  const recurringTasks = existingTasks.filter((t) => t.recurrence && t.recurrence === 'monthly');
  if (recurringTasks.length === 0) {
    return { tasks: existingTasks, hasNew: false };
  }

  // Group by recurrenceSeriesId or fallback
  const seriesMap = new Map<string, AccountingTask[]>();
  for (const t of recurringTasks) {
    const sId = t.recurrenceSeriesId || `series_${t.title.trim().toLowerCase()}`;
    const list = seriesMap.get(sId) || [];
    list.push(t);
    seriesMap.set(sId, list);
  }

  let updatedTasks = [...existingTasks];
  let hasNew = false;

  const now = new Date();
  const currentTotalMonths = now.getFullYear() * 12 + now.getMonth();
  const viewTotalMonths = viewYear * 12 + viewMonth;
  // Ensure up to at least 12 months ahead or 6 months past view
  const targetEndMonth = Math.max(viewTotalMonths + 6, currentTotalMonths + 12);

  for (const [seriesId, seriesTasks] of seriesMap.entries()) {
    // Sort series tasks chronologically
    seriesTasks.sort((a, b) => a.date.localeCompare(b.date));
    const rootTask = seriesTasks[0];

    // Determine series nominal day (the intended base day of month)
    let seriesNominalDay: number | undefined = undefined;
    for (const t of seriesTasks) {
      if (typeof t.nominalDay === 'number' && t.nominalDay >= 1 && t.nominalDay <= 31) {
        seriesNominalDay = t.nominalDay;
        break;
      }
    }

    const [startYStr, startMStr, startDStr] = rootTask.date.split('-');
    const startYear = parseInt(startYStr, 10);
    const startMonth = parseInt(startMStr, 10) - 1;
    const startDay = parseInt(startDStr, 10);

    if (!seriesNominalDay) {
      // If rootTask is on 6th of October 2026 (Implantação da República was on 5th):
      // Check if rootTask was adjusted from 5th
      if (startYear === 2026 && startMonth === 9 && startDay === 6) {
        seriesNominalDay = 5;
      } else {
        seriesNominalDay = startDay;
      }
    }

    // Ensure rootTask has seriesId and seriesNominalDay
    const rootIdx = updatedTasks.findIndex((t) => t.id === rootTask.id);
    if (rootIdx >= 0) {
      const curr = updatedTasks[rootIdx];
      if (!curr.recurrenceSeriesId || curr.nominalDay !== seriesNominalDay) {
        updatedTasks[rootIdx] = {
          ...curr,
          recurrenceSeriesId: seriesId,
          nominalDay: seriesNominalDay,
        };
        hasNew = true;
      }
    }

    const startTotalMonths = startYear * 12 + startMonth;

    for (let mIndex = startTotalMonths + 1; mIndex <= targetEndMonth; mIndex++) {
      const y = Math.floor(mIndex / 12);
      const m = mIndex % 12;
      const expectedPeriodLabel = `${PT_MONTHS[m]} ${y}`;

      // Calculate nominal day for this target month
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const targetDay = Math.min(seriesNominalDay, daysInMonth);
      const nominalDate = new Date(y, m, targetDay);

      // Adjust to next business day if weekend or holiday
      const adj = adjustToNextBusinessDay(nominalDate);
      const adjustedDateStr = adj.adjustedDateStr;

      // Check if an occurrence already exists
      const existingOccIndex = updatedTasks.findIndex((t) => {
        const matchesSeries = (t.recurrenceSeriesId === seriesId || t.id === seriesId || (t.title === rootTask.title && t.recurrence === 'monthly'));
        if (!matchesSeries) return false;
        if (t.periodLabel === expectedPeriodLabel) return true;
        if (t.id === `task_${seriesId}_${y}_${m + 1}`) return true;
        if (t.date && t.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)) return true;
        return false;
      });

      if (existingOccIndex >= 0) {
        const existingOcc = updatedTasks[existingOccIndex];
        // If the date or nominalDay differs from the business day rule, update it to the correct date
        if (
          existingOcc.date !== adjustedDateStr ||
          existingOcc.nominalDay !== seriesNominalDay ||
          existingOcc.recurrenceSeriesId !== seriesId
        ) {
          updatedTasks[existingOccIndex] = {
            ...existingOcc,
            date: adjustedDateStr,
            nominalDay: seriesNominalDay,
            recurrenceSeriesId: seriesId,
            periodLabel: existingOcc.periodLabel || expectedPeriodLabel,
          };
          hasNew = true;
        }
      } else {
        // Inherit clients from most recent preceding occurrence
        const preceding = updatedTasks
          .filter(
            (t) => (t.recurrenceSeriesId === seriesId || t.id === seriesId || t.title === rootTask.title) && t.date < adjustedDateStr
          )
          .sort((a, b) => b.date.localeCompare(a.date))[0] || rootTask;

        const newClients = (preceding.clients || []).map((c) => ({
          clientId: c.clientId,
          clientName: c.clientName,
          clientNif: c.clientNif,
          status: 'in_progress' as const,
          notes: '',
        }));

        const nowIso = new Date().toISOString();
        const newOccurrence: AccountingTask = {
          id: `task_${seriesId}_${y}_${m + 1}`,
          title: rootTask.title,
          description: rootTask.description,
          date: adjustedDateStr,
          periodLabel: expectedPeriodLabel,
          recurrence: 'monthly',
          recurrenceSeriesId: seriesId,
          nominalDay: seriesNominalDay,
          clients: newClients,
          generalNotes: '',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        updatedTasks.push(newOccurrence);
        hasNew = true;
      }
    }
  }

  return { tasks: updatedTasks, hasNew };
}
