export const TC = 1400;
export const TODAY = { y: 2026, m: 6, d: 15 };

export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const MONTH_ABBR  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const DAY_NAMES   = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

export const CATEGORIAS_PHONE = ['iPhone','iPad','Mac'];
export const CATEGORIAS = [
  'iPhone','iPad','Mac','Apple Watch','AirPods',
  'Vidrio templado','Cargador','Cable','Funda/Case','Otro accesorio',
];
export const esPhone = (cat) => CATEGORIAS_PHONE.includes(cat);

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

export function fARS(n) { return '$ ' + Math.round(n).toLocaleString('es-AR'); }
export function fUSD(n) { return 'US$ ' + Math.round(n).toLocaleString('es-AR'); }
export function dnum(o) { return o.y * 10000 + o.m * 100 + o.d; }
export function dim(y, m) { return new Date(y, m, 0).getDate(); }
export function firstW(y, m) { return (new Date(y, m - 1, 1).getDay() + 6) % 7; }
export function weekdayOf(y, m, d) { return (firstW(y, m) + d - 1) % 7; }
export function mesesRest(gv) {
  let mo = (gv.y - TODAY.y) * 12 + (gv.m - TODAY.m);
  if (gv.d < TODAY.d) mo -= 1;
  return mo;
}
export function gvFmt(gv) { return gv.d + ' ' + MONTH_ABBR[gv.m - 1] + ' ' + gv.y; }
export function batColor(b) { return b >= 85 ? '#82b39d' : b >= 80 ? '#74a8d6' : '#d98a76'; }
export function saldoDe(c) { return c.plan ? (c.plan.total - c.plan.pagadas) * c.plan.monto : 0; }
export function nextId(arr) { return String(arr.length + 1 + Date.now()).slice(-8); }

export const EQUIPOS_INIT = [
  { id:'e1',  categoria:'iPhone', modelo:'iPhone 16 Pro Max', cap:'256 GB', color:'Titanio Natural',  cond:'Nuevo', bat:null, imei:'356938 11 240517 4', usd:1450, estado:'disponible', cantidad:1 },
  { id:'e2',  categoria:'iPhone', modelo:'iPhone 16 Pro',     cap:'256 GB', color:'Titanio Negro',     cond:'Nuevo', bat:null, imei:'356938 11 772094 1', usd:1250, estado:'disponible', cantidad:1 },
  { id:'e3',  categoria:'iPhone', modelo:'iPhone 16',         cap:'128 GB', color:'Rosa',              cond:'Nuevo', bat:null, imei:'353091 10 884412 8', usd: 950, estado:'disponible', cantidad:1 },
  { id:'e4',  categoria:'iPhone', modelo:'iPhone 16 Plus',    cap:'256 GB', color:'Ultramarino',       cond:'Nuevo', bat:null, imei:'356712 09 551203 6', usd:1080, estado:'disponible', cantidad:1 },
  { id:'e5',  categoria:'iPhone', modelo:'iPhone 15 Pro Max', cap:'256 GB', color:'Titanio Natural',   cond:'Usado', bat:92,   imei:'358261 07 119284 3', usd:1180, estado:'disponible', cantidad:1, defectos:'' },
  { id:'e6',  categoria:'iPhone', modelo:'iPhone 15 Pro',     cap:'128 GB', color:'Titanio Azul',      cond:'Usado', bat:88,   imei:'357004 06 882017 9', usd: 870, estado:'disponible', cantidad:1, defectos:'' },
  { id:'e7',  categoria:'iPhone', modelo:'iPhone 15',         cap:'128 GB', color:'Negro',             cond:'Nuevo', bat:null, imei:'352099 08 440126 2', usd: 820, estado:'disponible', cantidad:1, defectos:'' },
  { id:'e8',  categoria:'iPhone', modelo:'iPhone 14 Pro',     cap:'256 GB', color:'Morado Oscuro',     cond:'Usado', bat:81,   imei:'351442 05 207733 5', usd: 760, estado:'disponible', cantidad:1, defectos:'Marco desgastado o rayado' },
  { id:'e9',  categoria:'iPhone', modelo:'iPhone 14',         cap:'128 GB', color:'Medianoche',        cond:'Usado', bat:79,   imei:'350877 04 663901 7', usd: 600, estado:'disponible', cantidad:1, defectos:'Pantalla con micro-rayones' },
  { id:'e10', categoria:'iPhone', modelo:'iPhone 13',         cap:'128 GB', color:'Blanco Estelar',    cond:'Usado', bat:73,   imei:'353448 03 119027 4', usd: 470, estado:'disponible', cantidad:1, defectos:'Carcasa trasera rayada · Marco desgastado o rayado' },
  { id:'e11', categoria:'iPhone', modelo:'iPhone 16 Pro',     cap:'512 GB', color:'Titanio Desierto',  cond:'Nuevo', bat:null, imei:'356938 11 905562 0', usd:1390, estado:'reservado',  cantidad:1 },
  { id:'e12', categoria:'iPhone', modelo:'iPhone 15 Pro',     cap:'256 GB', color:'Titanio Blanco',    cond:'Usado', bat:90,   imei:'357004 06 338820 1', usd: 920, estado:'vendido',    cantidad:1 },
  // Accesorios
  { id:'a1', categoria:'Vidrio templado', modelo:'Vidrio templado iPhone 16 Pro', cap:'',     color:'Transparente', cond:'Nuevo', bat:null, imei:'', usd:8,  estado:'disponible', cantidad:5 },
  { id:'a2', categoria:'Cargador',        modelo:'Cargador USB-C 20W Apple',      cap:'20W',  color:'Blanco',       cond:'Nuevo', bat:null, imei:'', usd:25, estado:'disponible', cantidad:3 },
  { id:'a3', categoria:'Cable',           modelo:'Cable USB-C a Lightning 1m',    cap:'1 m',  color:'Blanco',       cond:'Nuevo', bat:null, imei:'', usd:12, estado:'disponible', cantidad:7 },
  { id:'a4', categoria:'AirPods',         modelo:'AirPods Pro 2ª gen',            cap:'',     color:'Blanco',       cond:'Nuevo', bat:null, imei:'', usd:249,estado:'disponible', cantidad:1 },
  { id:'a5', categoria:'Funda/Case',      modelo:'Funda silicona iPhone 16',      cap:'',     color:'Azul Pizarra', cond:'Nuevo', bat:null, imei:'', usd:18, estado:'disponible', cantidad:4 },
];

