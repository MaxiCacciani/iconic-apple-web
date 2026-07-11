// CATEGORIAS_PHONE, CATEGORIAS_CONSOLA, CATEGORIAS, esPhone, esConsola
// se derivan de CATEGORIA_DEF — definido debajo de los arrays de modelos

export const MODELOS_IPHONE = [
  'iPhone 17 Pro Max','iPhone 17 Pro','iPhone 17 Plus','iPhone 17',
  'iPhone 16 Pro Max','iPhone 16 Pro','iPhone 16 Plus','iPhone 16',
  'iPhone 15 Pro Max','iPhone 15 Pro','iPhone 15 Plus','iPhone 15',
  'iPhone 14 Pro Max','iPhone 14 Pro','iPhone 14 Plus','iPhone 14',
  'iPhone 13 Pro Max','iPhone 13 Pro','iPhone 13 mini','iPhone 13',
  'iPhone 12 Pro Max','iPhone 12 Pro','iPhone 12 mini','iPhone 12',
  'iPhone 11 Pro Max','iPhone 11 Pro','iPhone 11',
  'iPhone SE (3ª gen)','iPhone SE (2ª gen)',
];
export const MODELOS_IPAD = [
  'iPad Pro 13" M4','iPad Pro 11" M4',
  'iPad Air 13" M2','iPad Air 11" M2',
  'iPad mini (7ª gen)','iPad (10ª gen)','iPad (9ª gen)',
];
export const MODELOS_MAC = [
  'MacBook Air 13" M3','MacBook Air 15" M3',
  'MacBook Pro 14" M4','MacBook Pro 14" M4 Pro','MacBook Pro 16" M4',
  'MacBook Air 13" M2','MacBook Pro 14" M3','MacBook Pro 16" M3',
  'Mac mini M4','Mac mini M2','iMac 24" M3',
];
export const MODELOS_WATCH = [
  'Apple Watch Series 10 46mm','Apple Watch Series 10 42mm',
  'Apple Watch Ultra 2','Apple Watch SE (2ª gen) 44mm','Apple Watch SE (2ª gen) 40mm',
];
export const MODELOS_AIRPODS = [
  'AirPods Pro (2ª gen)','AirPods 4 (ANC)','AirPods 4','AirPods (3ª gen)','AirPods Max (USB-C)',
];
export const MODELOS_XBOX = [
  'Xbox Series X','Xbox Series S','Xbox One X','Xbox One S','Xbox One','Xbox 360 Slim','Xbox 360',
];
export const MODELOS_PS = [
  'PlayStation 5 (PS5)','PS5 Slim','PS5 Slim Digital Edition','PS5 Digital Edition',
  'PS4 Pro','PS4 Slim','PlayStation 4 (PS4)',
  'PS3 Slim','PS3 Fat','PlayStation 2 (PS2)',
];
export const MODELOS_NINTENDO = [
  'Nintendo Switch OLED','Nintendo Switch','Nintendo Switch Lite',
  'Nintendo 3DS XL','Nintendo 3DS','Nintendo DS Lite','Wii U','Wii',
];

export const CAPS_PHONE = ['64 GB','128 GB','256 GB','512 GB','1 TB'];
export const CAPS_IPAD  = ['64 GB','128 GB','256 GB','512 GB','1 TB','2 TB'];
export const CAPS_MAC   = ['256 GB','512 GB','1 TB','2 TB'];
export const CAPS_XBOX  = ['512 GB','1 TB','2 TB'];
export const CAPS_PS    = ['Edición Disco','Edición Digital','825 GB','1 TB'];

export const COLORES_IPHONE = [
  'Titanio Natural','Titanio Negro','Titanio Blanco','Titanio Azul','Titanio Desierto',
  'Negro','Blanco','Rosa','Azul','Verde','Amarillo','Ultramarino',
  'Medianoche','Blanco Estelar','Morado Oscuro','Verde Azulado','Plata',
  'Rojo (Product Red)','Tostado',
];
export const COLORES_IPAD = ['Plata','Gris Espacial','Azul','Morado','Rosa','Amarillo','Verde'];
export const COLORES_MAC  = ['Plata','Gris Espacial','Dorado','Azul Medianoche','Luz de Estrella','Verde','Morado','Naranja'];
export const COLORES_WATCH    = ['Plata','Medianoche','Luz de Estrella','Rojo (Product Red)','Titanio Natural','Titanio Negro'];
export const COLORES_XBOX     = ['Negro Carbon','Blanco Robot','Azul Shock','Rojo Pulse','Verde','Edición Especial'];
export const COLORES_PS       = ['Blanco','Negro Midnight','Rojo Volcano','Azul Cobalt','Plata Natural','Edición Especial'];
export const COLORES_NINTENDO = ['Blanco / Rojo Neón','Negro / Gris','Azul Neón / Rojo Neón','Coral','Azul','Gris','Turquesa','Edición Especial'];

