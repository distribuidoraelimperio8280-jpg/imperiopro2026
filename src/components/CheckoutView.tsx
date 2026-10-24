import React, { useState, useEffect, useId } from 'react';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  Receipt, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  Tag, 
  Calendar, 
  Building, 
  Users, 
  Warehouse, 
  Database,
  HelpCircle,
  ExternalLink,
  Printer,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import { 
  initPagueloFacil, 
  solicitarTokenPago, 
  confirmarTransaccion, 
  activarSuscripcionCliente,
  getPagueloFacilConfig,
  type PagueloFacilTransactionResponse 
} from '../services/paymentService';

export interface CheckoutPlanInfo {
  id: string;
  name: string;
  priceMonthly: number;
  invoiceLimitText: string;
  invoiceLimit: number;
  features: string[];
}

export const AVAILABLE_PLANS: CheckoutPlanInfo[] = [
  {
    id: 'emprendedor',
    name: 'Plan Emprendedor',
    priceMonthly: 25.00,
    invoiceLimit: 100,
    invoiceLimitText: '100 facturas de venta al mes',
    features: ['Ingreso ilimitado de datos', '2 Usuarios simultáneos', '1 Espacio de bodega', 'Facturación DGI / PAC']
  },
  {
    id: 'pyme',
    name: 'Plan Pyme',
    priceMonthly: 50.00,
    invoiceLimit: 250,
    invoiceLimitText: '250 facturas de venta al mes',
    features: ['Ingreso ilimitado de datos', '2 Usuarios simultáneos', '1 Espacio de bodega', 'Cotizaciones a WhatsApp']
  },
  {
    id: 'pro',
    name: 'Plan Pro (Más Popular)',
    priceMonthly: 70.00,
    invoiceLimit: 500,
    invoiceLimitText: '500 facturas de venta al mes',
    features: ['Ingreso ilimitado de datos', '2 Usuarios simultáneos', '1 Espacio de bodega', 'Rutas Google Maps GPS', 'Gráficos y Balance']
  },
  {
    id: 'plus',
    name: 'Plan Plus',
    priceMonthly: 100.00,
    invoiceLimit: 1000,
    invoiceLimitText: '1,000 facturas de venta al mes',
    features: ['Ingreso ilimitado de datos', '2 Usuarios simultáneos', '1 Espacio de bodega', 'Multimoneda y Plantillas']
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    priceMonthly: 200.00,
    invoiceLimit: 2000,
    invoiceLimitText: '2,000 facturas de venta al mes',
    features: ['Ingreso ilimitado de datos', '2 Usuarios simultáneos', '1 Espacio de bodega', 'Auditoría Fiscal Avanzada', 'Soporte 24/7']
  }
];

export type DocumentTypeOption = 
  | 'Contribuyente (RUC)'
  | 'Consumidor Final (Cédula)'
  | 'Gobierno Extranjero'
  | 'Empresa Extranjera'
  | 'Empresa Nacional';

/**
 * Algoritmo de Luhn (Módulo 10) para validación de tarjetas de crédito y débito.
 * Valida la suma de verificación de números de tarjeta bancaria (Visa, Mastercard, Amex, Discover, etc.)
 *
 * @param cardNumber Número de tarjeta con o sin espacios/guiones
 * @returns true si el número cumple la fórmula de Luhn (suma total mod 10 == 0)
 */
export function validateLuhn(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\D/g, '');
  // La longitud estándar de tarjetas bancarias válidas está entre 13 y 19 dígitos
  if (!sanitized || sanitized.length < 13 || sanitized.length > 19) {
    return false;
  }

  // Descartar secuencias repetidas obvias (ej. 0000000000000000 o 1111111111111111)
  if (/^(\d)\1+$/.test(sanitized)) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  // Recorrer los dígitos de derecha a izquierda
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Validador oficial de Cédula de Identidad Personal de Panamá
 * Admite formatos tradicionales normados por la DGI y el Tribunal Electoral:
 * - Regular: Provincia-Tomo-Asiento (ej. 8-765-4321, 4-123-4567, 10-123-456, 1-23-456)
 * - Especiales: PE-XX-XXXX, N-XX-XXXX, E-XX-XXXX, PI-XX-XXXX, AV-XX-XXXX
 * - Continuo alfanumérico sin guiones: de 6 a 12 caracteres (ej. 87654321, PE123456)
 */
export function validatePanamaCedula(cedula: string): { isValid: boolean; message?: string } {
  const clean = cedula.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'La Cédula de identidad es obligatoria para emitir el comprobante.' };
  }

  // Patrón con guiones: (1-13 | PE | N | E | PI | AV) - (1-5 caracteres) - (1-6 caracteres)
  const cedulaConGuionesRegex = /^(?:1[0-3]|[1-9]|PE|N|E|PI|AV)-[0-9A-Z]{1,5}-[0-9A-Z]{1,6}$/;
  // Patrón continuo alfanumérico sin guiones (ej. 87654321)
  const cedulaSinGuionesRegex = /^[0-9A-Z]{6,14}$/;

  if (cedulaConGuionesRegex.test(clean) || cedulaSinGuionesRegex.test(clean)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    message: 'Formato de Cédula inválido. Usa el estándar panameño Provincia-Tomo-Asiento (ej. 8-765-4321, 4-123-456 o PE-12-345).'
  };
}

/**
 * Validador de RUC (Registro Único de Contribuyente - DGI Panamá)
 * Para personas jurídicas y naturales:
 * - Formato: números/letras y guiones (ej. 155689021-2-2026, 1234567-1-123456, 8-NT-1-1234, 8-123-456)
 * - Longitud: entre 5 y 30 caracteres
 */
export function validatePanamaRuc(ruc: string): { isValid: boolean; message?: string } {
  const clean = ruc.trim().toUpperCase();
  if (!clean) {
    return { isValid: false, message: 'El número de RUC es obligatorio para personas o entidades contribuyentes.' };
  }

  if (clean.length < 5 || clean.length > 30) {
    return { isValid: false, message: 'El RUC debe tener entre 5 y 30 caracteres.' };
  }

  // No debe iniciar ni terminar con guión, y contener solo caracteres alfanuméricos y guiones
  const rucRegex = /^[0-9A-Z]+(?:-[0-9A-Z]+)+$/;
  const alphanumericOnly = /^[0-9A-Z]{5,30}$/;

  if (!rucRegex.test(clean) && !alphanumericOnly.test(clean)) {
    return { 
      isValid: false, 
      message: 'Formato de RUC no válido ante la DGI. Debe contener números/letras y guiones (ej. 155689021-2-2026 o 8-123-456).' 
    };
  }

  return { isValid: true };
}

