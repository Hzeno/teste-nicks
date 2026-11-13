import React, { useState } from 'react';
import { InventoryItem, ItemType, InventoryLocation } from '../types/inventory';
import { X, Save, Wine, Beer, AlertCircle } from 'lucide-react';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  editingItem?: InventoryItem | null;
}

const CATEGORIAS_DESTILADOS = [
  'Gin',
  'Whisky Bourbon',
  'Whisky Rye',
  'Whisky Scotch',
  'Whisky Japonês',
  'Vodka',
  'Rum',
  'Tequila',
  'Cognac',
  'Licor de Laranja',
  'Licor de Avelã',
  'Jägermeister',
  'Outros Licores',
  'Cachaça',
  'Vinhos e Espumantes',
  'Vermutes',
  'Saquê',
  'Absinto',
  'Aperitivos e Bitters',
  'Xaropes',
  'Outro Destilado',
];

const CATEGORIAS_REFRIGERANTES = [
  'Refrigerantes e Águas',
  'Refrigerante Cola',
  'Refrigerante Guaraná',
  'Água Tônica',
  'Energético',
  'Água Mineral',
  'Outro Mixer',
];

const LOCAIS: InventoryLocation[] = [
  'NICKS',
  'RPC',
];

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
}) => {
  if (!isOpen) return null;

  const isEditing = !!editingItem;

  const [tipo, setTipo] = useState<ItemType>(editingItem?.tipo || 'destilado');
  const [nome, setNome] = useState(editingItem?.nome || '');
  const [categoria, setCategoria] = useState(
    editingItem?.categoria || (tipo === 'destilado' ? 'Whisky Scotch' : 'Refrigerante Cola')
  );
  const [volumeMl, setVolumeMl] = useState<number>(
    editingItem?.volumeMl || (tipo === 'destilado' ? 750 : 350)
  );
  const [localizacao, setLocalizacao] = useState<InventoryLocation>(
    (editingItem?.localizacao === 'RPC' ? 'RPC' : 'NICKS')
  );
  const [fornecedor, setFornecedor] = useState(editingItem?.fornecedor || 'Distribuidora Principal');
  const [custoUnitario, setCustoUnitario] = useState<number>(editingItem?.custoUnitario || 0);
  const [precoVenda, setPrecoVenda] = useState<number>(editingItem?.precoVenda || 0);

  // Estoque Mínimo e Ideal (Padrão: 2 garrafas para destilados)
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(
    editingItem?.estoqueMinimo ?? (editingItem?.tipo === 'refrigerante' ? 36 : 2)
  );
  const [estoqueIdeal, setEstoqueIdeal] = useState<number>(
    editingItem?.estoqueIdeal ?? (editingItem?.tipo === 'refrigerante' ? 72 : 4)
  );

  // Estoque Atual
  const [garrafasFechadas, setGarrafasFechadas] = useState<number>(editingItem?.garrafasFechadas || 0);
  const [garrafasAbertasFracao, setGarrafasAbertasFracao] = useState<number>(
    editingItem?.garrafasAbertasFracao || 0
  );
  const [itensPorFardo, setItensPorFardo] = useState<number>(editingItem?.itensPorFardo || 12);
  const [fardosFechados, setFardosFechados] = useState<number>(editingItem?.fardosFechados || 0);
  const [unidadesAvulsas, setUnidadesAvulsas] = useState<number>(editingItem?.unidadesAvulsas || 0);

  const [codigoBarras, setCodigoBarras] = useState(editingItem?.codigoBarras || '');
  const [observacoes, setObservacoes] = useState(editingItem?.observacoes || '');
  const [error, setError] = useState<string>('');

  const handleTipoChange = (newTipo: ItemType) => {
    setTipo(newTipo);
    if (newTipo === 'destilado') {
      setCategoria('Whisky Scotch');
      setVolumeMl(750);
      setEstoqueMinimo(2);
      setEstoqueIdeal(4);
    } else {
      setCategoria('Refrigerante Cola');
      setVolumeMl(350);
      setEstoqueMinimo(36);
      setEstoqueIdeal(72);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }
    if (estoqueMinimo < 0) {
      setError('O estoque mínimo não pode ser negativo.');
      return;
    }

    const now = new Date().toISOString();
    const itemToSave: InventoryItem = {
      id: editingItem?.id || `item-${Date.now()}`,
      nome: nome.trim(),
      tipo,
      categoriaPrincipal: tipo === 'destilado' ? 'Estoque de Destilados' : 'Estoque de Refrigerantes',
      categoria,
      volumeMl: Number(volumeMl) || (tipo === 'destilado' ? 750 : 350),
      localizacao,
      fornecedor: fornecedor.trim(),
      custoUnitario: Number(custoUnitario) || 0,
      precoVenda: Number(precoVenda) || undefined,
      estoqueMinimo: Number(estoqueMinimo),
      estoqueIdeal: Number(estoqueIdeal) || Number(estoqueMinimo) * 2,
      garrafasFechadas: tipo === 'destilado' ? Number(garrafasFechadas) || 0 : 0,
      garrafasAbertasFracao: tipo === 'destilado' ? Number(garrafasAbertasFracao) || 0 : 0,
      itensPorFardo: tipo === 'refrigerante' ? Number(itensPorFardo) || 12 : 1,
      fardosFechados: tipo === 'refrigerante' ? Number(fardosFechados) || 0 : 0,
      unidadesAvulsas: tipo === 'refrigerante' ? Number(unidadesAvulsas) || 0 : 0,
      codigoBarras: codigoBarras.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      ultimaContagem: editingItem?.ultimaContagem || now,
      atualizadoEm: now,
    };

    onSave(itemToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {isEditing ? 'Editar Cadastro de Bebida' : 'Cadastrar Bebida no Bar'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Nicks Sport Bar · Parâmetros de estoque mínimo, volumes e custos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="py-4 space-y-5">
          {/* Tipo Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Tipo de Bebida
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTipoChange('destilado')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-bold transition-colors ${
                  tipo === 'destilado'
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Wine className="w-4 h-4" />
                Destilado ♠ (Garrafas & Doses)
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange('refrigerante')}
                className={`flex items-center justify-center gap-2.5 p-3 rounded-xl border text-sm font-bold transition-colors ${
                  tipo === 'refrigerante'
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-black border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Beer className="w-4 h-4" />
                Refrigerante ♣ (Fardos & Latas)
              </button>
            </div>
          </div>

          {/* Nome e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Nome do Rótulo / Produto *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={tipo === 'destilado' ? 'Ex: Tanqueray London Dry' : 'Ex: Coca-Cola Lata 350ml'}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {(tipo === 'destilado' ? CATEGORIAS_DESTILADOS : CATEGORIAS_REFRIGERANTES).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Volume, Localização e Fornecedor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Volume da Garrafa (ml)
              </label>
              <input
                type="number"
                min="50"
                step="10"
                value={volumeMl}
                onChange={(e) => setVolumeMl(Number(e.target.value))}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Localização no Bar
              </label>
              <select
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value as InventoryLocation)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
              >
                {LOCAIS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Fornecedor / Distribuidora
              </label>
              <input
                type="text"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex: Diageo, Pernod Ricard, Ambev"
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* ESTOQUE MÍNIMO E IDEAL */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <span>Gestão de Estoque Mínimo & Alertas</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Estoque Mínimo de Segurança * ({tipo === 'destilado' ? 'garrafas' : 'unidades/latas'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step={tipo === 'destilado' ? '0.5' : '1'}
                    required
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono font-bold focus:outline-none focus:border-zinc-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-mono">
                    {tipo === 'destilado' ? 'gf mín' : 'un mín'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Alerta disparado se o estoque cair abaixo desta quantidade.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Estoque Ideal / Alvo ({tipo === 'destilado' ? 'garrafas' : 'unidades/latas'})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step={tipo === 'destilado' ? '0.5' : '1'}
                    value={estoqueIdeal}
                    onChange={(e) => setEstoqueIdeal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-mono">
                    {tipo === 'destilado' ? 'gf alvo' : 'un alvo'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Meta para reposição automática no pedido de compras.
                </p>
              </div>
            </div>
          </div>

          {/* Estoque Inicial / Atual */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 mb-3">
              Estoque Físico Atual
            </h3>

            {tipo === 'destilado' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Garrafas Fechadas (Lacradas)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={garrafasFechadas}
                    onChange={(e) => setGarrafasFechadas(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Fração da Garrafa Aberta (0.0 a 0.95)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="0.99"
                    step="0.05"
                    value={garrafasAbertasFracao}
                    onChange={(e) => setGarrafasAbertasFracao(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                  <span className="block text-[11px] text-zinc-500 mt-1">
                    Ex: 0.5 = meia garrafa em uso no balcão
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Itens por Fardo
                  </label>
                  <select
                    value={itensPorFardo}
                    onChange={(e) => setItensPorFardo(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  >
                    <option value="6">Fardo com 6</option>
                    <option value="12">Fardo com 12 (Padrão)</option>
                    <option value="24">Fardo com 24</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Fardos Fechados
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fardosFechados}
                    onChange={(e) => setFardosFechados(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Unidades Avulsas (Geladeira)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={unidadesAvulsas}
                    onChange={(e) => setUnidadesAvulsas(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Valores Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Custo de Aquisição (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">
                Preço de Venda (R$) {tipo === 'destilado' ? '(por dose)' : '(por unidade)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(Number(e.target.value))}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">
              Observações
            </label>
            <input
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Drink especial do Nicks Sport Bar, alta rotação"
              className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Buttons */}
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
              className="px-5 py-2 text-sm font-black text-black bg-white hover:bg-zinc-200 rounded-lg transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Save className="w-4 h-4 text-black" />
              {isEditing ? 'Atualizar Bebida' : 'Cadastrar no Estoque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
