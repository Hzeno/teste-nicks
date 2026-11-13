import React, { useState, useMemo } from 'react';
import { InventoryItem, InventoryCountSession, MainCategory, InventoryLocation } from '../types/inventory';
import { calcItemStock, getItemStatus, formatBRL, getItemMainCategory, formatCountDate } from '../utils/calculations';
import * as XLSX from 'xlsx';
import {
  ArrowLeftRight,
  Calendar,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  TrendingDown,
  TrendingUp,
  Wine,
  Beer,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  MapPin,
  Tag,
} from 'lucide-react';

interface DayComparisonViewProps {
  items: InventoryItem[];
  sessions: InventoryCountSession[];
  onStartNewCount: () => void;
}

interface ItemComparisonRow {
  id: string;
  nome: string;
  tipo: string;
  categoria: string;
  categoriaPrincipal: MainCategory;
  localizacao: InventoryLocation;
  estoqueMinimo: number;
  custoUnitario: number;
  qtdDia1: number;
  qtdDia2: number;
  variacao: number; // Dia 2 - Dia 1
  valorVariacao: number; // variacao * custoUnitario
}

export const DayComparisonView: React.FC<DayComparisonViewProps> = ({
  items,
  sessions,
  onStartNewCount,
}) => {
  // Sort sessions newest to oldest
  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [sessions]);

  // Session 1 (Base / Dia Anterior) and Session 2 (Comparativo / Dia Seguinte ou Atual)
  const [selectedSession1Id, setSelectedSession1Id] = useState<string>(() => {
    // Default to older session if available
    return sortedSessions.length >= 2 ? sortedSessions[1].id : sortedSessions[0]?.id || 'current';
  });

  const [selectedSession2Id, setSelectedSession2Id] = useState<string>(() => {
    // Default to newest session or current stock
    return sortedSessions.length >= 1 ? sortedSessions[0].id : 'current';
  });

  // Filters
  const [sectorFilter, setSectorFilter] = useState<'all' | 'NICKS' | 'RPC'>('all');
  const [categoryGroupFilter, setCategoryGroupFilter] = useState<
    'all' | 'Estoque de Destilados' | 'Estoque de Refrigerantes'
  >('all');
  const [variationFilter, setVariationFilter] = useState<'all' | 'consumo' | 'entrada' | 'zero'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Helper to extract stock value for an item in a specific session
  const getStockFromSessionOrCurrent = (sessionOrId: string, item: InventoryItem): number => {
    if (sessionOrId === 'current') {
      return calcItemStock(item);
    }
    const session = sessions.find((s) => s.id === sessionOrId);
    if (!session) return calcItemStock(item);

    const record = session.registros.find((r) => r.itemId === item.id);
    if (record) {
      return record.estoqueContado;
    }
    // Fallback to stock
    return calcItemStock(item);
  };

  // Get labels for chosen dates
  const session1Label = useMemo(() => {
    if (selectedSession1Id === 'current') return 'Estoque Atual em Tempo Real';
    const s = sessions.find((sess) => sess.id === selectedSession1Id);
    if (!s) return 'Contagem Anterior';
    return `${formatCountDate(s.data)} (${s.responsavel})`;
  }, [selectedSession1Id, sessions]);

  const session2Label = useMemo(() => {
    if (selectedSession2Id === 'current') return 'Estoque Atual em Tempo Real';
    const s = sessions.find((sess) => sess.id === selectedSession2Id);
    if (!s) return 'Contagem Recente';
    return `${formatCountDate(s.data)} (${s.responsavel})`;
  }, [selectedSession2Id, sessions]);

  // Compute comparison rows
  const comparisonRows = useMemo<ItemComparisonRow[]>(() => {
    return items.map((item) => {
      const qtd1 = getStockFromSessionOrCurrent(selectedSession1Id, item);
      const qtd2 = getStockFromSessionOrCurrent(selectedSession2Id, item);
      const variacao = Number((qtd2 - qtd1).toFixed(2));
      const valorVariacao = Number((variacao * (item.custoUnitario || 0)).toFixed(2));

      return {
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        categoria: item.categoria,
        categoriaPrincipal: getItemMainCategory(item),
        localizacao: item.localizacao || 'NICKS',
        estoqueMinimo: item.estoqueMinimo,
        custoUnitario: item.custoUnitario || 0,
        qtdDia1: qtd1,
        qtdDia2: qtd2,
        variacao,
        valorVariacao,
      };
    });
  }, [items, selectedSession1Id, selectedSession2Id, sessions]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return comparisonRows.filter((row) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (
          !row.nome.toLowerCase().includes(q) &&
          !row.categoria.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Sector filter: NICKS and RPC only
      if (sectorFilter !== 'all' && row.localizacao !== sectorFilter) {
        return false;
      }

      // Category Group: Estoque de Destilados vs Estoque de Refrigerantes
      if (categoryGroupFilter !== 'all' && row.categoriaPrincipal !== categoryGroupFilter) {
        return false;
      }

      // Variation filter
      if (variationFilter === 'consumo' && row.variacao >= 0) return false;
      if (variationFilter === 'entrada' && row.variacao <= 0) return false;
      if (variationFilter === 'zero' && row.variacao !== 0) return false;

      return true;
    });
  }, [comparisonRows, searchTerm, sectorFilter, categoryGroupFilter, variationFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalConsumoGf = 0;
    let totalConsumoUn = 0;
    let custoTotalConsumo = 0;
    let totalEntradas = 0;
    let maiorSaidaNome = '-';
    let maiorSaidaQtd = 0;

    comparisonRows.forEach((r) => {
      if (r.variacao < 0) {
        const consumed = Math.abs(r.variacao);
        if (r.tipo === 'destilado') {
          totalConsumoGf += consumed;
        } else {
          totalConsumoUn += consumed;
        }
        custoTotalConsumo += consumed * r.custoUnitario;

        if (consumed > maiorSaidaQtd) {
          maiorSaidaQtd = consumed;
          maiorSaidaNome = `${r.nome} (-${consumed})`;
        }
      } else if (r.variacao > 0) {
        totalEntradas += r.variacao;
      }
    });

    return {
      totalConsumoGf: Number(totalConsumoGf.toFixed(1)),
      totalConsumoUn: Math.round(totalConsumoUn),
      custoTotalConsumo,
      totalEntradas: Number(totalEntradas.toFixed(1)),
      maiorSaidaNome,
    };
  }, [comparisonRows]);

  // Export comparison to XLSX
  const handleExportComparisonExcel = () => {
    const dataToExport = filteredRows.map((r, idx) => ({
      'Item Nº': idx + 1,
      'Categoria Principal': r.categoriaPrincipal,
      'Subcategoria': r.categoria,
      'Produto / Bebida': r.nome,
      'Setor': r.localizacao,
      'Dia Anterior (Qtd)': r.qtdDia1,
      'Dia Recente (Qtd)': r.qtdDia2,
      'Variação / Consumo': r.variacao,
      'Status': r.variacao < 0 ? 'Consumo de Turno' : r.variacao > 0 ? 'Entrada / Reposição' : 'Sem Alteração',
      'Custo Unitário (R$)': r.custoUnitario,
      'Custo da Variação (R$)': Math.abs(r.valorVariacao),
      'Estoque Mínimo': r.estoqueMinimo,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 24 },
      { wch: 20 },
      { wch: 38 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo Dia a Dia');
    XLSX.writeFile(wb, `Nicks_Sport_Comparativo_${Date.now()}.xlsx`);
  };

  // Copy text summary for WhatsApp
  const handleCopyWhatsApp = () => {
    let msg = `📊 *NICKS SPORT BAR - COMPARATIVO DE CONTAGEM DIA A DIA*\n`;
    msg += `📅 Dia 1 (Base): ${session1Label}\n`;
    msg += `📅 Dia 2 (Comparado): ${session2Label}\n`;
    msg += `🏢 Setor: ${sectorFilter === 'all' ? 'Todos (NICKS e RPC)' : sectorFilter}\n`;
    msg += `📦 Categoria: ${categoryGroupFilter === 'all' ? 'Destilados e Refrigerantes' : categoryGroupFilter}\n`;
    msg += `------------------------------------\n`;
    msg += `📉 *Consumo Destilados:* ~${metrics.totalConsumoGf} garrafas\n`;
    msg += `📉 *Consumo Refrigerantes:* ~${metrics.totalConsumoUn} unidades\n`;
    msg += `💰 *Custo Total de Consumo:* ${formatBRL(metrics.custoTotalConsumo)}\n`;
    msg += `⭐ *Maior Saída:* ${metrics.maiorSaidaNome}\n`;
    msg += `------------------------------------\n\n`;

    const topConsumed = filteredRows
      .filter((r) => r.variacao < 0)
      .sort((a, b) => a.variacao - b.variacao)
      .slice(0, 8);

    if (topConsumed.length > 0) {
      msg += `*Principais Saídas no Período:*\n`;
      topConsumed.forEach((r, i) => {
        msg += `${i + 1}. ${r.nome} [${r.localizacao}]: ${r.qtdDia1} ➔ ${r.qtdDia2} (*${r.variacao}*)\n`;
      });
    }

    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Comparison Selector */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-mono text-zinc-400 font-bold">
                Auditoria de Giro & Consumo
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-zinc-300 font-mono">♠ NICKS & RPC</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <ArrowLeftRight className="w-6 h-6 text-white" />
              Comparativo de Contagem Dia a Dia
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Compare a contagem física de um dia com a do outro para calcular o consumo real do bar, perdas e saídas.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportComparisonExcel}
              className="px-4 py-2 text-xs font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-black" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Date Selection Box: Dia 1 vs Dia 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black p-4 rounded-xl border border-zinc-800">
          {/* Dia 1 (Contagem Anterior) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dia 1 (Contagem Base / Anterior)</span>
              </label>
              <span className="text-[11px] font-mono text-zinc-500">Ponto de Partida</span>
            </div>
            <select
              value={selectedSession1Id}
              onChange={(e) => setSelectedSession1Id(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-zinc-400"
            >
              {sortedSessions.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  📅 {formatCountDate(s.data)} — {s.responsavel} ({s.setor || 'NICKS'})
                </option>
              ))}
              <option value="current">⚡ Estoque Atual em Tempo Real</option>
            </select>
            <p className="text-[11px] text-zinc-500 truncate">
              {session1Label}
            </p>
          </div>

          {/* Dia 2 (Contagem Recente / Seguinte) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dia 2 (Contagem Comparada / Recente)</span>
              </label>
              <span className="text-[11px] font-mono text-zinc-500">Fechamento do Período</span>
            </div>
            <select
              value={selectedSession2Id}
              onChange={(e) => setSelectedSession2Id(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-zinc-400"
            >
              <option value="current">⚡ Estoque Atual em Tempo Real</option>
              {sortedSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  📅 {formatCountDate(s.data)} — {s.responsavel} ({s.setor || 'NICKS'})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500 truncate">
              {session2Label}
            </p>
          </div>
        </div>

        {/* Filter Controls Row (Setor NICKS/RPC + Categoria Destilados/Refrigerantes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          {/* Setor: STRICTLY NICKS and RPC */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-zinc-500" />
              <span>Filtrar por Setor</span>
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todos os Setores (NICKS e RPC)</option>
              <option value="NICKS">NICKS</option>
              <option value="RPC">RPC</option>
            </select>
          </div>

          {/* Categoria: Estoque de Destilados vs Estoque de Refrigerantes */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-zinc-500" />
              <span>Categoria de Estoque</span>
            </label>
            <select
              value={categoryGroupFilter}
              onChange={(e) => setCategoryGroupFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todas (Destilados & Refrigerantes)</option>
              <option value="Estoque de Destilados">🍸 Estoque de Destilados</option>
              <option value="Estoque de Refrigerantes">🥤 Estoque de Refrigerantes</option>
            </select>
          </div>

          {/* Tipo de Variação */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Filtro de Variação
            </label>
            <select
              value={variationFilter}
              onChange={(e) => setVariationFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todas as Variações</option>
              <option value="consumo">📉 Apenas Consumo / Saída (Negativo)</option>
              <option value="entrada">📈 Apenas Entradas / Aumento</option>
              <option value="zero">Estáveis (Sem Variação)</option>
            </select>
          </div>

          {/* Busca por Texto */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Buscar Bebida
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome do rótulo ou marca..."
                className="w-full pl-8 pr-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Comparison Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-300 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Saída de Destilados
            </span>
            <span className="font-mono text-zinc-500">♠ Bar</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-rose-400 tabular-nums">
              -{metrics.totalConsumoGf}
            </span>
            <span className="text-xs text-zinc-400">garrafas consumidas</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Variação entre as 2 contagens
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-300 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Saída de Refrigerantes
            </span>
            <span className="font-mono text-zinc-500">♣ Mixers</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-rose-400 tabular-nums">
              -{metrics.totalConsumoUn}
            </span>
            <span className="text-xs text-zinc-400">latas e garrafas</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Vendas e serviço do salão
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-300">Custo Total Consumido</span>
            <span className="font-mono text-zinc-500">BRL</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-white tabular-nums">
              {formatBRL(metrics.custoTotalConsumo)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Valor de custo das bebidas consumidas
          </p>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-semibold text-zinc-300">Maior Giro / Consumo</span>
            <span className="font-mono text-zinc-500">Destaque</span>
          </div>
          <div className="text-sm font-bold text-white truncate mt-1">
            {metrics.maiorSaidaNome}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Item com maior redução no turno
          </p>
        </div>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black border-b border-zinc-800 text-xs font-semibold text-zinc-400">
              <tr>
                <th className="px-4 py-3">Bebida / Rótulo</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-center">Setor</th>
                <th className="px-4 py-3 text-right">Dia 1 (Base)</th>
                <th className="px-4 py-3 text-right">Dia 2 (Comparado)</th>
                <th className="px-4 py-3 text-right font-black text-white">Variação / Consumo</th>
                <th className="px-4 py-3 text-right">Custo da Saída</th>
                <th className="px-4 py-3 text-center">Situação do Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-mono">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 font-sans">
                    Nenhum item atende aos filtros de setor ou categoria selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isDest = row.tipo === 'destilado';
                  const isNegative = row.variacao < 0;
                  const isPositive = row.variacao > 0;
                  const isBelowMin = row.qtdDia2 < row.estoqueMinimo;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        isBelowMin ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Nome */}
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center gap-2">
                          {isDest ? (
                            <Wine className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          ) : (
                            <Beer className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <span className="font-bold text-white block truncate">{row.nome}</span>
                            <span className="text-[11px] text-zinc-500 font-mono">
                              Mínimo: {row.estoqueMinimo} {isDest ? 'gf' : 'un'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="px-4 py-3 font-sans text-xs">
                        <span className="text-zinc-300 block">{row.categoriaPrincipal}</span>
                        <span className="text-zinc-500 text-[11px]">{row.categoria}</span>
                      </td>

                      {/* Setor: NICKS ou RPC */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-xs font-black tracking-wider ${
                            row.localizacao === 'NICKS'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {row.localizacao}
                        </span>
                      </td>

                      {/* Qtd Dia 1 */}
                      <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                        {row.qtdDia1} <span className="text-[11px] text-zinc-600">{isDest ? 'gf' : 'un'}</span>
                      </td>

                      {/* Qtd Dia 2 */}
                      <td className="px-4 py-3 text-right font-bold text-white tabular-nums">
                        {row.qtdDia2} <span className="text-[11px] text-zinc-500">{isDest ? 'gf' : 'un'}</span>
                      </td>

                      {/* Variação (Dia 2 - Dia 1) */}
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {isNegative ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-black border border-rose-500/30">
                            <TrendingDown className="w-3 h-3" />
                            <span>{row.variacao} {isDest ? 'gf' : 'un'}</span>
                          </div>
                        ) : isPositive ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30">
                            <TrendingUp className="w-3 h-3" />
                            <span>+{row.variacao} {isDest ? 'gf' : 'un'}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500">0</span>
                        )}
                      </td>

                      {/* Custo da Variação */}
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-300">
                        {row.variacao !== 0 ? formatBRL(Math.abs(row.valorVariacao)) : '-'}
                      </td>

                      {/* Situação do Estoque */}
                      <td className="px-4 py-3 text-center font-sans text-xs">
                        {isBelowMin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
                            <AlertTriangle className="w-3 h-3" />
                            Abaixo do mín ({row.estoqueMinimo})
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-xs font-semibold">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-3 bg-black border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-400">
          <span>
            Exibindo <strong className="text-white">{filteredRows.length}</strong> de{' '}
            <strong className="text-white">{items.length}</strong> itens comparados
          </span>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">
              Setor selecionado: <strong className="text-zinc-200">{sectorFilter === 'all' ? 'NICKS + RPC' : sectorFilter}</strong>
            </span>
            <button
              onClick={onStartNewCount}
              className="text-white hover:underline font-bold"
            >
              Iniciar Nova Contagem →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
