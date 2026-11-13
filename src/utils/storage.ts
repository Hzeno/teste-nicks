import { InventoryItem, StockMovement, InventoryCountSession, MainCategory, InventoryLocation } from '../types/inventory';
import { INITIAL_ITEMS, INITIAL_MOVEMENTS } from '../data/initialData';
import { calcItemStock } from './calculations';

const STORAGE_KEYS = {
  ITEMS: 'nicks_sport_items_v4',
  MOVEMENTS: 'nicks_sport_movements_v4',
  SESSIONS: 'nicks_sport_sessions_v4',
};

function normalizeItem(item: InventoryItem, index: number): InventoryItem {
  let loc: InventoryLocation = 'NICKS';
  if (item.localizacao === 'RPC' || item.localizacao === 'NICKS') {
    loc = item.localizacao;
  } else {
    // Distribute between NICKS and RPC: every 4th item to RPC, others to NICKS
    loc = index % 4 === 0 ? 'RPC' : 'NICKS';
  }

  const catPrincipal: MainCategory =
    item.categoriaPrincipal ||
    (item.tipo === 'destilado' ? 'Estoque de Destilados' : 'Estoque de Refrigerantes');

  // Redução solicitada: todas as garrafas (destilados) com estoque mínimo sendo 2
  const estoqueMinimo = item.tipo === 'destilado' ? 2 : item.estoqueMinimo;
  const estoqueIdeal = item.tipo === 'destilado' ? Math.max(4, item.estoqueIdeal || 4) : item.estoqueIdeal;

  return {
    ...item,
    localizacao: loc,
    categoriaPrincipal: catPrincipal,
    estoqueMinimo,
    estoqueIdeal,
  };
}

export function loadItems(): InventoryItem[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      raw = localStorage.getItem('nicks_sport_items_v3') || localStorage.getItem('nicks_sport_items_v2');
    }
    let itemsToProcess: InventoryItem[];
    if (!raw) {
      itemsToProcess = INITIAL_ITEMS;
    } else {
      const parsed = JSON.parse(raw);
      itemsToProcess = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ITEMS;
    }

    const normalized = itemsToProcess.map((item, idx) => normalizeItem(item, idx));
    saveItems(normalized);
    return normalized;
  } catch (err) {
    console.error('Falha ao carregar itens do localStorage:', err);
    return INITIAL_ITEMS.map((item, idx) => normalizeItem(item, idx));
  }
}

export function saveItems(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  } catch (err) {
    console.error('Falha ao salvar itens no localStorage:', err);
  }
}

export function loadMovements(): StockMovement[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (!raw) {
      raw = localStorage.getItem('nicks_sport_movements_v3');
    }
    if (!raw) {
      saveMovements(INITIAL_MOVEMENTS);
      return INITIAL_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Falha ao carregar movimentações:', err);
    return INITIAL_MOVEMENTS;
  }
}

export function saveMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  } catch (err) {
    console.error('Falha ao salvar movimentações:', err);
  }
}