export const SPARK_RAW = [2300, 3100, 2800, 3900, 3200, 2600, 4120];

export const COBROS = [
  { y:2026, m:5,  d:28, cliente:'Lucía Bringas',    equipo:'iPhone 15 Pro Max · cuota 2/6',  monto:268000, estado:'cobrada'  },
  { y:2026, m:5,  d:30, cliente:'Martín Quiroga',   equipo:'iPhone 16 Pro · cuota 2/6',      monto:312000, estado:'cobrada'  },
  { y:2026, m:6,  d:3,  cliente:'Martín Quiroga',   equipo:'iPhone 16 Pro · cuota 3/6',      monto:312000, estado:'cobrada'  },
  { y:2026, m:6,  d:5,  cliente:'Lucía Bringas',    equipo:'iPhone 15 Pro Max · cuota 3/6',  monto:268000, estado:'cobrada'  },
  { y:2026, m:6,  d:8,  cliente:'Federico Sosa',    equipo:'iPhone 14 Pro · cuota 2/6',      monto:175000, estado:'vencida'  },
  { y:2026, m:6,  d:9,  cliente:'Sofía Ledesma',    equipo:'iPhone 16 · cuota 2/9',          monto:240000, estado:'cobrada'  },
  { y:2026, m:6,  d:11, cliente:'Tomás Vera',        equipo:'iPhone 13 · cuota 4/6',          monto:132000, estado:'vencida'  },
  { y:2026, m:6,  d:12, cliente:'Pablo Lucero',      equipo:'iPhone 14 Pro · cuota 5/9',      monto:198000, estado:'cobrada'  },
  { y:2026, m:6,  d:15, cliente:'Nahuel Ferreyra',   equipo:'iPhone 16 Pro Max · cuota 1/12', monto:360000, estado:'pendiente'},
  { y:2026, m:6,  d:16, cliente:'Martín Quiroga',   equipo:'iPhone 16 Pro · cuota 4/6',      monto:312000, estado:'pendiente'},
  { y:2026, m:6,  d:18, cliente:'Lucía Bringas',    equipo:'iPhone 15 Pro Max · cuota 4/6',  monto:268000, estado:'pendiente'},
  { y:2026, m:6,  d:19, cliente:'Sofía Ledesma',    equipo:'iPhone 16 · cuota 3/9',          monto:240000, estado:'pendiente'},
  { y:2026, m:6,  d:22, cliente:'Federico Sosa',    equipo:'iPhone 14 Pro · cuota 3/6',      monto:175000, estado:'pendiente'},
  { y:2026, m:6,  d:23, cliente:'Tomás Vera',        equipo:'iPhone 13 · cuota 5/6',          monto:132000, estado:'pendiente'},
  { y:2026, m:6,  d:25, cliente:'Pablo Lucero',      equipo:'iPhone 14 Pro · cuota 6/9',      monto:198000, estado:'pendiente'},
  { y:2026, m:6,  d:26, cliente:'Julieta Funes',     equipo:'iPhone 15 · cuota 1/9',          monto:222000, estado:'pendiente'},
  { y:2026, m:6,  d:29, cliente:'Nahuel Ferreyra',   equipo:'iPhone 16 Pro Max · cuota 2/12', monto:360000, estado:'pendiente'},
  { y:2026, m:6,  d:30, cliente:'Bruno Medina',      equipo:'iPhone 14 · cuota 1/6',          monto:150000, estado:'pendiente'},
  { y:2026, m:7,  d:2,  cliente:'Martín Quiroga',   equipo:'iPhone 16 Pro · cuota 5/6',      monto:312000, estado:'pendiente'},
  { y:2026, m:7,  d:5,  cliente:'Lucía Bringas',    equipo:'iPhone 15 Pro Max · cuota 5/6',  monto:268000, estado:'pendiente'},
  { y:2026, m:7,  d:10, cliente:'Sofía Ledesma',    equipo:'iPhone 16 · cuota 4/9',          monto:240000, estado:'pendiente'},
];

