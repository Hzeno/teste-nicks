import { InventoryItem, StockStatus } from '../types/inventory';

/**
 * Calcula o estoque total equivalente de um item.
 * Para destilados: garrafas fechadas + fração da garrafa aberta (ex: 4 + 0.6 = 4.6 garrafas)
 * Para refrigerantes: (fardos * itensPorFardo) + unidades avulsas (ex: 2 fardos de 12 + 4 avulsas = 28 latas)
 */
export function calcItemStock(item: InventoryItem): number {
  if (item.tipo === 'destilado') {
    const fechadas = Number(item.garrafasFechadas) || 0;
    const fracao = Number(item.garrafasAbertasFracao) || 0;
    return Number((fechadas + fracao).toFixed(2));
  }

  if (item.tipo === 'refrigerante') {
    const fardos = Number(item.fardosFechados) || 0;
    const fator = Number(item.itensPorFardo) || 1;
    const avulsas = Number(item.unidadesAvulsas) || 0;
    return (fardos * fator) + avulsas;
  }

  // Outros
  return (Number(item.garrafasFechadas) || 0) + (Number(item.unidadesAvulsas) || 0);
}

/**
 * Retorna o status de estoque do item em relação ao estoque mínimo estipulado.
 */
export function getItemStatus(item: InventoryItem): {
  status: StockStatus;
  deficit: number;
  percentMinimo: number;
  label: string;
} {
  const stock = calcItemStock(item);
  const min = Number(item.estoqueMinimo) || 0;

  if (min <= 0) {
    return {
      status: 'ok',
      deficit: 0,
      percentMinimo: 100,
      label: 'Normal',
    };
  }

  const percent = Math.round((stock / min) * 100);

  if (stock < min) {
    return {
      status: 'critico',
      deficit: Number((min - stock).toFixed(2)),
      percentMinimo: percent,
      label: 'Abaixo do Mínimo',
    };
  }

  if (stock <= min * 1.25) {
    return {
      status: 'alerta',
      deficit: 0,
      percentMinimo: percent,
      label: 'Próximo ao Mínimo',
    };
  }

  return {
    status: 'ok',
    deficit: 0,
    percentMinimo: percent,
    label: 'Adequado',
  };
}

/**
 * Calcula quantidade sugerida para pedido de reposição:
 * estritamente a diferença para atingir o estoque mínimo de segurança.
 */
export function calcSuggestedOrder(item: InventoryItem): number {
  const stock = calcItemStock(item);
  const min = Number(item.estoqueMinimo) || 0;
  const diff = min - stock;
  if (diff <= 0) return 0;

  if (item.tipo === 'destilado') {
    // Garrafas inteiras necessárias para cobrir o déficit até o estoque mínimo
    return Math.ceil(diff);
  }

  if (item.tipo === 'refrigerante') {
    // Unidades (em múltiplos de fardo) necessárias para cobrir o déficit até o estoque mínimo
    const fator = item.itensPorFardo || 12;
    return Math.ceil(diff / fator) * fator;
  }

  return Math.ceil(diff);
}

/**
 * Retorna o total aproximado de doses (50ml padrão de bar) para um destilado
 */
export function calcDosesDisponiveis(item: InventoryItem, doseMl: number = 50): number {
  if (item.tipo !== 'destilado') return 0;
  const stock = calcItemStock(item);
  const totalMl = stock * item.volumeMl;
  return Math.floor(totalMl / doseMl);
}

/**
 * Formata valores monetários em Reais (BRL)
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Formata a quantidade de forma legível e amigável para a equipe de bar
 */
export function formatStockDescription(item: InventoryItem): string {
  const total = calcItemStock(item);

  if (item.tipo === 'destilado') {
    const fechadas = Math.floor(item.garrafasFechadas || 0);
    const fracao = Math.round((item.garrafasAbertasFracao || 0) * 100);
    
    if (fracao > 0) {
      return `${total.toLocaleString('pt-BR')} gf (${fechadas} fechada${fechadas !== 1 ? 's' : ''} + ${fracao}% aberta)`;
    }
    return `${fechadas} gf fechada${fechadas !== 1 ? 's' : ''}`;
  }

  if (item.tipo === 'refrigerante') {
    const fardos = item.fardosFechados || 0;
    const avulsas = item.unidadesAvulsas || 0;
    const itensPorFardo = item.itensPorFardo || 12;

    if (fardos > 0 && avulsas > 0) {
      return `${total} un (${fardos} fardo${fardos > 1 ? 's' : ''} de ${itensPorFardo} + ${avulsas} avulsa${avulsas > 1 ? 's' : ''})`;
    }
    if (fardos > 0) {
      return `${total} un (${fardos} fardo${fardos > 1 ? 's' : ''} de ${itensPorFardo})`;
    }
    return `${avulsas} unidade${avulsas !== 1 ? 's' : ''}`;
  }

  return `${total} un`;
}

/**
 * Retorna a categoria principal do item: 'Estoque de Destilados' ou 'Estoque de Refrigerantes'
 */
export function getItemMainCategory(item: InventoryItem): 'Estoque de Destilados' | 'Estoque de Refrigerantes' {
  if (item.categoriaPrincipal) return item.categoriaPrincipal;
  if (item.tipo === 'destilado') return 'Estoque de Destilados';
  return 'Estoque de Refrigerantes';
}

/**
 * Formata a data e hora em que a contagem do item foi realizada
 */
export function formatCountDate(isoString?: string): string {
  if (!isoString) return 'Pendente';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Pendente';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Pendente';
  }
}
