const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const taskValidation = `
    // Task validation
    function isValidTask(data) {
      return data.id is string && data.id.size() <= 128 &&
             data.title is string && data.title.size() <= 500 &&
             data.status is string && data.status in ['upcoming', 'in-progress', 'done', 'archived'] &&
             data.priority is string && data.priority in ['low', 'medium', 'high'];
    }
`;

code = code.replace(
  /    \/\/ CreditNote validation/,
  taskValidation + '\n    // CreditNote validation'
);

const taskMatch = `
    match /tasks/{taskId} {
      allow get: if isSignedIn() && isValidId(taskId) && (resource.data.userId == request.auth.uid || resource.data.userEmail == request.auth.token.email || !('userId' in resource.data));
      allow list: if isSignedIn() && (resource.data.userId == request.auth.uid || resource.data.userEmail == request.auth.token.email || !('userId' in resource.data));
      allow create: if isSignedIn() && isValidId(taskId) && isValidTask(request.resource.data) && (request.resource.data.userId == request.auth.uid || request.resource.data.userEmail == request.auth.token.email || !('userId' in request.resource.data));
      allow update: if isSignedIn() && isValidId(taskId) && isValidTask(request.resource.data) && (resource.data.userId == request.auth.uid || resource.data.userEmail == request.auth.token.email || !('userId' in resource.data));
      allow delete: if isSignedIn() && isValidId(taskId) && (resource.data.userId == request.auth.uid || resource.data.userEmail == request.auth.token.email || !('userId' in resource.data));
    }
`;

code = code.replace(
  /    match \/companyProfiles\/\{profileId\}/,
  taskMatch + '\n    match /companyProfiles/{profileId}'
);

fs.writeFileSync('firestore.rules', code);
