export interface ExpenseCategoryGroup {
  id: string;
  name: string;
  codePrefix: string;
  iconName: string;
  suggestedAccount: string;
  categories: string[];
}

export const EXPENSE_TAXONOMY: ExpenseCategoryGroup[] = [
  {
    id: 'costo_ventas',
    name: 'A. COSTO DE VENTAS E INVENTARIO',
    codePrefix: '51',
    iconName: 'ShoppingBag',
    suggestedAccount: '5101 - Costo de Ventas e Insumos Operativos',
    categories: [
      'Compra de Mercadería / Productos',
      'Fletes, Traslados y Envíos de Compras',
      'Importaciones y Aranceles'
    ]
  },
  {
    id: 'viaje_viaticos',
    name: 'B. GASTOS DE VIAJE, VIÁTICOS Y REPRESENTACIÓN',
    codePrefix: '6102',
    iconName: 'Plane',
    suggestedAccount: '6102 - Viáticos y Gastos de Representación',
    categories: [
      'Hotelería / Hospedaje',
      'Viáticos y Dietas',
      'Consumo y Alimentos (Giras / Reuniones)',
      'Pasajes / Transporte Terrestre y Aéreo'
    ]
  },
  {
    id: 'flota_transporte',
    name: 'C. GASTOS DE FLOTA Y TRANSPORTE',
    codePrefix: '6103',
    iconName: 'Truck',
    suggestedAccount: '6103 - Mantenimiento y Combustible de Flota',
    categories: [
      'Combustible y Lubricantes',
      'Mantenimiento de Vehículos Livianos (Autos / Paneles)',
      'Mantenimiento de Camiones y Equipo Pesado',
      'Peajes, Estacionamientos y Grúas',
      'Repuestos, Baterías y Llantas'
    ]
  },
  {
    id: 'servicios_publicos',
    name: 'D. SERVICIOS PÚBLICOS Y BÁSICOS',
    codePrefix: '6104',
    iconName: 'Zap',
    suggestedAccount: '6104 - Servicios Básicos y Utilidades',
    categories: [
      'Electricidad / Luz',
      'Agua y Aseo',
      'Telecomunicaciones e Internet Fijo',
      'Telefonía Móvil / Planes Celulares'
    ]
  },
  {
    id: 'insumos_oficina',
    name: 'E. INSUMOS Y GASTOS DE OFICINA',
    codePrefix: '6105',
    iconName: 'FileSpreadsheet',
    suggestedAccount: '6105 - Insumos, Papelería y Aseo de Oficina',
    categories: [
      'Insumos y Papelería de Oficina',
      'Artículos de Aseo y Limpieza',
      'Equipamiento Menor y Muebles de Oficina'
    ]
  },
  {
    id: 'tecnologia_software',
    name: 'F. TECNOLOGÍA Y SOFTWARE',
    codePrefix: '6106',
    iconName: 'Laptop',
    suggestedAccount: '6106 - Licencias de Software y Soporte IT',
    categories: [
      'Aplicaciones, Licencias y Suscripciones (SaaS / Cloud / Hosting)',
      'Mantenimiento de Equipos de Cómputo e Impresoras',
      'Dominios y Servicios Web'
    ]
  },
  {
    id: 'personal_planilla',
    name: 'G. GASTOS DE PERSONAL Y PLANILLA',
    codePrefix: '6107',
    iconName: 'Users',
    suggestedAccount: '6107 - Sueldos, Prestaciones y Cargas Sociales',
    categories: [
      'Salarios y Sueldos Brutos',
      'Decimotercer Mes (Décimo Primer y Segundo Pago / Partidas)',
      'Cuota Patronal y Seguro Social (CSS)',
      'Vacaciones, Décimo Proporcional y Liquidaciones',
      'Bonificaciones y Comisiones de Venta'
    ]
  },
  {
    id: 'legales_profesionales',
    name: 'H. GASTOS LEGALES Y PROFESIONALES',
    codePrefix: '6108',
    iconName: 'Scale',
    suggestedAccount: '6108 - Honorarios Profesionales y Asesoría Legal',
    categories: [
      'Honorarios Contables y Auditoría',
      'Servicios Legales y Abogados',
      'Trámites, Licencias, Avisos de Operación y Permisos'
    ]
  },
  {
    id: 'instalaciones_local',
    name: 'I. INSTALACIONES Y LOCAL',
    codePrefix: '6109',
    iconName: 'Building',
    suggestedAccount: '6109 - Arrendamiento, Mantenimiento y Seguros',
    categories: [
      'Alquiler / Arrendamiento de Local, Bodega u Oficina',
      'Mantenimiento de Edificio, Pintura y Reparaciones Locales',
      'Seguridad, Cámaras y Vigilancia Privada',
      'Seguros Comerciales y Pólizas de Incendio / Contenido'
    ]
  },
  {
    id: 'publicidad_marketing',
    name: 'J. PUBLICIDAD Y MARKETING',
    codePrefix: '6110',
    iconName: 'Megaphone',
    suggestedAccount: '6110 - Publicidad, Marketing y Promoción',
    categories: [
      'Pautas Digitales (Meta Ads, Google Ads, Redes Sociales)',
      'Publicidad Impresa, Volantes y Material Promocional',
      'Eventos, Ferias y Patrocinios'
    ]
  },
  {
    id: 'financieros_bancarios',
    name: 'K. GASTOS FINANCIEROS Y BANCARIOS',
    codePrefix: '6201',
    iconName: 'Landmark',
    suggestedAccount: '6201 - Comisiones Bancarias e Intereses Financieros',
    categories: [
      'Comisiones Bancarias y Manejo de Cuenta',
      'Intereses de Préstamos o Líneas de Crédito',
      'Comisiones por Tarjetas de Crédito / POS'
    ]
  },
  {
    id: 'impuestos_tasas',
    name: 'L. IMPUESTOS, TASAS Y TRIBUTOS',
    codePrefix: '6301',
    iconName: 'Receipt',
    suggestedAccount: '6301 - Impuestos y Tasas Municipales/Estatales',
    categories: [
      'Tasa Única Anual',
      'Impuestos Municipales',
      'Retenciones y Otros Impuestos Directos'
    ]
  },
  {
    id: 'otros_no_operativos',
    name: 'M. OTROS GASTOS NO OPERATIVOS',
    codePrefix: '6401',
    iconName: 'HelpCircle',
    suggestedAccount: '6401 - Donaciones y Gastos No Operacionales',
    categories: [
      'Donaciones y Aportes',
      'Gastos Imprevistos / Varios'
    ]
  }
];

