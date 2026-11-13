import React, { useState, useMemo, useRef } from 'react';
import {
  InventoryItem,
  InventoryCountSession,
  CountRecordItem,
  InventoryLocation,
  MainCategory,
} from '../types/inventory';
import {
  calcItemStock,
  getItemStatus,
  formatCountDate,
  getItemMainCategory,
} from '../utils/calculations';
import {
  ClipboardCheck,
  Check,
  ArrowLeft,
  AlertTriangle,
  Minus,
  Plus,
  Calendar,
  Clock,
  RotateCcw,
  MapPin,
  Tag,
  Search,
  X,
  CheckCircle2,
  ListChecks,
  Wine,
  Beer,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface CountSessionViewProps {
  items: InventoryItem[];
  initialZeroMode?: boolean;
  onFinishCount: (
    updatedItems: InventoryItem[],
    session: InventoryCountSession
  ) => void;
  onCancel: () => void;
}

interface DraftCount {
  fechadas: number;
  fracao: number;
  fardos: number;
  avulsas: number;
}

export const CountSessionView: React.FC<CountSessionViewProps> = ({
  items,
  initialZeroMode = false,
  onFinishCount,
  onCancel,
}) => {
  const getInitialDateTimeLocal = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [isZeroMode, setIsZeroMode] = useState<boolean>(initialZeroMode);
  const [dataContagem, setDataContagem] = useState<string>(getInitialDateTimeLocal);
  const [responsavel, setResponsavel] = useState('Bartender de Turno');

  // Search input & quick category filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sector filter: STRICTLY NICKS and RPC
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'NICKS' | 'RPC'>('all');

  // Categories: Estoque de Destilados vs Estoque de Refrigerantes
  const [selectedMainCategory, setSelectedMainCategory] = useState<
    'all' | 'Estoque de Destilados' | 'Estoque de Refrigerantes'
  >('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Checklist status filter: 'all' | 'pending' | 'confirmed'
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const [observacoes, setObservacoes] = useState(
    initialZeroMode ? 'Contagem do Zero (Inventário Cego)' : ''
  );

  // Modal for pending items validation when attempting to save
  const [showPendingModal, setShowPendingModal] = useState<boolean>(false);

  // Initialize draft counts: if zero mode, everything is 0!
  const createDrafts = (fromZero: boolean): Record<string, DraftCount> => {
    const init: Record<string, DraftCount> = {};
    items.forEach((item) => {
      if (fromZero) {
        init[item.id] = { fechadas: 0, fracao: 0, fardos: 0, avulsas: 0 };
      } else {
        init[item.id] = {
          fechadas: item.garrafasFechadas || 0,
          fracao: item.garrafasAbertasFracao || 0,
          fardos: item.fardosFechados || 0,
          avulsas: item.unidadesAvulsas || 0,
        };
      }
    });
    return init;
  };

  // Tracking confirmation per item: mandatory filling ("preenchimento obrigatório")
  // In zero mode, all items start as unconfirmed.
  // In standard mode, all items also start unconfirmed to force validation.
  const createConfirmedMap = (): Record<string, boolean> => {
    const init: Record<string, boolean> = {};
    items.forEach((item) => {
      init[item.id] = false;
    });
    return init;
  };

  const [draftCounts, setDraftCounts] = useState<Record<string, DraftCount>>(() =>
    createDrafts(initialZeroMode)
  );

  const [confirmedMap, setConfirmedMap] = useState<Record<string, boolean>>(() =>
    createConfirmedMap()
  );

  // Reset to Zero Mode
  const handleResetToZero = () => {
    if (confirm('Deseja zerar todos os campos de contagem para preenchimento do zero?')) {
      setDraftCounts(createDrafts(true));
      setConfirmedMap(createConfirmedMap());
      setIsZeroMode(true);
      setChecklistFilter('all');
    }
  };

  // Restore current stock values as starting point
  const handleRestoreCurrentStock = () => {
    setDraftCounts(createDrafts(false));
    setConfirmedMap(createConfirmedMap());
    setIsZeroMode(false);
  };

  // Categories list
  const subCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.categoria))),
    [items]
  );

  // Quick chip filters for top bar
  const quickChips = [
    { label: 'Todos', query: '' },
    { label: 'Gin', query: 'gin' },
    { label: 'Bourbon', query: 'bourbon' },
    { label: 'Scotch', query: 'scotch' },
    { label: 'Vodka', query: 'vodka' },
    { label: 'Rum', query: 'rum' },
    { label: 'Tequila', query: 'tequila' },
    { label: 'Licores', query: 'licor' },
    { label: 'Refrigerantes', query: 'coca' },
    { label: 'Tônicas', query: 'tônica' },
  ];

  // Filter items based on sector, category, subcategory, checklist status, and live search
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      // Sector filter
      if (selectedLocation !== 'all' && item.localizacao !== selectedLocation) return false;

      // Main Category: Estoque de Destilados vs Estoque de Refrigerantes
      const mainCat = getItemMainCategory(item);
      if (selectedMainCategory !== 'all' && mainCat !== selectedMainCategory) return false;

      // Subcategory
      if (selectedCategory !== 'all' && item.categoria !== selectedCategory) return false;

      // Checklist Status: pending vs confirmed
      const isConfirmed = !!confirmedMap[item.id];
      if (checklistFilter === 'pending' && isConfirmed) return false;
      if (checklistFilter === 'confirmed' && !isConfirmed) return false;

      // Search Query
      if (query) {
        const matchName = item.nome.toLowerCase().includes(query);
        const matchCat = item.categoria.toLowerCase().includes(query);
        const matchMain = (item.categoriaPrincipal || '').toLowerCase().includes(query);
        const matchBarcode = (item.codigoBarras || '').toLowerCase().includes(query);
        const matchLoc = item.localizacao.toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchMain && !matchBarcode && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [
    items,
    selectedLocation,
    selectedMainCategory,
    selectedCategory,
    checklistFilter,
    searchQuery,
    confirmedMap,
  ]);

  // Overall checklist stats across all eligible items in current sector/category scope
  const scopedItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLocation !== 'all' && item.localizacao !== selectedLocation) return false;
      const mainCat = getItemMainCategory(item);
      if (selectedMainCategory !== 'all' && mainCat !== selectedMainCategory) return false;
      if (selectedCategory !== 'all' && item.categoria !== selectedCategory) return false;
      return true;
    });
  }, [items, selectedLocation, selectedMainCategory, selectedCategory]);

  const totalScoped = scopedItems.length;
  const confirmedCount = scopedItems.filter((i) => confirmedMap[i.id]).length;
  const pendingCount = totalScoped - confirmedCount;
  const percentComplete = totalScoped > 0 ? Math.round((confirmedCount / totalScoped) * 100) : 100;

  // Update draft and mark as confirmed
  const updateDraft = (itemId: string, patch: Partial<DraftCount>, markConfirmed = true) => {
    setDraftCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { fechadas: 0, fracao: 0, fardos: 0, avulsas: 0 }),
        ...patch,
      },
    }));

    if (markConfirmed) {
      setConfirmedMap((prev) => ({
        ...prev,
        [itemId]: true,
      }));
    }
  };

  // Mark an item explicitly as 0 (sem estoque / nada)
  const handleMarkZero = (itemId: string) => {
    updateDraft(itemId, { fechadas: 0, fracao: 0, fardos: 0, avulsas: 0 }, true);
  };

  // Confirm current value of an item
  const handleConfirmItem = (itemId: string) => {
    setConfirmedMap((prev) => ({
      ...prev,
      [itemId]: true,
    }));
  };

  // Toggle item back to unconfirmed
  const handleToggleConfirm = (itemId: string) => {
    setConfirmedMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Fill all pending items with Zero (0) and mark them confirmed
  const handleFillAllPendingWithZero = () => {
    if (
      confirm(
        `Deseja marcar todos os ${pendingCount} itens pendentes como 0 (sem estoque)? Esta ação irá confirmar todos os itens restantes.`
      )
    ) {
      setDraftCounts((prev) => {
        const next = { ...prev };
        scopedItems.forEach((item) => {
          if (!confirmedMap[item.id]) {
            next[item.id] = { fechadas: 0, fracao: 0, fardos: 0, avulsas: 0 };
          }
        });
        return next;
      });

      setConfirmedMap((prev) => {
        const next = { ...prev };
        scopedItems.forEach((item) => {
          next[item.id] = true;
        });
        return next;
      });

      setShowPendingModal(false);
    }
  };

  // Calculate drafted stock for an item
  const getDraftStock = (item: InventoryItem): number => {
    const draft = draftCounts[item.id];
    if (!draft) return calcItemStock(item);

    if (item.tipo === 'destilado') {
      return Number((draft.fechadas + draft.fracao).toFixed(2));
    }
    return draft.fardos * (item.itensPorFardo || 12) + draft.avulsas;
  };

  // Summary of changes
  const summary = scopedItems.map((item) => {
    const anterior = calcItemStock(item);
    const contado = getDraftStock(item);
    const diff = Number((contado - anterior).toFixed(2));
    return {
      item,
      anterior,
      contado,
      diff,
    };
  });

  const changedCount = summary.filter((s) => s.diff !== 0).length;

  // Attempt to finish count
  const handleAttemptFinish = () => {
    // Check if there are pending items in mandatory filling mode
    if (pendingCount > 0) {
      setShowPendingModal(true);
      return;
    }
    executeSave();
  };

  const executeSave = () => {
    let countTimestamp: string;
    try {
      countTimestamp = new Date(dataContagem).toISOString();
    } catch {
      countTimestamp = new Date().toISOString();
    }

    const records: CountRecordItem[] = [];

    const updatedItems = items.map((orig) => {
      const draft = draftCounts[orig.id];
      if (!draft) return orig;

      const anterior = calcItemStock(orig);
      let novoEstoque: number;

      const updatedItem = {
        ...orig,
        ultimaContagem: countTimestamp,
        atualizadoEm: countTimestamp,
      };

      if (orig.tipo === 'destilado') {
        updatedItem.garrafasFechadas = draft.fechadas;
        updatedItem.garrafasAbertasFracao = draft.fracao;
        novoEstoque = draft.fechadas + draft.fracao;
      } else {
        updatedItem.fardosFechados = draft.fardos;
        updatedItem.unidadesAvulsas = draft.avulsas;
        novoEstoque = draft.fardos * (orig.itensPorFardo || 12) + draft.avulsas;
      }

      records.push({
        itemId: orig.id,
        itemNome: orig.nome,
        tipo: orig.tipo,
        categoria: orig.categoria,
        categoriaPrincipal: getItemMainCategory(orig),
        localizacao: orig.localizacao,
        estoqueAnterior: anterior,
        estoqueContado: novoEstoque,
        diferenca: Number((novoEstoque - anterior).toFixed(2)),
        custoUnitario: orig.custoUnitario,
        detalhesContagem: draft,
      });

      return updatedItem;
    });

    const session: InventoryCountSession = {
      id: `session-${Date.now()}`,
      data: countTimestamp,
      responsavel: responsavel.trim() || 'Bartender de Turno',
      setor: selectedLocation === 'all' ? 'Todos os Setores (NICKS e RPC)' : selectedLocation,
      tipoContagem: selectedMainCategory === 'all' ? 'Todos' : selectedMainCategory,
      modoContagem: isZeroMode ? 'zero' : 'padrao',
      totalItensContados: scopedItems.length,
      itensComDivergencia: changedCount,
      registros: records,
      observacoes: observacoes.trim() || (isZeroMode ? 'Contagem do Zero (Inventário Cego)' : undefined),
    };

    onFinishCount(updatedItems, session);
  };

  const formattedDisplayDate = () => {
    try {
      const d = new Date(dataContagem);
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Zero Mode Notification Banner */}
      {isZeroMode && (
        <div className="bg-black border border-white/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              0
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-black text-white">
                Modo Contagem do Zero Ativo (Inventário Cego)
              </span>
              <p className="text-xs text-zinc-400">
                Todos os itens começam zerados. Digite a contagem real presente no bar sem viés dos números anteriores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestoreCurrentStock}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold border border-zinc-700 transition-colors shrink-0"
          >
            Carregar Números Atuais
          </button>
        </div>
      )}

      {/* Top Banner and Session Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Estoque
            </button>
            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-white" />
              {isZeroMode
                ? 'Contagem do Zero (Inventário Limpo)'
                : 'Sessão de Contagem & Fechamento de Turno'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Nicks Sport Bar · Controle operacional ágil com pesquisa instantânea e preenchimento obrigatório
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleResetToZero}
              className="px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white bg-black border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors flex items-center gap-1.5"
              title="Zerar todos os contadores de garrafas e fardos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Campos (Contar do Zero)</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAttemptFinish}
              className="px-5 py-2 text-xs font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Check className="w-4 h-4 text-black" />
              Salvar Contagem ({changedCount} alterações)
            </button>
          </div>
        </div>

        {/* PROMINENT COUNT DATE SECTION */}
        <div className="bg-black p-3.5 rounded-lg border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 block font-medium">
                Data e Horário Realizados da Contagem
              </span>
              <span className="text-sm font-bold text-white capitalize">
                {formattedDisplayDate()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 font-mono flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Data/Hora:</span>
            </label>
            <input
              type="datetime-local"
              value={dataContagem}
              onChange={(e) => setDataContagem(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Filters and Session Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 text-xs">
          {/* Responsável */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">
              Responsável pelo Turno
            </label>
            <input
              type="text"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Sector: STRICTLY NICKS and RPC */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-zinc-500" />
              <span>Setor do Bar</span>
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-white font-bold focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todos os Setores (NICKS e RPC)</option>
              <option value="NICKS">NICKS</option>
              <option value="RPC">RPC</option>
            </select>
          </div>

          {/* Categoria Principal */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-zinc-500" />
              <span>Categoria de Estoque</span>
            </label>
            <select
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-white font-bold focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Ambos os Estoques</option>
              <option value="Estoque de Destilados">🍸 Estoque de Destilados</option>
              <option value="Estoque de Refrigerantes">🥤 Estoque de Refrigerantes</option>
            </select>
          </div>

          {/* Subcategoria */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">Subcategoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500"
            >
              <option value="all">Todas ({subCategories.length})</option>
              {subCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1">
              Observação da Contagem
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Turno sábado, encerramento"
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* QUICK OPERATIONAL SEARCH & MANDATORY CHECKLIST BAR */}
      <div className="sticky top-2 z-20 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-2xl space-y-3">
        {/* Row 1: Search Bar + Direct Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar destilado ou bebida (ex: Tanqueray, Jack, Buchanan's, Coca, Vodka)..."
              className="w-full pl-10 pr-9 py-2.5 bg-black border border-zinc-700 hover:border-zinc-500 focus:border-white rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors font-medium shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded"
                title="Limpar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Action: Preencher pendentes com zero */}
          <button
            type="button"
            onClick={handleFillAllPendingWithZero}
            disabled={pendingCount === 0}
            className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              pendingCount > 0
                ? 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white active:scale-95'
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
            title="Preencher todos os itens restantes com 0 garrafas"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Preencher Pendentes c/ 0</span>
          </button>
        </div>

        {/* Row 2: Checklist Progress Strip + Filter Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          {/* Progress Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <ListChecks className="w-4 h-4 text-zinc-300" />
                Preenchimento Obrigatório:
              </span>
              <span className="text-xs font-mono font-black text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {confirmedCount} / {totalScoped} conferidos ({percentComplete}%)
              </span>
            </div>

            {/* Mini Progress Bar */}
            <div className="hidden sm:block flex-1 w-32 bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className={`h-full transition-all duration-300 ${
                  percentComplete === 100 ? 'bg-emerald-500' : 'bg-white'
                }`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>

            {pendingCount > 0 ? (
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
                {pendingCount} item(ns) pendente(s)
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Todos conferidos!
              </span>
            )}
          </div>

          {/* Filter Tabs: Todos / Pendentes / Conferidos */}
          <div className="flex items-center gap-1.5 text-xs shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setChecklistFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                checklistFilter === 'all'
                  ? 'bg-zinc-800 text-white'
                  : 'bg-black text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Todos ({totalScoped})
            </button>
            <button
              type="button"
              onClick={() => setChecklistFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                checklistFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-black text-amber-400 hover:bg-zinc-900 border border-zinc-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Apenas Pendentes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setChecklistFilter('confirmed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                checklistFilter === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-black text-emerald-400 hover:bg-zinc-900 border border-zinc-800'
              }`}
            >
              <Check className="w-3 h-3" />
              Conferidos ({confirmedCount})
            </button>
          </div>
        </div>

        {/* Row 3: Quick Filter Chips (One-tap search) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px]">
          <span className="text-zinc-500 font-semibold mr-1 shrink-0">Filtro rápido:</span>
          {quickChips.map((chip) => {
            const isChipActive = searchQuery.toLowerCase() === chip.query.toLowerCase();
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSearchQuery(chip.query);
                  if (chip.query) searchInputRef.current?.focus();
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isChipActive
                    ? 'bg-white text-black font-bold shadow-xs'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Counting Cards / List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-12 text-center text-zinc-400 space-y-3">
            <Search className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-sm font-bold text-zinc-200">
              Nenhuma bebida encontrada para &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Tente buscar por outra marca ou categoria, ou limpe a pesquisa para visualizar a lista completa.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold border border-zinc-700"
              >
                Limpar Pesquisa
              </button>
              {checklistFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setChecklistFilter('all')}
                  className="px-3.5 py-1.5 bg-black hover:bg-zinc-900 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-800"
                >
                  Ver Todos os Itens
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const draft = draftCounts[item.id] || {
              fechadas: 0,
              fracao: 0,
              fardos: 0,
              avulsas: 0,
            };
            const anterior = calcItemStock(item);
            const contado = getDraftStock(item);
            const diff = Number((contado - anterior).toFixed(2));
            const isDest = item.tipo === 'destilado';
            const isConfirmed = !!confirmedMap[item.id];
            const { status } = getItemStatus({
              ...item,
              garrafasFechadas: draft.fechadas,
              garrafasAbertasFracao: draft.fracao,
              fardosFechados: draft.fardos,
              unidadesAvulsas: draft.avulsas,
            });

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  !isConfirmed
                    ? 'bg-zinc-950/90 border-amber-900/50 hover:border-amber-700/80 shadow-md'
                    : diff !== 0
                    ? 'bg-zinc-950 border-zinc-600 shadow-md'
                    : 'bg-zinc-950/80 border-zinc-800/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Item Info + Status Badge */}
                  <div className="lg:w-1/3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        {getItemMainCategory(item)}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-white">
                        {item.localizacao}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-xs text-zinc-400">{item.categoria}</span>
                    </div>

                    <div className="flex items-center gap-2.5 mt-1">
                      <div className="shrink-0">
                        {isDest ? (
                          <Wine className="w-4 h-4 text-zinc-300" />
                        ) : (
                          <Beer className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white truncate">
                        {item.nome}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-1.5">
                      <span>
                        Mínimo:{' '}
                        <strong className="text-zinc-200 font-mono">
                          {item.estoqueMinimo} {isDest ? 'gf' : 'un'}
                        </strong>
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span>
                        Anterior:{' '}
                        <strong className="text-zinc-200 font-mono">{anterior}</strong>
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {formatCountDate(item.ultimaContagem)}
                      </span>
                    </div>
                  </div>

                  {/* Counter Controls with Direct Numeric Input */}
                  <div className="flex-1">
                    {isDest ? (
                      /* DESTILADO ROW CONTROLS */
                      <div className="flex flex-wrap items-center gap-5">
                        {/* Garrafas Fechadas (Direct Input + Steppers) */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 font-semibold shrink-0">
                            Fechadas:
                          </span>
                          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 focus-within:border-zinc-500">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  fechadas: Math.max(0, draft.fechadas - 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={draft.fechadas}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                updateDraft(item.id, { fechadas: val });
                              }}
                              className="w-12 text-center font-mono font-black text-sm text-white bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  fechadas: draft.fechadas + 1,
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Garrafa Aberta Fracionada */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-medium shrink-0">
                            Aberta:
                          </span>
                          <div className="flex items-center gap-1">
                            {[
                              { label: '0%', val: 0 },
                              { label: '25%', val: 0.25 },
                              { label: '50%', val: 0.5 },
                              { label: '75%', val: 0.75 },
                              { label: '90%', val: 0.9 },
                            ].map((f) => (
                              <button
                                key={f.val}
                                type="button"
                                onClick={() => updateDraft(item.id, { fracao: f.val })}
                                className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
                                  Math.abs(draft.fracao - f.val) < 0.05
                                    ? 'bg-white text-black font-black shadow-xs scale-105'
                                    : 'bg-black border border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick Zero & Confirm Buttons */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleMarkZero(item.id)}
                            className="px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-white bg-black hover:bg-zinc-900 border border-zinc-800 rounded transition-colors"
                            title="Marcar como 0 garrafas (sem estoque)"
                          >
                            Zerar (0)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleConfirm(item.id)}
                            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                              isConfirmed
                                ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300'
                                : 'bg-white text-black hover:bg-zinc-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isConfirmed ? 'Conferido' : 'Confirmar'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* REFRIGERANTE ROW CONTROLS */
                      <div className="flex flex-wrap items-center gap-5">
                        {/* Fardos */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-300 font-semibold shrink-0">
                            Fardos ({item.itensPorFardo || 12} un):
                          </span>
                          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 focus-within:border-zinc-500">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  fardos: Math.max(0, draft.fardos - 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={draft.fardos}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                updateDraft(item.id, { fardos: val });
                              }}
                              className="w-12 text-center font-mono font-black text-sm text-white bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  fardos: draft.fardos + 1,
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Avulsas */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400 font-medium shrink-0">
                            Avulsas:
                          </span>
                          <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800 focus-within:border-zinc-500">
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  avulsas: Math.max(0, draft.avulsas - 1),
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={draft.avulsas}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                updateDraft(item.id, { avulsas: val });
                              }}
                              className="w-12 text-center font-mono font-black text-sm text-white bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateDraft(item.id, {
                                  avulsas: draft.avulsas + 1,
                                })
                              }
                              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold active:scale-95 transition-transform"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Zero & Confirm Buttons */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleMarkZero(item.id)}
                            className="px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-white bg-black hover:bg-zinc-900 border border-zinc-800 rounded transition-colors"
                          >
                            Zerar (0)
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleConfirm(item.id)}
                            className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition-all ${
                              isConfirmed
                                ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300'
                                : 'bg-white text-black hover:bg-zinc-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isConfirmed ? 'Conferido' : 'Confirmar'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Outcome, Variance & Confirmation Badge */}
                  <div className="lg:w-48 text-right flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 border-zinc-800 pt-2 lg:pt-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-zinc-400">Total:</span>
                      <span className="text-lg font-mono font-bold text-white tabular-nums">
                        {contado} {isDest ? 'gf' : 'un'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      {diff !== 0 ? (
                        <span
                          className={`text-xs font-mono font-semibold ${
                            diff < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {diff < 0 ? `Saída: ${diff}` : `Ajuste: +${diff}`}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 font-mono">Sem alteração</span>
                      )}
                    </div>

                    {/* Status alert warning */}
                    {status === 'critico' && (
                      <span className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        Abaixo do mín ({item.estoqueMinimo})
                      </span>
                    )}

                    {/* Checklist verification badge */}
                    <div className="mt-1">
                      {isConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Conferido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FLOATING ACTION DOCK AT THE BOTTOM (NEVER HAVE TO SCROLL TO THE END) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-xl border-t border-zinc-800 px-4 sm:px-6 py-3.5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Progress summary & Quick filter toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Progresso:</span>
              <span className="text-sm font-mono font-black text-white">
                {confirmedCount} / {totalScoped} ({percentComplete}%)
              </span>
            </div>

            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => setChecklistFilter('pending')}
                className="px-2.5 py-1 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-700/60 rounded-md hover:bg-amber-900/60 transition-colors flex items-center gap-1"
              >
                <span>Ver {pendingCount} pendente(s)</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% conferido
              </span>
            )}
          </div>

          {/* Action buttons (Right on hand) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleFillAllPendingWithZero}
              disabled={pendingCount === 0}
              className="px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preencher Pendentes c/ 0
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAttemptFinish}
              className="px-5 py-2 text-xs font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Check className="w-4 h-4 text-black" />
              <span>Salvar Contagem ({changedCount} alterações)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MANDATORY VALIDATION MODAL (Preenchimento Obrigatório) */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  Preenchimento Obrigatório Pendente
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Existem <strong className="text-amber-400 font-bold">{pendingCount} bebidas</strong> ainda não conferidas nesta contagem do Nicks Sport Bar.
                </p>
              </div>
            </div>

            <div className="bg-black p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-300 space-y-1.5">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                Como você deseja proceder?
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Para manter a integridade do estoque, cada item deve ser conferido. Se uma bebida não possui garrafas no bar, ela deve ser explicitamente confirmada com valor zero (0).
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleFillAllPendingWithZero}
                className="w-full px-4 py-2.5 text-xs font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                <Check className="w-4 h-4 text-black" />
                <span>Preencher Todos os Pendentes com Zero (0) e Salvar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPendingModal(false);
                  setChecklistFilter('pending');
                  searchInputRef.current?.focus();
                }}
                className="w-full px-4 py-2.5 text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ListChecks className="w-4 h-4" />
                <span>Ver e Conferir os {pendingCount} Itens Pendentes</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="w-full px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors text-center"
              >
                Voltar à Contagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
