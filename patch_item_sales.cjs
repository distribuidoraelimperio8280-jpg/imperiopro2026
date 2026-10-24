const fs = require('fs');
const file = 'src/components/ReportsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /unitProfit: number;/g,
  'unitProfit: number;\n    totalProfit: number;'
);

code = code.replace(
  /unitProfit: 0,/g,
  'unitProfit: 0,\n          totalProfit: 0,'
);

code = code.replace(
  /itemSalesMap\[key\]\.unitProfit = unitProfit;/g,
  'itemSalesMap[key].unitProfit = unitProfit;\n      itemSalesMap[key].totalProfit += (unitProfit * qty);'
);

fs.writeFileSync(file, code);
