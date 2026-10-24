import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Sparkles, 
  CreditCard, 
  FileText, 
  Users, 
  Warehouse, 
  Database, 
  ShieldCheck, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  X, 
  AlertCircle,
  MessageCircle,
  Building2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import { CheckoutView } from './CheckoutView';

export interface SubscriptionPlan {
  id: string;
  name: string;
  subtitle: string;
  priceMonthly: number;
  invoiceLimit: number;
  invoiceLimitText: string;
  isPopular?: boolean;
  colorScheme: 'slate' | 'emerald' | 'sky';
  features: {
    text: string;
    bold?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

interface SubscriptionPlansViewProps {
  onPlanSelected?: (planName: string, price: number) => void;
  onNavigateToCheckout?: (planId: string, frequency?: 'monthly' | 'annual') => void;
  initialSelectedPlanId?: string;
}

export const SubscriptionPlansView: React.FC<SubscriptionPlansViewProps> = ({ 
  onPlanSelected,
  onNavigateToCheckout,
  initialSelectedPlanId
}) => {
  const company = useLiveQuery(() => db.companyProfile.get('default'), []);
  const [currentView, setCurrentView] = useState<'plans' | 'checkout'>('plans');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<string>(initialSelectedPlanId || 'pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<SubscriptionPlan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null);

  // Definición oficial de los 5 Planes de Suscripción solicitados
  const plans: SubscriptionPlan[] = [
    {
      id: 'emprendedor',
      name: 'Plan Emprendedor',
      subtitle: 'Ideal para profesionales independientes y nuevos negocios',
      priceMonthly: 25.00,
      invoiceLimit: 100,
      invoiceLimitText: '100 facturas de venta al mes',
      colorScheme: 'slate',
      features: [
        { text: 'Ingreso ilimitado de datos', bold: true, icon: Database },
        { text: '2 Usuarios con accesos simultáneos', bold: true, icon: Users },
        { text: '1 Espacio de bodega / almacén', bold: true, icon: Warehouse },
        { text: 'Facturación electrónica DGI / PAC', icon: FileText },
        { text: 'Reportes de ventas e impuestos en PDF/Excel', icon: Check },
        { text: 'Sincronización en la nube en tiempo real', icon: Check },
      ]
    },
    {
      id: 'pyme',
      name: 'Plan Pyme',
      subtitle: 'Diseñado para pequeñas empresas en ritmo de crecimiento',
      priceMonthly: 50.00,
      invoiceLimit: 250,
      invoiceLimitText: '250 facturas de venta al mes',
      colorScheme: 'slate',
      features: [
        { text: 'Ingreso ilimitado de datos', bold: true, icon: Database },
        { text: '2 Usuarios con accesos simultáneos', bold: true, icon: Users },
        { text: '1 Espacio de bodega / almacén', bold: true, icon: Warehouse },
        { text: 'Cotizaciones con envío rápido a WhatsApp', icon: Check },
        { text: 'Notas de crédito con retorno a stock', icon: Check },
        { text: 'Control de inventarios y alertas de mínimo', icon: Check },
      ]
    },
    {
      id: 'pro',
      name: 'Plan Pro',
      subtitle: 'La solución más completa y solicitada por distribuidores',
      priceMonthly: 70.00,
      invoiceLimit: 500,
      invoiceLimitText: '500 facturas de venta al mes',
      isPopular: true,
      colorScheme: 'emerald',
      features: [
        { text: 'Ingreso ilimitado de datos', bold: true, icon: Database },
        { text: '2 Usuarios con accesos simultáneos', bold: true, icon: Users },
        { text: '1 Espacio de bodega / almacén', bold: true, icon: Warehouse },
        { text: 'Rutas y clientes en Google Maps GPS', icon: Check },
        { text: 'Análisis gráfico dinámico y balance financiero', icon: Check },
        { text: 'Soporte prioritario por WhatsApp dedicado', icon: Check },
      ]
    },
    {
      id: 'plus',
      name: 'Plan Plus',
      subtitle: 'Potencia ampliada para operaciones comerciales activas',
      priceMonthly: 100.00,
      invoiceLimit: 1000,
      invoiceLimitText: '1,000 facturas de venta al mes',
      colorScheme: 'slate',
      features: [
        { text: 'Ingreso ilimitado de datos', bold: true, icon: Database },
        { text: '2 Usuarios con accesos simultáneos', bold: true, icon: Users },
        { text: '1 Espacio de bodega / almacén', bold: true, icon: Warehouse },
        { text: 'Diseños de plantillas de factura personalizadas', icon: Check },
        { text: 'Gestión multimoneda y conciliaciones', icon: Check },
        { text: 'Importación y exportación masiva en Excel', icon: Check },
      ]
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      subtitle: 'Máxima capacidad operativa para empresas consolidadas',
      priceMonthly: 200.00,
      invoiceLimit: 2000,
      invoiceLimitText: '2,000 facturas de venta al mes',
      colorScheme: 'slate',
      features: [
        { text: 'Ingreso ilimitado de datos', bold: true, icon: Database },
        { text: '2 Usuarios con accesos simultáneos', bold: true, icon: Users },
        { text: '1 Espacio de bodega / almacén', bold: true, icon: Warehouse },
        { text: 'Auditoría completa de modificaciones fiscales', icon: Check },
        { text: 'Copia de seguridad externa bajo demanda', icon: Check },
        { text: 'Asesor contable y técnico prioritario 24/7', icon: Check },
      ]
    },
  ];

  // Función requerida por el usuario: seleccionarPlan(nombre_plan, precio)
  const seleccionarPlan = (nombre_plan: string, precio: number, planObj?: SubscriptionPlan) => {
    const foundPlan = planObj || plans.find(p => p.name === nombre_plan || p.id === nombre_plan) || plans[0];

    // 1. Ejecutar callback si fue provisto
    if (onPlanSelected) {
      onPlanSelected(nombre_plan, precio);
    }

    // 2. Disparar evento personalizado en window para integraciones JavaScript externas
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('planSelected', {
        detail: {
          planId: foundPlan.id,
          planName: foundPlan.name,
          price: precio,
          itbms: Number((precio * 0.07).toFixed(2)),
          total: Number((precio * 1.07).toFixed(2)),
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
      console.log(`[Imperio Pro Contabilidad] Plan seleccionado: ${foundPlan.name} - Precio: B/. ${precio.toFixed(2)}`);
    }

    // 3. Transición inmediata a la vista del proceso de Pago y Facturación (Checkout)
    setSelectedPlanForCheckout(foundPlan.id);
    if (onNavigateToCheckout) {
      onNavigateToCheckout(foundPlan.id, billingCycle);
    } else {
      setCurrentView('checkout');
    }
  };

  // Exponer la función seleccionarPlan en el objeto global window para scripts del usuario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { seleccionarPlan: typeof seleccionarPlan }).seleccionarPlan = (nombre: string, precio: number) => {
        seleccionarPlan(nombre, precio);
      };
    }
  }, [billingCycle]);

  // Si la vista actual es checkout, renderizar CheckoutView
  if (currentView === 'checkout') {
    return (
      <CheckoutView
        selectedPlanId={selectedPlanForCheckout}
        initialFrequency={billingCycle}
        onBackToPlans={() => setCurrentView('plans')}
      />
    );
  }

  // Preguntas Frecuentes
  const faqs = [
    {
      q: '¿Qué sucede si llego al límite de facturas mensuales de mi plan?',
      a: 'El sistema te notificará cuando alcances el 80% y 100% de tu cuota mensual. Podrás ascender al siguiente plan en cualquier momento con cálculo prorrateado sin interrumpir tu facturación.'
    },
    {
      q: '¿Por qué los precios no incluyen el 7% de ITBMS?',
      a: 'En la República de Panamá, los servicios de software y suscripciones en la nube están gravados con la tasa legal del 7% de ITBMS según las normativas de la DGI. El impuesto se desglosa claramente en tu factura fiscal.'
    },
    {
      q: '¿Qué métodos de pago están disponibles?',
      a: 'Aceptamos transferencias bancarias directas (ACH local de Panamá), Yappy Comercial para empresas, y tarjetas de crédito o débito Visa / Mastercard con procesamiento seguro e instantáneo.'
    },
    {
      q: '¿Puedo cambiar de plan o cancelar cuando lo desee?',
      a: 'Sí, todas nuestras suscripciones son sin contratos forzosos. Puedes cambiar de plan, subir de categoría o cancelar la renovación al finalizar el ciclo contratado.'
    }
  ];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Membresías & Licenciamiento Oficial</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Planes de Suscripción Flexibles
        </h1>
        
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Selecciona el plan que mejor se adapte al volumen comercial de tu negocio en Panamá.
          Todos los planes cuentan con soporte fiscal DGI, respaldo en la nube y actualización continua.
        </p>

        {/* Toggle Facturación Mensual / Anual */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Facturación Mensual
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>Pago Anual</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-md">
                -15% Ahorro
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de 5 Planes de Suscripción con Identificación Visual en Verde al Pasar el Cursor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 items-stretch">
        {plans.map((plan) => {
          const isPopular = plan.isPopular;
          const isHovered = hoveredPlanId === plan.id;

          // Cálculo si el ciclo es anual (15% de descuento mensual equivalente)
          const displayedPrice = billingCycle === 'annual' 
            ? Number((plan.priceMonthly * 0.85).toFixed(2))
            : plan.priceMonthly;
          
          const itbmsAmount = Number((displayedPrice * 0.07).toFixed(2));
          const totalPrice = Number((displayedPrice + itbmsAmount).toFixed(2));

          return (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlanId(plan.id)}
              onMouseLeave={() => setHoveredPlanId(null)}
              onClick={() => seleccionarPlan(plan.name, displayedPrice, plan)}
              className={`group relative flex flex-col justify-between rounded-2xl transition-all duration-200 bg-white cursor-pointer select-none ${
                isHovered
                  ? 'border-2 border-emerald-500 shadow-2xl shadow-emerald-500/25 ring-4 ring-emerald-400/40 -translate-y-2 scale-[1.02] bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 z-20'
                  : isPopular
                    ? 'border-2 border-emerald-500 shadow-lg ring-2 ring-emerald-500/10 lg:-translate-y-1 z-10'
                    : 'border border-slate-200/90 hover:border-emerald-400 shadow-xs hover:shadow-md'
              }`}
              title={`Haz clic para escoger el ${plan.name} por B/. ${displayedPrice.toFixed(2)}/mes`}
            >
              {/* Badge Dinámico: Verde Llamativo al Posicionar el Cursor o "Más Popular" */}
              {isHovered ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg shadow-emerald-600/35 ring-2 ring-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100 animate-pulse" />
                    <span>¡Escoger este Plan!</span>
                  </span>
                </div>
              ) : isPopular ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    Más Popular
                  </span>
                </div>
              ) : null}

              {/* Parte Superior: Encabezado y Precios */}
              <div className="p-5 sm:p-6 space-y-4">
                
                {/* Nombre y descripción */}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-black tracking-tight transition-colors ${
                      isHovered ? 'text-emerald-700' : isPopular ? 'text-emerald-950' : 'text-slate-900'
                    }`}>
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {plan.subtitle}
                  </p>
                </div>

                {/* Precio Grande en Balboas (B/.) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xs font-extrabold transition-colors ${isHovered ? 'text-emerald-600' : 'text-slate-500'}`}>B/.</span>
                    <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight transition-colors ${
                      isHovered ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {displayedPrice.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      / mes
                    </span>
                  </div>

                  {/* Nota individual en la tarjeta sobre ITBMS */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      + 7% ITBMS: <span className="font-mono text-slate-700 font-bold">B/. {itbmsAmount.toFixed(2)}</span>
                    </span>
                    <span className={`font-mono font-bold transition-colors ${isHovered ? 'text-emerald-700' : 'text-slate-900'}`}>
                      B/. {totalPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className={`mt-1 text-[10px] px-2 py-0.5 rounded border font-medium inline-block transition-colors ${
                    isHovered 
                      ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300' 
                      : 'text-amber-700 bg-amber-50/80 border-amber-200/60'
                  }`}>
                    Precios no incluyen el 7% de ITBMS
                  </div>
                </div>

                {/* Caja Destacada: Límite de Facturas */}
                <div className={`p-3 rounded-xl border transition-colors ${
                  isHovered
                    ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950 shadow-xs'
                    : isPopular 
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-start gap-2.5">
                    <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isHovered || isPopular ? 'text-emerald-600' : 'text-slate-600'}`} />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                        Límite de Operaciones
                      </span>
                      <span className="text-xs font-extrabold block">
                        {plan.invoiceLimitText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista con viñetas e iconos de características */}
                <div className="pt-1 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Características incluidas:
                  </span>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, idx) => {
                      const IconComp = feat.icon || Check;
                      return (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isHovered || isPopular 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <IconComp className="w-2.5 h-2.5 stroke-[2.5]" />
                          </span>
                          <span className={feat.bold ? 'font-bold text-slate-900' : 'font-normal text-slate-600'}>
                            {feat.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

              </div>

              {/* Botón de Acción en la base: Color verde llamativo y estado activo */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    seleccionarPlan(plan.name, displayedPrice, plan);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    isHovered
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl shadow-emerald-600/35 ring-2 ring-emerald-400 scale-[1.02]'
                      : isPopular
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg'
                        : 'bg-slate-900 hover:bg-emerald-600 active:bg-emerald-700 text-white'
                  }`}
                >
                  {isHovered ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                      <span>Elegir {plan.name}</span>
                      <ArrowRight className="w-4 h-4 text-emerald-100 translate-x-0.5" />
                    </>
                  ) : (
                    <>
                      <span>Seleccionar Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Nota Aclaratoria General Prominente */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Nota fiscal obligatoria: Precios no incluyen el 7% de ITBMS
            </h4>
            <p className="text-xs text-slate-500">
              Conforme a las leyes fiscales panameñas, se aplicará el 7% de ITBMS sobre el valor de la suscripción al generar su factura fiscal electrónica.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Garantía de servicio 99.9% y soporte local en Panamá</span>
        </div>
      </div>

      {/* Resumen Comparativo de Características */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Comparativa Rápida de Capacidades
            </h3>
            <p className="text-xs text-slate-500">
              Visualiza en detalle los límites de operaciones y recursos de cada plan
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-lg self-start sm:self-auto">
            Moneda: Balboas (B/.)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/75 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Plan de Suscripción</th>
                <th className="py-3 px-4 text-center">Precio Mensual (+ ITBMS)</th>
                <th className="py-3 px-4 text-center">Límite Facturas de Venta</th>
                <th className="py-3 px-4 text-center">Ingreso de Datos</th>
                <th className="py-3 px-4 text-center">Usuarios</th>
                <th className="py-3 px-4 text-center">Bodega</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {plans.map((p) => {
                const isHovered = hoveredPlanId === p.id;
                return (
                  <tr 
                    key={p.id} 
                    onMouseEnter={() => setHoveredPlanId(p.id)}
                    onMouseLeave={() => setHoveredPlanId(null)}
                    onClick={() => seleccionarPlan(p.name, p.priceMonthly, p)}
                    className={`transition-colors cursor-pointer ${
                      isHovered
                        ? 'bg-emerald-50/90 font-semibold'
                        : p.isPopular 
                          ? 'bg-emerald-50/40 font-semibold' 
                          : 'hover:bg-emerald-50/50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold transition-colors ${isHovered ? 'text-emerald-700 font-black' : 'text-slate-900'}`}>
                          {p.name}
                        </span>
                        {p.isPopular && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.2 rounded-full">
                            PRO
                          </span>
                        )}
                        {isHovered && (
                          <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-in fade-in duration-100 flex items-center gap-1 shadow-2xs">
                            <Check className="w-2.5 h-2.5" />
                            <span>Escoger</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                      B/. {p.priceMonthly.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold px-2 py-0.5 rounded transition-colors ${
                        isHovered ? 'bg-emerald-100 text-emerald-900' : 'text-slate-800 bg-slate-100'
                      }`}>
                        {p.invoiceLimit.toLocaleString('es-PA')} facturas
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-700 font-bold">
                      Ilimitado
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      2 Usuarios
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      1 Bodega
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          seleccionarPlan(p.name, p.priceMonthly, p);
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ml-auto ${
                          isHovered
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400 scale-105'
                            : p.isPopular
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800'
                        }`}
                      >
                        <span>Elegir</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preguntas Frecuentes (FAQ) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <HelpCircle className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            Preguntas Frecuentes sobre la Suscripción
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-start gap-2">
                <span className="text-emerald-600 font-black">P.</span>
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-slate-600 pl-4 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Interactivo de Selección y Checkout */}
      {isCheckoutModalOpen && selectedPlanForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Close button */}
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!checkoutSuccess ? (
              <>
                <div>
                  <div className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider rounded mb-1 border border-emerald-200">
                    Proceso de Activación
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Confirmar Selección de Plan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Revisa el desglose de tu suscripción para {company?.name || 'tu empresa'}
                  </p>
                </div>

                {/* Resumen del Plan */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-slate-900 text-base">{selectedPlanForModal.name}</div>
                      <div className="text-xs text-slate-500">{selectedPlanForModal.invoiceLimitText}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-lg text-slate-900">
                        B/. {selectedPlanForModal.priceMonthly.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-500 block">/ mes</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal mensual:</span>
                      <span className="font-mono font-medium">B/. {selectedPlanForModal.priceMonthly.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ITBMS legal (7%):</span>
                      <span className="font-mono font-medium">B/. {(selectedPlanForModal.priceMonthly * 0.07).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total mensual a facturar:</span>
                      <span className="font-mono text-emerald-700">
                        B/. {(selectedPlanForModal.priceMonthly * 1.07).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Características destacadas */}
                <div className="space-y-1.5 text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <div className="font-bold text-emerald-950">Incluido en tu suscripción:</div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ingreso ilimitado de datos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>2 Usuarios simultáneos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1 Espacio de bodega</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Soporte fiscal DGI</span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => {
                      setIsCheckoutModalOpen(false);
                      if (onNavigateToCheckout) {
                        onNavigateToCheckout(selectedPlanForModal.id, billingCycle);
                      } else {
                        setSelectedPlanForCheckout(selectedPlanForModal.id);
                        setCurrentView('checkout');
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Continuar al Pago Seguro</span>
                  </button>

                  <a
                    href={`https://wa.me/50760000000?text=${encodeURIComponent(
                      `Hola, deseo activar el ${selectedPlanForModal.name} (B/. ${selectedPlanForModal.priceMonthly.toFixed(2)}/mes + ITBMS) para mi empresa ${company?.name || 'en Panamá'}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <span>Consultar por WhatsApp con un Asesor</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    ¡Solicitud de Plan Recibida!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    Has seleccionado el <strong className="text-slate-900">{selectedPlanForModal.name}</strong> por{' '}
                    <strong className="font-mono text-emerald-700">
                      B/. {(selectedPlanForModal.priceMonthly * 1.07).toFixed(2)}/mes
                    </strong>{' '}
                    (con 7% ITBMS incluido).
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
                  <div className="font-bold text-slate-800">Próximos pasos:</div>
                  <div>1. Se generará la orden fiscal a nombre de <strong>{company?.name || 'tu empresa'}</strong>.</div>
                  <div>2. Recibirás las instrucciones de pago por ACH o Yappy.</div>
                  <div>3. Tu cuota de facturas quedará actualizada de inmediato.</div>
                </div>

                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all"
                >
                  Entendido y Volver
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
export default SubscriptionPlansView;