export const COST_CENTERS = [
  'Administración Central / Oficina Principal',
  'Ventas y Distribución',
  'Depósito Central / Almacén Principal',
  'Sucursal / Depósito Chiriquí',
  'Sucursal Panamá Oeste / Chorrera',
  'Sucursal Azuero / Provincias Centrales',
  'Operaciones y Logística',
  'Taller y Flota Vehicular',
  'Dirección General'
];

export const VEHICLE_FLEET_PRESETS = [
  { id: 'v1', plate: 'BC-4821', name: 'Camión Isuzu NPR 4.5T (Placa: BC-4821)' },
  { id: 'v2', plate: 'AA-9032', name: 'Panel Hyundai H-100 Reparto (Placa: AA-9032)' },
  { id: 'v3', plate: 'AK-5510', name: 'Panel Nissan Urvan Carga (Placa: AK-5510)' },
  { id: 'v4', plate: 'CL-3319', name: 'Pickup Toyota Hilux 4x4 (Placa: CL-3319)' },
  { id: 'v5', plate: '829103', name: 'Camión Freightliner M2 Pesado (Placa: 829103)' },
  { id: 'v6', plate: 'M-4421', name: 'Moto Mensajería Yamaha (Placa: M-4421)' }
];

export function findGroupForCategory(categoryName: string): ExpenseCategoryGroup | undefined {
  return EXPENSE_TAXONOMY.find(group =>
    group.categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase()) ||
    group.name.toLowerCase().includes(categoryName.toLowerCase())
  );
}