/**
 * Validador de Dígito Verificador (DV) para RUC panameño
 * Requiere entre 1 y 3 dígitos numéricos (ej. 01, 55, 9).
 */
export function validateDigitoVerificador(dv: string): { isValid: boolean; message?: string } {
  const clean = dv.trim();
  if (!clean) {
    return { isValid: false, message: 'El Dígito Verificador (DV) es obligatorio para Contribuyentes con RUC.' };
  }

  if (!/^\d{1,3}$/.test(clean)) {
    return { isValid: false, message: 'El DV debe contener entre 1 y 3 dígitos numéricos (ej. 55).' };
  }

  return { isValid: true };
}

/**
 * Validador exhaustivo de datos de tarjeta bancaria
 */
export function validateCardData(params: {
  cardName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardBrand?: 'visa' | 'mastercard' | 'amex' | 'generic';
}): { isValid: boolean; errors: { [key: string]: string } } {
  const errors: { [key: string]: string } = {};

  // 1. Titular de la tarjeta
  const cleanName = params.cardName.trim();
  if (!cleanName) {
    errors.cardName = 'Ingresa el nombre del titular como figura en el plástico.';
  } else if (cleanName.length < 4) {
    errors.cardName = 'El nombre del titular debe tener al menos 4 letras.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(cleanName)) {
    errors.cardName = 'El nombre contiene caracteres no permitidos. Usa solo letras y espacios.';
  } else if (cleanName.split(/\s+/).length < 2) {
    errors.cardName = 'Ingresa nombre y apellido completos (ej. CARLOS MENDOZA).';
  }

  // 2. Número de Tarjeta con Luhn y validación de marcas
  const rawNum = params.cardNumber.replace(/\D/g, '');
  if (!rawNum) {
    errors.cardNumber = 'El número de tarjeta es obligatorio.';
  } else if (rawNum.length < 13 || rawNum.length > 19) {
    errors.cardNumber = 'Longitud de tarjeta inválida (debe contener entre 13 y 19 dígitos).';
  } else if (/^(\d)\1+$/.test(rawNum)) {
    errors.cardNumber = 'Número de tarjeta inválido (dígitos repetitivos).';
  } else if (params.cardBrand === 'amex' && rawNum.length !== 15) {
    errors.cardNumber = 'Las tarjetas American Express deben contener exactamente 15 dígitos.';
  } else if (params.cardBrand === 'mastercard' && rawNum.length !== 16) {
    errors.cardNumber = 'Las tarjetas Mastercard deben contener 16 dígitos.';
  } else if (params.cardBrand === 'visa' && ![13, 16, 19].includes(rawNum.length)) {
    errors.cardNumber = 'Las tarjetas Visa deben contener 13, 16 o 19 dígitos.';
  } else if (!validateLuhn(rawNum)) {
    errors.cardNumber = 'Número de tarjeta inválido. La suma de comprobación del Algoritmo de Luhn (Mod 10) no coincide.';
  }

  // 3. Fecha de Vencimiento (MM/AA)
  if (!params.cardExpiry) {
    errors.cardExpiry = 'La fecha de vencimiento es obligatoria.';
  } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(params.cardExpiry)) {
    errors.cardExpiry = 'Formato inválido. Usa MM/AA (ej. 12/28).';
  } else {
    const [monthStr, yearStr] = params.cardExpiry.split('/');
    const expMonth = parseInt(monthStr, 10);
    const expYear = parseInt('20' + yearStr, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      errors.cardExpiry = 'La tarjeta se encuentra vencida. Ingresa una tarjeta vigente.';
    } else if (expYear > currentYear + 15) {
      errors.cardExpiry = 'Año de vencimiento lejano o incorrecto (máximo 15 años).';
    }
  }

  // 4. Código de Seguridad CVC / CVV
  const rawCvc = params.cardCvc.trim();
  if (!rawCvc) {
    errors.cardCvc = 'El código CVC/CVV es obligatorio.';
  } else if (!/^\d+$/.test(rawCvc)) {
    errors.cardCvc = 'El CVC debe ser numérico.';
  } else if (params.cardBrand === 'amex' && rawCvc.length !== 4) {
    errors.cardCvc = 'Para American Express el CVC debe tener exactamente 4 dígitos.';
  } else if (params.cardBrand !== 'amex' && rawCvc.length !== 3) {
    errors.cardCvc = 'El código CVC debe tener exactamente 3 dígitos (al reverso).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validador de Correo Electrónico
 */
export function validateFiscalEmail(email: string): { isValid: boolean; message?: string } {
  const clean = email.trim();
  if (!clean) {
    return { isValid: false, message: 'El correo electrónico es obligatorio para recibir la factura electrónica.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, message: 'Formato de correo electrónico inválido (ej. contabilidad@empresa.com).' };
  }
  return { isValid: true };
}

/**
 * Validador de Razón Social / Nombre Fiscal
 */
export function validateLegalName(name: string): { isValid: boolean; message?: string } {
  const clean = name.trim();
  if (!clean) {
    return { isValid: false, message: 'La razón social o nombre para la factura fiscal es obligatoria.' };
  }
  if (clean.length < 3) {
    return { isValid: false, message: 'La razón social debe tener al menos 3 caracteres.' };
  }
  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(clean)) {
    return { isValid: false, message: 'La razón social debe contener letras identificativas.' };
  }
  return { isValid: true };
}

interface CheckoutViewProps {
  selectedPlanId?: string;
  initialFrequency?: 'monthly' | 'annual';
  onBackToPlans?: () => void;
  onSuccessReturn?: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  selectedPlanId = 'pro',
  initialFrequency = 'monthly',
  onBackToPlans,
  onSuccessReturn
}) => {
  const company = useLiveQuery(() => db.companyProfile.get('default'), []);

  // Form IDs for strict accessibility
  const cardNameId = useId();
  const cardNumberId = useId();
  const cardExpiryId = useId();
  const cardCvcId = useId();
  const docTypeId = useId();
  const docNumberId = useId();
  const dvId = useId();
  const legalNameId = useId();
  const billingEmailId = useId();
  const couponInputId = useId();

  // State: Plan and Billing Cycle
  const [currentPlanId, setCurrentPlanId] = useState<string>(selectedPlanId);
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'annual'>(initialFrequency);

  // State: Payment Method (Card)
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'amex' | 'generic'>('generic');

  // State: Fiscal Data
  const [documentType, setDocumentType] = useState<DocumentTypeOption>('Contribuyente (RUC)');
  const [documentNumber, setDocumentNumber] = useState(company?.ruc || '');
  const [digitoVerificador, setDigitoVerificador] = useState(company?.dv || '00');
  const [legalName, setLegalName] = useState(company?.name || 'DISTRIBUIDORA EL IMPERIO');
  const [billingEmail, setBillingEmail] = useState(company?.email || 'distribuidoraelimperio8280@gmail.com');

  // State: Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percent?: number; fixed?: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // State: Validation & Processing
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [gatewayStatusStep, setGatewayStatusStep] = useState<string>('');
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [activatedSubscriptionInfo, setActivatedSubscriptionInfo] = useState<{
    newLimit: number;
    planName: string;
  } | null>(null);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    authCode: string;
    operationCode?: string;
    transactionId: string;
    date: string;
    planName: string;
    frequency: string;
    totalPaid: number;
    subtotal: number;
    discount: number;
    itbms: number;
    last4: string;
    clientName: string;
    docNumber: string;
    receiptUrl?: string;
    gateway?: string;
  } | null>(null);

  // Auto-fill from company profile if available
  useEffect(() => {
    if (company) {
      if (!legalName) setLegalName(company.name);
      if (!documentNumber && company.ruc) setDocumentNumber(company.ruc);
      if (!billingEmail && company.email) setBillingEmail(company.email);
      if (company.dv) setDigitoVerificador(company.dv);
    }
  }, [company]);

  // Synchronize plan from prop
  useEffect(() => {
    if (selectedPlanId) {
      setCurrentPlanId(selectedPlanId);
    }
  }, [selectedPlanId]);

  // Find currently active plan
  const activePlan = AVAILABLE_PLANS.find(p => p.id === currentPlanId) || AVAILABLE_PLANS[2]; // Default Pro

  // Validación en tiempo real del Algoritmo de Luhn (Módulo 10)
  const rawCardNumber = cardNumber.replace(/\D/g, '');
  const isLuhnValid = rawCardNumber.length >= 13 ? validateLuhn(rawCardNumber) : null;

  // Card Number formatting & Brand Detection (soporta Visa, Mastercard, Amex 4-6-5 y hasta 19 dígitos)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 19);
    let detectedBrand: 'visa' | 'mastercard' | 'amex' | 'generic' = 'generic';

    if (rawVal.startsWith('4')) {
      detectedBrand = 'visa';
    } else if (/^(5[1-5]|2[2-7])/.test(rawVal)) {
      detectedBrand = 'mastercard';
    } else if (/^(34|37)/.test(rawVal)) {
      detectedBrand = 'amex';
    }

    setCardBrand(detectedBrand);

    // Formateo según la red bancaria
    let formatted = rawVal;
    if (detectedBrand === 'amex') {
      // Bloques 4 - 6 - 5 característicos de American Express
      const p1 = rawVal.slice(0, 4);
      const p2 = rawVal.slice(4, 10);
      const p3 = rawVal.slice(10, 15);
      formatted = [p1, p2, p3].filter(Boolean).join(' ');
    } else {
      // Bloques de 4 dígitos para Visa, Mastercard y otros
      formatted = rawVal.match(/.{1,4}/g)?.join(' ') || rawVal;
    }

    setCardNumber(formatted);
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: '' }));
    }
  };

  // Expiry MM/AA formatting
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setCardExpiry(val);
    if (errors.cardExpiry) {
      setErrors(prev => ({ ...prev, cardExpiry: '' }));
    }
  };

  // CVC formatting (3 dígitos para Visa/MC, 4 dígitos para Amex)
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxLen = cardBrand === 'amex' ? 4 : 3;
    const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
    setCardCvc(val);
    if (errors.cardCvc) {
      setErrors(prev => ({ ...prev, cardCvc: '' }));
    }
  };

  // Document Number formatting & sanitization (RUC / Cédula)
  const handleDocumentNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();
    // Permitir letras, números y guiones característicos de Panamá
    val = val.replace(/[^A-Z0-9-]/g, '');
    setDocumentNumber(val);
    if (errors.documentNumber) {
      setErrors(prev => ({ ...prev, documentNumber: '' }));
    }
  };

  // Dígito Verificador (DV) para RUC (solo números de 1 a 3 dígitos)
  const handleDigitoVerificadorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setDigitoVerificador(val);
    if (errors.digitoVerificador) {
      setErrors(prev => ({ ...prev, digitoVerificador: '' }));
    }
  };

  // Coupon handling
  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccessMsg('');
    const clean = couponCode.trim().toUpperCase();
    if (!clean) {
      setCouponError('Ingresa un cupón válido.');
      return;
    }

    if (clean === 'IMPERIO10' || clean === 'PROMO10') {
      setAppliedDiscount({ code: clean, percent: 10 });
      setCouponSuccessMsg('¡Cupón aplicado! 10% de descuento adicional');
    } else if (clean === 'BIENVENIDA' || clean === 'PANAMA2026') {
      setAppliedDiscount({ code: clean, fixed: 5.00 });
      setCouponSuccessMsg('¡Cupón aplicado! B/. 5.00 de descuento directo');
    } else {
      setCouponError('El código promocional no es válido o ya ha expirado.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccessMsg('');
  };

  // Financial Calculations
  // Monthly price
  const baseMonthlyPrice = activePlan.priceMonthly;
  
  // Calculate Subtotal according to frequency
  // If annual: 12 months with a 15% promotional discount
  let subtotal = 0;
  let cycleDiscount = 0;

  if (billingFrequency === 'monthly') {
    subtotal = baseMonthlyPrice;
  } else {
    // Annual is 12 months. Standard price = base * 12. We apply a 15% annual plan saving
    const fullYearPrice = baseMonthlyPrice * 12;
    cycleDiscount = fullYearPrice * 0.15; // 15% discount for annual commitment
    subtotal = fullYearPrice - cycleDiscount;
  }

  // Coupon Discount
  let promoDiscountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.percent) {
      promoDiscountAmount = Number((subtotal * (appliedDiscount.percent / 100)).toFixed(2));
    } else if (appliedDiscount.fixed) {
      promoDiscountAmount = Math.min(appliedDiscount.fixed, subtotal);
    }
  }

  const netSubtotal = Math.max(0, subtotal - promoDiscountAmount);
  // ITBMS 7% tax in Panama: calculated strictly on the net subtotal after discounts
  const itbmsAmount = Number((netSubtotal * 0.07).toFixed(2));
  const totalToPay = Number((netSubtotal + itbmsAmount).toFixed(2));

  // Next renewal date calculation
  const nextRenewalDate = new Date();
  if (billingFrequency === 'monthly') {
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
  } else {
    nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
  }
  const renewalDateFormatted = nextRenewalDate.toLocaleDateString('es-PA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Client-side Validation Robusta para Tarjeta y Documentos Fiscales Panameños
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // 1. Validación de Datos de Tarjeta Bancaria (Titular, Número con Algoritmo de Luhn, Vencimiento, CVC)
    const cardValidation = validateCardData({
      cardName,
      cardNumber,
      cardExpiry,
      cardCvc,
      cardBrand
    });

    if (!cardValidation.isValid) {
      Object.assign(newErrors, cardValidation.errors);
    }

    // 2. Validación Robusta de Identificación Fiscal según Normativa DGI Panamá
    if (documentType === 'Consumidor Final (Cédula)') {
      const cedulaCheck = validatePanamaCedula(documentNumber);
      if (!cedulaCheck.isValid && cedulaCheck.message) {
        newErrors.documentNumber = cedulaCheck.message;
      }
    } else if (documentType === 'Contribuyente (RUC)') {
      const rucCheck = validatePanamaRuc(documentNumber);
      if (!rucCheck.isValid && rucCheck.message) {
        newErrors.documentNumber = rucCheck.message;
      }

      const dvCheck = validateDigitoVerificador(digitoVerificador);
      if (!dvCheck.isValid && dvCheck.message) {
        newErrors.digitoVerificador = dvCheck.message;
      }
    } else {
      // Empresa Nacional, Empresa Extranjera, Gobierno Extranjero
      const cleanDoc = documentNumber.trim();
      if (!cleanDoc) {
        newErrors.documentNumber = 'El identificador fiscal o tributario es obligatorio.';
      } else if (cleanDoc.length < 4 || cleanDoc.length > 30) {
        newErrors.documentNumber = 'El identificador debe contener entre 4 y 30 caracteres válidos.';
      } else if (!/^[A-Z0-9-]+$/i.test(cleanDoc)) {
        newErrors.documentNumber = 'El identificador contiene caracteres no permitidos.';
      }
    }

    // 3. Validación de Razón Social / Nombre Fiscal
    const legalNameCheck = validateLegalName(legalName);
    if (!legalNameCheck.isValid && legalNameCheck.message) {
      newErrors.legalName = legalNameCheck.message;
    }

    // 4. Validación de Correo Electrónico para Facturación Electrónica
    const emailCheck = validateFiscalEmail(billingEmail);
    if (!emailCheck.isValid && emailCheck.message) {
      newErrors.billingEmail = emailCheck.message;
    }

    setErrors(newErrors);

    // Si existen errores, hacer foco y scroll al primer campo con fallo
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const fieldIdMap: Record<string, string> = {
        cardName: cardNameId,
        cardNumber: cardNumberId,
        cardExpiry: cardExpiryId,
        cardCvc: cardCvcId,
        documentNumber: docNumberId,
        digitoVerificador: dvId,
        legalName: legalNameId,
        billingEmail: billingEmailId,
      };

      const firstField = errorKeys[0];
      const targetId = fieldIdMap[firstField];
      if (targetId && typeof document !== 'undefined') {
        const el = document.getElementById(targetId);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return false;
    }

    return true;
  };

  // Función principal requerida: procesarPago() con integración real de PagueloFacil
  const procesarPago = async () => {
    setGatewayError(null);

    // Validación estricta: si los datos no cumplen con los formatos requeridos, NO llamar a solicitarTokenPago
    const isFormValid = validateForm();
    if (!isFormValid) {
      console.warn('[PagueloFacil Checkout] Validación fallida. Se cancela la llamada a solicitarTokenPago hasta corregir los campos requeridos.');
      return;
    }

    setIsProcessing(true);
    setGatewayStatusStep('1/3: Validando datos fiscales y algoritmo de Luhn (Mod 10)...');

    try {
      // Paso 1: Tokenización Segura con PagueloFacil (PCI-DSS)
      setGatewayStatusStep('2/3: Cifrando tarjeta y generando token seguro en PagueloFacil...');
      const cleanCard = cardNumber.replace(/\D/g, '');
      const [expMonth, expYear] = cardExpiry.split('/');

      const tokenResult = await solicitarTokenPago({
        cardholderName: cardName.trim(),
        cardNumber: cleanCard,
        expiryMonth: expMonth || '12',
        expiryYear: expYear || '27',
        cvc: cardCvc.trim()
      });

      if (!tokenResult.success || !tokenResult.token) {
        throw new Error(tokenResult.error || 'No fue posible tokenizar la tarjeta de manera segura.');
      }

      // Paso 2: Estructurar el JSON de transacción requerido por la API de PagueloFacil
      setGatewayStatusStep('3/3: Transmitiendo cobro a PagueloFacil (Monto + 7% ITBMS)...');
      
      const transactionPayload = {
        amount: Number(totalToPay.toFixed(2)),
        taxAmount: Number(itbmsAmount.toFixed(2)),
        description: `Suscripción Imperio Pro Contabilidad - ${activePlan.name} (${billingFrequency === 'monthly' ? 'Mensual' : 'Anual'})`,
        email: billingEmail.trim(),
        phone: company?.phone || '+507 6890-1234',
        customFields: {
          documentType,
          documentNumber: documentNumber.trim(),
          digitoVerificador: documentType === 'Contribuyente (RUC)' ? digitoVerificador : undefined,
          legalName: legalName.trim(),
          planId: activePlan.id,
          billingFrequency,
        },
        cardData: {
          name: cardName.trim(),
          number: cardNumber,
          expiry: cardExpiry,
          cvc: cardCvc,
        },
        paymentToken: tokenResult.token,
      };

      console.log('[PagueloFacil Gateway] Estructura JSON enviada a la pasarela:', transactionPayload);

      // Disparar evento personalizado en el objeto window para integraciones JavaScript externas
      if (typeof window !== 'undefined') {
        const checkoutEvent = new CustomEvent('paguelofacil_transaction_initiated', {
          detail: transactionPayload
        });
        window.dispatchEvent(checkoutEvent);
      }

      // Paso 3: Confirmar transacción con PagueloFacil
      const txResponse = await confirmarTransaccion(transactionPayload);

      if (!txResponse.success || txResponse.status !== 'Approved') {
        throw new Error(
          txResponse.message || 
          'La transacción fue rechazada por la pasarela de pagos (Tarjeta declinada o fondos insuficientes).'
        );
      }

      // Paso 4: Transacción Exitosa (Approved) -> Ejecutar activarSuscripcionCliente
      setGatewayStatusStep('¡Transacción Aprobada! Activando plan e incrementando límite de facturas...');
      const activation = await activarSuscripcionCliente(activePlan.id, txResponse.transactionId, {
        authCode: txResponse.authCode,
        billingFrequency,
        totalPaid: txResponse.amount,
        receiptUrl: txResponse.receiptUrl,
      });

      setActivatedSubscriptionInfo({
        newLimit: activation.newLimit,
        planName: activation.planName
      });

      // Configurar estado para la vista de Confirmación y Recibo Imprimible
      const result = {
        success: true,
        authCode: txResponse.authCode,
        operationCode: txResponse.operationCode,
        transactionId: txResponse.transactionId,
        date: new Date().toLocaleDateString('es-PA') + ' ' + new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' }),
        planName: activePlan.name,
        frequency: billingFrequency === 'monthly' ? 'Mensual' : 'Anual (-15% Descuento)',
        totalPaid: txResponse.amount,
        subtotal: subtotal,
        discount: promoDiscountAmount,
        itbms: itbmsAmount,
        last4: txResponse.cardLast4,
        clientName: txResponse.clientName,
        docNumber: txResponse.documentNumber + (documentType === 'Contribuyente (RUC)' && digitoVerificador ? ` DV ${digitoVerificador}` : ''),
        receiptUrl: txResponse.receiptUrl,
        gateway: 'PagueloFacil'
      };

      setPaymentResult(result);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('paguelofacil_payment_success', {
          detail: result
        }));
      }

    } catch (err: any) {
      console.error('[PagueloFacil Checkout] Error al procesar pago:', err);
      setGatewayError(err.message || 'La pasarela PagueloFacil no pudo procesar la transacción. Revisa tus datos e intenta nuevamente.');
    } finally {
      setIsProcessing(false);
      setGatewayStatusStep('');
    }
  };

  // Exponer métodos de integración PagueloFacil y validación en window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        initPagueloFacil: typeof initPagueloFacil;
        solicitarTokenPago: typeof solicitarTokenPago;
        confirmarTransaccion: typeof confirmarTransaccion;
        activarSuscripcionCliente: typeof activarSuscripcionCliente;
        procesarPago: () => Promise<void>;
        validateLuhn: typeof validateLuhn;
        validatePanamaCedula: typeof validatePanamaCedula;
        validatePanamaRuc: typeof validatePanamaRuc;
        validateDigitoVerificador: typeof validateDigitoVerificador;
        validateCardData: typeof validateCardData;
        validateForm: () => boolean;
      };

      win.initPagueloFacil = initPagueloFacil;
      win.solicitarTokenPago = solicitarTokenPago;
      win.confirmarTransaccion = confirmarTransaccion;
      win.activarSuscripcionCliente = activarSuscripcionCliente;
      win.procesarPago = async () => {
        await procesarPago();
      };
      win.validateLuhn = validateLuhn;
      win.validatePanamaCedula = validatePanamaCedula;
      win.validatePanamaRuc = validatePanamaRuc;
      win.validateDigitoVerificador = validateDigitoVerificador;
      win.validateCardData = validateCardData;
      win.validateForm = validateForm;
    }
  }, [cardName, cardNumber, cardExpiry, cardCvc, documentType, documentNumber, digitoVerificador, legalName, billingEmail, activePlan, billingFrequency, promoDiscountAmount, itbmsAmount, totalToPay]);

  // Pantalla de Éxito / Comprobante de Pago Emitido
  if (paymentResult && paymentResult.success) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 animate-in fade-in duration-300">
        
        {/* Recibo Formal Imprimible */}
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          
          {/* Cinta superior decorativa */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

          <div className="text-center space-y-2 pt-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-black uppercase tracking-wider rounded-full border border-emerald-200">
                Pago Autorizado y Suscripción Activada
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-800 text-[11px] font-black uppercase tracking-wider rounded-full border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>PagueloFacil Gateway</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ¡Bienvenido a {paymentResult.planName}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Tu suscripción en <strong>Imperio Pro Contabilidad</strong> ha sido procesada con éxito a través de <strong>PagueloFacil</strong>. Tus fondos y límite de facturas han sido actualizados de inmediato.
            </p>

            {activatedSubscriptionInfo && (
              <div className="max-w-md mx-auto bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-center justify-center gap-2 mt-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Límite mensual actualizado a:{' '}
                  <strong className="font-black">
                    {activatedSubscriptionInfo.newLimit >= 999999 
                      ? 'Facturación Ilimitada' 
                      : `${activatedSubscriptionInfo.newLimit} facturas de venta al mes`}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Tarjeta de Detalles del Comprobante Fiscal */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ID Transacción PagueloFacil
                </span>
                <span className="font-mono font-bold text-xs text-slate-800">
                  {paymentResult.transactionId}
                </span>
                {paymentResult.operationCode && (
                  <span className="font-mono text-[11px] text-slate-500 block">
                    Op: {paymentResult.operationCode}
                  </span>
                )}
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Código de Autorización
                </span>
                <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {paymentResult.authCode}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Pasarela: PagueloFacil (PA)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Titular / Empresa:</span>
                <span className="font-bold text-slate-900">{paymentResult.clientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Documento Fiscal:</span>
                <span className="font-mono font-bold text-slate-900">{paymentResult.docNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Método de Pago:</span>
                <span className="font-medium text-slate-800">Tarjeta terminada en •••• {paymentResult.last4}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora de Emisión:</span>
                <span className="font-medium text-slate-800">{paymentResult.date}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Frecuencia Contratada:</span>
                <span className="font-bold text-slate-900">{paymentResult.frequency}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Próxima Renovación Automática:</span>
                <span className="font-medium text-slate-800">{renewalDateFormatted}</span>
              </div>
            </div>

            {/* Desglose de Valores */}
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Plan:</span>
                <span className="font-mono font-medium">B/. {paymentResult.subtotal.toFixed(2)}</span>
              </div>
              {paymentResult.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuento Aplicado:</span>
                  <span className="font-mono">-B/. {paymentResult.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>ITBMS Legal (7%):</span>
                <span className="font-mono font-medium">B/. {paymentResult.itbms.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Pagado:</span>
                <span className="font-mono text-emerald-700 text-lg">
                  B/. {paymentResult.totalPaid.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Sellos de Respaldo */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2 px-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Factura electrónica certificada enviada a {billingEmail}</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Transacción encriptada 256-Bit SSL</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir Comprobante Fiscal</span>
            </button>

            <button
              onClick={() => {
                if (onSuccessReturn) {
                  onSuccessReturn();
                } else if (onBackToPlans) {
                  onBackToPlans();
                } else {
                  setPaymentResult(null);
                }
              }}
              className="w-full sm:flex-1 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ir al Panel Principal de Contabilidad</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 max-w-7xl mx-auto">
      
      {/* Top Breadcrumb / Return to Plans */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          {onBackToPlans && (
            <button
              onClick={onBackToPlans}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Regresar a la lista de planes"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Ver todos los planes</span>
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>Proceso de Pago y Facturación (Checkout)</span>
            </h1>
            <p className="text-xs text-slate-500">
              Configura tu método de pago y datos fiscales para activar tu suscripción oficial
            </p>
          </div>
        </div>

        {/* Security badge top right */}
        <div className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Conexión Cifrada SSL 256-Bit</span>
        </div>
      </div>

      {/* OVERLAY DE CARGA Y CIFRADO SEGURO PAGUELOFACIL */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-emerald-500 text-center space-y-4">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                <Lock className="w-7 h-7" />
              </div>
            </div>
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full mb-1.5">
                PagueloFacil Gateway • Panamá
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Procesando Pago Seguro
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {gatewayStatusStep || 'Cifrando datos bancarios y verificando autorización...'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cifrado TLS 256-Bit de grado bancario • PCI-DSS</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Por favor no cierres ni actualices esta ventana mientras confirmamos la transferencia a tu cuenta vinculada.
            </p>
          </div>
        </div>
      )}

      {/* BANNER DE ERROR O RECHAZO BANCARIO PAGUELOFACIL */}
      {gatewayError && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-xs text-rose-900 shadow-sm animate-in fade-in duration-200">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                <span>Transacción Declinada o Fallida por PagueloFacil</span>
              </h4>
              <button 
                onClick={() => setGatewayError(null)}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold px-2 py-0.5 rounded hover:bg-rose-100 cursor-pointer"
              >
                Cerrar aviso
              </button>
            </div>
            <p className="text-rose-800 font-medium">
              {gatewayError}
            </p>
            <p className="text-[11px] text-rose-600/90 pt-0.5">
              Tus datos se conservaron intactos en el formulario. Puedes verificar el número de tarjeta, fecha de vencimiento, código CVC o fondos disponibles y volver a presionar <strong>"Guardar y Continuar"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: FORMULARIO DE PAGO Y FACTURACIÓN (7/12) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECCIÓN C: FRECUENCIA DE COBRO Y FACTURACIÓN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Frecuencia de Cobro y Facturación
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Cancelable en cualquier momento
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              {/* Opción Mensual */}
              <label 
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  billingFrequency === 'monthly'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="billingFrequency"
                  value="monthly"
                  checked={billingFrequency === 'monthly'}
                  onChange={() => setBillingFrequency('monthly')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 block">
                    Facturación Mensual
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Cobro recurrente cada 30 días
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 block pt-1">
                    B/. {baseMonthlyPrice.toFixed(2)} / mes
                  </span>
                </div>
              </label>

              {/* Opción Anual */}
              <label 
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  billingFrequency === 'annual'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.2 rounded-full uppercase tracking-wider shadow-xs">
                  -15% Ahorro
                </div>
                <input
                  type="radio"
                  name="billingFrequency"
                  value="annual"
                  checked={billingFrequency === 'annual'}
                  onChange={() => setBillingFrequency('annual')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 block">
                    Pago Anual Adelantado
                  </span>
                  <span className="text-xs text-slate-500 block">
                    12 meses con descuento especial
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-700 block pt-1">
                    B/. {(baseMonthlyPrice * 0.85).toFixed(2)} / mes equiv.
                  </span>
                </div>
              </label>

            </div>

            {/* Detalles del ciclo de facturación y renovación automática */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Detalles de Renovación y Ciclo:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Su suscripción se renovará automáticamente el día{' '}
                <strong className="text-slate-900">{renewalDateFormatted}</strong>{' '}
                ({billingFrequency === 'monthly' ? 'ciclo mensual' : 'ciclo anual'}). Puede pausar o cancelar la renovación automática en cualquier momento antes de la fecha límite desde el panel de configuración sin recargos.
              </p>
            </div>
          </div>

          {/* SECCIÓN A: MÉTODO DE PAGO (TARJETA CRÉDITO / DÉBITO) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Método de Pago: Tarjeta de Crédito / Débito
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>PagueloFacil Gateway</span>
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">VISA</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">MC</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">AMEX</span>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              
              {/* Nombre en la tarjeta */}
              <div>
                <label htmlFor={cardNameId} className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre en la tarjeta <span className="text-rose-500">*</span>
                </label>
                <input
                  id={cardNameId}
                  type="text"
                  placeholder="Ej. CARLOS E. MENDOZA"
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value.toUpperCase());
                    if (errors.cardName) setErrors(prev => ({ ...prev, cardName: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 transition-all ${
                    errors.cardName
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {errors.cardName && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.cardName}
                  </p>
                )}
              </div>

              {/* Número de tarjeta con detección visual y formato **** **** **** **** */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor={cardNumberId} className="block text-xs font-bold text-slate-700">
                    Número de tarjeta <span className="text-rose-500">*</span>
                  </label>
                  {isLuhnValid === true && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Luhn Válido (Mod 10)</span>
                    </span>
                  )}
                  {isLuhnValid === false && rawCardNumber.length >= 13 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Luhn Inválido</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id={cardNumberId}
                    type="text"
                    inputMode="numeric"
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className={`w-full pl-10 pr-16 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono tracking-wider font-bold focus:outline-hidden focus:ring-2 transition-all ${
                      errors.cardNumber
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : isLuhnValid === true
                        ? 'border-emerald-300 focus:ring-emerald-500 bg-emerald-50/10'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {cardBrand === 'visa' && (
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">VISA</span>
                    )}
                    {cardBrand === 'mastercard' && (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">MC</span>
                    )}
                    {cardBrand === 'amex' && (
                      <span className="text-[10px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">AMEX</span>
                    )}
                    {cardBrand === 'generic' && (
                      <Lock className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
                {errors.cardNumber ? (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.cardNumber}
                  </p>
                ) : isLuhnValid === true ? (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    Tarjeta verificada mediante el algoritmo de Luhn (Módulo 10).
                  </p>
                ) : rawCardNumber.length >= 15 && isLuhnValid === false ? (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    El dígito de verificación no coincide según el algoritmo de Luhn.
                  </p>
                ) : null}
              </div>

              {/* Fila Fecha de Vencimiento y CVC */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Fecha de vencimiento MM/AA */}
                <div>
                  <label htmlFor={cardExpiryId} className="block text-xs font-bold text-slate-700 mb-1">
                    Vencimiento (MM/AA) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={cardExpiryId}
                    type="text"
                    inputMode="numeric"
                    placeholder="12/28"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono text-center font-bold focus:outline-hidden focus:ring-2 transition-all ${
                      errors.cardExpiry
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  {errors.cardExpiry && (
                    <p className="text-[10px] text-rose-600 mt-1 leading-tight font-medium">
                      {errors.cardExpiry}
                    </p>
                  )}
                </div>

                {/* Código de seguridad CVC/CVV */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={cardCvcId} className="text-xs font-bold text-slate-700">
                      CVC / CVV <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400" title="3 dígitos al reverso o 4 al frente para Amex">
                      3-4 dígitos
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id={cardCvcId}
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="•••"
                      value={cardCvc}
                      onChange={handleCvcChange}
                      className={`w-full pl-3.5 pr-8 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono text-center font-bold focus:outline-hidden focus:ring-2 transition-all ${
                        errors.cardCvc
                          ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  {errors.cardCvc && (
                    <p className="text-[10px] text-rose-600 mt-1 leading-tight font-medium">
                      {errors.cardCvc}
                    </p>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* SECCIÓN B: DATOS FISCALES / DOCUMENTACIÓN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Datos Fiscales para Emisión de Factura
                </h2>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                Normativa DGI Panamá
              </span>
            </div>

            <div className="space-y-4 pt-1">
              
              {/* Tipo de Documento */}
              <div>
                <label htmlFor={docTypeId} className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Documento Fiscal <span className="text-rose-500">*</span>
                </label>
                <select
                  id={docTypeId}
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentTypeOption)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Contribuyente (RUC)">Contribuyente (RUC)</option>
                  <option value="Consumidor Final (Cédula)">Consumidor Final (Cédula)</option>
                  <option value="Empresa Nacional">Empresa Nacional</option>
                  <option value="Empresa Extranjera">Empresa Extranjera</option>
                  <option value="Gobierno Extranjero">Gobierno Extranjero</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Define el formato del identificador tributario en la Factura Electrónica.
                </span>
              </div>

              {/* Número de Documento (Input dependiente de la opción elegida) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={documentType === 'Contribuyente (RUC)' ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={docNumberId} className="block text-xs font-bold text-slate-700">
                      Número de {documentType.includes('RUC') ? 'RUC' : documentType.includes('Cédula') ? 'Cédula' : 'Identificación'} <span className="text-rose-500">*</span>
                    </label>
                    {documentType === 'Contribuyente (RUC)' && documentNumber && validatePanamaRuc(documentNumber).isValid && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>RUC DGI Válido</span>
                      </span>
                    )}
                    {documentType === 'Consumidor Final (Cédula)' && documentNumber && validatePanamaCedula(documentNumber).isValid && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Cédula Válida</span>
                      </span>
                    )}
                  </div>
                  <input
                    id={docNumberId}
                    type="text"
                    placeholder={
                      documentType === 'Contribuyente (RUC)'
                        ? 'Ej. 155689021-2-2026'
                        : documentType === 'Consumidor Final (Cédula)'
                        ? 'Ej. 8-765-4321 o PE-12-345'
                        : 'Ej. ID Tributario Internacional'
                    }
                    value={documentNumber}
                    onChange={handleDocumentNumberChange}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono font-medium focus:outline-hidden focus:ring-2 transition-all ${
                      errors.documentNumber
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  {errors.documentNumber && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {errors.documentNumber}
                    </p>
                  )}
                </div>

                {/* Dígito Verificador (DV) si es Contribuyente RUC */}
                {documentType === 'Contribuyente (RUC)' && (
                  <div>
                    <label htmlFor={dvId} className="block text-xs font-bold text-slate-700 mb-1">
                      Dígito Verif. (DV) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id={dvId}
                      type="text"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="Ej. 55"
                      value={digitoVerificador}
                      onChange={handleDigitoVerificadorChange}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono text-center font-bold focus:outline-hidden focus:ring-2 transition-all ${
                        errors.digitoVerificador
                          ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                    {errors.digitoVerificador && (
                      <p className="text-[10px] text-rose-600 mt-1 leading-tight font-medium">
                        {errors.digitoVerificador}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Razón Social / Nombre Comercial */}
              <div>
                <label htmlFor={legalNameId} className="block text-xs font-bold text-slate-700 mb-1">
                  Razón Social / Nombre Fiscal <span className="text-rose-500">*</span>
                </label>
                <input
                  id={legalNameId}
                  type="text"
                  placeholder="Ej. DISTRIBUIDORA EL IMPERIO, S.A."
                  value={legalName}
                  onChange={(e) => {
                    setLegalName(e.target.value);
                    if (errors.legalName) setErrors(prev => ({ ...prev, legalName: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 transition-all ${
                    errors.legalName
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {errors.legalName && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.legalName}
                  </p>
                )}
              </div>

              {/* Correo Electrónico para Factura Electrónica */}
              <div>
                <label htmlFor={billingEmailId} className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico para Facturación <span className="text-rose-500">*</span>
                </label>
                <input
                  id={billingEmailId}
                  type="email"
                  placeholder="contabilidad@empresa.com"
                  value={billingEmail}
                  onChange={(e) => {
                    setBillingEmail(e.target.value);
                    if (errors.billingEmail) setErrors(prev => ({ ...prev, billingEmail: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 transition-all ${
                    errors.billingEmail
                      ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-emerald-500'
                  }`}
                />
                {errors.billingEmail && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {errors.billingEmail}
                  </p>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Recibirás el archivo XML fiscal firmado y el PDF oficial con código QR DGI.
                </span>
              </div>

            </div>
          </div>

        </div>


        {/* ========================================================= */}
        {/* COLUMNA DERECHA: RESUMEN DE LA SUSCRIPCIÓN (CHECKOUT) (5/12) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
          
          <div className="bg-white border-2 border-slate-900 rounded-3xl p-5 sm:p-6 shadow-lg space-y-5 relative">
            
            {/* Header del Resumen */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Resumen de Suscripción
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {billingFrequency === 'monthly' ? 'Mensual' : 'Anual -15%'}
              </span>
            </div>

            {/* Plan Seleccionado con selector dinámico */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Plan Seleccionado
                  </span>
                  <div className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>{activePlan.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 block">
                    {activePlan.invoiceLimitText}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Tarifa base</span>
                  <span className="font-mono font-black text-base text-slate-900">
                    B/. {baseMonthlyPrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">/ mes</span>
                </div>
              </div>

              {/* Selector para cambiar de plan rápidamente con botones de hover verde llamativo */}
              <div className="pt-2 border-t border-slate-200/80">
                <label className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Cambiar de Plan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-2">
                  {AVAILABLE_PLANS.map((p) => {
                    const isSelected = p.id === currentPlanId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCurrentPlanId(p.id)}
                        className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50 scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-xs hover:scale-[1.02]'
                        }`}
                        title={`${p.name} - B/. ${p.priceMonthly.toFixed(2)}/mes`}
                      >
                        <div className="truncate font-black">{p.name.replace('Plan ', '')}</div>
                        <div className="text-[10px] font-mono opacity-85">B/.{p.priceMonthly.toFixed(0)}</div>
                      </button>
                    );
                  })}
                </div>
                <select
                  value={currentPlanId}
                  onChange={(e) => setCurrentPlanId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {AVAILABLE_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — B/. {p.priceMonthly.toFixed(2)}/mes ({p.invoiceLimitText})
                    </option>
                  ))}
                </select>
              </div>

              {/* Características Clave del Plan */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Incluye en este plan:
                </span>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-emerald-600" />
                    <span>Ingreso ilimitado de datos y clientes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span>2 Usuarios simultáneos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="w-3 h-3 text-emerald-600" />
                    <span>1 Espacio de bodega / sucursal</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Código Promocional / Cupón de Descuento */}
            <div className="space-y-2 pt-1">
              <label htmlFor={couponInputId} className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>¿Tienes un código de descuento?</span>
              </label>

              {!appliedDiscount ? (
                <div className="flex gap-2">
                  <input
                    id={couponInputId}
                    type="text"
                    placeholder="Ej. IMPERIO10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    type="button"
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Código: {appliedDiscount.code}</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer underline"
                  >
                    Eliminar
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {couponError}
                </p>
              )}
              {couponSuccessMsg && (
                <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  {couponSuccessMsg}
                </p>
              )}
            </div>

            {/* Desglose Financiero del Cobro */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              
              {/* Frecuencia */}
              <div className="flex justify-between text-slate-600">
                <span>Frecuencia seleccionada:</span>
                <span className="font-bold text-slate-800">
                  {billingFrequency === 'monthly' ? 'Mensual (cada 30 días)' : 'Anual (12 meses)'}
                </span>
              </div>

              {/* Subtotal */}
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({billingFrequency === 'monthly' ? '1 mes' : '12 meses con -15%'}):</span>
                <span className="font-mono font-bold text-slate-800">
                  B/. {subtotal.toFixed(2)}
                </span>
              </div>

              {/* Descuento Aplicado */}
              <div className="flex justify-between text-slate-600">
                <span>Descuento aplicado:</span>
                <span className={`font-mono font-bold ${promoDiscountAmount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {promoDiscountAmount > 0 ? `- B/. ${promoDiscountAmount.toFixed(2)}` : '$0.00'}
                </span>
              </div>

              {/* Impuesto ITBMS 7% */}
              <div className="flex justify-between text-slate-600">
                <span className="flex items-center gap-1">
                  <span>Impuesto (ITBMS 7%):</span>
                  <span className="text-[10px] text-slate-400" title="Calculado sobre el subtotal con descuento">(DGI)</span>
                </span>
                <span className="font-mono font-bold text-slate-800">
                  B/. {itbmsAmount.toFixed(2)}
                </span>
              </div>

              {/* Total a Pagar Grande */}
              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 block">
                    Total a Pagar:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Incluye el 7% de ITBMS legal
                  </span>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-black text-slate-600">B/.</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                      {totalToPay.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {billingFrequency === 'monthly' ? 'cargo recurrente mensual' : 'pago único anual'}
                  </span>
                </div>
              </div>

            </div>

            {/* SECCIÓN D: BOTÓN PRINCIPAL "GUARDAR Y CONTINUAR" */}
            <div className="pt-2 space-y-3">
              <button
                id="btn-guardar-y-continuar"
                onClick={procesarPago}
                disabled={isProcessing}
                className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/25 hover:shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cifrando y Procesando Pago...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Guardar y Continuar</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 leading-tight block">
                  Cobro procesado directamente por la pasarela oficial <strong>PagueloFacil Panamá</strong>. Al hacer clic en "Guardar y Continuar", autorizas la transacción con cifrado bancario y confirmas la emisión de tu factura electrónica.
                </span>
              </div>
            </div>

            {/* Sellos de Seguridad y Certificación */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5 font-bold text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>PagueloFacil Gateway</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PCI-DSS Certificado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Algoritmo Luhn (Mod 10)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Cifrado TLS 256-Bit</span>
              </div>
            </div>

          </div>

          {/* Nota Aclaratoria Fiscal en Columna Lateral */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Aviso Legal de Impuestos:</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Todos los precios de los planes están fijados en Balboas (B/.) y no incluyen el 7% de ITBMS obligatorio según la legislación tributaria panameña. El ITBMS se calcula y desglosa en tiempo real en este resumen antes de procesar su cargo.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
export default CheckoutView;