export const RESERVAS_INIT = [
  { id:'r1', equipo:'iPhone 16 Pro',     spec:'512 GB · Titanio Desierto', cliente:'Tomás Vera',     sena:350000, usd:1390, estado:'activa',      fecha:'8 jun'  },
  { id:'r2', equipo:'iPhone 16 Pro Max', spec:'256 GB · Titanio Natural',  cliente:'Camila Aguirre', sena:500000, usd:1450, estado:'activa',      fecha:'2 jun'  },
  { id:'r3', equipo:'iPhone 15',         spec:'128 GB · Negro',            cliente:'Bruno Medina',   sena:180000, usd: 820, estado:'activa',      fecha:'10 jun' },
  { id:'r4', equipo:'iPhone 14 Pro',     spec:'256 GB · Morado Oscuro',    cliente:'Pablo Lucero',   sena:200000, usd: 760, estado:'activa',      fecha:'12 jun' },
  { id:'r5', equipo:'iPhone 13',         spec:'128 GB · Blanco Estelar',   cliente:'Aldana Ríos',    sena:120000, usd: 470, estado:'convertida',  fecha:'1 jun'  },
];

export const ACTIVIDAD = [
  { hora:'17:05', equipo:'iPhone 16 Pro',  cliente:'Martín Quiroga',  usd:1250, modalidad:'Cuotas'  },
  { hora:'15:30', equipo:'iPhone 16 Plus', cliente:'Camila Aguirre',  usd:1080, modalidad:'Contado' },
  { hora:'12:15', equipo:'iPhone 16',      cliente:'Sofía Ledesma',   usd: 950, modalidad:'Contado' },
  { hora:'10:40', equipo:'iPhone 15 Pro',  cliente:'Tomás Vera',      usd: 840, modalidad:'Cuotas'  },
];

