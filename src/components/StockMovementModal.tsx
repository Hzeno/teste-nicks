import React, { useState } from 'react';
import { InventoryItem, StockMovement } from '../types/inventory';
import { X, ArrowDownRight, AlertOctagon } from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  preselectedItemId?: string;
  onSaveMovement: (movement: StockMovement, updatedItem: InventoryItem) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  items,
  preselectedItemId,
  onSaveMovement,
}) => {
  if (!isOpen) return null;

  const [selectedItemId, setSelectedItemId] = useState<string>(
    preselectedItemId || (items[0]?.id || '')
  );
  const [tipo, setTipo] = useState<'entrada' | 'quebra_perda' | 'saida_venda'>('entrada');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [responsavel, setResponsavel] = useState<string>('Bartender de Turno');
  const [motivo, setMotivo] = useState<string>('');

  const currentItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    const qty = Math.abs(Number(quantidade)) || 1;
    const finalQty = tipo === 'entrada' ? qty : -qty;

    // Build updated item
    const updated: InventoryItem = { ...currentItem };
    if (currentItem.tipo === 'destilado') {
      if (tipo === 'entrada') {
        updated.garrafasFechadas = (updated.garrafasFechadas || 0) + qty;
      } else {
        if (updated.garrafasFechadas >= qty) {
          updated.garrafasFechadas -= qty;
        } else {
          const rem = qty - updated.garrafasFechadas;
          updated.garrafasFechadas = 0;
          updated.garrafasAbertasFracao = Math.max(0, (updated.garrafasAbertasFracao || 0) - rem);
        }
      }
    } else {
      if (tipo === 'entrada') {
        updated.unidadesAvulsas = (updated.unidadesAvulsas || 0) + qty;
      } else {
        if (updated.unidadesAvulsas >= qty) {
          updated.unidadesAvulsas -= qty;
        } else {
          const deficit = qty - updated.unidadesAvulsas;
          updated.unidadesAvulsas = 0;
          const fardosParaAbrir = Math.ceil(deficit / (updated.itensPorFardo || 12));
          updated.fardosFechados = Math.max(0, (updated.fardosFechados || 0) - fardosParaAbrir);
          const totalLiberado = fardosParaAbrir * (updated.itensPorFardo || 12);
          updated.unidadesAvulsas = Math.max(0, totalLiberado - deficit);
        }
      }
    }

    const now = new Date().toISOString();
    updated.atualizadoEm = now;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: currentItem.id,
      itemNome: currentItem.nome,
      tipo,
      quantidade: finalQty,
      unidadeDescricao:
        currentItem.tipo === 'destilado'
          ? `${qty} garrafa${qty > 1 ? 's' : ''}`
          : `${qty} unidade${qty > 1 ? 's' : ''}`,
      motivo: motivo.trim() || (tipo === 'entrada' ? 'Recebimento de compra' : 'Perda ou quebra no bar'),
      responsavel: responsavel.trim() || 'Equipe do Bar',
      criadoEm: now,
    };

    onSaveMovement(movement, updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Registrar Movimentação</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Nicks Sport Bar · Entradas de compra, reposição e perdas/quebras
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          {/* Movement Type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Tipo de Operação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipo('entrada')}
                className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  tipo === 'entrada'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                Entrada (Compra)
              </button>

              <button
                type="button"
                onClick={() => setTipo('quebra_perda')}
                className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  tipo === 'quebra_perda'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                Quebra / Avaria
              </button>
            </div>
          </div>

          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Selecione o Item
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.tipo === 'destilado' ? 'Destilado' : 'Refrigerante'})
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Quantidade ({currentItem?.tipo === 'destilado' ? 'garrafas inteiras' : 'unidades/latas'})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                step={currentItem?.tipo === 'destilado' ? '0.5' : '1'}
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white font-mono font-bold focus:outline-none focus:border-zinc-500"
              />
              <span className="text-xs text-zinc-400 font-mono shrink-0">
                {currentItem?.tipo === 'destilado' ? 'garrafas' : 'latas/un'}
              </span>
            </div>
          </div>

          {/* Responsável e Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Responsável
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome do colaborador"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Motivo / Justificativa
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={tipo === 'entrada' ? 'Ex: NF 1234 Distribuidora' : 'Ex: Garrafa escorregou no piso molhado'}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-sm font-black rounded-lg transition-all shadow-sm flex items-center gap-1.5 active:scale-95 ${
                tipo === 'entrada'
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {tipo === 'entrada' ? 'Confirmar Entrada' : 'Registrar Quebra/Perda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
