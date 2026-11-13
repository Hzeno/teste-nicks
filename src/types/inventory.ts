export type ItemType = 'destilado' | 'refrigerante' | 'licor_mixer' | 'outro';

export type MainCategory = 'Estoque de Destilados' | 'Estoque de Refrigerantes';

export type BarCategory =
  | 'Gin'
  | 'Whisky Bourbon'
  | 'Whisky Rye'
  | 'Whisky Scotch'
  | 'Whisky Japonês'
  | 'Vodka'
  | 'Rum'
  | 'Tequila'
  | 'Cognac'
  | 'Licor de Laranja'
  | 'Licor de Avelã'
  | 'Jägermeister'
  | 'Outros Licores'
  | 'Cachaça'
  | 'Vinhos e Espumantes'
  | 'Vermutes'
  | 'Saquê'
  | 'Absinto'
  | 'Aperitivos e Bitters'
  | 'Xaropes'
  | 'Refrigerantes e Águas';

// Setores do bar restritos estritamente a NICKS e RPC conforme solicitado pelo usuário
export type InventoryLocation = 'NICKS' | 'RPC';

export interface InventoryItem {
  id: string;
  nome: string;
  tipo: ItemType;
  categoriaPrincipal?: MainCategory; // 'Estoque de Destilados' ou 'Estoque de Refrigerantes'
  categoria: string;
  volumeMl: number; // ex: 750ml, 1000ml, 350ml, 250ml
  localizacao: InventoryLocation;
  fornecedor: string;
  custoUnitario: number; // Preço de custo da garrafa ou lata em R$
  precoVenda?: number; // Preço de venda da dose ou da lata em R$

  // Campos específicos de estoque
  // Para destilados: garrafas fechadas + fração de garrafa aberta (0 a 0.99)
  garrafasFechadas: number;
  garrafasAbertasFracao: number; // ex: 0.6 = 60% da garrafa aberta

  // Para refrigerantes: fardos/packs fechados + unidades avulsas
  itensPorFardo: number; // ex: 6, 12, 24 por fardo
  fardosFechados: number;
  unidadesAvulsas: number;

  // Controle de Mínimos e Ideais
  estoqueMinimo: number; // Em unidades equivalentes (garrafas ou latas)
  estoqueIdeal: number; // Estoque alvo após reposição

  codigoBarras?: string;
  observacoes?: string;
  ultimaContagem?: string; // ISO date string
  atualizadoEm: string;
}

export type StockStatus = 'critico' | 'alerta' | 'ok';

export interface StockMovement {
  id: string;
  itemId: string;
  itemNome: string;
  tipo: 'entrada' | 'saida_venda' | 'quebra_perda' | 'ajuste_inventario';
  quantidade: number; // positivo para entrada, negativo para perda/ajuste
  unidadeDescricao: string;
  motivo?: string;
  responsavel?: string;
  criadoEm: string;
}

export interface CountRecordItem {
  itemId: string;
  itemNome: string;
  tipo: ItemType;
  categoria?: string;
  categoriaPrincipal?: MainCategory;
  localizacao?: InventoryLocation;
  estoqueAnterior: number;
  estoqueContado: number;
  diferenca: number; // contado - anterior (negativo = consumo/perda)
  custoUnitario?: number;
  detalhesContagem: {
    fechadas?: number;
    fracao?: number;
    fardos?: number;
    avulsas?: number;
  };
}

export interface InventoryCountSession {
  id: string;
  data: string;
  responsavel: string;
  setor?: string; // 'NICKS', 'RPC' ou 'Todos os Setores'
  tipoContagem?: MainCategory | 'Todos';
  modoContagem?: 'padrao' | 'zero'; // 'zero' quando iniciada do zero
  totalItensContados: number;
  itensComDivergencia: number;
  registros: CountRecordItem[];
  observacoes?: string;
}
