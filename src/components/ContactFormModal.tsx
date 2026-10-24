import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Users,
  Briefcase,
  Calculator,
  MessageSquare,
  Plus,
  Trash2,
  Sparkles,
  Send,
  Lock,
  Building2,
  Save
} from 'lucide-react';
import type { Contact, ContactType, AssociatedPerson, ContactComment } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ContactType;
  contactToEdit?: Contact | null;
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  initialType = 'client',
  contactToEdit
}) => {
  // Accordion open/close states
  const [openSection, setOpenSection] = useState<string>('general');

  // Datos Generales
  const [type, setType] = useState<ContactType>(initialType);
  const [taxpayerType, setTaxpayerType] = useState<'Persona Jurídica' | 'Persona Natural'>('Persona Jurídica');
  const [ruc, setRuc] = useState('');
  const [dv, setDv] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('Panamá');
  const [district, setDistrict] = useState('Panamá');
  const [corregimiento, setCorregimiento] = useState('Bella Vista');
  const [address, setAddress] = useState('');

  // Información de Contacto
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [mobile, setMobile] = useState('');

  // Personas Asociadas
  const [associatedPeople, setAssociatedPeople] = useState<AssociatedPerson[]>([]);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personNotify, setPersonNotify] = useState(true);

  // Información Comercial
  const [paymentTerms, setPaymentTerms] = useState('Contado');
  const [creditLimit, setCreditLimit] = useState<number>(3000);
  const [priceList, setPriceList] = useState('General');
  const [assignedSalesperson, setAssignedSalesperson] = useState('Carlos Mendoza');

  // Configuración para Contabilidad
  const [receivableAccount, setReceivableAccount] = useState('110501 - Cuentas por Cobrar Clientes');
  const [payableAccount, setPayableAccount] = useState('220501 - Proveedores Locales');
  const [taxWithholding, setTaxWithholding] = useState('Sin retención');

  // Comentarios
  const [comments, setComments] = useState<ContactComment[]>([
    {
      id: 'c-1',
      author: 'JOSE',
      isUser: true,
      text: 'Contacto registrado en el sistema. Pendiente verificar límite de crédito.',
      createdAt: new Date().toLocaleDateString()
    }
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [sendAccountStatement, setSendAccountStatement] = useState(false);

  const [isAutocompleting, setIsAutocompleting] = useState(false);

  useEffect(() => {
    if (contactToEdit) {
      setType(contactToEdit.type || 'client');
      setTaxpayerType(contactToEdit.taxpayerType || 'Persona Jurídica');
      // Clean up RUC if full string stored with DV
      const cleanRuc = contactToEdit.rucOrCedula ? contactToEdit.rucOrCedula.split(' DV ')[0] : '';
      setRuc(cleanRuc);
      setDv(contactToEdit.dv || '');
      setName(contactToEdit.name || '');
      setProvince(contactToEdit.province || 'Panamá');
      setDistrict(contactToEdit.district || 'Panamá');
      setCorregimiento(contactToEdit.corregimiento || 'Bella Vista');
      setAddress(contactToEdit.address || '');
      setEmail(contactToEdit.email || '');
      setPhone(contactToEdit.phone || '');
      setPhone2(contactToEdit.phone2 || '');
      setMobile(contactToEdit.mobile || '');
      setAssociatedPeople(contactToEdit.associatedPeople || []);
      setPaymentTerms(contactToEdit.paymentTerms || 'Contado');
      setCreditLimit(contactToEdit.creditLimit ?? 3000);
      setPriceList(contactToEdit.priceList || 'General');
      setAssignedSalesperson(contactToEdit.assignedSalesperson || 'Carlos Mendoza');
      setReceivableAccount(contactToEdit.receivableAccount || '110501 - Cuentas por Cobrar Clientes');
      setPayableAccount(contactToEdit.payableAccount || '220501 - Proveedores Locales');
      setTaxWithholding(contactToEdit.taxWithholding || 'Sin retención');
      setComments(contactToEdit.comments && contactToEdit.comments.length > 0 ? contactToEdit.comments : []);
      setSendAccountStatement(contactToEdit.sendAccountStatement || false);
    } else {
      setType(initialType);
      setTaxpayerType('Persona Jurídica');
      setRuc('');
      setDv('');
      setName('');
      setProvince('Panamá');
      setDistrict('Panamá');
      setCorregimiento('Bella Vista');
      setAddress('');
      setEmail('');
      setPhone('');
      setPhone2('');
      setMobile('');
      setAssociatedPeople([]);
      setPaymentTerms('Contado');
      setCreditLimit(3000);
      setPriceList('General');
      setAssignedSalesperson('Carlos Mendoza');
      setReceivableAccount('110501 - Cuentas por Cobrar Clientes');
      setPayableAccount('220501 - Proveedores Locales');
      setTaxWithholding('Sin retención');
      setComments([
        {
          id: 'c-1',
          author: 'JOSE',
          isUser: true,
          text: 'Contacto registrado en el sistema. Pendiente verificar límite de crédito.',
          createdAt: new Date().toLocaleDateString()
        }
      ]);
      setSendAccountStatement(false);
    }
  }, [contactToEdit, isOpen, initialType]);

  if (!isOpen) return null;

  const toggleAccordion = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  const handleAutocomplete = () => {
    setIsAutocompleting(true);
    setTimeout(() => {
      if (!ruc) setRuc('1556892-1-2024');
      if (!dv) setDv('45');
      setName('Comercializadora & Soluciones Globales S.A.');
      setProvince('Panamá');
      setDistrict('Panamá');
      setCorregimiento('San Francisco');
      setAddress('Calle 50, Edificio Global Plaza, Piso 12, Suite 1204');
      if (!email) setEmail('contacto@solucionesglobales.com');
      if (!phone) setPhone('+507 269-4500');
      if (!mobile) setMobile('+507 6200-9988');
      setIsAutocompleting(false);
    }, 600);
  };

  const handleAddPerson = () => {
    if (!personName) return;
    const newPerson: AssociatedPerson = {
      id: `ap-${Date.now()}`,
      name: personName,
      role: personRole || 'Representante',
      email: personEmail,
      phone: personPhone,
      notifyDueDate: personNotify
    };
    setAssociatedPeople([...associatedPeople, newPerson]);
    setPersonName('');
    setPersonRole('');
    setPersonEmail('');
    setPersonPhone('');
    setPersonNotify(true);
    setShowAddPerson(false);
  };

  const handleRemovePerson = (id: string) => {
    setAssociatedPeople(associatedPeople.filter((p) => p.id !== id));
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newC: ContactComment = {
      id: `cm-${Date.now()}`,
      author: 'JOSE',
      isUser: true,
      text: newCommentText.trim(),
      createdAt: new Date().toLocaleDateString()
    };
    setComments([...comments, newC]);
    setNewCommentText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !ruc) {
      alert('Por favor completa los campos obligatorios: Razón Social / Nombre y RUC.');
      return;
    }

    const fullRuc = dv ? `${ruc} DV ${dv}` : ruc;
    const now = new Date().toISOString().split('T')[0];

    if (contactToEdit) {
      const updatedContact: Contact = {
        ...contactToEdit,
        name,
        rucOrCedula: fullRuc,
        dv,
        taxpayerType,
        email,
        phone,
        phone2,
        mobile,
        address,
        province,
        district,
        corregimiento,
        type,
        creditLimit: Number(creditLimit) || 0,
        paymentTerms,
        priceList,
        assignedSalesperson,
        receivableAccount,
        payableAccount,
        taxWithholding,
        associatedPeople,
        comments,
        sendAccountStatement,
        updatedAt: now
      };

      await db.contacts.put(updatedContact);
      await syncService.queueChange('contacts', 'update', updatedContact);
    } else {
      const newContact: Contact = {
        id: `cnt-${Date.now()}`,
        name,
        rucOrCedula: fullRuc,
        dv,
        taxpayerType,
        email,
        phone,
        phone2,
        mobile,
        address,
        province,
        district,
        corregimiento,
        type,
        creditLimit: Number(creditLimit) || 0,
        paymentTerms,
        priceList,
        assignedSalesperson,
        receivableAccount,
        payableAccount,
        taxWithholding,
        associatedPeople,
        comments,
        sendAccountStatement,
        balance: 0,
        createdAt: now,
        updatedAt: now
      };

      await db.contacts.add(newContact);
      await syncService.queueChange('contacts', 'create', newContact);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (contactToEdit && confirm(`¿Estás seguro de eliminar el contacto "${contactToEdit.name}"?`)) {
      await db.contacts.delete(contactToEdit.id);
      await syncService.queueChange('contacts', 'delete', { id: contactToEdit.id });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {contactToEdit ? `Editar Contacto: ${contactToEdit.name}` : 'Registro de Nuevo Contacto'}
              </h2>
              <p className="text-xs text-slate-400">
                Añade o edita clientes y proveedores con configuración completa y contable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Collapsible Accordions */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          
          {/* 1. DATOS GENERALES */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('general')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Datos generales</div>
                  <div className="text-xs font-normal text-slate-500">
                    Incluye los datos principales de tu nuevo contacto
                  </div>
                </div>
              </div>
              {openSection === 'general' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'general' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                
                {/* Tipo de Receptor */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Tipo de receptor
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('client')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        type === 'client'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('provider')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        type === 'provider'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Proveedor
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('both')}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                        type === 'both'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Cliente y Proveedor
                    </button>
                  </div>
                </div>

                {/* Tipo de contribuyente */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Tipo de contribuyente
                  </label>
                  <div className="flex gap-4 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="taxpayerType"
                        checked={taxpayerType === 'Persona Jurídica'}
                        onChange={() => setTaxpayerType('Persona Jurídica')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Persona Jurídica</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="taxpayerType"
                        checked={taxpayerType === 'Persona Natural'}
                        onChange={() => setTaxpayerType('Persona Natural')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Persona Natural</span>
                    </label>
                  </div>
                </div>

                {/* RUC, DV & Autocompletar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      RUC / Cédula *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 1556892-1-2024"
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      DV (Dígito Verificador)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 45"
                      value={dv}
                      onChange={(e) => setDv(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <button
                      type="button"
                      onClick={handleAutocomplete}
                      disabled={isAutocompleting}
                      className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sparkles className={`w-4 h-4 text-emerald-600 ${isAutocompleting ? 'animate-spin' : ''}`} />
                      <span>{isAutocompleting ? 'Consultando...' : 'Autocompletar'}</span>
                    </button>
                  </div>
                </div>

                {/* Razón social o nombre completo */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Razón social o nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Comercializadora San José S.A."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Ubicación: Provincia / Distrito / Corregimiento (Ingreso Manual) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Panamá"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Distrito (Manual)
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe el distrito..."
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Corregimiento (Manual)
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe el corregimiento..."
                      value={corregimiento}
                      onChange={(e) => setCorregimiento(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Calle 50, Edificio Global Plaza, Piso 12"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

              </div>
            )}
          </div>

          {/* 2. INFORMACIÓN DE CONTACTO */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('contact')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Información de contacto</div>
                  <div className="text-xs font-normal text-slate-500">
                    Agrega estos datos para comunicarte en cualquier momento con tu contacto.
                  </div>
                </div>
              </div>
              {openSection === 'contact' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'contact' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="Ejemplo@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      placeholder="+507 269-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Teléfono 2
                    </label>
                    <input
                      type="text"
                      placeholder="+507 269-0001"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Celular
                    </label>
                    <input
                      type="text"
                      placeholder="+507 6000-0000"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. PERSONAS ASOCIADAS */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('associated')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Personas asociadas</div>
                  <div className="text-xs font-normal text-slate-500">
                    Vincula los datos de personas relacionadas a este contacto y activa notificaciones de vencimiento para tus clientes.
                  </div>
                </div>
              </div>
              {openSection === 'associated' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'associated' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                
                {associatedPeople.length > 0 && (
                  <div className="space-y-2">
                    {associatedPeople.map((person) => (
                      <div
                        key={person.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{person.name}</div>
                          <div className="text-slate-500">{person.role} | {person.email} | {person.phone}</div>
                          {person.notifyDueDate && (
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-block">
                              Notificaciones de vencimiento activadas
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(person.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAddPerson ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs uppercase">Añadir Persona Relacionada</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Nombre completo"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Cargo (Ej. Gerente de Compras)"
                        value={personRole}
                        onChange={(e) => setPersonRole(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        value={personEmail}
                        onChange={(e) => setPersonEmail(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Teléfono / Celular"
                        value={personPhone}
                        onChange={(e) => setPersonPhone(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 pt-1">
                      <input
                        type="checkbox"
                        checked={personNotify}
                        onChange={(e) => setPersonNotify(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Activar notificaciones de vencimiento para esta persona</span>
                    </label>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPerson(false)}
                        className="px-3 py-1.5 text-slate-600 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPerson}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddPerson(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-2xs transition-all"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>+ Asociar persona</span>
                  </button>
                )}

              </div>
            )}
          </div>

          {/* 4. INFORMACIÓN COMERCIAL */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('commercial')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Información comercial</div>
                  <div className="text-xs font-normal text-slate-500">
                    Agrega los datos administrativos y condiciones comerciales de tu contacto.
                  </div>
                </div>
              </div>
              {openSection === 'commercial' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'commercial' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Términos de pago
                    </label>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="Contado">De contado / Inmediato</option>
                      <option value="15 días">Crédito 15 días</option>
                      <option value="30 días">Crédito 30 días</option>
                      <option value="60 días">Crédito 60 días</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Límite de crédito ($)
                    </label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Lista de precios
                    </label>
                    <select
                      value={priceList}
                      onChange={(e) => setPriceList(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="General">General (Público)</option>
                      <option value="Mayorista">Mayorista (Descuento 10%)</option>
                      <option value="Distribución">Distribución Especial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Vendedor asignado
                    </label>
                    <input
                      type="text"
                      value={assignedSalesperson}
                      onChange={(e) => setAssignedSalesperson(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. CONFIGURACIÓN PARA CONTABILIDAD */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('accounting')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Configuración para contabilidad</div>
                  <div className="text-xs font-normal text-slate-500">
                    Elige las cuentas contables que recibirán los movimientos de valores pendientes de pago.
                  </div>
                </div>
              </div>
              {openSection === 'accounting' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'accounting' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Cuenta por cobrar (Clientes)
                    </label>
                    <select
                      value={receivableAccount}
                      onChange={(e) => setReceivableAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs"
                    >
                      <option value="110501 - Cuentas por Cobrar Clientes">110501 - Cuentas por Cobrar Clientes</option>
                      <option value="110502 - Deudores Varios Locales">110502 - Deudores Varios Locales</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Cuenta por pagar (Proveedores)
                    </label>
                    <select
                      value={payableAccount}
                      onChange={(e) => setPayableAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs"
                    >
                      <option value="220501 - Proveedores Locales">220501 - Proveedores Locales</option>
                      <option value="220502 - Acreedores Varios">220502 - Acreedores Varios</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Retención de impuesto aplicable
                    </label>
                    <select
                      value={taxWithholding}
                      onChange={(e) => setTaxWithholding(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="Sin retención">Sin retención de impuesto</option>
                      <option value="Retención 50% ITBMS">Retención 50% ITBMS</option>
                      <option value="Retención 100% ITBMS">Retención 100% ITBMS</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. COMENTARIOS Y ESTADO DE CUENTA */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
            <button
              type="button"
              onClick={() => toggleAccordion('comments')}
              className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left font-bold text-slate-900 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">Comentarios y Estado de Cuenta</div>
                  <div className="text-xs font-normal text-slate-500">
                    Registra aquí las observaciones importantes sobre tu contacto.
                  </div>
                </div>
              </div>
              {openSection === 'comments' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {openSection === 'comments' && (
              <div className="p-5 space-y-4 bg-white animate-in fade-in duration-150">
                
                {/* Visual Comments Feed */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        J
                      </div>
                      <span className="font-bold text-slate-900 text-xs">JOSE</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                        Tú
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Solo tú puedes ver los comentarios</span>
                    </div>
                  </div>

                  {comments.map((cm) => (
                    <div key={cm.id} className="text-xs bg-white p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-800">{cm.text}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{cm.createdAt}</div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Escribe un comentario u observación interna..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddComment}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>

                {/* Enviar estado de cuenta */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">Enviar estado de cuenta</div>
                    <div className="text-xs text-slate-500">
                      Generar notificación automática con el saldo activo y facturas pendientes
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendAccountStatement}
                      onChange={(e) => setSendAccountStatement(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

              </div>
            )}
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
            {contactToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Contacto</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs sm:text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 text-xs sm:text-sm transition-colors"
              >
                {contactToEdit ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>{contactToEdit ? 'Guardar Cambios' : 'Guardar Contacto'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
