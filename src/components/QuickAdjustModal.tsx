import React, { useState } from 'react';
import { InventoryItem } from '../types/inventory';
import { BottleVisualizer } from './BottleVisualizer';
import { calcItemStock, getItemStatus, formatBRL, formatCountDate } from '../utils/calculations';
import { Minus, Plus, X, Check, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface QuickAdjustModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: InventoryItem, reason?: string) => void;
}

export const QuickAdjustModal: React.FC<QuickAdjustModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isDestilado = item.tipo === 'destilado';

  // Current local date/time string for input (YYYY-MM-DDTHH:mm)
  const getInitialDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Local editing state
  const [dataContagem, setDataContagem] = useState<string>(getInitialDateTimeLocal);
  const [fechadas, setFechadas] = useState<number>(item.garrafasFechadas || 0);
  const [fracao, setFracao] = useState<number>(item.garrafasAbertasFracao || 0);
  const [fardos, setFardos] = useState<number>(item.fardosFechados || 0);
  const [avulsas, setAvulsas] = useState<number>(item.unidadesAvulsas || 0);
  const [motivo, setMotivo] = useState<string>('Conferência e contagem de turno');

  // Preview calculation
  const novoTimestamp = (() => {
    try {
      return new Date(dataContagem).toISOString();
    } catch {
      return new Date().toISOString();
    }
  })();

  const tempItem: InventoryItem = {
    ...item,
    garrafasFechadas: fechadas,
    garrafasAbertasFracao: fracao,
    fardosFechados: fardos,
    unidadesAvulsas: avulsas,
    ultimaContagem: novoTimestamp,
    atualizadoEm: novoTimestamp,
  };

  const novoEstoque = calcItemStock(tempItem);
  const statusInfo = getItemStatus(tempItem);
  const estoqueAnterior = calcItemStock(item);
  const diferenca = Number((novoEstoque - estoqueAnterior).toFixed(2));

  const handleConfirm = () => {
    onSave(tempItem, motivo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                {item.tipo === 'destilado' ? 'Destilado ♠' : 'Refrigerante ♣'} · {item.categoria}
              </span>
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mt-0.5">{item.nome}</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Local: <span className="text-zinc-200 font-medium">{item.localizacao}</span> · Mínimo: <span className="text-zinc-200 font-mono font-bold">{item.estoqueMinimo} {isDestilado ? 'gf' : 'un'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-5 space-y-5">
          {/* Data da Contagem Selector */}
          <div className="bg-black p-3 rounded-lg border border-zinc-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="font-semibold block text-white">Data da Realização desta Contagem:</span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  Última contagem: {formatCountDate(item.ultimaContagem)}
                </span>
              </div>
            </div>
            <input
              type="datetime-local"
              value={dataContagem}
              onChange={(e) => setDataContagem(e.target.value)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-zinc-400"
            />
          </div>

          {isDestilado ? (
            /* DESTILADO CONTROLS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              {/* Garrafas Fechadas */}
              <div className="bg-black p-4 rounded-xl border border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Garrafas Fechadas (Lacradas)
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setFechadas(Math.max(0, fechadas - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-mono font-black text-white tabular-nums">
                    {fechadas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFechadas(fechadas + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex gap-1 justify-center">
                  {[0, 1, 2, 3, 5, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFechadas(n)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                        fechadas === n ? 'bg-white text-black font-extrabold shadow-xs' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Garrafa Aberta (Nível da Garrafa em uso) */}
              <div className="bg-black p-4 rounded-xl border border-zinc-800 flex flex-col items-center">
                <span className="text-xs font-semibold text-zinc-400 mb-1">
                  Garrafa Aberta no Balcão
                </span>
                <BottleVisualizer
                  level={fracao}
                  onChange={(val) => setFracao(Number(val.toFixed(2)))}
                  interactive={true}
                  size="md"
                  liquidColor={statusInfo.status === 'critico' ? '#f43f5e' : '#f8fafc'}
                />
              </div>
            </div>
          ) : (
            /* REFRIGERANTE CONTROLS */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fardos Fechados */}
              <div className="bg-black p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400">
                    Fardos Fechados
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {item.itensPorFardo || 12} un/fardo
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setFardos(Math.max(0, fardos - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-mono font-black text-white tabular-nums">
                      {fardos}
                    </span>
                    <span className="block text-xs text-zinc-500 font-mono">
                      = {fardos * (item.itensPorFardo || 12)} un
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFardos(fardos + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex gap-1.5 justify-center">
                  {[0, 1, 2, 4, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFardos(n)}
                      className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                        fardos === n ? 'bg-white text-black font-extrabold shadow-xs' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unidades Avulsas (Geladeira) */}
              <div className="bg-black p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-400">
                    Unidades Avulsas
                  </label>
                  <span className="text-xs text-zinc-500 font-mono">latas / gfs</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setAvulsas(Math.max(0, avulsas - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center">
                    <span className="text-2xl font-mono font-black text-white tabular-nums">
                      {avulsas}
                    </span>
                    <span className="block text-xs text-zinc-500 font-mono">avulsas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAvulsas(avulsas + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex gap-1 justify-center">
                  {[0, 2, 4, 6, 8, 10, 12].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAvulsas(n)}
                      className={`px-1.5 py-0.5 text-xs font-mono rounded transition-colors ${
                        avulsas === n ? 'bg-white text-black font-extrabold shadow-xs' : 'bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Comparativo de Estoque e Status */}
          <div className="p-3.5 bg-black rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-zinc-400">Novo Estoque Calculado:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-mono font-black text-white tabular-nums">
                  {novoEstoque}
                </span>
                <span className="text-xs text-zinc-400">
                  {isDestilado ? 'garrafas totais' : 'unidades totais'}
                </span>
                {diferenca !== 0 && (
                  <span
                    className={`text-xs font-mono font-bold ${
                      diferenca > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    ({diferenca > 0 ? `+${diferenca}` : diferenca} vs anterior)
                  </span>
                )}
              </div>
            </div>

            {/* Status vs Estoque Mínimo */}
            <div className="text-right">
              <span className="text-xs text-zinc-400">Situação do Estoque Mínimo:</span>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                {statusInfo.status === 'critico' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Crítico: Abaixo do mín ({item.estoqueMinimo})
                  </span>
                ) : statusInfo.status === 'alerta' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Atenção: Perto do mín ({item.estoqueMinimo})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Seguro (Mínimo: {item.estoqueMinimo})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Motivo do Ajuste */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Motivo ou Nota do Ajuste
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Contagem de fechamento de turno, garrafa reposta"
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Check className="w-4 h-4 text-black" />
            Salvar Contagem
          </button>
        </div>
      </div>
    </div>
  );
};
