import React, { useState, useMemo } from 'react';
import { InventoryItem, MainCategory, InventoryLocation } from '../types/inventory';
import { calcItemStock, getItemStatus, calcDosesDisponiveis, formatStockDescription, formatCountDate, getItemMainCategory } from '../utils/calculations';
import { BottleVisualizer } from './BottleVisualizer';
import {
  Search,
  Wine,
  Beer,
  AlertTriangle,
  Edit2,
  Trash2,
  Plus,
  Minus,
  ArrowUpDown,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Tag,
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onOpenAdjust: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onQuickIncrement: (item: InventoryItem, delta: number) => void;
  onStartCountSession: () => void;
  onStartZeroCountSession?: () => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onOpenAdjust,
  onEditItem,
  onDeleteItem,
  onQuickIncrement,
  onStartCountSession,
  onStartZeroCountSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'all' | 'Estoque de Destilados' | 'Estoque de Refrigerantes'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critico' | 'alerta' | 'ok'>('all');
  // Sector strictly NICKS or RPC
  const [locationFilter, setLocationFilter] = useState<'all' | 'NICKS' | 'RPC'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'estoque' | 'status' | 'minimo' | 'contagem' | 'setor'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Subcategories
  const categories = useMemo(() => {
    const list: string[] = [];
    items.forEach((i) => {
      if (!list.includes(i.categoria)) list.push(i.categoria);
    });
    return list;
  }, [items]);

  // Counts for filters
  const counts = useMemo(() => {
    let criticos = 0;
    let alertas = 0;
    let ok = 0;
    let nicksCount = 0;
    let rpcCount = 0;
    let destiladosCount = 0;
    let refrigerantesCount = 0;

    items.forEach((i) => {
      const { status } = getItemStatus(i);
      if (status === 'critico') criticos++;
      else if (status === 'alerta') alertas++;
      else ok++;

      if (i.localizacao === 'RPC') rpcCount++;
      else nicksCount++;

      if (getItemMainCategory(i) === 'Estoque de Destilados') destiladosCount++;
      else refrigerantesCount++;
    });

    return {
      total: items.length,
      criticos,
      alertas,
      ok,
      nicksCount,
      rpcCount,
      destiladosCount,
      refrigerantesCount,
    };
  }, [items]);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchName = item.nome.toLowerCase().includes(q);
          const matchCat = item.categoria.toLowerCase().includes(q);
          const matchForn = item.fornecedor.toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchForn) return false;
        }

        // Main Category: Estoque de Destilados vs Estoque de Refrigerantes
        if (mainCategoryFilter !== 'all') {
          const mainCat = getItemMainCategory(item);
          if (mainCat !== mainCategoryFilter) return false;
        }

        // Subcategory
        if (categoryFilter !== 'all' && item.categoria !== categoryFilter) return false;

        // Sector: NICKS and RPC only
        if (locationFilter !== 'all' && item.localizacao !== locationFilter) return false;

        // Status
        if (statusFilter !== 'all') {
          const { status } = getItemStatus(item);
          if (status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'nome') {
          return a.nome.localeCompare(b.nome) * factor;
        }
        if (sortBy === 'estoque') {
          return (calcItemStock(a) - calcItemStock(b)) * factor;
        }
        if (sortBy === 'minimo') {
          return (a.estoqueMinimo - b.estoqueMinimo) * factor;
        }
        if (sortBy === 'setor') {
          return (a.localizacao || '').localeCompare(b.localizacao || '') * factor;
        }
        if (sortBy === 'contagem') {
          const dateA = a.ultimaContagem ? new Date(a.ultimaContagem).getTime() : 0;
          const dateB = b.ultimaContagem ? new Date(b.ultimaContagem).getTime() : 0;
          return (dateA - dateB) * factor;
        }
        if (sortBy === 'status') {
          const priority: Record<string, number> = { critico: 0, alerta: 1, ok: 2 };
          const statA = priority[getItemStatus(a).status] ?? 3;
          const statB = priority[getItemStatus(b).status] ?? 3;
          return (statA - statB) * factor;
        }
        return 0;
      });
  }, [items, searchTerm, mainCategoryFilter, statusFilter, locationFilter, categoryFilter, sortBy, sortOrder]);

  const toggleSort = (col: 'nome' | 'estoque' | 'status' | 'minimo' | 'contagem' | 'setor') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar (Noir Poker Bar Style) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3.5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no Estoque de Destilados ou Refrigerantes..."
              className="w-full pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-zinc-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* CATEGORIAS PRINCIPAIS: Estoque de Destilados & Estoque de Refrigerantes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setMainCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                mainCategoryFilter === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Todos os Estoques ({counts.total})
            </button>
            <button
              onClick={() => setMainCategoryFilter('Estoque de Destilados')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                mainCategoryFilter === 'Estoque de Destilados'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <span>♠</span>
              <span>Estoque de Destilados ({counts.destiladosCount})</span>
            </button>
            <button
              onClick={() => setMainCategoryFilter('Estoque de Refrigerantes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                mainCategoryFilter === 'Estoque de Refrigerantes'
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <span>♣</span>
              <span>Estoque de Refrigerantes ({counts.refrigerantesCount})</span>
            </button>
          </div>
        </div>

        {/* Filter Row 2: Status & Strictly NICKS/RPC Sectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/80 text-xs">
          {/* Status Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium mr-1">Situação:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-zinc-800 text-white font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('critico')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                statusFilter === 'critico'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-rose-400 hover:bg-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Abaixo do Mínimo ({counts.criticos})
            </button>
            <button
              onClick={() => setStatusFilter('alerta')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                statusFilter === 'alerta'
                  ? 'bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold'
                  : 'text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Alerta ({counts.alertas})
            </button>
            <button
              onClick={() => setStatusFilter('ok')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                statusFilter === 'ok'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-emerald-400 hover:bg-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Normal ({counts.ok})
            </button>
          </div>

          {/* Sector filter: ONLY NICKS AND RPC */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-semibold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                Setor:
              </span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value as any)}
                className="px-2.5 py-1 bg-black border border-zinc-800 rounded text-xs text-white font-bold focus:outline-none focus:border-zinc-500"
              >
                <option value="all">Todos os Setores (NICKS e RPC)</option>
                <option value="NICKS">NICKS ({counts.nicksCount})</option>
                <option value="RPC">RPC ({counts.rpcCount})</option>
              </select>
            </div>

            {/* Subcategory Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Subcategoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1 bg-black border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 max-w-[190px]"
              >
                <option value="all">Todas as 20 ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black border-b border-zinc-800 text-xs font-semibold text-zinc-400">
              <tr>
                <th
                  onClick={() => toggleSort('status')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>Situação</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nome')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Bebida & Categoria</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {/* SETOR: NICKS ou RPC */}
                <th
                  onClick={() => toggleSort('setor')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none text-center w-24"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Setor</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                {/* DATA DA CONTAGEM */}
                <th
                  onClick={() => toggleSort('contagem')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Data da Contagem</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('estoque')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Estoque Atual</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('minimo')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Estoque Mínimo</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Estoque Ideal</th>
                <th className="px-4 py-3 text-center w-40">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Layers className="w-8 h-8 mx-auto text-zinc-600" />
                      <p className="text-sm font-medium text-zinc-300">
                        Nenhum produto encontrado com os filtros atuais
                      </p>
                      <p className="text-xs text-zinc-500">
                        Tente alternar o setor (NICKS/RPC) ou a categoria de estoque.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = calcItemStock(item);
                  const { status, deficit } = getItemStatus(item);
                  const isDest = item.tipo === 'destilado';
                  const doses = isDest ? calcDosesDisponiveis(item) : 0;
                  const mainCat = getItemMainCategory(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        status === 'critico' ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Situação / Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {status === 'critico' ? (
                          <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span>Crítico (-{deficit})</span>
                          </div>
                        ) : status === 'alerta' ? (
                          <div className="flex items-center gap-1.5 text-zinc-300 font-medium text-xs">
                            <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
                            <span>Alerta</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>Normal</span>
                          </div>
                        )}
                      </td>

                      {/* Nome, Categoria Principal & Subcategoria */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {isDest ? (
                              <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-200">
                                <Wine className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300">
                                <Beer className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span className="truncate">{item.nome}</span>
                              {item.volumeMl && (
                                <span className="text-xs text-zinc-400 font-mono font-normal">
                                  {item.volumeMl}ml
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                              <span className="text-zinc-300 font-medium">{mainCat}</span>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span>{item.categoria}</span>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span className="font-mono text-zinc-300">{formatStockDescription(item)}</span>
                              {isDest && doses > 0 && (
                                <>
                                  <span aria-hidden="true" className="text-zinc-600">·</span>
                                  <span className="text-zinc-300 font-mono">
                                    ~{doses} doses
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SETOR: NICKS ou RPC */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-black tracking-wider ${
                            item.localizacao === 'NICKS'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {item.localizacao}
                        </span>
                      </td>

                      {/* DATA DA CONTAGEM */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="font-semibold">{formatCountDate(item.ultimaContagem)}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-zinc-600" />
                          <span>Registro no turno</span>
                        </div>
                      </td>

                      {/* Estoque Atual */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isDest && (
                            <div className="scale-75 origin-right">
                              <BottleVisualizer
                                level={item.garrafasAbertasFracao || 0}
                                size="sm"
                                liquidColor={status === 'critico' ? '#f43f5e' : '#e2e8f0'}
                              />
                            </div>
                          )}

                          <div className="text-right">
                            <span
                              className={`text-base font-mono font-bold tabular-nums ${
                                status === 'critico' ? 'text-rose-400' : 'text-white'
                              }`}
                            >
                              {stock}
                            </span>
                            <span className="block text-[11px] text-zinc-500 font-mono">
                              {isDest ? 'garrafas' : 'unidades'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Estoque Mínimo */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
                        <div
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold tabular-nums ${
                            status === 'critico'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'text-zinc-300 bg-zinc-900 border border-zinc-800'
                          }`}
                        >
                          {item.estoqueMinimo} {isDest ? 'gf' : 'un'}
                        </div>
                      </td>

                      {/* Estoque Ideal */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs text-zinc-400 tabular-nums">
                        {item.estoqueIdeal || item.estoqueMinimo * 2} {isDest ? 'gf' : 'un'}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onQuickIncrement(item, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                            title="Subtrair 1 unidade/garrafa"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenAdjust(item)}
                            className="px-2.5 py-1 text-xs font-bold bg-white hover:bg-zinc-200 text-black rounded transition-all shadow-xs"
                            title="Ajustar contagem da garrafa aberta ou fardo"
                          >
                            Contar
                          </button>

                          <button
                            type="button"
                            onClick={() => onQuickIncrement(item, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                            title="Adicionar 1 unidade/garrafa"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors ml-1"
                            title="Editar cadastro do item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remover item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-black border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-400">
          <span>
            Mostrando <strong className="text-zinc-200">{filteredItems.length}</strong> de{' '}
            <strong className="text-zinc-200">{items.length}</strong> itens cadastrados · Setor: <strong className="text-white">{locationFilter === 'all' ? 'NICKS + RPC' : locationFilter}</strong>
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              {counts.criticos} abaixo do estoque mínimo
            </span>
            {onStartZeroCountSession && (
              <button
                onClick={onStartZeroCountSession}
                className="text-zinc-300 hover:text-white hover:underline font-bold"
              >
                Contagem do Zero →
              </button>
            )}
            <button
              onClick={onStartCountSession}
              className="text-white hover:underline font-bold flex items-center gap-1"
            >
              <span>Conferir Turno</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
