const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add state for delete confirmation
code = code.replace(
  /const \[menuOpenId, setMenuOpenId\] = useState<string \| null>\(null\);/,
  `const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);`
);

code = code.replace(
  /const handleBulkDelete = async \(\) => {[\s\S]*?setSelectedIds\(new Set\(\)\);\n    }\n  };/,
  `const handleBulkDelete = () => {
    if (selectedIds.size === 0) {
      setAlertMessage('Por favor selecciona al menos un contacto para eliminar.');
      return;
    }
    setShowBulkDeleteConfirm(true);
  };
  
  const confirmBulkDelete = async () => {
    for (const id of selectedIds) {
      await db.contacts.delete(id);
      await syncService.queueChange('contacts', 'delete', { id });
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };`
);

code = code.replace(
  /const handleDeleteContact = async \(c: Contact\) => {[\s\S]*?  };/,
  `const handleDeleteContact = (c: Contact) => {
    setContactToDelete(c);
    setMenuOpenId(null);
  };
  
  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    await db.contacts.delete(contactToDelete.id);
    await syncService.queueChange('contacts', 'delete', { id: contactToDelete.id });
    setContactToDelete(null);
  };`
);

code = code.replace(
  /alert\(\`¡Importación exitosa! Se importaron \$\{importedCount\} contactos\.\`\);/,
  `setAlertMessage(\`¡Importación exitosa! Se importaron \${importedCount} contactos.\`);`
);

code = code.replace(
  /alert\('Hubo un error al importar el archivo. Asegúrate de que sea un archivo Excel válido con la columna "Nombre"\.'\);/,
  `setAlertMessage('Hubo un error al importar el archivo. Asegúrate de que sea un archivo Excel válido con la columna "Nombre".');`
);

// Add the modals at the end of the return statement
code = code.replace(
  /(\s+)<\/div>\n  \);\n};\n/,
  `$1</div>

      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2 font-sans">Aviso</h3>
            <p className="text-slate-600 mb-6 font-sans">{alertMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded shadow-xs font-medium transition-colors font-sans"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Contact Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-rose-600 mb-2 font-sans">Eliminar Contacto</h3>
            <p className="text-slate-600 mb-6 font-sans">
              ¿Estás seguro de eliminar el contacto <strong>{contactToDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setContactToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteContact}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded shadow-xs font-medium transition-colors font-sans"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-rose-600 mb-2 font-sans">Eliminar Contactos</h3>
            <p className="text-slate-600 mb-6 font-sans">
              ¿Estás seguro de eliminar <strong>{selectedIds.size}</strong> contacto(s) seleccionados? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded shadow-xs font-medium transition-colors font-sans"
              >
                Eliminar {selectedIds.size} contactos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
`
);

fs.writeFileSync(file, code);
