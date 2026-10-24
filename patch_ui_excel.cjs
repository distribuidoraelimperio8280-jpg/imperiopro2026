const fs = require('fs');
const file = 'src/components/ReportsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Export
code = code.replace(
  /'Ganancia por Artículo \(\$\)': item\.unitProfit,/g,
  '\'Ganancia por Artículo ($)\': item.unitProfit,\n        \'Ganancia Total ($)\': item.totalProfit,'
);

// Table Header
code = code.replace(
  /<th className="py-2.5 px-3 text-right text-emerald-600">Ganancia por Artículo \(\$\)<\/th>/g,
  '<th className="py-2.5 px-3 text-right text-emerald-600">Ganancia por Artículo ($)</th>\n                      <th className="py-2.5 px-3 text-right text-emerald-700">Ganancia Total ($)</th>'
);

// Table Body
code = code.replace(
  /<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">\$\{item\.unitProfit\.toFixed\(2\)\}<\/td>/g,
  '<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">${item.unitProfit.toFixed(2)}</td>\n                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">${item.totalProfit.toFixed(2)}</td>'
);

// Fix colSpan
code = code.replace(
  /<td colSpan=\{7\} className="py-8 text-center text-slate-400">/g,
  '<td colSpan={8} className="py-8 text-center text-slate-400">'
);

fs.writeFileSync(file, code);
