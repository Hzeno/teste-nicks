import React, { useRef, useState } from 'react';
import { InventoryItem } from '../types/inventory';
import {
  exportAllDataAsJSON,
  importDataFromJSON,
  resetToDefaultData,
} from '../utils/storage';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { exportToNativeExcel } from '../utils/excelExport';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onDataReloaded: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  items,
  onDataReloaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  // Export JSON
  const handleExportJSON = () => {
    const json = exportAllDataAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nicks_sport_bar_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ text: 'Backup JSON baixado com sucesso!', type: 'success' });
  };

  // Export Excel .xlsx
  const handleExportExcel = () => {
    exportToNativeExcel(items, `Nicks_Sport_Bar_Contagem_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setMsg({ text: 'Planilha nativa do Excel (.XLSX) baixada com sucesso!', type: 'success' });
  };

  // Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importDataFromJSON(content);
        if (ok) {
          onDataReloaded();
          setMsg({ text: 'Dados restaurados com sucesso a partir do arquivo!', type: 'success' });
        } else {
          setMsg({ text: 'Formato do arquivo inválido. Verifique o arquivo JSON.', type: 'error' });
        }
      }
    };
    reader.readAsText(file);
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (confirm('Deseja realmente restaurar os dados de demonstração padrão? Os dados atuais serão substituídos.')) {
      resetToDefaultData();
      onDataReloaded();
      setMsg({ text: 'Dados padrão restaurados!', type: 'success' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Configurações & Backup</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Nicks Sport Bar · Exportação de planilhas e cópias de segurança
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              msg.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {msg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="py-4 space-y-4">
          {/* Export section */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Exportação & Planilhas
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleExportExcel}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-white flex flex-col items-center gap-2 text-center transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Baixar Planilha Excel (.XLSX)</span>
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-white flex flex-col items-center gap-2 text-center transition-colors"
              >
                <Download className="w-5 h-5 text-zinc-300" />
                <span>Baixar Backup Completo (JSON)</span>
              </button>
            </div>
          </div>

          {/* Import section */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Restaurar Backup
            </h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-zinc-400" />
              Selecionar Arquivo JSON de Backup
            </button>
          </div>

          {/* Reset section */}
          <div className="p-4 bg-black rounded-xl border border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-200">
                Restaurar 20 Categorias Padrão
              </h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Recarrega a lista completa dos 50+ rótulos registrados do Nicks Sport Bar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/50 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Restaurar
            </button>
          </div>

          {/* Info Card */}
          <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <Info className="w-3.5 h-3.5" />
              Dica para Contagem de Bar
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Para destilados, 1 garrafa de 750ml rende em média 15 doses de 50ml, e 1000ml rende 20 doses. O sistema registra a data exata de cada contagem para conferência de perdas e reposição no estoque.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white bg-zinc-900 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