export const PROVEEDORES = [
  'Plan canje','Importación personal',
];

// ─── Registro de categorías ───────────────────────────────────────────────────
// Para agregar una nueva categoría: solo agregá una entrada aquí.
// Ningún otro archivo necesita cambiar.

const DEF_ACCESORIO = {
  modelos: null, caps: null, colores: null,
  tieneIMEI: false, tieneBateria: false, tieneControles: false, tieneExtras: false,
  enTabPropia: false, capLabel: 'Especificación',
};

export const CATEGORIA_DEF = {
  'iPhone':      { modelos: MODELOS_IPHONE, caps: CAPS_PHONE, colores: COLORES_IPHONE, tieneIMEI: true,  tieneBateria: true,  tieneControles: false, tieneExtras: false, enTabPropia: true,  capLabel: 'Almacenamiento' },
  'iPad':        { modelos: MODELOS_IPAD,   caps: CAPS_IPAD,  colores: COLORES_IPAD,   tieneIMEI: true,  tieneBateria: true,  tieneControles: false, tieneExtras: false, enTabPropia: true,  capLabel: 'Almacenamiento' },
  'Mac':         { modelos: MODELOS_MAC,    caps: CAPS_MAC,   colores: COLORES_MAC,    tieneIMEI: true,  tieneBateria: true,  tieneControles: false, tieneExtras: false, enTabPropia: true,  capLabel: 'Almacenamiento' },
  'Apple Watch': { modelos: MODELOS_WATCH,  caps: null,       colores: COLORES_WATCH,  tieneIMEI: false, tieneBateria: false, tieneControles: false, tieneExtras: false, enTabPropia: true,  capLabel: 'Especificación' },
  'AirPods':     { modelos: MODELOS_AIRPODS,caps: null,       colores: null,           tieneIMEI: false, tieneBateria: false, tieneControles: false, tieneExtras: false, enTabPropia: true,  capLabel: 'Especificación' },
  'Xbox':        { modelos: MODELOS_XBOX,   caps: CAPS_XBOX,  colores: COLORES_XBOX,   tieneIMEI: false, tieneBateria: false, tieneControles: true,  tieneExtras: true,  enTabPropia: true,  capLabel: 'Edición / Almacenamiento' },
  'PlayStation': { modelos: MODELOS_PS,     caps: CAPS_PS,    colores: COLORES_PS,     tieneIMEI: false, tieneBateria: false, tieneControles: true,  tieneExtras: true,  enTabPropia: true,  capLabel: 'Edición / Almacenamiento' },
  'Nintendo':    { modelos: MODELOS_NINTENDO,caps: null,      colores: COLORES_NINTENDO,tieneIMEI: false, tieneBateria: false, tieneControles: true,  tieneExtras: true,  enTabPropia: true,  capLabel: 'Edición / Almacenamiento' },
};

const CATEGORIAS_ACCESORIO = ['Vidrio templado','Cargador','Cable','Funda/Case','Otro accesorio'];

export function getCatDef(cat) { return CATEGORIA_DEF[cat] ?? DEF_ACCESORIO; }

export const CATEGORIAS_PHONE   = Object.entries(CATEGORIA_DEF).filter(([,d]) => d.tieneIMEI).map(([k]) => k);
export const CATEGORIAS_CONSOLA = Object.entries(CATEGORIA_DEF).filter(([,d]) => d.tieneControles).map(([k]) => k);
export const CATEGORIAS         = [...Object.keys(CATEGORIA_DEF), ...CATEGORIAS_ACCESORIO];
export const esPhone   = (cat) => getCatDef(cat).tieneIMEI;
export const esConsola = (cat) => getCatDef(cat).tieneControles;

export function getModelos(cat) { return getCatDef(cat).modelos; }
export function getCaps(cat)    { return getCatDef(cat).caps; }
export function getColores(cat) { return getCatDef(cat).colores; }

export const DEFECTOS_COMUNES = [
  'Pantalla con micro-rayones',
  'Pantalla rota (uso normal afectado)',
  'Marco desgastado o rayado',
  'Carcasa trasera rayada',
  'Botón con juego o dificultad',
  'Altavoz con distorsión leve',
  'Cámara con polvo interior',
  'Touch ID / Face ID con fallas leves',
  'Puerto de carga flojo',
  'Otro desperfecto',
];

export const DIAGNOSTICOS = [
  'Pantalla rota o con fallas',
  'Batería defectuosa',
  'Problema con la cámara',
  'Botones físicos no funcionan',
  'Sin señal o problemas de red',
  'No enciende',
  'Problema de altavoz o micrófono',
  'Problema de carga',
  'Daño por humedad o líquidos',
  'Face ID / Touch ID no funciona',
  'Reinicio espontáneo',
  'Sobrecalentamiento',
  'Otro',
];

