import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types/inventory';
import { calcItemStock, getItemStatus, formatBRL, calcSuggestedOrder } from '../utils/calculations';
import {
  ShoppingCart,
  Copy,
  Check,
  Printer,
  AlertTriangle,
  Wine,
  Beer,
  RotateCcw,
} from 'lucide-react';

interface PurchaseOrdersViewProps {
  items: InventoryItem[];
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ items }) => {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [onlyBelowMin, setOnlyBelowMin] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Editable purchase quantities overrides { itemId: qty }
  // Solicitado: somente comprar a diferença do estoque mínimo
  const [orderQtys, setOrderQtys] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    items.forEach((item) => {
      init[item.id] = calcSuggestedOrder(item);
    });
    return init;
  });

  const resetToMinimumDiff = () => {
    const init: Record<string, number> = {};
    items.forEach((item) => {
      init[item.id] = calcSuggestedOrder(item);
    });
    setOrderQtys(init);
  };

  // Extract suppliers
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.fornecedor) set.add(i.fornecedor);
    });
    return Array.from(set);
  }, [items]);

  // Filter items that need purchase (itens abaixo do mínimo ou com quantidade configurada)
  const purchaseItems = useMemo(() => {
    return items
      .filter((item) => {
        const stock = calcItemStock(item);
        const { status } = getItemStatus(item);

        if (onlyBelowMin && status !== 'critico') {
          return false;
        }

        if (selectedSupplier !== 'all' && item.fornecedor !== selectedSupplier) {
          return false;
        }

        const qty = orderQtys[item.id] ?? 0;
        return qty > 0 || stock < item.estoqueMinimo;
      })
      .sort((a, b) => {
        const statA = getItemStatus(a).status === 'critico' ? 0 : 1;
        const statB = getItemStatus(b).status === 'critico' ? 0 : 1;
        return statA - statB;
      });
  }, [items, selectedSupplier, onlyBelowMin, orderQtys]);

  // Totals
  const { totalEstimatedCost, criticalCount } = useMemo(() => {
    let totalItems = 0;
    let cost = 0;
    let crit = 0;

    purchaseItems.forEach((item) => {
      const qty = orderQtys[item.id] || 0;
      totalItems += qty;
      cost += qty * (item.custoUnitario || 0);
      if (getItemStatus(item).status === 'critico') crit++;
    });

    return {
      totalItemsToBuy: totalItems,
      totalEstimatedCost: cost,
      criticalCount: crit,
    };
  }, [purchaseItems, orderQtys]);

  const updateQty = (itemId: string, newQty: number) => {
    setOrderQtys((prev) => ({
      ...prev,
      [itemId]: Math.max(0, newQty),
    }));
  };

  // Generate WhatsApp formatted text
  const generateWhatsAppMessage = (): string => {
    const dataHora = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let msg = `📋 *NICKS SPORT BAR - PEDIDO DE COMPRA (DIFERENÇA DO ESTOQUE MÍNIMO)*\n`;
    msg += `📅 Data: ${dataHora}\n`;
    if (selectedSupplier !== 'all') {
      msg += `🏢 Fornecedor: *${selectedSupplier}*\n`;
    }
    msg += `🎯 *Critério:* Reposição calculada estritamente pela diferença para atingir o estoque mínimo.\n`;
    msg += `------------------------------------\n\n`;

    const itemsToOrder = purchaseItems.filter((i) => (orderQtys[i.id] || 0) > 0);

    if (itemsToOrder.length === 0) {
      msg += `Nenhum item com estoque abaixo do mínimo no momento.`;
      return msg;
    }

    itemsToOrder.forEach((item, idx) => {
      const qty = orderQtys[item.id];
      const isDest = item.tipo === 'destilado';
      if (isDest) {
        msg += `${idx + 1}. *${item.nome}* (${item.volumeMl}ml)\n`;
        msg += `   └ Pedido: *${qty} garrafa(s)* (Estoque mín: ${item.estoqueMinimo})\n`;
      } else {
        const fator = item.itensPorFardo || 12;
        const fardos = Math.floor(qty / fator);
        const avulsas = qty % fator;
        msg += `${idx + 1}. *${item.nome}*\n`;
        if (fardos > 0) {
          msg += `   └ Pedido: *${fardos} fardo(s)* com ${fator} un`;
          if (avulsas > 0) msg += ` + ${avulsas} avulsas`;
          msg += ` (Total: ${qty} un | Estoque mín: ${item.estoqueMinimo})\n`;
        } else {
          msg += `   └ Pedido: *${qty} unidade(s)* (Estoque mín: ${item.estoqueMinimo})\n`;
        }
      }
    });

    msg += `\n------------------------------------\n`;
    msg += `💰 *Valor Estimado:* ${formatBRL(totalEstimatedCost)}\n`;
    msg += `📍 *Nicks Sport Bar - Botafogo, Rio de Janeiro*`;

    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Automação de Reposição
            </span>
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
              <ShoppingCart className="w-5 h-5 text-white" />
              Lista de Compras & Reposição do Bar
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sugestão de compra calculada estritamente pela <strong className="text-zinc-200">diferença para atingir o estoque mínimo</strong> de segurança do Nicks Sport Bar.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={resetToMinimumDiff}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-black border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
              title="Recalcular quantidades sugeridas pela diferença do estoque mínimo"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              Recalcular p/ Mínimo
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-black border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-4 py-2 text-xs font-extrabold text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-black" />
                  Copiado para WhatsApp!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-black" />
                  Copiar Pedido (WhatsApp)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Bar & KPI Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Filtrar por Fornecedor</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todos os Fornecedores ({suppliers.length})</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={onlyBelowMin}
                onChange={(e) => setOnlyBelowMin(e.target.checked)}
                className="w-4 h-4 rounded bg-black border-zinc-700 text-white focus:ring-0 cursor-pointer"
              />
              <span className="text-zinc-300">Apenas itens abaixo do mínimo ({criticalCount})</span>
            </label>
          </div>

          <div className="bg-black p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">Total Itens a Comprar:</span>
            <span className="text-base font-mono font-black text-white tabular-nums">
              {purchaseItems.filter((i) => (orderQtys[i.id] || 0) > 0).length} produtos
            </span>
          </div>

          <div className="bg-black p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-400">Custo Estimado da Compra:</span>
            <span className="text-base font-mono font-black text-emerald-400 tabular-nums">
              {formatBRL(totalEstimatedCost)}
            </span>
          </div>
        </div>
      </div>

      {/* Purchase Items Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black border-b border-zinc-800 text-xs font-semibold text-zinc-400">
              <tr>
                <th className="px-4 py-3">Produto & Fornecedor</th>
                <th className="px-4 py-3 text-right">Estoque Atual</th>
                <th className="px-4 py-3 text-right">Estoque Mínimo</th>
                <th className="px-4 py-3 text-right">Diferença p/ Mínimo</th>
                <th className="px-4 py-3 text-center w-48">Qtd a Pedir (Mínimo)</th>
                <th className="px-4 py-3 text-right">Custo Unitário</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {purchaseItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Check className="w-8 h-8 mx-auto text-emerald-500" />
                      <p className="text-sm font-bold text-zinc-200">
                        Estoque 100% Abastecido!
                      </p>
                      <p className="text-xs text-zinc-500">
                        Nenhum produto está abaixo do estoque de segurança no momento.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                purchaseItems.map((item) => {
                  const stock = calcItemStock(item);
                  const { status, deficit } = getItemStatus(item);
                  const isDest = item.tipo === 'destilado';
                  const orderQty = orderQtys[item.id] || 0;
                  const subtotal = orderQty * (item.custoUnitario || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        status === 'critico' ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Produto & Fornecedor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0">
                            {isDest ? (
                              <Wine className="w-4 h-4 text-zinc-300" />
                            ) : (
                              <Beer className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{item.nome}</span>
                              {status === 'critico' && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  Abaixo do mín
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <span>{item.categoria}</span>
                              <span className="text-zinc-600">·</span>
                              <span className="text-zinc-500">{item.fornecedor}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Estoque Atual */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums">
                        <span
                          className={`font-bold ${
                            status === 'critico' ? 'text-rose-400' : 'text-zinc-200'
                          }`}
                        >
                          {stock}
                        </span>{' '}
                        <span className="text-xs text-zinc-500">{isDest ? 'gf' : 'un'}</span>
                      </td>

                      {/* Estoque Mínimo */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-zinc-300 font-bold tabular-nums">
                        {item.estoqueMinimo} {isDest ? 'gf' : 'un'}
                      </td>

                      {/* Diferença p/ Mínimo (Déficit) */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono tabular-nums text-xs">
                        {deficit > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                            -{deficit} {isDest ? 'gf' : 'un'}
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-medium">0 (OK)</span>
                        )}
                      </td>

                      {/* Qtd a Pedir */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1.5 bg-black p-1 rounded-lg border border-zinc-800">
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(
                                item.id,
                                isDest
                                  ? Math.max(0, orderQty - 1)
                                  : Math.max(0, orderQty - (item.itensPorFardo || 6))
                              )
                            }
                            className="w-6 h-6 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={orderQty}
                            onChange={(e) => updateQty(item.id, Number(e.target.value))}
                            className="w-14 text-center bg-transparent text-sm font-mono font-black text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(
                                item.id,
                                isDest
                                  ? orderQty + 1
                                  : orderQty + (item.itensPorFardo || 6)
                              )
                            }
                            className="w-6 h-6 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        {!isDest && item.itensPorFardo && (
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {orderQty > 0
                              ? `~${Math.round(orderQty / item.itensPorFardo)} fardos de ${item.itensPorFardo}`
                              : ''}
                          </div>
                        )}
                      </td>

                      {/* Custo Unitário */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs text-zinc-400 tabular-nums">
                        {formatBRL(item.custoUnitario || 0)}
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold text-white tabular-nums">
                        {formatBRL(subtotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
