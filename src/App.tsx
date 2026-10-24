import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialDataIfNeeded } from './db/indexedDB';
import type { Invoice, Product, CompanyProfile, Quote, Expense } from './types';
import { Header } from './components/Header';
import { Sidebar, type TabType } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { QuotesView } from './components/QuotesView';
import { CreditNotesView } from './components/CreditNotesView';
import { TemplatesConfigView } from './components/TemplatesConfigView';
import { ContactsView } from './components/ContactsView';
import { InventoryView } from './components/InventoryView';
import { ExpensesView } from './components/ExpensesView';
import { ReportsView } from './components/ReportsView';
import { SubscriptionPlansView } from './components/SubscriptionPlansView';
import { CheckoutView } from './components/CheckoutView';
import { GlobalSaveView } from './components/GlobalSaveView';
import { DataManagementView } from './components/DataManagementView';
import { TasksView } from './components/TasksView';
import { GoogleMapsView } from './components/GoogleMapsView';

import { InvoiceFormModal } from './components/InvoiceFormModal';
import { QuoteFormModal } from './components/QuoteFormModal';
import { CreditNoteFormModal } from './components/CreditNoteFormModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { ContactFormModal } from './components/ContactFormModal';
import { ProductFormModal } from './components/ProductFormModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { CompanyProfileModal } from './components/CompanyProfileModal';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { DesktopShortcutModal } from './components/DesktopShortcutModal';
import { AuthModal } from './components/AuthModal';
import { authService, type UserSession } from './services/authService';
import { syncService } from './services/syncService';
import { cloudDataService } from './services/cloudDataService';
import { auth, testFirestoreConnection } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [activeSearch, setActiveSearch] = useState<string>('');

  // Authentication State
  const [userSession, setUserSession] = useState<UserSession | null>(() => authService.getSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !authService.getSession());

  // Modals state
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [selectedInvoiceToEdit, setSelectedInvoiceToEdit] = useState<Invoice | null>(null);
  const [initialContactIdForInvoice, setInitialContactIdForInvoice] = useState<string | null>(null);
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false);
  const [initialContactIdForQuote, setInitialContactIdForQuote] = useState<string | null>(null);
  const [isCreditNoteFormOpen, setIsCreditNoteFormOpen] = useState(false);
  const [selectedQuoteToEdit, setSelectedQuoteToEdit] = useState<Quote | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<Product | null>(null);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedExpenseToEdit, setSelectedExpenseToEdit] = useState<Expense | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [isDesktopShortcutModalOpen, setIsDesktopShortcutModalOpen] = useState(false);
  const [selectedCheckoutPlanId, setSelectedCheckoutPlanId] = useState<string>('pro');

  // Seed DB and start multi-device server & Firestore cloud sync on startup
  useEffect(() => {
    seedInitialDataIfNeeded().then(() => {
      // Pull central shared database immediately so other PCs receive all records
      syncService.pullInitialServerData().catch(console.warn);
      syncService.startAutoSync();
    }).catch(err => console.error('Error seeding initial data:', err));
    testFirestoreConnection().catch(console.warn);
  }, []);

  // Real-time Firestore Cloud Sync when user session exists
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = user.email || 'distribuidoraelimperio8280@gmail.com';
        const session = authService.saveSession(
          email,
          user.displayName || undefined,
          user.uid,
          user.photoURL || undefined,
          'google'
        );
        setUserSession(session);
        setIsAuthModalOpen(false);
        syncService.pullInitialServerData().catch(console.warn);
        cloudDataService.startRealtimeSync(email, user.uid);
        await cloudDataService.pullAllCloudData(email, user.uid).catch(console.warn);
      } else {
        const existingSession = authService.getSession();
        if (!existingSession || existingSession.authProvider !== 'google') {
          cloudDataService.stopRealtimeSync();
        }
      }
    });

    return () => {
      unsubscribe();
      cloudDataService.stopRealtimeSync();
    };
  }, []);

  // Online network reconnection handler to refresh cloud & server data
  useEffect(() => {
    const handleOnline = () => {
      syncService.checkForUpdates().catch(console.warn);
      const uid = auth.currentUser?.uid || userSession?.uid;
      const email = userSession?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
      if (uid && email) {
        cloudDataService.startRealtimeSync(email, uid);
        cloudDataService.pullAllCloudData(email, uid).catch(console.warn);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userSession?.email, userSession?.uid]);

  const handleLoginSuccess = async (session: UserSession) => {
    setUserSession(session);
    setIsAuthModalOpen(false);

    // Pull from central server immediately
    await syncService.pullInitialServerData().catch(console.warn);

    // Bind company profile email to logged in user if available
    const existingCompany = await db.companyProfile.get('default');
    if (existingCompany) {
      await db.companyProfile.update('default', {
        email: session.email,
        name: existingCompany.name || 'DISTRIBUIDORA EL IMPERIO',
      });
    }

    // Start cloud sync immediately
    cloudDataService.startRealtimeSync(session.email, session.uid);
    cloudDataService.pullAllCloudData(session.email, session.uid).catch(console.warn);
  };

  const handleLogout = () => {
    cloudDataService.stopRealtimeSync();
    authService.logout();
    setUserSession(null);
    setIsAuthModalOpen(true);
  };

  const company = useLiveQuery(() => db.companyProfile.get('default'), []) || {
    name: 'Distribuidora & Servicios Globales S.A.',
    ruc: '155689021-2-2024',
    email: 'contacto@distribuidoraglobal.com',
    phone: '+507 6890-1234',
    address: 'Av. Empresarial Torre 2, Piso 8',
    currency: 'USD',
    taxName: 'ITBMS (7%)',
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      
      {/* Desktop Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        companyName={company.name}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Sticky Header Bar */}
        <Header
          company={company}
          userSession={userSession}
          onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
          onOpenNewInvoice={() => {
            setSelectedInvoiceToEdit(null);
            setInitialContactIdForInvoice(null);
            setIsInvoiceFormOpen(true);
          }}
          onOpenNewContact={() => setIsContactFormOpen(true)}
          onOpenNewProduct={() => setIsProductFormOpen(true)}
          onOpenNewExpense={() => setIsExpenseFormOpen(true)}
          onOpenArchitectureModal={() => setIsArchitectureModalOpen(true)}
          onNavigateToGlobalSave={() => setActiveTab('global-save')}
          onOpenDesktopShortcut={() => setIsDesktopShortcutModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          activeSearch={activeSearch}
          setActiveSearch={setActiveSearch}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenNewInvoice={() => {
                  setSelectedInvoiceToEdit(null);
                  setInitialContactIdForInvoice(null);
                  setIsInvoiceFormOpen(true);
                }}
                onOpenNewContact={() => setIsContactFormOpen(true)}
                onOpenNewProduct={() => setIsProductFormOpen(true)}
                onOpenNewExpense={() => {
                  setSelectedExpenseToEdit(null);
                  setIsExpenseFormOpen(true);
                }}
                onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesView
                onOpenNewInvoice={() => {
                  setSelectedInvoiceToEdit(null);
                  setInitialContactIdForInvoice(null);
                  setIsInvoiceFormOpen(true);
                }}
                onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                onEditInvoice={(inv) => {
                  setSelectedInvoiceToEdit(inv);
                  setIsInvoiceFormOpen(true);
                }}
                searchTerm={activeSearch}
              />
            )}

            {activeTab === 'quotes' && (
              <QuotesView
                onOpenNewQuote={() => {
                  setSelectedQuoteToEdit(null);
                  setIsQuoteFormOpen(true);
                }}
                onEditQuote={(q) => {
                  setSelectedQuoteToEdit(q);
                  setIsQuoteFormOpen(true);
                }}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'credit-notes' && (
              <CreditNotesView
                onOpenNewCreditNote={() => setIsCreditNoteFormOpen(true)}
              />
            )}

            {activeTab === 'templates' && (
              <TemplatesConfigView />
            )}

            {activeTab === 'contacts' && (
              <ContactsView
                onOpenNewContact={() => setIsContactFormOpen(true)}
                onInvoiceContact={(contact) => {
                  setSelectedInvoiceToEdit(null);
                  setInitialContactIdForInvoice(contact.id);
                  setIsInvoiceFormOpen(true);
                }}
                onQuoteContact={(contact) => {
                  setSelectedQuoteToEdit(null);
                  setInitialContactIdForQuote(contact.id);
                  setIsQuoteFormOpen(true);
                }}
                searchTerm={activeSearch}
              />
            )}

            {activeTab === 'maps' && (
              <GoogleMapsView
                onOpenNewInvoiceForContact={(contactId) => {
                  setSelectedInvoiceToEdit(null);
                  setInitialContactIdForInvoice(contactId);
                  setIsInvoiceFormOpen(true);
                }}
                onOpenNewQuoteForContact={(contactId) => {
                  setSelectedQuoteToEdit(null);
                  setInitialContactIdForQuote(contactId);
                  setIsQuoteFormOpen(true);
                }}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView
                onOpenNewProduct={() => setIsProductFormOpen(true)}
                onOpenStockAdjust={(prod) => setSelectedProductForAdjust(prod)}
                searchTerm={activeSearch}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesView
                onOpenNewExpense={() => {
                  setSelectedExpenseToEdit(null);
                  setIsExpenseFormOpen(true);
                }}
                onEditExpense={(exp) => {
                  setSelectedExpenseToEdit(exp);
                  setIsExpenseFormOpen(true);
                }}
                searchTerm={activeSearch}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'subscriptions' && (
              <SubscriptionPlansView 
                initialSelectedPlanId={selectedCheckoutPlanId}
                onNavigateToCheckout={(planId) => {
                  setSelectedCheckoutPlanId(planId);
                  setActiveTab('checkout');
                }}
              />
            )}

            {activeTab === 'checkout' && (
              <CheckoutView
                selectedPlanId={selectedCheckoutPlanId}
                onBackToPlans={() => setActiveTab('subscriptions')}
                onSuccessReturn={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'global-save' && (
              <GlobalSaveView />
            )}

            {activeTab === 'data-management' && (
              <DataManagementView />
            )}

            {activeTab === 'tasks' && (
              <TasksView />
            )}

            {activeTab === 'architecture' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <button 
                  onClick={() => setIsArchitectureModalOpen(true)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold"
                >
                  Abrir Guía Completa de Arquitectura
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Mobile Navigation Bar */}
        <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      </div>

      {/* Modals & Drawers */}
      <InvoiceFormModal
        isOpen={isInvoiceFormOpen}
        onClose={() => {
          setIsInvoiceFormOpen(false);
          setSelectedInvoiceToEdit(null);
          setInitialContactIdForInvoice(null);
        }}
        invoiceToEdit={selectedInvoiceToEdit}
        initialContactId={initialContactIdForInvoice}
      />

      <QuoteFormModal
        isOpen={isQuoteFormOpen}
        onClose={() => {
          setIsQuoteFormOpen(false);
          setSelectedQuoteToEdit(null);
          setInitialContactIdForQuote(null);
        }}
        quoteToEdit={selectedQuoteToEdit}
        initialContactId={initialContactIdForQuote}
      />

      <CreditNoteFormModal
        isOpen={isCreditNoteFormOpen}
        onClose={() => setIsCreditNoteFormOpen(false)}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onEditInvoice={(inv) => {
          setSelectedInvoiceToEdit(inv);
          setIsInvoiceFormOpen(true);
        }}
      />

      <ContactFormModal
        isOpen={isContactFormOpen}
        onClose={() => setIsContactFormOpen(false)}
      />

      <ProductFormModal
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
      />

      <StockAdjustModal
        product={selectedProductForAdjust}
        onClose={() => setSelectedProductForAdjust(null)}
      />

      <ExpenseFormModal
        isOpen={isExpenseFormOpen}
        onClose={() => {
          setIsExpenseFormOpen(false);
          setSelectedExpenseToEdit(null);
        }}
        expenseToEdit={selectedExpenseToEdit}
      />

      <CompanyProfileModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        company={company}
      />

      <ArchitectureGuideModal
        isOpen={isArchitectureModalOpen}
        onClose={() => setIsArchitectureModalOpen(false)}
      />

      <DesktopShortcutModal
        isOpen={isDesktopShortcutModalOpen}
        onClose={() => setIsDesktopShortcutModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => userSession && setIsAuthModalOpen(false)}
        canDismiss={!!userSession}
      />

    </div>
  );
}
