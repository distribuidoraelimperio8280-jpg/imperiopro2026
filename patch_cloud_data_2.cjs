const fs = require('fs');
let code = fs.readFileSync('src/services/cloudDataService.ts', 'utf8');

// Remove the wrongly inserted tasks block
code = code.replace(
/      \/\/ 8\. Tasks\n      const tasks = await localDb\.tasks\.toArray\(\);\n      for \(const t of tasks\) \{\n        const docRef = doc\(firestoreDb, 'tasks', t\.id\);\n        await setDoc\(docRef, \{\n          \.\.\.t,\n          userId: uid,\n          userEmail: email,\n          updatedAt: new Date\(\)\.toISOString\(\),\n        \}, \{ merge: true \}\);\n        count\+\+;\n      \}\n\n/,
  ''
);

// Insert into uploadAllLocalToCloud properly
code = code.replace(
/      \/\/ 7\. Company Profile\n      const company = await localDb\.companyProfile\.get\('default'\);/,
`      // 8. Tasks
      const tasks = await localDb.tasks.toArray();
      for (const t of tasks) {
        const docRef = doc(firestoreDb, 'tasks', t.id);
        await setDoc(docRef, {
          ...t,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 7. Company Profile
      const company = await localDb.companyProfile.get('default');`
);

fs.writeFileSync('src/services/cloudDataService.ts', code);
