const fs = require('fs');
let code = fs.readFileSync('src/services/cloudDataService.ts', 'utf8');

// Add tasks to uploadAllLocalToCloud
const tasksBlock = `
      // 8. Tasks
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
`;

code = code.replace(
  /      \/\/ 7\. Company Profile/,
  tasksBlock + '\n      // 7. Company Profile'
);

// Add saveTask function
const saveTaskFn = `
  public async saveTask(task: any, userEmail: string, userId?: string) {
    if (!auth.currentUser?.uid && !userId) throw new Error('No autorizado');
    const uid = userId || auth.currentUser?.uid;
    const email = userEmail.trim().toLowerCase();
    
    const docRef = doc(firestoreDb, 'tasks', task.id);
    await setDoc(docRef, {
      ...task,
      userId: uid,
      userEmail: email,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  public async deleteTask(id: string) {
    if (!auth.currentUser?.uid) throw new Error('No autorizado');
    await deleteDoc(doc(firestoreDb, 'tasks', id));
  }
`;

code = code.replace(
  /  public async saveCompanyProfile/,
  saveTaskFn + '\n  public async saveCompanyProfile'
);

fs.writeFileSync('src/services/cloudDataService.ts', code);
