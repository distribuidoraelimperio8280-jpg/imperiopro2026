const fs = require('fs');
const file = 'src/components/InvoicesView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const \[statusFilter, setStatusFilter\] = useState<'all' \| 'paid' \| 'pending' \| 'overdue' \| 'cancelled'>\('all'\);/g,
  `const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'cancelled'>('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);`
);

code = code.replace(
  /const handleHardDeleteInvoice = async \(inv: Invoice, e: React\.MouseEvent\) => {[\s\S]*?};/g,
  `const handleHardDeleteInvoice = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(inv);
  };
  
  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    await db.invoices.delete(invoiceToDelete.id);
    await syncService.queueChange('invoices', 'delete', { id: invoiceToDelete.id });
    setInvoiceToDelete(null);
  };`
);

// Add the modal JSX at the end of the return statement
code = code.replace(
  /(\s+)<\/div>\n  \);\n};\n/g,
  `$1</div>
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Eliminar Factura Permanentemente</h3>
            </div>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de <strong>ELIMINAR DEFINITIVAMENTE</strong> la factura <strong>{invoiceToDelete.code}</strong>? Esta acción la borrará por completo del sistema sin dejar rastros y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(null); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); confirmDeleteInvoice(); }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
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