export const CLIENTES_INIT = [
  { id:'c1',  nombre:'Martín Quiroga',    inicial:'M', dni:'34.521.890', tel:'+54 9 3541 55-2089', loc:'Villa Carlos Paz', desde:'2023',
    compras:[
      { modelo:'iPhone 16 Pro',  cap:'256 GB', color:'Titanio Negro',  cond:'Nuevo', bat:null, imei:'356938 11 772094 1', fecha:'12 abr 2026', usd:1250, gVence:{y:2027,m:4,d:12} },
      { modelo:'iPhone 14',      cap:'128 GB', color:'Medianoche',     cond:'Usado', bat:86,   imei:'350877 04 663901 7', fecha:'03 set 2024', usd: 600, gVence:{y:2025,m:3,d:3}  },
    ], plan:{ equipo:'iPhone 16 Pro', total:6, pagadas:3, monto:312000, prox:'16 jun' },
    reclamos:[] },
  { id:'c2',  nombre:'Lucía Bringas',     inicial:'L', dni:'30.118.774', tel:'+54 9 3541 41-7720', loc:'Villa Carlos Paz', desde:'2024',
    compras:[
      { modelo:'iPhone 15 Pro Max', cap:'256 GB', color:'Titanio Natural', cond:'Usado', bat:92, imei:'358261 07 119284 3', fecha:'20 dic 2025', usd:1180, gVence:{y:2026,m:6,d:20} },
      { modelo:'iPhone 15',         cap:'128 GB', color:'Negro',           cond:'Nuevo', bat:null,imei:'352099 08 440126 2', fecha:'Hoy',         usd: 820, gVence:{y:2027,m:6,d:15} },
    ], plan:{ equipo:'iPhone 15 Pro Max', total:6, pagadas:3, monto:268000, prox:'18 jun' },
    reclamos:[
      { id:'rcl1', equipoLabel:'iPhone 15 Pro Max', imei:'358261 07 119284 3', diagnostico:'Batería defectuosa', descripcion:'El cliente reporta que el equipo no dura más de 4 horas de uso normal.', fecha:'10 jun 2026', estado:'En gestión', resolucion:'Se envía a revisión técnica. Pendiente respuesta.' },
    ] },
  { id:'c3',  nombre:'Federico Sosa',     inicial:'F', dni:'33.904.221', tel:'+54 9 3541 60-3318', loc:'Tanti',            desde:'2024',
    compras:[
      { modelo:'iPhone 14 Pro', cap:'256 GB', color:'Morado Oscuro', cond:'Usado', bat:81, imei:'351442 05 207733 5', fecha:'22 nov 2025', usd:760, gVence:{y:2026,m:5,d:22} },
    ], plan:{ equipo:'iPhone 14 Pro', total:6, pagadas:1, monto:175000, prox:'22 jun', mora:'8 jun' },
    reclamos:[
      { id:'rcl2', equipoLabel:'iPhone 14 Pro', imei:'351442 05 207733 5', diagnostico:'Pantalla rota o con fallas', descripcion:'', fecha:'5 jun 2026', estado:'Resuelto', resolucion:'Se cambió el equipo por garantía. Cliente retiró nuevo equipo el 12 jun.' },
    ] },
  { id:'c4',  nombre:'Camila Aguirre',    inicial:'C', dni:'38.220.510', tel:'+54 9 3541 33-9041', loc:'Villa Carlos Paz', desde:'2025',
    compras:[
      { modelo:'iPhone 16 Plus', cap:'256 GB', color:'Ultramarino', cond:'Nuevo', bat:null, imei:'356712 09 551203 6', fecha:'Hoy', usd:1080, gVence:{y:2027,m:6,d:15} },
    ], plan:null, reclamos:[] },
  { id:'c5',  nombre:'Nahuel Ferreyra',   inicial:'N', dni:'35.660.190', tel:'+54 9 3541 22-8841', loc:'Villa Carlos Paz', desde:'2023',
    compras:[
      { modelo:'iPhone 16 Pro Max', cap:'256 GB', color:'Titanio Desierto', cond:'Nuevo', bat:null, imei:'356938 11 240517 4', fecha:'20 may 2026', usd:1450, gVence:{y:2027,m:5,d:20} },
    ], plan:{ equipo:'iPhone 16 Pro Max', total:12, pagadas:1, monto:360000, prox:'15 jun' }, reclamos:[] },
  { id:'c6',  nombre:'Sofía Ledesma',     inicial:'S', dni:'37.014.882', tel:'+54 9 3541 47-1190', loc:'Cosquín',          desde:'2025',
    compras:[
      { modelo:'iPhone 16', cap:'128 GB', color:'Rosa', cond:'Nuevo', bat:null, imei:'353091 10 884412 8', fecha:'09 mar 2026', usd:950, gVence:{y:2027,m:3,d:9} },
    ], plan:{ equipo:'iPhone 16', total:9, pagadas:2, monto:240000, prox:'19 jun' }, reclamos:[] },
  { id:'c7',  nombre:'Tomás Vera',         inicial:'T', dni:'32.551.043', tel:'+54 9 3541 55-7012', loc:'Villa Carlos Paz', desde:'2024',
    compras:[
      { modelo:'iPhone 13', cap:'128 GB', color:'Blanco Estelar', cond:'Usado', bat:73, imei:'353448 03 119027 4', fecha:'10 dic 2025', usd:470, gVence:{y:2026,m:6,d:10} },
    ], plan:{ equipo:'iPhone 13', total:6, pagadas:4, monto:132000, prox:'23 jun' }, reclamos:[] },
  { id:'c8',  nombre:'Bruno Medina',       inicial:'B', dni:'36.880.215', tel:'+54 9 3541 60-2204', loc:'Villa Carlos Paz', desde:'2025',
    compras:[
      { modelo:'iPhone 14', cap:'128 GB', color:'Medianoche', cond:'Usado', bat:84, imei:'350877 04 118802 3', fecha:'04 ene 2026', usd:600, gVence:{y:2026,m:7,d:4} },
    ], plan:null, reclamos:[] },
  { id:'c9',  nombre:'Aldana Ríos',        inicial:'A', dni:'40.112.668', tel:'+54 9 3541 41-5530', loc:'Villa Carlos Paz', desde:'2026', compras:[], plan:null, reclamos:[] },
  { id:'c10', nombre:'Pablo Lucero',       inicial:'P', dni:'31.778.904', tel:'+54 9 3541 33-1198', loc:'Villa Giardino',   desde:'2024',
    compras:[
      { modelo:'iPhone 14 Pro', cap:'256 GB', color:'Plata', cond:'Usado', bat:88, imei:'351442 05 660173 9', fecha:'12 set 2025', usd:760, gVence:{y:2026,m:9,d:12} },
    ], plan:{ equipo:'iPhone 14 Pro', total:9, pagadas:5, monto:198000, prox:'25 jun' }, reclamos:[] },
  { id:'c11', nombre:'Julieta Funes',      inicial:'J', dni:'39.450.123', tel:'+54 9 3541 22-4471', loc:'Villa Carlos Paz', desde:'2025',
    compras:[
      { modelo:'iPhone 15', cap:'128 GB', color:'Azul', cond:'Nuevo', bat:null, imei:'352099 08 990281 4', fecha:'02 nov 2025', usd:820, gVence:{y:2026,m:11,d:2} },
    ], plan:{ equipo:'iPhone 15', total:9, pagadas:1, monto:222000, prox:'26 jun' }, reclamos:[] },
  { id:'c12', nombre:'Ramiro Ponce',       inicial:'R', dni:'29.880.456', tel:'+54 9 3541 60-7789', loc:'Tanti',            desde:'2023',
    compras:[
      { modelo:'iPhone 12', cap:'64 GB', color:'Negro', cond:'Usado', bat:70, imei:'353091 10 220456 1', fecha:'15 ago 2024', usd:380, gVence:{y:2025,m:8,d:15} },
    ], plan:null, reclamos:[] },
  { id:'c13', nombre:'Valentina Cáceres', inicial:'V', dni:'41.203.987', tel:'+54 9 3541 47-3398', loc:'Villa Carlos Paz', desde:'2026',
    compras:[
      { modelo:'iPhone 16', cap:'256 GB', color:'Verde Azulado', cond:'Nuevo', bat:null, imei:'353091 10 412039 8', fecha:'18 feb 2026', usd:1010, gVence:{y:2027,m:2,d:18} },
    ], plan:null, reclamos:[] },
  { id:'c14', nombre:'Gonzalo Herrera',    inicial:'G', dni:'33.119.560', tel:'+54 9 3541 55-9920', loc:'Cosquín',          desde:'2024',
    compras:[
      { modelo:'iPhone 15 Pro', cap:'128 GB', color:'Titanio Azul', cond:'Usado', bat:85, imei:'357004 06 311956 0', fecha:'30 ago 2025', usd:870, gVence:{y:2026,m:8,d:30} },
    ], plan:null, reclamos:[] },
];

