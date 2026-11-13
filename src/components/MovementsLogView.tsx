import React, { useState } from 'react';
import { StockMovement, InventoryCountSession } from '../types/inventory';
import {
  History,
  ArrowDownRight,
  AlertOctagon,
  ClipboardList,
  Calendar,
  Plus,
} from 'lucide-react';

interface MovementsLogViewProps {
  movements: StockMovement[];
  sessions: InventoryCountSession[];
  onOpenNewMovement: () => void;
}

export const MovementsLogView: React.FC<MovementsLogViewProps> = ({
  movements,
  sessions,
  onOpenNewMovement,
}) => {
  const [activeTab, setActiveTab] = useState<'movimentos' | 'auditorias'>('movimentos');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMovements = movements.filter((m) => {
    if (filterType === 'all') return true;
    return m.tipo === filterType;
  });

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Rastreabilidade e Fechamentos
          </span>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
            <History className="w-5 h-5 text-white" />
            Histórico de Movimentações & Auditorias de Turno
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Registro cronológico das contagens físicas, entradas de reposição e perdas no Nicks Sport Bar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-black rounded-lg border border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('movimentos')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'movimentos'
                  ? 'bg-white text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Movimentações ({movements.length})
            </button>
            <button
              onClick={() => setActiveTab('auditorias')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'auditorias'
                  ? 'bg-white text-black font-extrabold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sessões de Contagem ({sessions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewMovement}
            className="px-3.5 py-2 text-xs font-extrabold text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 text-black" />
            Lançar Movimento
          </button>
        </div>
      </div>

      {activeTab === 'movimentos' ? (
        /* MOVEMENTS LIST */
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Movement Type Filter */}
          <div className="px-4 py-3 bg-black border-b border-zinc-800 flex items-center gap-2 text-xs">
            <span className="text-zinc-500 mr-2">Filtrar:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('entrada')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'entrada' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('quebra_perda')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'quebra_perda' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Quebras / Perdas
            </button>
            <button
              onClick={() => setFilterType('ajuste_inventario')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterType === 'ajuste_inventario' ? 'bg-zinc-800 text-white font-bold border border-zinc-700' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Ajustes de Contagem
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black text-xs font-semibold text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Item do Bar</th>
                  <th className="px-4 py-3 text-right">Quantidade</th>
                  <th className="px-4 py-3">Motivo / Observação</th>
                  <th className="px-4 py-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 text-xs">
                      Nenhuma movimentação registrada nesta categoria.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => {
                    const isPositive = mov.quantidade > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-zinc-900/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400 font-mono">
                          {formatDate(mov.criadoEm)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {mov.tipo === 'entrada' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              Entrada
                            </span>
                          ) : mov.tipo === 'quebra_perda' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-bold">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              Quebra / Avaria
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-white font-bold">
                              <History className="w-3.5 h-3.5" />
                              Ajuste de Turno
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-white">
                          {mov.itemNome}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-bold tabular-nums">
                          <span
                            className={isPositive ? 'text-emerald-400 font-black' : 'text-rose-400 font-black'}
                          >
                            {isPositive ? `+${mov.quantidade}` : mov.quantidade}{' '}
                            <span className="text-xs font-normal text-zinc-400">
                              {mov.unidadeDescricao}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-300 max-w-xs truncate">
                          {mov.motivo || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                          {mov.responsavel || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* SESSIONS AUDIT LIST */
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400">
              <ClipboardList className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
              <h3 className="text-base font-bold text-white">
                Nenhuma auditoria de turno realizada ainda
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                Ao realizar uma sessão de contagem pela aba &quot;Contagem de Turno&quot;, ela ficará arquivada aqui com o dia exato da contagem e todos os consumos calculados.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-black text-white">
                        {session.setor || 'NICKS'}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Data da Contagem: {formatDate(session.data)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                      <span>Responsável: <strong className="text-zinc-200">{session.responsavel}</strong></span>
                      <span className="text-zinc-600">·</span>
                      <span>{session.totalItensContados} itens auditados</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-white font-semibold">{session.itensComDivergencia} alterações registradas</span>
                    </div>
                  </div>
                </div>

                {session.observacoes && (
                  <p className="text-xs text-zinc-400 italic">
                    &ldquo;{session.observacoes}&rdquo;
                  </p>
                )}

                {/* Sub-table with records */}
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 px-3 text-right">Anterior</th>
                        <th className="py-2 px-3 text-right">Contado</th>
                        <th className="py-2 pl-3 text-right">Variação / Consumo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {session.registros
                        .filter((r) => r.diferenca !== 0)
                        .slice(0, 10)
                        .map((reg, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 pr-4 font-semibold text-white">
                              {reg.itemNome}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-zinc-400 tabular-nums">
                              {reg.estoqueAnterior}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-zinc-200 font-bold tabular-nums">
                              {reg.estoqueContado}
                            </td>
                            <td className="py-1.5 pl-3 text-right font-mono font-black tabular-nums">
                              <span
                                className={
                                  reg.diferenca < 0 ? 'text-rose-400' : 'text-emerald-400'
                                }
                              >
                                {reg.diferenca > 0 ? `+${reg.diferenca}` : reg.diferenca}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {session.registros.filter((r) => r.diferenca !== 0).length > 10 && (
                    <div className="text-[11px] text-zinc-500 text-center py-2">
                      + outros itens alterados
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
