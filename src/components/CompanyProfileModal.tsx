import React, { useState, useEffect } from 'react';
import { X, Building2, Check, Upload, Trash2, Image, User, Phone, MessageSquare } from 'lucide-react';
import type { CompanyProfile } from '../types';
import { db } from '../db/indexedDB';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  company,
}) => {
  const [name, setName] = useState(company.name || '');
  const [ruc, setRuc] = useState(company.ruc || '');
  const [dv, setDv] = useState(company.dv || '');
  const [ownerName, setOwnerName] = useState(company.ownerName || '');
  const [whatsapp, setWhatsapp] = useState(company.whatsapp || company.phone || '');
  const [mobile, setMobile] = useState(company.mobile || company.phone || '');
  const [email, setEmail] = useState(company.email || '');
  const [phone, setPhone] = useState(company.phone || '');
  const [address, setAddress] = useState(company.address || '');
  const [taxName, setTaxName] = useState(company.taxName || 'ITBMS (7%)');
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || '');

  // Keep state in sync if company prop changes
  useEffect(() => {
    setName(company.name || '');
    setRuc(company.ruc || '');
    setDv(company.dv || '');
    setOwnerName(company.ownerName || '');
    setWhatsapp(company.whatsapp || company.phone || '');
    setMobile(company.mobile || company.phone || '');
    setEmail(company.email || '');
    setPhone(company.phone || '');
    setAddress(company.address || '');
    setTaxName(company.taxName || 'ITBMS (7%)');
    setLogoUrl(company.logoUrl || '');
  }, [company, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen seleccionada es mayor a 5MB. Selecciona un archivo más pequeño.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Compress the image before setting the logoUrl
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill background with white just in case it's a transparent PNG converted to JPEG
          // But we will use webp to preserve transparency while compressing better.
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as webp with 0.8 quality to aggressively reduce size.
          // This ensures base64 string stays very small (e.g. < 50KB), avoiding the 1MB Firestore limit.
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
          setLogoUrl(compressedDataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updated: CompanyProfile & { id: string } = {
      id: 'default',
      name: name.trim() || 'Mi Empresa',
      ruc: ruc.trim(),
      dv: dv.trim(),
      ownerName: ownerName.trim(),
      whatsapp: whatsapp.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      phone: whatsapp.trim() || mobile.trim() || phone.trim(),
      address: address.trim(),
      currency: 'USD',
      taxName: taxName.trim() || 'ITBMS (7%)',
      logoUrl: logoUrl,
    };

    await db.companyProfile.put(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Configuración de Mi Empresa
              </h2>
              <p className="text-xs text-slate-400">
                Ajusta el logo, nombre, DV, representantes y números de contacto empresarial
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          
          {/* SECTION 1: LOGO DE LA EMPRESA (AJUSTADO Y MÁS GRANDE) */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Logo Oficial de la Empresa
              </label>
              <span className="text-[11px] text-sky-700 font-semibold bg-sky-100 px-2.5 py-0.5 rounded-full">
                Encabezado y Factura PDF
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-1">
              {/* Preview Box - Larger & perfectly proportioned */}
              <div className="w-40 h-32 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-sm relative group p-2">
                {logoUrl ? (
                  <>
                    <img 
                      src={logoUrl} 
                      alt="Logo Empresa" 
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-300 font-bold text-xs gap-1.5"
                      title="Eliminar logo"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Quitar Logo</span>
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <Image className="w-10 h-10 mx-auto mb-1 opacity-50 text-slate-400" />
                    <span className="text-xs font-bold">Sin Logo Cargado</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3 w-full">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Suba la imagen corporativa de su negocio. Se ajustará de forma proporcional en la pantalla principal y en la esquina superior de sus facturas descargables.
                </p>

                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Seleccionar Imagen</span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                      onChange={handleImageUpload}
                      className="hidden" 
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="py-2.5 px-3.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Quitar Logo</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Formatos recomendados: PNG o JPG con fondo claro/transparente.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DATOS GENERALES, RAZÓN SOCIAL Y DUEÑO */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre Comercial / Razón Social de la Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora El Imperio S.A."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white transition-colors text-sm"
                />
              </div>

              {/* RUC & DV */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    RUC / Cédula *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 155689021-2-2024"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    D.V. (DV)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 32"
                    value={dv}
                    onChange={(e) => setDv(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-center text-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre del Dueño / Rep. Legal
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs sm:text-sm"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* SECCIÓN CONTACTO DIVIDIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  WhatsApp Empresarial
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+507 6000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs sm:text-sm"
                  />
                  <MessageSquare className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Celular Empresarial
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+507 6111-2222"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs sm:text-sm"
                  />
                  <Phone className="w-4 h-4 text-sky-600 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Impuesto Principal Configurado
                </label>
                <input
                  type="text"
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="Ej. ITBMS (7%)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Dirección Física Comercial
              </label>
              <input
                type="text"
                placeholder="Ej. Av. Balboa, Plaza Comercial L-12, Ciudad de Panamá"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={async () => {
                if (window.confirm('¿Deseas limpiar todos los clientes, productos y facturas de prueba para empezar totalmente desde cero?')) {
                  const { clearAllSampleData } = await import('../db/indexedDB');
                  await clearAllSampleData();
                  alert('¡Sistema limpiado con éxito! Ahora puedes empezar a ingresar tus propios clientes, productos y facturas.');
                  window.location.reload();
                }
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Datos de Prueba</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios de la Empresa</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};


