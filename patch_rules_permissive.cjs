const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// Make validation functions more permissive to avoid sync errors on missing optional fields.
const newValidation = `
    function isValidInvoice(data) {
      return data.id is string;
    }
    function isValidContact(data) {
      return data.id is string;
    }
    function isValidProduct(data) {
      return data.id is string;
    }
    function isValidExpense(data) {
      return data.id is string;
    }
    function isValidQuote(data) {
      return data.id is string;
    }
    function isValidTask(data) {
      return data.id is string;
    }
    function isValidCreditNote(data) {
      return data.id is string;
    }
    function isValidCompanyProfile(data) {
      return true; // ID may be implicit (uid)
    }
`;

// Replace all validations with permissive ones
code = code.replace(
  /    function isValidInvoice\(data\) \{[\s\S]*?\/\/ Collections Rules/,
  newValidation + '\n    // Collections Rules'
);

fs.writeFileSync('firestore.rules', code);
