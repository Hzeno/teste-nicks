import * as XLSX from 'xlsx';
import { InventoryItem } from '../types/inventory';
import { calcItemStock, getItemStatus, calcDosesDisponiveis, calcSuggestedOrder } from './calculations';

/**
 * Exporta o inventário completo do Nicks Sport Bar para um arquivo .XLSX real do Microsoft Excel
 */
export function exportToNativeExcel(items: InventoryItem[], filename = 'Contagem_Nicks_Sport_Bar.xlsx'): void {
  // 1. Tabela Principal de Contagem
  const mainData = items.map((item, index) => {
    const stock = calcItemStock(item);
    const { status, label, deficit } = getItemStatus(item);
    const doses = calcDosesDisponiveis(item);
    const sugeridoCompra = calcSuggestedOrder(item);
    const valorTotal = stock * (item.custoUnitario || 0);

    return {
      'Item Nº': index + 1,
      'Categoria': item.categoria,
      'Produto / Bebida': item.nome,
      'Tipo': item.tipo === 'destilado' ? 'Destilado' : 'Refrigerante / Mixer',
      'Volume (ml)': item.volumeMl,
      'Gf Fechadas': item.tipo === 'destilado' ? item.garrafasFechadas : item.fardosFechados,
      'Gf Aberta (Fração)': item.tipo === 'destilado' ? `${Math.round((item.garrafasAbertasFracao || 0) * 100)}%` : `${item.unidadesAvulsas} avulsas`,
      'Estoque Total': stock,
      'Unidade': item.tipo === 'destilado' ? 'garrafas' : 'unidades',
      'Doses Estimadas (50ml)': item.tipo === 'destilado' ? doses : '-',
      'Estoque Mínimo': item.estoqueMinimo,
      'Estoque Ideal': item.estoqueIdeal,
      'Situação': label,
      'Déficit': deficit > 0 ? deficit : 0,
      'Sugerido Compra': sugeridoCompra,
      'Custo Unitário (R$)': item.custoUnitario,
      'Valor em Estoque (R$)': Number(valorTotal.toFixed(2)),
      'Fornecedor': item.fornecedor,
      'Localização no Bar': item.localizacao,
      'Data da Contagem': item.ultimaContagem ? new Date(item.ultimaContagem).toLocaleString('pt-BR') : 'Não realizada',
    };
  });

  // 2. Tabela de Itens Críticos (Abaixo do Mínimo)
  const criticalItems = items
    .filter((item) => getItemStatus(item).status === 'critico')
    .map((item, index) => {
      const stock = calcItemStock(item);
      const { deficit } = getItemStatus(item);
      const sugeridoCompra = calcSuggestedOrder(item);
      const custoEstimado = sugeridoCompra * (item.custoUnitario || 0);

      return {
        'Prioridade': `CRÍTICO #${index + 1}`,
        'Categoria': item.categoria,
        'Produto': item.nome,
        'Estoque Atual': stock,
        'Estoque Mínimo': item.estoqueMinimo,
        'Falta para Mínimo': deficit,
        'Qtd Recomendada de Pedido': sugeridoCompra,
        'Custo Unitário (R$)': item.custoUnitario,
        'Custo Total Pedido (R$)': Number(custoEstimado.toFixed(2)),
        'Fornecedor': item.fornecedor,
      };
    });

  // 3. Resumo por Categoria
  const catMap: Record<string, { totalGf: number; criticos: number; custoTotal: number }> = {};
  items.forEach((item) => {
    const cat = item.categoria;
    const stock = calcItemStock(item);
    const { status } = getItemStatus(item);
    const cost = stock * (item.custoUnitario || 0);

    if (!catMap[cat]) {
      catMap[cat] = { totalGf: 0, criticos: 0, custoTotal: 0 };
    }
    catMap[cat].totalGf += stock;
    catMap[cat].custoTotal += cost;
    if (status === 'critico') catMap[cat].criticos += 1;
  });

  const categorySummary = Object.keys(catMap).map((cat) => ({
    'Categoria do Bar': cat,
    'Total em Estoque': Number(catMap[cat].totalGf.toFixed(1)),
    'Itens Abaixo do Mínimo': catMap[cat].criticos,
    'Valor Total Categoria (R$)': Number(catMap[cat].custoTotal.toFixed(2)),
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Create worksheets
  const wsMain = XLSX.utils.json_to_sheet(mainData);
  const wsCritical = XLSX.utils.json_to_sheet(criticalItems);
  const wsSummary = XLSX.utils.json_to_sheet(categorySummary);

  // Set column widths for better Excel readability
  const mainCols = [
    { wch: 8 },  // Item Nº
    { wch: 22 }, // Categoria
    { wch: 38 }, // Produto
    { wch: 14 }, // Tipo
    { wch: 12 }, // Volume
    { wch: 12 }, // Fechadas
    { wch: 18 }, // Aberta Fracao
    { wch: 14 }, // Estoque Total
    { wch: 10 }, // Unidade
    { wch: 16 }, // Doses
    { wch: 14 }, // Est Minimo
    { wch: 14 }, // Est Ideal
    { wch: 18 }, // Situacao
    { wch: 10 }, // Deficit
    { wch: 16 }, // Sugerido Compra
    { wch: 16 }, // Custo Unit
    { wch: 20 }, // Valor Estoque
    { wch: 24 }, // Fornecedor
    { wch: 18 }, // Localizacao
    { wch: 16 }, // Ultima Contagem
  ];
  wsMain['!cols'] = mainCols;
  wsCritical['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 24 }];
  wsSummary['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];

  // Append sheets
  XLSX.utils.book_append_sheet(wb, wsMain, 'Contagem de Estoque');
  XLSX.utils.book_append_sheet(wb, wsCritical, 'Abaixo do Mínimo');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo por Categoria');

  // Trigger download
  XLSX.writeFile(wb, filename);
}

/**
 * Gera texto tabulado (TSV) pronto para colar no Excel ou Google Sheets via Ctrl+V
 */
export function generateTSVForClipboard(items: InventoryItem[]): string {
  const headers = [
    'Categoria',
    'Produto / Bebida',
    'Volume (ml)',
    'Garrafas Fechadas',
    'Garrafa Aberta (Nível)',
    'Estoque Total',
    'Doses (50ml)',
    'Estoque Mínimo',
    'Estoque Ideal',
    'Situação',
    'Sugerido Compra',
    'Custo Unitário (R$)',
    'Valor em Estoque (R$)',
    'Data da Contagem',
    'Fornecedor',
    'Localização',
  ];

  let tsv = headers.join('\t') + '\n';

  items.forEach((item) => {
    const stock = calcItemStock(item);
    const { label } = getItemStatus(item);
    const doses = calcDosesDisponiveis(item);
    const sugeridoCompra = calcSuggestedOrder(item);
    const valorTotal = (stock * (item.custoUnitario || 0)).toFixed(2);
    const dataContagem = item.ultimaContagem ? new Date(item.ultimaContagem).toLocaleString('pt-BR') : 'Não realizada';
    const aberta = item.tipo === 'destilado'
      ? `${Math.round((item.garrafasAbertasFracao || 0) * 100)}%`
      : `${item.unidadesAvulsas} avulsas`;

    const row = [
      item.categoria,
      item.nome,
      item.volumeMl,
      item.tipo === 'destilado' ? item.garrafasFechadas : item.fardosFechados,
      aberta,
      stock,
      doses,
      item.estoqueMinimo,
      item.estoqueIdeal,
      label,
      sugeridoCompra,
      item.custoUnitario,
      valorTotal,
      dataContagem,
      item.fornecedor,
      item.localizacao,
    ];

    tsv += row.join('\t') + '\n';
  });

  return tsv;
}
