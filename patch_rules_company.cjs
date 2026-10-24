const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  /    function isValidCompanyProfile\(data\) \{\n      return data\.id is string && data\.id\.size\(\) <= 128 &&/,
  `    function isValidCompanyProfile(data) {\n      return (!('id' in data) || (data.id is string && data.id.size() <= 128)) &&`
);

fs.writeFileSync('firestore.rules', code);
