const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add useRef to imports
code = code.replace(/import React, { useState, useEffect } from 'react';/, "import React, { useState, useEffect, useRef } from 'react';");

// Add Download, Upload to lucide-react imports
code = code.replace(/HelpCircle, Trash2, ChevronDown, Plus, Search, Filter,/, "HelpCircle, Trash2, ChevronDown, Plus, Search, Filter, Download, Upload,");

// Add state
code = code.replace(/const \[menuOpenId, setMenuOpenId\] = useState<string \| null>\(null\);/, 
  `const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);`);

// Add bulk delete
const handlerCode = `
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('Por favor selecciona al menos un contacto para eliminar.');
      return;
    }
    if (confirm(\`¿Estás seguro de eliminar \${selectedIds.size} contacto(s) seleccionados? Esta acción no se puede deshacer.\`)) {
      for (const id of selectedIds) {
        await db.contacts.delete(id);
        await syncService.queueChange('contacts', 'delete', { id });
      }
      setSelectedIds(new Set());
    }
  };

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const dataToExport = contacts.map(c => ({
        Nombre: c.name,
        'Identificación (RUC/Cédula)': c.rucOrCedula,
        DV: c.dv || '',
        Tipo: c.type === 'client' ? 'Cliente' : c.type === 'provider' ? 'Proveedor' : 'Ambos',
        Teléfono: c.phone || c.mobile || '',
        Email: c.email || '',
        Dirección: [c.province, c.district, c.address].filter(Boolean).join(', ') || ''
      }));
      
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contactos");
      XLSX.writeFile(wb, "contactos_imperio.xlsx");
      setIsMoreActionsOpen(false);
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let importedCount = 0;
        for (const row of data) {
          if (row.Nombre) {
            const newContact = {
              id: crypto.randomUUID(),
              name: row.Nombre,
              rucOrCedula: String(row['Identificación (RUC/Cédula)'] || row.Identificacion || row.RUC || ''),
              dv: String(row.DV || ''),
              type: String(row.Tipo || '').toLowerCase().includes('prov') ? 'provider' : 'client',
              phone: String(row.Teléfono || row.Telefono || ''),
              email: String(row.Email || row.Correo || ''),
              address: String(row.Dirección || row.Direccion || ''),
              balance: 0,
              creditLimit: 0,
              isSynced: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await db.contacts.add(newContact);
            await syncService.queueChange('contacts', 'create', newContact);
            importedCount++;
          }
        }
        alert(\`¡Importación exitosa! Se importaron \${importedCount} contactos.\`);
      } catch (error) {
        console.error(error);
        alert('Hubo un error al importar el archivo. Asegúrate de que sea un archivo Excel válido con la columna "Nombre".');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsMoreActionsOpen(false);
    };
    reader.readAsBinaryString(file);
  };
`;
code = code.replace(/const handleDeleteContact = async \(c: Contact\) => {/, handlerCode + "\n  const handleDeleteContact = async (c: Contact) => {");

// Replace Papelera and Más acciones buttons
const bulkDeleteBtn = `
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-50 transition-colors font-sans text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Papelera
            </button>
`;

code = code.replace(/<button className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-50 transition-colors font-sans text-sm font-medium">\s*<Trash2 className="w-4 h-4" \/>\s*Papelera\s*<\/button>/, bulkDeleteBtn);

const moreActionsBtn = `
            <div className="relative">
              <button 
                onClick={() => setIsMoreActionsOpen(!isMoreActionsOpen)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-50 transition-colors font-sans text-sm font-medium"
              >
                Más acciones
                <ChevronDown className="w-4 h-4" />
              </button>
              {isMoreActionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMoreActionsOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button 
                      onClick={handleExportExcel}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-sans"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      Exportar a Excel
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-sans"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      Importar desde Excel
                    </button>
                  </div>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleImportExcel} 
            />
`;

code = code.replace(/<button className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-50 transition-colors font-sans text-sm font-medium">\s*Más acciones\s*<ChevronDown className="w-4 h-4" \/>\s*<\/button>/, moreActionsBtn);

// Head Checkbox mapping
const headCheckbox = `
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredContacts.map(c => c.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
`;
code = code.replace(/<input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" \/>/, headCheckbox);

// Row Checkbox mapping
const rowCheckbox = `
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        checked={selectedIds.has(c.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) newSet.add(c.id);
                          else newSet.delete(c.id);
                          setSelectedIds(newSet);
                        }}
                      />
`;
code = code.replace(/<input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" \/>/, rowCheckbox);

fs.writeFileSync(file, code);
