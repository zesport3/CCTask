import { AccountingTask, RecurrenceType } from '../types/accounting';
import { adjustToNextBusinessDay, PT_MONTHS } from './dateUtils';

export interface FiscalObligationDefinition {
  id: string;
  seriesId: string;
  title: string;
  nominalDay: number;
  recurrence: RecurrenceType;
  quarterlyMonths?: number[]; // 0-indexed months for quarterly tasks (e.g. [1, 4, 7, 10] for Fev, Mai, Ago, Nov)
  annualMonth?: number; // 0-indexed month for yearly tasks (e.g. 4 for Maio, 6 for Julho)
  description: string;
  legalEntity: 'AT' | 'Segurança Social' | 'ACT / MTSSS';
  category: 'Faturação' | 'Salários' | 'IVA' | 'IRC / IRS' | 'Segurança Social';
  notes: string;
}

/**
 * Official Portuguese Tax and Social Security Calendar Obligations for Accountants (OCC / AT / Seg. Social).
 */
export const FISCAL_OBLIGATIONS: FiscalObligationDefinition[] = [
  {
    id: 'fiscal_saft',
    seriesId: 'series_fiscal_saft',
    title: 'Comunicação de Faturas (SAF-T / e-Fatura)',
    nominalDay: 5,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'Faturação',
    description: 'Submissão do ficheiro SAF-T de faturação à AT ou inserção dos elementos das faturas emitidas no mês anterior no portal e-fatura.',
    notes: 'Prazo legal: até ao dia 5 do mês seguinte ao da emissão. Se coincidir com fim de semana ou feriado, transfere-se para o primeiro dia útil seguinte.',
  },
  {
    id: 'fiscal_dmr',
    seriesId: 'series_fiscal_dmr',
    title: 'Declaração Mensal de Remunerações (DMR - AT)',
    nominalDay: 10,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'Salários',
    description: 'Envio da Declaração Mensal de Remunerações (DMR) à Autoridade Tributária com as remunerações e retenções na fonte de IRS de trabalho dependente (cat. A) pagas no mês anterior.',
    notes: 'Prazo legal: até ao dia 10 do mês seguinte àquele em que os rendimentos foram pagos ou colocados à disposição.',
  },
  {
    id: 'fiscal_dri',
    seriesId: 'series_fiscal_dri',
    title: 'Declaração de Remunerações à Segurança Social (DRI)',
    nominalDay: 10,
    recurrence: 'monthly',
    legalEntity: 'Segurança Social',
    category: 'Segurança Social',
    description: 'Envio da Declaração de Remunerações (DRI) dos colaboradores através da Segurança Social Direta relativa aos tempos de trabalho e remunerações do mês anterior.',
    notes: 'Prazo legal: entre o dia 1 e o dia 10 do mês seguinte àquele a que respeita.',
  },
  {
    id: 'fiscal_tsu',
    seriesId: 'series_fiscal_tsu',
    title: 'Pagamento da TSU (Segurança Social)',
    nominalDay: 25,
    recurrence: 'monthly',
    legalEntity: 'Segurança Social',
    category: 'Segurança Social',
    description: 'Pagamento das contribuições e cotizações para a Segurança Social (Taxa Social Única) referentes ao mês anterior.',
    notes: 'Prazo legal: até ao dia 25 de cada mês.',
  },
  {
    id: 'fiscal_retencoes',
    seriesId: 'series_fiscal_retencoes',
    title: 'Pagamento de Retenções na Fonte (IRS / IRC e Imposto do Selo)',
    nominalDay: 20,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'IRC / IRS',
    description: 'Entrega no Estado das quantias retidas na fonte no mês anterior a título de IRS/IRC (trabalho dependente, recibos verdes, capitais, prediais) e de Imposto do Selo.',
    notes: 'Prazo legal: até ao dia 20 do mês seguinte àquele em que as retenções foram efetuadas.',
  },
  {
    id: 'fiscal_iva_mensal_declaracao',
    seriesId: 'series_fiscal_iva_mensal_declaracao',
    title: 'Declaração Periódica do IVA - Regime Mensal',
    nominalDay: 20,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'IVA',
    description: 'Submissão da Declaração Periódica do IVA referente às operações realizadas no mês anterior (sujeitos passivos enquadrados no regime normal mensal com volume de negócios >= 650.000€).',
    notes: 'Prazo legal: até ao dia 20 do mês seguinte ao das operações.',
  },
  {
    id: 'fiscal_iva_mensal_pagamento',
    seriesId: 'series_fiscal_iva_mensal_pagamento',
    title: 'Pagamento do IVA - Regime Mensal',
    nominalDay: 25,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'IVA',
    description: 'Pagamento do imposto de IVA apurado na declaração periódica do regime normal mensal.',
    notes: 'Prazo legal: até ao dia 25 do mês seguinte ao período a que respeita a declaração.',
  },
  {
    id: 'fiscal_iva_recapitulativa',
    seriesId: 'series_fiscal_iva_recapitulativa',
    title: 'Declaração Recapitulativa do IVA (Operações Intracomunitárias)',
    nominalDay: 20,
    recurrence: 'monthly',
    legalEntity: 'AT',
    category: 'IVA',
    description: 'Envio da declaração recapitulativa por sujeitos passivos que tenham realizado transmissões intracomunitárias de bens ou prestações de serviços noutros Estados-Membros.',
    notes: 'Prazo legal: até ao dia 20 do mês seguinte ao das operações.',
  },
  {
    id: 'fiscal_fct',
    seriesId: 'series_fiscal_fct',
    title: 'Fundo de Compensação do Trabalho (FCT / FGCT)',
    nominalDay: 20,
    recurrence: 'monthly',
    legalEntity: 'ACT / MTSSS',
    category: 'Segurança Social',
    description: 'Pagamento mensal das entregas devidas pelas empresas ao Fundo de Compensação do Trabalho ou Mecanismo Equivalente.',
    notes: 'Prazo legal: entre o dia 10 e o dia 20 de cada mês.',
  },
  {
    id: 'fiscal_iva_trimestral_declaracao',
    seriesId: 'series_fiscal_iva_trimestral_declaracao',
    title: 'Declaração Periódica do IVA - Regime Trimestral',
    nominalDay: 20,
    recurrence: 'quarterly',
    quarterlyMonths: [1, 4, 7, 10], // Fevereiro, Maio, Agosto, Novembro
    legalEntity: 'AT',
    category: 'IVA',
    description: 'Submissão da Declaração Periódica do IVA referente ao trimestre civil anterior (regime normal trimestral com volume de negócios < 650.000€).',
    notes: 'Prazo legal: até ao dia 20 do segundo mês seguinte ao trimestre a que respeitam as operações (Fev, Mai, Ago, Nov).',
  },
  {
    id: 'fiscal_iva_trimestral_pagamento',
    seriesId: 'series_fiscal_iva_trimestral_pagamento',
    title: 'Pagamento do IVA - Regime Trimestral',
    nominalDay: 25,
    recurrence: 'quarterly',
    quarterlyMonths: [1, 4, 7, 10], // Fevereiro, Maio, Agosto, Novembro
    legalEntity: 'AT',
    category: 'IVA',
    description: 'Pagamento do montante de IVA apurado na declaração periódica trimestral.',
    notes: 'Prazo legal: até ao dia 25 do segundo mês seguinte ao trimestre a que respeitam as operações (Fev, Mai, Ago, Nov).',
  },
  {
    id: 'fiscal_modelo22',
    seriesId: 'series_fiscal_modelo22',
    title: 'Modelo 22 - Declaração de Rendimentos de IRC',
    nominalDay: 31,
    recurrence: 'yearly',
    annualMonth: 4, // Maio
    legalEntity: 'AT',
    category: 'IRC / IRS',
    description: 'Submissão da declaração periódica de rendimentos de IRC (Modelo 22) relativa ao período de tributação anterior.',
    notes: 'Prazo legal: até ao último dia do mês de maio.',
  },
  {
    id: 'fiscal_ies',
    seriesId: 'series_fiscal_ies',
    title: 'IES / DA - Informação Empresarial Simplificada',
    nominalDay: 15,
    recurrence: 'yearly',
    annualMonth: 6, // Julho
    legalEntity: 'AT',
    category: 'IRC / IRS',
    description: 'Submissão da IES/DA para cumprimento das obrigações anuais fiscais, contabilísticas e estatísticas das empresas.',
    notes: 'Prazo legal: até ao dia 15 do mês de julho.',
  },
];

