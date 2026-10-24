import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  query,
  where,
  type Unsubscribe 
} from 'firebase/firestore';
import { db as firestoreDb, auth, handleFirestoreError, OperationType } from '../firebase';
import { db as localDb } from '../db/indexedDB';
import type { 
  Invoice, 
  Contact, 
  Product, 
  Expense, 
  Quote, 
  CreditNote, 
  CompanyProfile 
} from '../types';

export interface CloudSyncStatus {
  isCloudConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  activeEmail: string | null;
  cloudItemCounts: {
    invoices: number;
    contacts: number;
    products: number;
    expenses: number;
    quotes: number;
    creditNotes: number;
  };
  errorMessage: string | null;
}

/**
 * Recursively removes all `undefined` values from an object or array
 * so that Firestore setDoc / updateDoc does not throw "Unsupported field value: undefined" errors.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) {
      return data;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

class CloudDataService {
  /**
   * Safe setDoc wrapper that strips all `undefined` values recursively
   * preventing Firestore "Unsupported field value: undefined" errors.
   */
  private async safeSetDoc(docRef: any, data: any, options: { merge?: boolean } = { merge: true }) {
    const cleaned = cleanForFirestore(data);
    return await setDoc(docRef, cleaned, options);
  }

  private unsubscribers: Unsubscribe[] = [];
  private listeners: ((status: CloudSyncStatus) => void)[] = [];
  private currentStatus: CloudSyncStatus = {
    isCloudConnected: false,
    isSyncing: false,
    lastSyncTime: null,
    activeEmail: null,
    cloudItemCounts: {
      invoices: 0,
      contacts: 0,
      products: 0,
      expenses: 0,
      quotes: 0,
      creditNotes: 0,
    },
    errorMessage: null,
  };

  public subscribe(callback: (status: CloudSyncStatus) => void) {
    this.listeners.push(callback);
    callback(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb({ ...this.currentStatus }));
  }

  private setStatus(update: Partial<CloudSyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...update };
    this.notify();
  }

  /**
   * Initialize real-time listeners for all collections scoped to user account
   */
  public startRealtimeSync(userEmail: string, userId?: string) {
    this.stopRealtimeSync();

    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;

    if (!uid) {
      this.setStatus({ isSyncing: false, errorMessage: 'Usuario no autenticado.' });
      return;
    }

    this.setStatus({
      isCloudConnected: true,
      activeEmail: email,
      isSyncing: true,
      errorMessage: null,
    });

    try {
      // 1. Invoices Listeners
      const handleInvoicesSnapshot = async (snapshot: any) => {
        const invoices: Invoice[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          invoices.push({
            ...data,
            id: docSnap.id,
            isSynced: true,
          } as Invoice);
        });

        if (invoices.length > 0) {
          await localDb.invoices.bulkPut(invoices);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            invoices: await localDb.invoices.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
          isSyncing: false,
        });
      };

      const onSnapError = (col: string) => (error: any) => {
        console.warn(`[Firestore Sync] Aviso de sincronización para ${col}:`, error?.message || error);
        this.setStatus({ isSyncing: false });
      };

      // 1. Invoices Listeners
      const invoicesQueryUid = query(collection(firestoreDb, 'invoices'), where('userId', '==', uid));
      const unsubInvoicesUid = onSnapshot(invoicesQueryUid, handleInvoicesSnapshot, onSnapError('invoices_uid'));
      this.unsubscribers.push(unsubInvoicesUid);

      if (email) {
        const invoicesQueryEmail = query(collection(firestoreDb, 'invoices'), where('userEmail', '==', email));
        const unsubInvoicesEmail = onSnapshot(invoicesQueryEmail, handleInvoicesSnapshot, onSnapError('invoices_email'));
        this.unsubscribers.push(unsubInvoicesEmail);
      }

      // 2. Contacts Listeners
      const handleContactsSnapshot = async (snapshot: any) => {
        const contacts: Contact[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          contacts.push({
            ...data,
            id: docSnap.id,
          } as Contact);
        });

        if (contacts.length > 0) {
          await localDb.contacts.bulkPut(contacts);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            contacts: await localDb.contacts.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
        });
      };

      const contactsQueryUid = query(collection(firestoreDb, 'contacts'), where('userId', '==', uid));
      const unsubContactsUid = onSnapshot(contactsQueryUid, handleContactsSnapshot, onSnapError('contacts_uid'));
      this.unsubscribers.push(unsubContactsUid);

      if (email) {
        const contactsQueryEmail = query(collection(firestoreDb, 'contacts'), where('userEmail', '==', email));
        const unsubContactsEmail = onSnapshot(contactsQueryEmail, handleContactsSnapshot, onSnapError('contacts_email'));
        this.unsubscribers.push(unsubContactsEmail);
      }

      // 3. Products Listeners
      const handleProductsSnapshot = async (snapshot: any) => {
        const products: Product[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          products.push({
            ...data,
            id: docSnap.id,
          } as Product);
        });

        if (products.length > 0) {
          await localDb.products.bulkPut(products);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            products: await localDb.products.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
        });
      };

      const productsQueryUid = query(collection(firestoreDb, 'products'), where('userId', '==', uid));
      const unsubProductsUid = onSnapshot(productsQueryUid, handleProductsSnapshot, onSnapError('products_uid'));
      this.unsubscribers.push(unsubProductsUid);

      if (email) {
        const productsQueryEmail = query(collection(firestoreDb, 'products'), where('userEmail', '==', email));
        const unsubProductsEmail = onSnapshot(productsQueryEmail, handleProductsSnapshot, onSnapError('products_email'));
        this.unsubscribers.push(unsubProductsEmail);
      }

      // 4. Expenses Listeners
      const handleExpensesSnapshot = async (snapshot: any) => {
        const expenses: Expense[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          expenses.push({
            ...data,
            id: docSnap.id,
            isSynced: true,
          } as Expense);
        });

        if (expenses.length > 0) {
          await localDb.expenses.bulkPut(expenses);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            expenses: await localDb.expenses.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
        });
      };

      const expensesQueryUid = query(collection(firestoreDb, 'expenses'), where('userId', '==', uid));
      const unsubExpensesUid = onSnapshot(expensesQueryUid, handleExpensesSnapshot, onSnapError('expenses_uid'));
      this.unsubscribers.push(unsubExpensesUid);

      if (email) {
        const expensesQueryEmail = query(collection(firestoreDb, 'expenses'), where('userEmail', '==', email));
        const unsubExpensesEmail = onSnapshot(expensesQueryEmail, handleExpensesSnapshot, onSnapError('expenses_email'));
        this.unsubscribers.push(unsubExpensesEmail);
      }

      // 5. Quotes Listeners
      const handleQuotesSnapshot = async (snapshot: any) => {
        const quotes: Quote[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          quotes.push({
            ...data,
            id: docSnap.id,
          } as Quote);
        });

        if (quotes.length > 0) {
          await localDb.quotes.bulkPut(quotes);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            quotes: await localDb.quotes.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
        });
      };

      const quotesQueryUid = query(collection(firestoreDb, 'quotes'), where('userId', '==', uid));
      const unsubQuotesUid = onSnapshot(quotesQueryUid, handleQuotesSnapshot, onSnapError('quotes_uid'));
      this.unsubscribers.push(unsubQuotesUid);

      if (email) {
        const quotesQueryEmail = query(collection(firestoreDb, 'quotes'), where('userEmail', '==', email));
        const unsubQuotesEmail = onSnapshot(quotesQueryEmail, handleQuotesSnapshot, onSnapError('quotes_email'));
        this.unsubscribers.push(unsubQuotesEmail);
      }

      // 6. Credit Notes Listeners
      const handleCreditNotesSnapshot = async (snapshot: any) => {
        const creditNotes: CreditNote[] = [];
        snapshot.forEach((docSnap: any) => {
          const data = docSnap.data() as any;
          creditNotes.push({
            ...data,
            id: docSnap.id,
          } as CreditNote);
        });

        if (creditNotes.length > 0) {
          await localDb.creditNotes.bulkPut(creditNotes);
        }
        this.setStatus({
          cloudItemCounts: {
            ...this.currentStatus.cloudItemCounts,
            creditNotes: await localDb.creditNotes.count(),
          },
          lastSyncTime: new Date().toLocaleTimeString(),
        });
      };

      const cnQueryUid = query(collection(firestoreDb, 'creditNotes'), where('userId', '==', uid));
      const unsubCreditNotesUid = onSnapshot(cnQueryUid, handleCreditNotesSnapshot, onSnapError('creditNotes_uid'));
      this.unsubscribers.push(unsubCreditNotesUid);

      if (email) {
        const cnQueryEmail = query(collection(firestoreDb, 'creditNotes'), where('userEmail', '==', email));
        const unsubCreditNotesEmail = onSnapshot(cnQueryEmail, handleCreditNotesSnapshot, onSnapError('creditNotes_email'));
        this.unsubscribers.push(unsubCreditNotesEmail);
      }

      // 7. Company Profile Listeners
      const handleProfileDoc = async (docSnap: any) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as CompanyProfile;
          await localDb.companyProfile.put({
            id: 'default',
            ...profileData,
            name: profileData.name || 'DISTRIBUIDORA EL IMPERIO',
          });
        }
      };

      const profileDoc = doc(firestoreDb, 'companyProfiles', uid);
      const unsubProfile = onSnapshot(profileDoc, handleProfileDoc, onSnapError('companyProfiles'));
      this.unsubscribers.push(unsubProfile);

    } catch (err: any) {
      console.error('Error starting real-time cloud sync:', err);
      this.setStatus({
        errorMessage: err.message || 'Error al conectar con la base de datos en la nube',
        isSyncing: false,
      });
    }
  }

  /**
   * Stop all active Firestore real-time listeners
   */
  public stopRealtimeSync() {
    this.unsubscribers.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        console.warn('Error unsubscribing listener:', e);
      }
    });
    this.unsubscribers = [];
    this.setStatus({ isCloudConnected: false, isSyncing: false });
  }

  /**
   * Upload all local records to Cloud (Initial cloud seed or full sync push)
   */
  public async uploadAllLocalToCloud(userEmail: string, userId?: string): Promise<{ success: boolean; count: number; error?: string }> {
    this.setStatus({ isSyncing: true });
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    let count = 0;

    if (!uid) {
      this.setStatus({ isSyncing: false, errorMessage: 'Usuario no autenticado en Firebase.' });
      throw new Error('Usuario no autenticado en Firebase. Por favor, inicia sesión con Google (obligatorio para sincronizar datos).');
    }

    try {
      // 1. Invoices
      const invoices = await localDb.invoices.toArray();
      for (const inv of invoices) {
        const docRef = doc(firestoreDb, 'invoices', inv.id);
        await this.safeSetDoc(docRef, {
          ...inv,
          userId: uid,
          userEmail: email,
          isSynced: true,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 2. Contacts
      const contacts = await localDb.contacts.toArray();
      for (const c of contacts) {
        const docRef = doc(firestoreDb, 'contacts', c.id);
        await this.safeSetDoc(docRef, {
          ...c,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 3. Products
      const products = await localDb.products.toArray();
      for (const p of products) {
        const docRef = doc(firestoreDb, 'products', p.id);
        await this.safeSetDoc(docRef, {
          ...p,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 4. Expenses
      const expenses = await localDb.expenses.toArray();
      for (const exp of expenses) {
        const docRef = doc(firestoreDb, 'expenses', exp.id);
        await this.safeSetDoc(docRef, {
          ...exp,
          userId: uid,
          userEmail: email,
          isSynced: true,
        }, { merge: true });
        count++;
      }

      // 5. Quotes
      const quotes = await localDb.quotes.toArray();
      for (const q of quotes) {
        const docRef = doc(firestoreDb, 'quotes', q.id);
        await this.safeSetDoc(docRef, {
          ...q,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 6. Credit Notes
      const creditNotes = await localDb.creditNotes.toArray();
      for (const cn of creditNotes) {
        const docRef = doc(firestoreDb, 'creditNotes', cn.id);
        await this.safeSetDoc(docRef, {
          ...cn,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 8. Tasks
      const tasks = await localDb.tasks.toArray();
      for (const t of tasks) {
        const docRef = doc(firestoreDb, 'tasks', t.id);
        await this.safeSetDoc(docRef, {
          ...t,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      // 7. Company Profile
      const company = await localDb.companyProfile.get('default');
      if (company) {
        let logoToSync = company.logoUrl;
        
        // Self-healing: if the logo is too large (close to Firestore's 1MB limit), strip it.
        // User will need to re-upload using the newly added client-side compression.
        if (logoToSync && logoToSync.length > 800000) {
          console.warn('Local company logo is too large for Firestore sync. Stripping it.');
          logoToSync = '';
          // Heal local db as well
          await localDb.companyProfile.put({ ...company, logoUrl: '' });
        }

        const docRef = doc(firestoreDb, 'companyProfiles', uid);
        await this.safeSetDoc(docRef, {
          ...company,
          logoUrl: logoToSync,
          userId: uid,
          userEmail: email,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        count++;
      }

      this.setStatus({
        isSyncing: false,
        lastSyncTime: new Date().toLocaleTimeString(),
        errorMessage: null,
      });

      return { success: true, count };
    } catch (err: any) {
      this.setStatus({
        isSyncing: false,
        errorMessage: err.message || 'Error al subir datos a la nube',
      });
      handleFirestoreError(err, OperationType.WRITE, 'sync/uploadAll');
    }
  }

  /**
   * Save a single Invoice to Firestore
   */
  public async saveInvoice(invoice: Invoice, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'invoices', invoice.id);
    try {
      await this.safeSetDoc(docRef, {
        ...invoice,
        userId: uid,
        userEmail: email,
        isSynced: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `invoices/${invoice.id}`);
    }
  }

  /**
   * Delete Invoice from Firestore
   */
  public async deleteInvoice(invoiceId: string) {
    const docRef = doc(firestoreDb, 'invoices', invoiceId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invoices/${invoiceId}`);
    }
  }

  /**
   * Save a single Contact to Firestore
   */
  public async saveContact(contact: Contact, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'contacts', contact.id);
    try {
      await this.safeSetDoc(docRef, {
        ...contact,
        userId: uid,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `contacts/${contact.id}`);
    }
  }

  /**
   * Delete Contact from Firestore
   */
  public async deleteContact(contactId: string) {
    const docRef = doc(firestoreDb, 'contacts', contactId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `contacts/${contactId}`);
    }
  }

  /**
   * Save a single Product to Firestore
   */
  public async saveProduct(product: Product, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'products', product.id);
    try {
      await this.safeSetDoc(docRef, {
        ...product,
        userId: uid,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
    }
  }

  /**
   * Delete Product from Firestore
   */
  public async deleteProduct(productId: string) {
    const docRef = doc(firestoreDb, 'products', productId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
    }
  }

  /**
   * Save Expense to Firestore
   */
  public async saveExpense(expense: Expense, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'expenses', expense.id);
    try {
      await this.safeSetDoc(docRef, {
        ...expense,
        userId: uid,
        userEmail: email,
        isSynced: true,
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${expense.id}`);
    }
  }

  /**
   * Delete Expense from Firestore
   */
  public async deleteExpense(expenseId: string) {
    const docRef = doc(firestoreDb, 'expenses', expenseId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${expenseId}`);
    }
  }

  /**
   * Save Quote to Firestore
   */
  public async saveQuote(quote: Quote, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'quotes', quote.id);
    try {
      await this.safeSetDoc(docRef, {
        ...quote,
        userId: uid,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `quotes/${quote.id}`);
    }
  }

  /**
   * Delete Quote from Firestore
   */
  public async deleteQuote(quoteId: string) {
    const docRef = doc(firestoreDb, 'quotes', quoteId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `quotes/${quoteId}`);
    }
  }

  /**
   * Save Credit Note to Firestore
   */
  public async saveCreditNote(creditNote: CreditNote, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'creditNotes', creditNote.id);
    try {
      await this.safeSetDoc(docRef, {
        ...creditNote,
        userId: uid,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `creditNotes/${creditNote.id}`);
    }
  }

  /**
   * Delete Credit Note from Firestore
   */
  public async deleteCreditNote(creditNoteId: string) {
    const docRef = doc(firestoreDb, 'creditNotes', creditNoteId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `creditNotes/${creditNoteId}`);
    }
  }

  /**
   * Save Company Profile to Firestore
   */

  public async saveTask(task: any, userEmail: string, userId?: string) {
    if (!auth.currentUser?.uid && !userId) throw new Error('No autorizado');
    const uid = userId || auth.currentUser?.uid;
    const email = userEmail.trim().toLowerCase();
    
    const docRef = doc(firestoreDb, 'tasks', task.id);
    await this.safeSetDoc(docRef, {
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

  public async saveCompanyProfile(profile: CompanyProfile, userEmail: string, userId?: string) {
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error('Usuario no autenticado en Firebase');
    const docRef = doc(firestoreDb, 'companyProfiles', uid);
    
    let logoToSync = profile.logoUrl;
    if (logoToSync && logoToSync.length > 800000) {
      console.warn('Local company logo is too large for Firestore sync. Stripping it.');
      logoToSync = '';
    }

    try {
      await this.safeSetDoc(docRef, {
        ...profile,
        logoUrl: logoToSync,
        userId: uid,
        userEmail: email,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `companyProfiles/${uid}`);
    }
  }

  /**
   * Force manual pull of all cloud data
   */
  public async pullAllCloudData(userEmail: string, userId?: string): Promise<{ success: boolean; totalFetched: number }> {
    this.setStatus({ isSyncing: true, errorMessage: null });
    const email = userEmail.trim().toLowerCase();
    const uid = userId || auth.currentUser?.uid;
    let totalFetched = 0;

    if (!uid) {
      this.setStatus({ isSyncing: false, errorMessage: 'Usuario no autenticado.' });
      throw new Error('Usuario no autenticado.');
    }

    try {
      // 1. Invoices
      const invMap = new Map<string, Invoice>();
      try {
        const invSnapUid = await getDocs(query(collection(firestoreDb, 'invoices'), where('userId', '==', uid)));
        invSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          invMap.set(docSnap.id, { ...data, id: docSnap.id, isSynced: true });
        });
      } catch (e) {
        console.warn('Invoices uid fetch warning:', e);
      }
      if (email) {
        try {
          const invSnapEmail = await getDocs(query(collection(firestoreDb, 'invoices'), where('userEmail', '==', email)));
          invSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            invMap.set(docSnap.id, { ...data, id: docSnap.id, isSynced: true });
          });
        } catch (e) {
          console.warn('Invoices email fetch warning:', e);
        }
      }
      const invoices = Array.from(invMap.values());
      if (invoices.length > 0) {
        await localDb.invoices.bulkPut(invoices);
        totalFetched += invoices.length;
      }

      // 2. Contacts
      const contactMap = new Map<string, Contact>();
      try {
        const contactSnapUid = await getDocs(query(collection(firestoreDb, 'contacts'), where('userId', '==', uid)));
        contactSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          contactMap.set(docSnap.id, { ...data, id: docSnap.id });
        });
      } catch (e) {
        console.warn('Contacts uid fetch warning:', e);
      }
      if (email) {
        try {
          const contactSnapEmail = await getDocs(query(collection(firestoreDb, 'contacts'), where('userEmail', '==', email)));
          contactSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            contactMap.set(docSnap.id, { ...data, id: docSnap.id });
          });
        } catch (e) {
          console.warn('Contacts email fetch warning:', e);
        }
      }
      const contacts = Array.from(contactMap.values());
      if (contacts.length > 0) {
        await localDb.contacts.bulkPut(contacts);
        totalFetched += contacts.length;
      }

      // 3. Products
      const prodMap = new Map<string, Product>();
      try {
        const prodSnapUid = await getDocs(query(collection(firestoreDb, 'products'), where('userId', '==', uid)));
        prodSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          prodMap.set(docSnap.id, { ...data, id: docSnap.id });
        });
      } catch (e) {
        console.warn('Products uid fetch warning:', e);
      }
      if (email) {
        try {
          const prodSnapEmail = await getDocs(query(collection(firestoreDb, 'products'), where('userEmail', '==', email)));
          prodSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            prodMap.set(docSnap.id, { ...data, id: docSnap.id });
          });
        } catch (e) {
          console.warn('Products email fetch warning:', e);
        }
      }
      const products = Array.from(prodMap.values());
      if (products.length > 0) {
        await localDb.products.bulkPut(products);
        totalFetched += products.length;
      }

      // 4. Expenses
      const expMap = new Map<string, Expense>();
      try {
        const expSnapUid = await getDocs(query(collection(firestoreDb, 'expenses'), where('userId', '==', uid)));
        expSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          expMap.set(docSnap.id, { ...data, id: docSnap.id, isSynced: true });
        });
      } catch (e) {
        console.warn('Expenses uid fetch warning:', e);
      }
      if (email) {
        try {
          const expSnapEmail = await getDocs(query(collection(firestoreDb, 'expenses'), where('userEmail', '==', email)));
          expSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            expMap.set(docSnap.id, { ...data, id: docSnap.id, isSynced: true });
          });
        } catch (e) {
          console.warn('Expenses email fetch warning:', e);
        }
      }
      const expenses = Array.from(expMap.values());
      if (expenses.length > 0) {
        await localDb.expenses.bulkPut(expenses);
        totalFetched += expenses.length;
      }

      // 5. Quotes
      const quoteMap = new Map<string, Quote>();
      try {
        const quoteSnapUid = await getDocs(query(collection(firestoreDb, 'quotes'), where('userId', '==', uid)));
        quoteSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          quoteMap.set(docSnap.id, { ...data, id: docSnap.id });
        });
      } catch (e) {
        console.warn('Quotes uid fetch warning:', e);
      }
      if (email) {
        try {
          const quoteSnapEmail = await getDocs(query(collection(firestoreDb, 'quotes'), where('userEmail', '==', email)));
          quoteSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            quoteMap.set(docSnap.id, { ...data, id: docSnap.id });
          });
        } catch (e) {
          console.warn('Quotes email fetch warning:', e);
        }
      }
      const quotes = Array.from(quoteMap.values());
      if (quotes.length > 0) {
        await localDb.quotes.bulkPut(quotes);
        totalFetched += quotes.length;
      }

      // 6. Credit Notes
      const cnMap = new Map<string, CreditNote>();
      try {
        const cnSnapUid = await getDocs(query(collection(firestoreDb, 'creditNotes'), where('userId', '==', uid)));
        cnSnapUid.forEach((docSnap) => {
          const data = docSnap.data() as any;
          cnMap.set(docSnap.id, { ...data, id: docSnap.id });
        });
      } catch (e) {
        console.warn('Credit notes uid fetch warning:', e);
      }
      if (email) {
        try {
          const cnSnapEmail = await getDocs(query(collection(firestoreDb, 'creditNotes'), where('userEmail', '==', email)));
          cnSnapEmail.forEach((docSnap) => {
            const data = docSnap.data() as any;
            cnMap.set(docSnap.id, { ...data, id: docSnap.id });
          });
        } catch (e) {
          console.warn('Credit notes email fetch warning:', e);
        }
      }
      const creditNotes = Array.from(cnMap.values());
      if (creditNotes.length > 0) {
        await localDb.creditNotes.bulkPut(creditNotes);
        totalFetched += creditNotes.length;
      }

      // 7. Company Profile
      try {
        const profileSnap = await getDocs(query(collection(firestoreDb, 'companyProfiles'), where('userId', '==', uid)));
        if (!profileSnap.empty) {
          const docSnap = profileSnap.docs[0];
          const data = docSnap.data() as CompanyProfile;
          await localDb.companyProfile.put({
            id: 'default',
            ...data,
            name: data.name || 'DISTRIBUIDORA EL IMPERIO',
          });
          totalFetched++;
        } else if (email) {
          const profileEmailSnap = await getDocs(query(collection(firestoreDb, 'companyProfiles'), where('userEmail', '==', email)));
          if (!profileEmailSnap.empty) {
            const docSnap = profileEmailSnap.docs[0];
            const data = docSnap.data() as CompanyProfile;
            await localDb.companyProfile.put({
              id: 'default',
              ...data,
              name: data.name || 'DISTRIBUIDORA EL IMPERIO',
            });
            totalFetched++;
          }
        }
      } catch (e) {
        console.warn('Profile fetch warning:', e);
      }

      this.setStatus({
        isSyncing: false,
        lastSyncTime: new Date().toLocaleTimeString(),
      });

      return { success: true, totalFetched };
    } catch (err: any) {
      this.setStatus({
        isSyncing: false,
        errorMessage: err.message || 'Error al descargar datos desde la nube',
      });
      handleFirestoreError(err, OperationType.GET, 'sync/pullAll');
    }
  }
}

export const cloudDataService = new CloudDataService();
