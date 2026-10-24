const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix isSynced in seed
code = code.replace(/isSynced: false,\n\s*createdAt:/g, 'createdAt:');

// Fix isSynced in import
code = code.replace(/isSynced: false,\n\s*createdAt:/g, 'createdAt:');

// Fix unknown type in loop
code = code.replace(/for \(const row of data\)/g, 'for (const r of data as any[])');
code = code.replace(/if \(row.Nombre\)/g, 'const row = r as any;\n          if (row.Nombre)');

// Fix ContactType cast
code = code.replace(/type: String\(row.Tipo \|\| ''\).toLowerCase\(\).includes\('prov'\) \? 'provider' : 'client',/g, 
  "type: (String(row.Tipo || '').toLowerCase().includes('prov') ? 'provider' : 'client') as 'client' | 'provider' | 'both',");

// Ensure sync is properly removed if it was there twice
code = code.replace(/isSynced: false,/g, '');

fs.writeFileSync(file, code);
