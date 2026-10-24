const fs = require('fs');
const file = 'src/components/ReportsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove grossProfit from clientSalesMap, sellerSalesMap, and General Invoices in UI and Excel
// 2. Change itemSalesMap to calculate and store unitProfit

// Revert clientSalesMap
code = code.replace(/grossProfit:\s*0,\s*/g, '');
code = code.replace(/const invoiceCost = inv\.items\.reduce\(\(sum, item\) => {[\s\S]*?invoiceGrossProfit = inv\.subtotal - invoiceCost;/g, '');
code = code.replace(/clientSalesMap\[key\]\.grossProfit \+= invoiceGrossProfit;/g, '');
code = code.replace(/sellerSalesMap\[sellerKey\]\.grossProfit \+= invoiceGrossProfit;/g, '');
code = code.replace(/'Ganancia Bruta \(\$\)': c\.grossProfit,/g, '');
code = code.replace(/'Ganancia Bruta \(\$\)': s\.grossProfit,/g, '');
code = code.replace(/<th className="py-2.5 px-3 text-right text-emerald-600">Ganancia Bruta \(\$\)<\/th>/g, '');
code = code.replace(/<th className="py-2.5 px-3 text-right text-emerald-600">Ganancia Bruta<\/th>/g, '');
code = code.replace(/<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">\$\{invoiceGrossProfit\.toFixed\(2\)\}<\/td>/g, '');
code = code.replace(/<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">\$\{c\.grossProfit\.toFixed\(2\)\}<\/td>/g, '');
code = code.replace(/<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">\$\{s\.grossProfit\.toFixed\(2\)\}<\/td>/g, '');

// Fix General Invoices Excel
code = code.replace(/const invoiceCost = i\.items\.reduce[\s\S]*?const invoiceGrossProfit = i\.subtotal - invoiceCost;/g, '');
code = code.replace(/'Ganancia Bruta \(\$\)': invoiceGrossProfit,/g, '');
code = code.replace(/colSpan=\{8\}/g, 'colSpan={7}');
code = code.replace(/colSpan=\{7\}/g, 'colSpan={6}'); // wait, check if this breaks anything else. 

// Fix itemSalesMap
code = code.replace(/itemSalesMap\[key\]\.grossProfit \+= profit;/g, 'itemSalesMap[key].grossProfit += profit;'); // we still sum it but we will map to unitProfit

fs.writeFileSync(file, code);