const CUSTOM_FISCAL_KEY = 'contab_custom_fiscal_obligations_v1';

/**
 * Returns all active fiscal obligations, combining standard ones with any user customizations/additions.
 */
export function getFiscalObligations(): FiscalObligationDefinition[] {
  try {
    const stored = localStorage.getItem(CUSTOM_FISCAL_KEY);
    if (!stored) return FISCAL_OBLIGATIONS;
    const customList: FiscalObligationDefinition[] = JSON.parse(stored);
    if (!Array.isArray(customList) || customList.length === 0) return FISCAL_OBLIGATIONS;

    // Merge: custom items override or add to standard items
    const map = new Map<string, FiscalObligationDefinition>();
    for (const def of FISCAL_OBLIGATIONS) {
      map.set(def.seriesId, def);
    }
    for (const custom of customList) {
      map.set(custom.seriesId, custom);
    }
    return Array.from(map.values());
  } catch {
    return FISCAL_OBLIGATIONS;
  }
}

/**
 * Saves a new or modified fiscal obligation definition to local storage.
 */
export function saveFiscalObligation(def: FiscalObligationDefinition): void {
  try {
    const current = getFiscalObligations();
    const existingIndex = current.findIndex(
      (o) => o.id === def.id || o.seriesId === def.seriesId
    );
    let updated: FiscalObligationDefinition[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = def;
    } else {
      updated = [...current, def];
    }
    localStorage.setItem(CUSTOM_FISCAL_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save fiscal obligation', err);
  }
}

/**
 * Deletes a custom fiscal obligation.
 */
export function deleteFiscalObligation(seriesId: string): void {
  try {
    const current = getFiscalObligations();
    const filtered = current.filter((o) => o.seriesId !== seriesId && o.id !== seriesId);
    localStorage.setItem(CUSTOM_FISCAL_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete fiscal obligation', err);
  }
}

/**
 * Builds standard pre-defined AccountingTask objects for the specified year and month,
 * strictly applying the weekend and holiday rules (shifting to next business day while retaining nominalDay).
 */
export function generateFiscalTasksForMonth(year: number, month: number): AccountingTask[] {
  const monthStr = String(month + 1).padStart(2, '0');
  const monthName = PT_MONTHS[month];
  const periodLabel = `${monthName} de ${year}`;
  const nowIso = new Date().toISOString();

  const generated: AccountingTask[] = [];
  const obligations = getFiscalObligations();

  for (const def of obligations) {
    // Check if obligation applies to this month
    if (def.recurrence === 'quarterly') {
      const qMonths = def.quarterlyMonths || [1, 4, 7, 10];
      if (!qMonths.includes(month)) {
        continue;
      }
    } else if (def.recurrence === 'yearly') {
      if (def.annualMonth !== undefined && def.annualMonth !== month) {
        continue;
      }
    }

    // Determine max days in current month to avoid invalid dates (e.g., Feb 30)
    const maxDays = new Date(year, month + 1, 0).getDate();
    const safeNominalDay = Math.min(def.nominalDay, maxDays);
    const nominalDate = `${year}-${monthStr}-${String(safeNominalDay).padStart(2, '0')}`;

    // Apply business day adjustment for weekends & Portuguese holidays!
    const adjustment = adjustToNextBusinessDay(nominalDate);
    const effectiveDate = adjustment.businessDayDate;

    const taskId = `${def.id}_${year}_${monthStr}`;

    generated.push({
      id: taskId,
      title: def.title,
      description: def.description,
      date: effectiveDate,
      generalNotes: `${def.notes}\n\nEntidade: ${def.legalEntity} · Categoria: ${def.category}`,
      clients: [],
      isCompleted: false,
      recurrence: def.recurrence,
      recurrenceSeriesId: def.seriesId,
      nominalDay: def.nominalDay,
      nominalDate: nominalDate,
      periodLabel: periodLabel,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Sort by effective date ascending
  return generated.sort((a, b) => a.date.localeCompare(b.date));
}
