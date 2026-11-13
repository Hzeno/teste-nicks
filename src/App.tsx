/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  StockMovement,
  InventoryCountSession,
} from './types/inventory';
import {
  loadItems,
  saveItems,
  loadMovements,
  saveMovements,
  loadSessions,
  saveSessions,
} from './utils/storage';
import {
  calcItemStock,
  getItemStatus,
  formatBRL,
  calcDosesDisponiveis,
} from './utils/calculations';

import { InventoryTable } from './components/InventoryTable';
import { QuickAdjustModal } from './components/QuickAdjustModal';
import { ItemFormModal } from './components/ItemFormModal';
import { StockMovementModal } from './components/StockMovementModal';
import { CountSessionView } from './components/CountSessionView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { MovementsLogView } from './components/MovementsLogView';
import { SettingsModal } from './components/SettingsModal';
import { ExcelView } from './components/ExcelView';
import { DayComparisonView } from './components/DayComparisonView';

import {
  Wine,
  Beer,
  AlertTriangle,
  ShoppingCart,
  ClipboardCheck,
  Plus,
  Settings,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  RotateCcw,
  ArrowLeftRight,
} from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [sessions, setSessions] = useState<InventoryCountSession[]>([]);

  // Navigation active tab: includes dedicated 'contagem_zero' and 'comparativo' tabs requested by user
  const [activeTab, setActiveTab] = useState<
    'estoque' | 'contagem_zero' | 'comparativo' | 'excel' | 'contagem' | 'compras' | 'historico'
  >('estoque');

  // Modals state
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load on mount
  useEffect(() => {
    setItems(loadItems());
    setMovements(loadMovements());
    setSessions(loadSessions());
  }, []);

  // Sync helpers
  const handleUpdateItems = (newItems: InventoryItem[]) => {
    setItems(newItems);
    saveItems(newItems);
  };

  const handleDataReloaded = () => {
    setItems(loadItems());
    setMovements(loadMovements());
    setSessions(loadSessions());
  };

  // Quick adjust save
  const handleSaveAdjust = (updated: InventoryItem, motivo?: string) => {
    const oldItem = items.find((i) => i.id === updated.id);
    const oldStock = oldItem ? calcItemStock(oldItem) : 0;
    const newStock = calcItemStock(updated);
    const diff = Number((newStock - oldStock).toFixed(2));

    const updatedList = items.map((i) => (i.id === updated.id ? updated : i));
    handleUpdateItems(updatedList);

    // Create a movement log if changed
    if (diff !== 0) {
      const newMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: updated.id,
        itemNome: updated.nome,
        tipo: 'ajuste_inventario',
        quantidade: diff,
        unidadeDescricao: updated.tipo === 'destilado' ? 'garrafas' : 'unidades',
        motivo: motivo || 'Ajuste rápido de contagem',
        responsavel: 'Equipe de Bar',
        criadoEm: new Date().toISOString(),
      };
      const updatedMovs = [newMovement, ...movements];
      setMovements(updatedMovs);
      saveMovements(updatedMovs);
    }
  };

  // Quick increment/decrement (+1 / -1) directly from table
  const handleQuickIncrement = (item: InventoryItem, delta: number) => {
    const isDest = item.tipo === 'destilado';
    const updated: InventoryItem = { ...item };

    if (isDest) {
      if (delta > 0) {
        updated.garrafasFechadas = (updated.garrafasFechadas || 0) + 1;
      } else {
        if (updated.garrafasFechadas >= 1) {
          updated.garrafasFechadas -= 1;
        } else if (updated.garrafasAbertasFracao > 0) {
          updated.garrafasAbertasFracao = 0;
        }
      }
    } else {
      if (delta > 0) {
        updated.unidadesAvulsas = (updated.unidadesAvulsas || 0) + 1;
      } else {
        if (updated.unidadesAvulsas >= 1) {
          updated.unidadesAvulsas -= 1;
        } else if ((updated.fardosFechados || 0) > 0) {
          updated.fardosFechados = (updated.fardosFechados || 0) - 1;
          updated.unidadesAvulsas = (updated.itensPorFardo || 12) - 1;
        }
      }
    }

    updated.atualizadoEm = new Date().toISOString();
    handleUpdateItems(items.map((i) => (i.id === item.id ? updated : i)));
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (!itemToDelete) return;
    if (confirm(`Deseja remover "${itemToDelete.nome}" do estoque?`)) {
      handleUpdateItems(items.filter((i) => i.id !== id));
    }
  };

  // Add or edit item save
  const handleSaveItem = (itemToSave: InventoryItem) => {
    const exists = items.some((i) => i.id === itemToSave.id);
    let updatedList: InventoryItem[];
    if (exists) {
      updatedList = items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
    } else {
      updatedList = [itemToSave, ...items];
    }
    handleUpdateItems(updatedList);
    setEditingItem(null);
  };

  // Movement save
  const handleSaveMovement = (movement: StockMovement, updatedItem: InventoryItem) => {
    const updatedMovs = [movement, ...movements];
    setMovements(updatedMovs);
    saveMovements(updatedMovs);

    const updatedList = items.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    handleUpdateItems(updatedList);
  };

  // Finished count session (from either regular or zero count)
  const handleFinishCountSession = (
    updatedItems: InventoryItem[],
    session: InventoryCountSession
  ) => {
    handleUpdateItems(updatedItems);
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    saveSessions(updatedSessions);

    // Also register movements for variance
    const newMovements: StockMovement[] = session.registros
      .filter((r) => r.diferenca !== 0)
      .map((r) => ({
        id: `mov-${Date.now()}-${r.itemId}`,
        itemId: r.itemId,
        itemNome: r.itemNome,
        tipo: 'ajuste_inventario',
        quantidade: r.diferenca,
        unidadeDescricao: r.tipo === 'destilado' ? 'garrafas' : 'unidades',
        motivo: `Contagem ${session.modoContagem === 'zero' ? 'do Zero' : 'de Turno'} (${session.setor})`,
        responsavel: session.responsavel,
        criadoEm: session.data,
      }));

    if (newMovements.length > 0) {
      const merged = [...newMovements, ...movements];
      setMovements(merged);
      saveMovements(merged);
    }

    // Switch to comparison view so user can immediately examine the day-by-day comparison!
    setActiveTab('comparativo');
  };

  // KPI calculations
  const kpis = useMemo(() => {
    let valorTotal = 0;
    let criticos = 0;
    let doses = 0;
    let totalDestiladosGf = 0;
    let totalRefrigerantesUn = 0;

    items.forEach((item) => {
      const stock = calcItemStock(item);
      valorTotal += stock * (item.custoUnitario || 0);

      const { status } = getItemStatus(item);
      if (status === 'critico') criticos++;

      if (item.tipo === 'destilado') {
        doses += calcDosesDisponiveis(item);
        totalDestiladosGf += stock;
      } else {
        totalRefrigerantesUn += stock;
      }
    });

    return {
      valorTotal,
      criticos,
      doses,
      totalDestiladosGf: Number(totalDestiladosGf.toFixed(1)),
      totalRefrigerantesUn,
      totalItens: items.length,
    };
  }, [items]);

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Bar Contract (Strict 3 Zones) */}
      <header className="sticky top-0 z-40 bg-[#09090c]/95 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single text element wordmark with Nicks Sport Bar uploaded poker logo */}
          <button
            onClick={() => setActiveTab('estoque')}
            className="text-lg font-bold tracking-tight text-white hover:text-zinc-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-3 group"
          >
            <div className="relative p-0.5 rounded-full border-2 border-dashed border-zinc-400 group-hover:border-white transition-colors bg-black flex items-center justify-center shadow-md">
              <img
                src="/assets/aistudio/image_b48500cc.png"
                alt="Nicks Sport Bar"
                className="w-10 h-10 rounded-full object-cover bg-black"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="leading-tight font-black tracking-tight text-white uppercase text-base flex items-center gap-1.5">
                Nicks Sport Bar
                <span className="text-[11px] text-zinc-500 font-mono tracking-widest hidden sm:inline">♠♥♦♣</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                @nickssportbar · Botafogo, RJ · Setores: NICKS & RPC
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation links */}
          <nav className="hidden xl:flex items-center gap-4 text-sm font-medium">
            <button
              onClick={() => setActiveTab('estoque')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 ${
                activeTab === 'estoque'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              Estoque
            </button>

            {/* Nova Aba: Contagem do Zero */}
            <button
              onClick={() => setActiveTab('contagem_zero')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'contagem_zero'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
              <span>Contagem do Zero</span>
            </button>

            {/* Nova Aba: Comparativo Dia a Dia */}
            <button
              onClick={() => setActiveTab('comparativo')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'comparativo'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-300" />
              <span>Comparativo Dia a Dia</span>
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'excel'
                  ? 'text-white border-b-2 border-emerald-400 font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Planilha Excel</span>
            </button>

            <button
              onClick={() => setActiveTab('contagem')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'contagem'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-zinc-300" />
              <span>Contar Turno</span>
            </button>

            <button
              onClick={() => setActiveTab('compras')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 flex items-center gap-1.5 ${
                activeTab === 'compras'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Compras</span>
              {kpis.criticos > 0 && (
                <span className="text-xs text-rose-400 font-mono font-bold">
                  ({kpis.criticos})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-1 ${
                activeTab === 'historico'
                  ? 'text-white border-b-2 border-white font-bold'
                  : 'text-zinc-400'
              }`}
            >
              Histórico
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('comparativo')}
              className="hidden lg:flex px-3 py-1.5 text-xs font-bold text-zinc-200 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded-lg transition-colors items-center gap-1.5"
              title="Comparar contagem de um dia para o outro"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-300" />
              <span>Comparar Dias</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
              title="Configurações e Backup"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsItemFormOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>+ Nova Bebida</span>
            </button>
          </div>
        </div>

        {/* Medium/Mobile Navigation bar */}
        <div className="xl:hidden flex items-center justify-around px-2 py-2 border-t border-zinc-800/80 bg-[#09090c] text-xs overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('estoque')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'estoque' ? 'text-white font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            Estoque
          </button>
          <button
            onClick={() => setActiveTab('contagem_zero')}
            className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'contagem_zero' ? 'text-white font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Contar do Zero
          </button>
          <button
            onClick={() => setActiveTab('comparativo')}
            className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'comparativo' ? 'text-white font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            Comparativo
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'excel' ? 'text-emerald-400 font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            <FileSpreadsheet className="w-3 h-3" />
            Excel
          </button>
          <button
            onClick={() => setActiveTab('contagem')}
            className={`px-2.5 py-1 rounded whitespace-nowrap ${
              activeTab === 'contagem' ? 'text-white font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            Contar Turno
          </button>
          <button
            onClick={() => setActiveTab('compras')}
            className={`px-2.5 py-1 rounded whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'compras' ? 'text-white font-bold bg-zinc-900' : 'text-zinc-400'
            }`}
          >
            Compras {kpis.criticos > 0 && <span className="text-rose-400 font-bold">({kpis.criticos})</span>}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Nicks Sport Bar Poker Club Hero Card */}
        <section className="relative overflow-hidden bg-gradient-to-r from-black via-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
          <div className="absolute right-4 -top-6 text-7xl font-serif select-none pointer-events-none opacity-5 text-white">
            ♠ ♥ ♦ ♣
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative p-1 rounded-full border-2 border-dashed border-zinc-400 bg-black shrink-0 shadow-xl">
                <img
                  src="/assets/aistudio/image_b48500cc.png"
                  alt="Nicks Sport Bar Logo"
                  className="w-16 h-16 rounded-full object-cover bg-black"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase font-mono tracking-widest text-zinc-400 font-bold">
                    Club & Cocktails · Botafogo RJ
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[11px] font-mono text-zinc-300">Setores: NICKS & RPC</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mt-0.5">
                  Nicks Sport Bar
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Estoque de Destilados e Estoque de Refrigerantes com contagem do zero, comparativo dia a dia e exportação Excel.
                </p>
              </div>
            </div>

            {/* Quick Action Badges matching noir style */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('contagem_zero')}
                className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                title="Iniciar conferência com todos os números zerados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
                <span>Contagem do Zero</span>
              </button>

              <button
                onClick={() => setActiveTab('comparativo')}
                className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                title="Comparar consumo e saídas de um dia para o outro"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-300" />
                <span>Comparar Dias</span>
              </button>

              <button
                onClick={() => setActiveTab('excel')}
                className="px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-200 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </section>

        {/* KPI Strip */}
        <section aria-label="Indicadores Chave do Estoque">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* KPI 1: Abaixo do Mínimo */}
            <div
              onClick={() => setActiveTab('compras')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                kpis.criticos > 0
                  ? 'bg-rose-950/30 border-rose-800/80 hover:border-rose-600'
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span
                  className={
                    kpis.criticos > 0
                      ? 'text-rose-400 font-bold flex items-center gap-1.5'
                      : 'text-zinc-400'
                  }
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Abaixo do Mínimo
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">♥ Repor</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-mono font-black tabular-nums ${
                    kpis.criticos > 0 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {kpis.criticos}
                </span>
                <span className="text-xs text-zinc-400">garrafas em falta</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1 font-medium">
                Gerar pedido de reposição <ArrowRight className="w-3 h-3" />
              </p>
            </div>

            {/* KPI 2: Estoque de Destilados */}
            <div
              onClick={() => setActiveTab('estoque')}
              className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <span className="text-base leading-none">♠</span>
                  Estoque de Destilados
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Garrafas</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-black text-white tabular-nums">
                  {kpis.totalDestiladosGf}
                </span>
                <span className="text-xs text-zinc-400">garrafas no bar</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-mono mt-1 font-semibold">
                ~{kpis.doses} doses de 50ml disponíveis
              </p>
            </div>

            {/* KPI 3: Estoque de Refrigerantes */}
            <div
              onClick={() => setActiveTab('estoque')}
              className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <span className="text-base leading-none">♣</span>
                  Estoque de Refrigerantes
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Unidades</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-black text-white tabular-nums">
                  {kpis.totalRefrigerantesUn}
                </span>
                <span className="text-xs text-zinc-400">latas e garrafas</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Coca, guaraná, tônicas e águas
              </p>
            </div>

            {/* KPI 4: Capital em Estoque */}
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                  <span className="text-base leading-none text-zinc-400">♦</span>
                  Capital em Estoque
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">Custo BRL</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums">
                  {formatBRL(kpis.valorTotal)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                {kpis.totalItens} rótulos em NICKS e RPC
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic View Sections */}
        {activeTab === 'estoque' && (
          <InventoryTable
            items={items}
            onOpenAdjust={(item) => setAdjustingItem(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsItemFormOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            onQuickIncrement={handleQuickIncrement}
            onStartCountSession={() => setActiveTab('contagem')}
            onStartZeroCountSession={() => setActiveTab('contagem_zero')}
          />
        )}

        {/* Aba: Contagem do Zero */}
        {activeTab === 'contagem_zero' && (
          <CountSessionView
            items={items}
            initialZeroMode={true}
            onFinishCount={handleFinishCountSession}
            onCancel={() => setActiveTab('estoque')}
          />
        )}

        {/* Aba: Comparativo Dia a Dia */}
        {activeTab === 'comparativo' && (
          <DayComparisonView
            items={items}
            sessions={sessions}
            onStartNewCount={() => setActiveTab('contagem')}
          />
        )}

        {activeTab === 'excel' && (
          <ExcelView
            items={items}
            onUpdateItem={(updated) =>
              handleUpdateItems(items.map((i) => (i.id === updated.id ? updated : i)))
            }
          />
        )}

        {activeTab === 'contagem' && (
          <CountSessionView
            items={items}
            initialZeroMode={false}
            onFinishCount={handleFinishCountSession}
            onCancel={() => setActiveTab('estoque')}
          />
        )}

        {activeTab === 'compras' && <PurchaseOrdersView items={items} />}

        {activeTab === 'historico' && (
          <MovementsLogView
            movements={movements}
            sessions={sessions}
            onOpenNewMovement={() => setIsMovementModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 py-4 bg-[#09090c] text-xs text-zinc-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Nicks Sport Bar</span>
            <span>·</span>
            <span>Rua Dezenove de Fevereiro, 161 - Botafogo, Rio de Janeiro</span>
            <span>·</span>
            <span>Setores: NICKS e RPC</span>
            <span>·</span>
            <a
              href="https://www.instagram.com/nickssportbar/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline font-mono font-semibold"
            >
              @nickssportbar
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('comparativo')}
              className="text-zinc-300 hover:text-white hover:underline flex items-center gap-1 font-semibold"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Comparativo Dia a Dia
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('excel')}
              className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
            <span>·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              Backup & Configurações
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {adjustingItem && (
        <QuickAdjustModal
          item={adjustingItem}
          isOpen={!!adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSave={handleSaveAdjust}
        />
      )}

      {isItemFormOpen && (
        <ItemFormModal
          isOpen={isItemFormOpen}
          onClose={() => {
            setIsItemFormOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
        />
      )}

      {isMovementModalOpen && (
        <StockMovementModal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          items={items}
          onSaveMovement={handleSaveMovement}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          items={items}
          onDataReloaded={handleDataReloaded}
        />
      )}
    </div>
  );
}
