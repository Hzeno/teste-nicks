import React, { useState, useMemo } from 'react';
import { InventoryItem, MainCategory, InventoryLocation } from '../types/inventory';
import { calcItemStock, getItemStatus, calcDosesDisponiveis, formatBRL, formatCountDate, getItemMainCategory } from '../utils/calculations';
import { exportToNativeExcel, generateTSVForClipboard } from '../utils/excelExport';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Printer,
  Table,
  Search,
  AlertTriangle,
  Calendar,
  MapPin,
  Tag,
} from 'lucide-react';

interface ExcelViewProps {
  items: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
}

export const ExcelView: React.FC<ExcelViewProps> = ({ items, onUpdateItem }) => {
  const [activeSheet, setActiveSheet] = useState<'geral' | 'criticos' | 'resumo'>('geral');
  const [sectorFilter, setSectorFilter] = useState<'all' | 'NICKS' | 'RPC'>('all');
  const [mainCategoryFilter, setMainCategoryFilter] = useState<
    'all' | 'Estoque de Destilados' | 'Estoque de Refrigerantes'
  >('all');

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string; val: string }>({
    row: 1,
    col: 'A',
    val: 'Tanqueray London Dry',
  });
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');

  // Filtered rows for current sheet
  const displayItems = useMemo(() => {
    let list = items;
    if (activeSheet === 'criticos') {
      list = items.filter((i) => getItemStatus(i).status === 'critico');
    }

    // Sector Filter: Strictly NICKS and RPC
    if (sectorFilter !== 'all') {
      list = list.filter((i) => i.localizacao === sectorFilter);
    }

    // Main Category Filter: Estoque de Destilados vs Estoque de Refrigerantes
    if (mainCategoryFilter !== 'all') {
      list = list.filter((i) => getItemMainCategory(i) === mainCategoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.nome.toLowerCase().includes(q) ||
          i.categoria.toLowerCase().includes(q) ||
          i.fornecedor.toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, activeSheet, sectorFilter, mainCategoryFilter, search]);

  // Totals for Excel Footer
  const totals = useMemo(() => {
    let totalStock = 0;
    let totalDoses = 0;
    let totalValor = 0;
    let totalMin = 0;

    displayItems.forEach((i) => {
      const s = calcItemStock(i);
      totalStock += s;
      totalDoses += calcDosesDisponiveis(i);
      totalValor += s * (i.custoUnitario || 0);
      totalMin += i.estoqueMinimo || 0;
    });

    return {
      totalStock: Number(totalStock.toFixed(1)),
      totalDoses,
      totalValor,
      totalMin,
    };
  }, [displayItems]);

  // Category summary data
  const categorySummary = useMemo(() => {
    const map: Record<string, { count: number; stock: number; criticos: number; valor: number }> = {};
    items.forEach((item) => {
      const cat = item.categoria;
      const s = calcItemStock(item);
      const isCrit = getItemStatus(item).status === 'critico';
      const val = s * (item.custoUnitario || 0);

      if (!map[cat]) {
        map[cat] = { count: 0, stock: 0, criticos: 0, valor: 0 };
      }
      map[cat].count += 1;
      map[cat].stock += s;
      if (isCrit) map[cat].criticos += 1;
      map[cat].valor += val;
    });

    return Object.entries(map).map(([cat, data]) => ({
      categoria: cat,
      ...data,
      stock: Number(data.stock.toFixed(1)),
    }));
  }, [items]);

  const handleDownloadExcel = () => {
    exportToNativeExcel(items, 'Nicks_Sport_Bar_Contagem.xlsx');
  };

  const handleCopyClipboard = () => {
    const tsv = generateTSVForClipboard(displayItems);
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCellClick = (row: number, col: string, val: string) => {
    setSelectedCell({ row, col, val });
  };

  return (
    <div className="space-y-4">
      {/* Excel Ribbon & Control Bar */}
      <div className="bg-[#107c41] text-white rounded-t-xl p-3 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-black/30 flex items-center justify-center font-bold font-mono text-sm border border-white/20">
            X
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wide uppercase">
                Nicks_Sport_Bar_Contagem.xlsx
              </span>
              <span className="text-[11px] bg-black/40 px-1.5 py-0.5 rounded font-mono text-white">
                Setores NICKS & RPC
              </span>
            </div>
            <p className="text-[11px] text-emerald-100">
              Visualização com fórmulas, separação por Estoque de Destilados / Refrigerantes e Setor.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/20"
            title="Copiar dados tabulados para colar direto no Excel (Ctrl+V)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado para o Excel!' : 'Copiar (Ctrl+V)'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black font-extrabold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-black" />
            <span>Baixar .XLSX</span>
          </button>
        </div>
      </div>

      {/* Excel Formula Bar (fx) and Quick Filter Ribbon */}
      <div className="bg-zinc-950 border border-zinc-800 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="w-14 px-2 py-1 bg-black border border-zinc-800 text-center text-white font-bold rounded">
            {selectedCell.col}{selectedCell.row}
          </div>
          <div className="text-zinc-500 font-bold italic select-none">fx</div>
          <div className="flex-1 px-3 py-1 bg-black border border-zinc-800 text-zinc-100 rounded truncate">
            {selectedCell.val}
          </div>
        </div>

        {/* Setor and Category Dropdowns in Excel Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-sans">
          {/* Setor: NICKS and RPC */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-[11px]">Setor:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value as any)}
              className="px-2 py-1 bg-black border border-zinc-800 text-xs text-white font-bold rounded focus:outline-none"
            >
              <option value="all">NICKS e RPC</option>
              <option value="NICKS">NICKS</option>
              <option value="RPC">RPC</option>
            </select>
          </div>

          {/* Categoria Principal */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-[11px]">Estoque:</span>
            <select
              value={mainCategoryFilter}
              onChange={(e) => setMainCategoryFilter(e.target.value as any)}
              className="px-2 py-1 bg-black border border-zinc-800 text-xs text-white font-bold rounded focus:outline-none"
            >
              <option value="all">Todos os Estoques</option>
              <option value="Estoque de Destilados">Destilados</option>
              <option value="Estoque de Refrigerantes">Refrigerantes</option>
            </select>
          </div>

          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na planilha..."
              className="w-full pl-7 pr-2 py-1 bg-black border border-zinc-800 text-xs text-zinc-100 rounded focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid Container */}
      <div className="bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
        {activeSheet !== 'resumo' ? (
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-left text-xs border-collapse">
              {/* Excel Column Letters */}
              <thead>
                <tr className="bg-black text-zinc-400 font-mono text-[11px] select-none border-b border-zinc-800">
                  <th className="w-10 px-2 py-1.5 text-center bg-black border-r border-zinc-800 text-zinc-600 font-mono">
                    #
                  </th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80">A · Categoria</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80">B · Bebida / Rótulo</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-center">C · Setor</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">D · Vol (ml)</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">E · Fechadas</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">F · Aberta</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right font-bold text-white">
                    G · Total Estoque
                  </th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">H · Doses 50ml</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right font-bold text-white">
                    I · Est. Mínimo
                  </th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">J · Est. Ideal</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-center">K · Situação</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right">L · Custo (R$)</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80 text-right font-semibold">M · Valor Total</th>
                  <th className="px-3 py-1.5 border-r border-zinc-800/80">N · Data da Contagem</th>
                  <th className="px-3 py-1.5">O · Fornecedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono">
                {displayItems.map((item, index) => {
                  const rowNum = index + 1;
                  const stock = calcItemStock(item);
                  const { status, label, deficit } = getItemStatus(item);
                  const doses = calcDosesDisponiveis(item);
                  const valor = stock * (item.custoUnitario || 0);
                  const isCrit = status === 'critico';
                  const isDest = item.tipo === 'destilado';
                  const mainCat = getItemMainCategory(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-900/80 transition-colors ${
                        isCrit ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Row number */}
                      <td className="px-2 py-1.5 text-center bg-black/80 text-zinc-500 font-mono text-[10px] border-r border-zinc-800 select-none">
                        {rowNum}
                      </td>

                      {/* Col A: Categoria */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'A', `${mainCat} - ${item.categoria}`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 font-sans text-zinc-300 truncate max-w-[150px]"
                      >
                        {item.categoria}
                      </td>

                      {/* Col B: Nome */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'B', item.nome)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 font-sans font-bold text-white truncate max-w-[220px]"
                      >
                        {item.nome}
                      </td>

                      {/* Col C: Setor (NICKS ou RPC) */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'C', item.localizacao)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-center font-bold text-zinc-200"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]">
                          {item.localizacao}
                        </span>
                      </td>

                      {/* Col D: Volume */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'D', `${item.volumeMl}ml`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right text-zinc-400 tabular-nums"
                      >
                        {item.volumeMl}
                      </td>

                      {/* Col E: Fechadas */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'E', `${item.garrafasFechadas} fechadas`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right font-bold text-white tabular-nums cursor-pointer hover:bg-zinc-900"
                      >
                        {isDest ? item.garrafasFechadas : item.fardosFechados}
                      </td>

                      {/* Col F: Aberta */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'F', `Aberta: ${(item.garrafasAbertasFracao * 100).toFixed(0)}%`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right text-zinc-300 tabular-nums cursor-pointer hover:bg-zinc-900"
                      >
                        {isDest
                          ? `${Math.round((item.garrafasAbertasFracao || 0) * 100)}%`
                          : `${item.unidadesAvulsas} un`}
                      </td>

                      {/* Col G: Total em Estoque */}
                      <td
                        onClick={() =>
                          handleCellClick(
                            rowNum,
                            'G',
                            `=E${rowNum}+F${rowNum} (${stock} ${isDest ? 'garrafas' : 'unidades'})`
                          )
                        }
                        className={`px-3 py-1.5 border-r border-zinc-800/60 text-right font-bold tabular-nums ${
                          isCrit ? 'text-rose-400 font-extrabold' : 'text-white'
                        }`}
                      >
                        {stock}
                      </td>

                      {/* Col H: Doses */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'H', `${doses} doses de 50ml`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right text-zinc-400 tabular-nums"
                      >
                        {isDest ? doses : '-'}
                      </td>

                      {/* Col I: Estoque Mínimo */}
                      <td
                        onClick={() =>
                          handleCellClick(rowNum, 'I', `Estoque Mínimo de Segurança: ${item.estoqueMinimo}`)
                        }
                        className={`px-3 py-1.5 border-r border-zinc-800/60 text-right font-bold tabular-nums ${
                          isCrit ? 'bg-rose-950/60 text-rose-300' : 'text-zinc-300'
                        }`}
                      >
                        {item.estoqueMinimo}
                      </td>

                      {/* Col J: Estoque Ideal */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'J', `Estoque Ideal: ${item.estoqueIdeal}`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right text-zinc-400 tabular-nums"
                      >
                        {item.estoqueIdeal || item.estoqueMinimo * 2}
                      </td>

                      {/* Col K: Situação */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'K', label)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-center"
                      >
                        {isCrit ? (
                          <span className="inline-block px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold">
                            CRÍTICO (-{deficit})
                          </span>
                        ) : status === 'alerta' ? (
                          <span className="inline-block px-2 py-0.5 bg-zinc-800 text-zinc-200 rounded text-[10px] font-bold border border-zinc-700">
                            ALERTA
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                            NORMAL
                          </span>
                        )}
                      </td>

                      {/* Col L: Custo */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'L', formatBRL(item.custoUnitario || 0))}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right text-zinc-400 tabular-nums text-[11px]"
                      >
                        {formatBRL(item.custoUnitario || 0)}
                      </td>

                      {/* Col M: Valor Total */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'M', `=G${rowNum}*L${rowNum} (${formatBRL(valor)})`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-right font-bold text-white tabular-nums text-[11px]"
                      >
                        {formatBRL(valor)}
                      </td>

                      {/* Col N: Data da Contagem */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'N', `Contado em: ${formatCountDate(item.ultimaContagem)}`)}
                        className="px-3 py-1.5 border-r border-zinc-800/60 text-zinc-300 font-mono text-[11px] whitespace-nowrap"
                      >
                        {formatCountDate(item.ultimaContagem)}
                      </td>

                      {/* Col O: Fornecedor */}
                      <td
                        onClick={() => handleCellClick(rowNum, 'O', item.fornecedor)}
                        className="px-3 py-1.5 font-sans text-zinc-400 truncate max-w-[150px] text-[11px]"
                      >
                        {item.fornecedor}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Excel Total Row */}
              <tfoot>
                <tr className="bg-black font-mono font-bold text-xs border-t-2 border-zinc-700 text-zinc-200">
                  <td className="px-2 py-2 text-center bg-black text-zinc-600 border-r border-zinc-800">
                    Σ
                  </td>
                  <td colSpan={6} className="px-3 py-2 border-r border-zinc-800 text-zinc-400 text-right">
                    TOTAL / SOMA ({displayItems.length} linhas):
                  </td>
                  <td className="px-3 py-2 border-r border-zinc-800 text-right text-white font-extrabold tabular-nums">
                    {totals.totalStock}
                  </td>
                  <td className="px-3 py-2 border-r border-zinc-800 text-right text-zinc-300 tabular-nums">
                    {totals.totalDoses}
                  </td>
                  <td className="px-3 py-2 border-r border-zinc-800 text-right text-zinc-300 tabular-nums">
                    {totals.totalMin}
                  </td>
                  <td colSpan={3} className="px-3 py-2 border-r border-zinc-800 text-right text-zinc-400">
                    Valor Total em Garrafas:
                  </td>
                  <td className="px-3 py-2 border-r border-zinc-800 text-right text-emerald-400 font-black tabular-nums">
                    {formatBRL(totals.totalValor)}
                  </td>
                  <td colSpan={2} className="px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          /* RESUMO POR CATEGORIA TAB */
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                  <th className="px-4 py-2">Categoria Nicks Sport Bar</th>
                  <th className="px-4 py-2 text-right">Qtd de Rótulos</th>
                  <th className="px-4 py-2 text-right">Total Garrafas/Un em Estoque</th>
                  <th className="px-4 py-2 text-center">Itens Abaixo do Mínimo</th>
                  <th className="px-4 py-2 text-right">Valor em Estoque (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {categorySummary.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-2 font-bold text-white font-sans">
                      {cat.categoria}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-300 tabular-nums">
                      {cat.count} itens
                    </td>
                    <td className="px-4 py-2 text-right text-white font-bold tabular-nums">
                      {cat.stock} gf/un
                    </td>
                    <td className="px-4 py-2 text-center">
                      {cat.criticos > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold rounded text-[11px]">
                          🚨 {cat.criticos} críticos
                        </span>
                      ) : (
                        <span className="text-emerald-400">Ok</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-200 tabular-nums font-semibold">
                      {formatBRL(cat.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Excel Bottom Sheet Tabs */}
        <div className="bg-black border-t border-zinc-800 px-3 py-2 flex items-center gap-1.5 text-xs select-none">
          <span className="text-zinc-500 font-mono text-[11px] mr-2">Planilhas:</span>
          <button
            onClick={() => setActiveSheet('geral')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              activeSheet === 'geral'
                ? 'bg-zinc-800 text-white border-b-2 border-emerald-400 shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            Contagem Geral ({items.length})
          </button>

          <button
            onClick={() => setActiveSheet('criticos')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              activeSheet === 'criticos'
                ? 'bg-zinc-800 text-rose-300 border-b-2 border-rose-500 shadow-xs'
                : 'text-zinc-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            Abaixo do Mínimo ({items.filter((i) => getItemStatus(i).status === 'critico').length})
          </button>

          <button
            onClick={() => setActiveSheet('resumo')}
            className={`px-3 py-1 rounded font-bold transition-colors flex items-center gap-1.5 ${
              activeSheet === 'resumo'
                ? 'bg-zinc-800 text-white border-b-2 border-zinc-400 shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-300" />
            Resumo por Categoria
          </button>
        </div>
      </div>
    </div>
  );
};