export const VENTAS_INIT = [
  { id:'vta1',  fechaLabel:'15 jun 2026', fechaNum:20260615, equipo:'iPhone 16 Plus · 256 GB · Ultramarino',        imei:'356712 09 551203 6', categoria:'iPhone', cliente:'Camila Aguirre',   usd:1080, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Débito',         cuotaMonto:null },
  { id:'vta2',  fechaLabel:'15 jun 2026', fechaNum:20260615, equipo:'iPhone 15 · 128 GB · Negro',                   imei:'352099 08 440126 2', categoria:'iPhone', cliente:'Lucía Bringas',    usd: 820, modalidad:'cuotas',  cuotas:6,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:192000 },
  { id:'vta3',  fechaLabel:'12 abr 2026', fechaNum:20260412, equipo:'iPhone 16 Pro · 256 GB · Titanio Negro',        imei:'356938 11 772094 1', categoria:'iPhone', cliente:'Martín Quiroga',   usd:1250, modalidad:'cuotas',  cuotas:6,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:312000 },
  { id:'vta4',  fechaLabel:'20 may 2026', fechaNum:20260520, equipo:'iPhone 16 Pro Max · 256 GB · Titanio Natural',  imei:'356938 11 240517 4', categoria:'iPhone', cliente:'Nahuel Ferreyra',  usd:1450, modalidad:'cuotas',  cuotas:12,   anticipo:300000, metodo:'Transferencia', cuotaMonto:360000 },
  { id:'vta5',  fechaLabel:'09 mar 2026', fechaNum:20260309, equipo:'iPhone 16 · 128 GB · Rosa',                     imei:'353091 10 884412 8', categoria:'iPhone', cliente:'Sofía Ledesma',    usd: 950, modalidad:'cuotas',  cuotas:9,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:240000 },
  { id:'vta6',  fechaLabel:'18 feb 2026', fechaNum:20260218, equipo:'iPhone 16 · 256 GB · Verde Azulado',            imei:'353091 10 412039 8', categoria:'iPhone', cliente:'Valentina Cáceres', usd:1010, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Crédito',        cuotaMonto:null },
  { id:'vta7',  fechaLabel:'04 ene 2026', fechaNum:20260104, equipo:'iPhone 14 · 128 GB · Medianoche',               imei:'350877 04 118802 3', categoria:'iPhone', cliente:'Bruno Medina',     usd: 600, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Transferencia',  cuotaMonto:null },
  { id:'vta8',  fechaLabel:'20 dic 2025', fechaNum:20251220, equipo:'iPhone 15 Pro Max · 256 GB · Titanio Natural',  imei:'358261 07 119284 3', categoria:'iPhone', cliente:'Lucía Bringas',    usd:1180, modalidad:'cuotas',  cuotas:6,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:268000 },
  { id:'vta9',  fechaLabel:'10 dic 2025', fechaNum:20251210, equipo:'iPhone 13 · 128 GB · Blanco Estelar',           imei:'353448 03 119027 4', categoria:'iPhone', cliente:'Tomás Vera',       usd: 470, modalidad:'cuotas',  cuotas:6,    anticipo:0,    metodo:'Débito',         cuotaMonto:132000 },
  { id:'vta10', fechaLabel:'22 nov 2025', fechaNum:20251122, equipo:'iPhone 14 Pro · 256 GB · Morado Oscuro',        imei:'351442 05 207733 5', categoria:'iPhone', cliente:'Federico Sosa',    usd: 760, modalidad:'cuotas',  cuotas:6,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:175000 },
  { id:'vta11', fechaLabel:'02 nov 2025', fechaNum:20251102, equipo:'iPhone 15 · 128 GB · Azul',                     imei:'352099 08 990281 4', categoria:'iPhone', cliente:'Julieta Funes',    usd: 820, modalidad:'cuotas',  cuotas:9,    anticipo:0,    metodo:'Transferencia',  cuotaMonto:222000 },
  { id:'vta12', fechaLabel:'12 set 2025', fechaNum:20250912, equipo:'iPhone 14 Pro · 256 GB · Plata',                imei:'351442 05 660173 9', categoria:'iPhone', cliente:'Pablo Lucero',     usd: 760, modalidad:'cuotas',  cuotas:9,    anticipo:0,    metodo:'Débito',         cuotaMonto:198000 },
  { id:'vta13', fechaLabel:'30 ago 2025', fechaNum:20250830, equipo:'iPhone 15 Pro · 128 GB · Titanio Azul',         imei:'357004 06 311956 0', categoria:'iPhone', cliente:'Gonzalo Herrera',  usd: 870, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Transferencia',  cuotaMonto:null },
  { id:'vta14', fechaLabel:'03 set 2024', fechaNum:20240903, equipo:'iPhone 14 · 128 GB · Medianoche',               imei:'350877 04 663901 7', categoria:'iPhone', cliente:'Martín Quiroga',   usd: 600, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Transferencia',  cuotaMonto:null },
  { id:'vta15', fechaLabel:'15 ago 2024', fechaNum:20240815, equipo:'iPhone 12 · 64 GB · Negro',                     imei:'353091 10 220456 1', categoria:'iPhone', cliente:'Ramiro Ponce',     usd: 380, modalidad:'contado', cuotas:null, anticipo:null, metodo:'Efectivo',       cuotaMonto:null },
];