// Generate default sessions comparing yesterday vs today
function generateInitialSessions(): InventoryCountSession[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  const items = INITIAL_ITEMS.map((item, idx) => normalizeItem(item, idx));

  // Session 1: Yesterday's count
  const sessionOntem: InventoryCountSession = {
    id: 'session-ontem',
    data: new Date(yesterday.setHours(23, 45, 0, 0)).toISOString(),
    responsavel: 'Bartender Carlos (Turno Noite)',
    setor: 'NICKS',
    tipoContagem: 'Todos',
    modoContagem: 'padrao',
    totalItensContados: items.length,
    itensComDivergencia: 8,
    observacoes: 'Contagem de encerramento do expediente anterior.',
    registros: items.map((item) => {
      const currentStock = calcItemStock(item);
      // Simulate yesterday having a bit more stock for popular items
      const wasConsumed = ['gin-01', 'bou-01', 'sco-01', 'sco-02', 'vod-01', 'vod-03', 'refr-01', 'refr-02'].includes(item.id);
      const anterior = wasConsumed ? Number((currentStock + 2).toFixed(2)) : currentStock;
      const contado = currentStock;
      return {
        itemId: item.id,
        itemNome: item.nome,
        tipo: item.tipo,
        categoria: item.categoria,
        categoriaPrincipal: item.categoriaPrincipal,
        localizacao: item.localizacao,
        estoqueAnterior: anterior,
        estoqueContado: contado,
        diferenca: Number((contado - anterior).toFixed(2)),
        custoUnitario: item.custoUnitario,
        detalhesContagem: {
          fechadas: item.garrafasFechadas,
          fracao: item.garrafasAbertasFracao,
          fardos: item.fardosFechados,
          avulsas: item.unidadesAvulsas,
        },
      };
    }),
  };

  // Session 2: Today's earlier count
  const sessionHoje: InventoryCountSession = {
    id: 'session-hoje',
    data: new Date(now.getTime() - 3600000 * 2).toISOString(),
    responsavel: 'Bartender Roberto (Fechamento)',
    setor: 'NICKS',
    tipoContagem: 'Todos',
    modoContagem: 'padrao',
    totalItensContados: items.length,
    itensComDivergencia: 5,
    observacoes: 'Contagem oficial do turno de hoje com saída registrada de Gin, Whisky e Coca-Cola.',
    registros: items.map((item) => {
      const currentStock = calcItemStock(item);
      const hadExit = ['gin-01', 'bou-02', 'sco-02', 'refr-01', 'refr-05'].includes(item.id);
      const anterior = currentStock;
      const contado = hadExit ? Math.max(0, Number((currentStock - 1).toFixed(2))) : currentStock;
      return {
        itemId: item.id,
        itemNome: item.nome,
        tipo: item.tipo,
        categoria: item.categoria,
        categoriaPrincipal: item.categoriaPrincipal,
        localizacao: item.localizacao,
        estoqueAnterior: anterior,
        estoqueContado: contado,
        diferenca: Number((contado - anterior).toFixed(2)),
        custoUnitario: item.custoUnitario,
        detalhesContagem: {
          fechadas: item.garrafasFechadas,
          fracao: item.garrafasAbertasFracao,
          fardos: item.fardosFechados,
          avulsas: item.unidadesAvulsas,
        },
      };
    }),
  };

  return [sessionHoje, sessionOntem];
}

export function loadSessions(): InventoryCountSession[] {
  try {
    let raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) {
      raw = localStorage.getItem('nicks_sport_sessions_v3');
    }
    if (!raw) {
      const initial = generateInitialSessions();
      saveSessions(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : generateInitialSessions();
  } catch (err) {
    console.error('Falha ao carregar sessões de contagem:', err);
    return generateInitialSessions();
  }
}

export function saveSessions(sessions: InventoryCountSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.error('Falha ao salvar sessões de contagem:', err);
  }
}

export function resetToDefaultData(): void {
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
  localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  const items = INITIAL_ITEMS.map((item, idx) => normalizeItem(item, idx));
  saveItems(items);
  saveMovements(INITIAL_MOVEMENTS);
  saveSessions(generateInitialSessions());
}

export function exportAllDataAsJSON(): string {
  const data = {
    app: 'NicksSportBar',
    exportDate: new Date().toISOString(),
    version: '2.0',
    items: loadItems(),
    movements: loadMovements(),
    sessions: loadSessions(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDataFromJSON(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && Array.isArray(parsed.items)) {
      saveItems(parsed.items.map((i: InventoryItem, idx: number) => normalizeItem(i, idx)));
      if (Array.isArray(parsed.movements)) saveMovements(parsed.movements);
      if (Array.isArray(parsed.sessions)) saveSessions(parsed.sessions);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erro ao importar JSON:', err);
    return false;
  }
}
