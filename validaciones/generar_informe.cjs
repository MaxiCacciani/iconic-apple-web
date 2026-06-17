const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} = require('docx');
const fs = require('fs');
const path = require('path');

const AZUL   = '2B5F8F';
const GRIS   = '5A6272';
const ROJO   = 'C0392B';
const VERDE  = '27AE60';
const FONDO  = 'F4F6F8';
const BLANCO = 'FFFFFF';

const h1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 120 },
  run: { color: AZUL, bold: true },
});

const h2 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 80 },
  run: { color: GRIS },
});

const h3 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 60 },
  run: { color: GRIS, bold: true },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, color: '2C3E50', ...opts })],
  spacing: { after: 100 },
});

const bullet = (text) => new Paragraph({
  children: [new TextRun({ text: `• ${text}`, size: 22, color: '2C3E50' })],
  spacing: { after: 80 },
  indent: { left: 360 },
});

const badge = (text, color) => new TextRun({
  text: ` ${text} `,
  bold: true,
  color: BLANCO,
  highlight: color === ROJO ? 'red' : color === VERDE ? 'green' : 'darkBlue',
  size: 18,
});

const ruled = () => new Paragraph({
  border: { bottom: { color: 'C8D0DA', space: 1, style: BorderStyle.SINGLE, size: 4 } },
  spacing: { after: 160 },
});

const tableRow = (cells, isHeader = false) => new TableRow({
  children: cells.map((text, i) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, size: 20, bold: isHeader, color: isHeader ? BLANCO : '2C3E50' })],
    })],
    width: { size: i === 0 ? 30 : i === 1 ? 25 : 45, type: WidthType.PERCENTAGE },
    shading: isHeader ? { type: ShadingType.CLEAR, fill: AZUL } : { type: ShadingType.CLEAR, fill: i % 2 === 0 ? FONDO : BLANCO },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
  })),
});

const validaciones = [
  ['Stock — IMEI (formato)',     'Bloqueante', '15 dígitos numéricos + algoritmo de Luhn. Error si el formato no corresponde.'],
  ['Stock — IMEI (unicidad)',    'Bloqueante', 'No se pueden registrar dos equipos con el mismo IMEI en stock.'],
  ['Stock — Precio USD',        'Bloqueante', 'Debe ser un número mayor a 0. Campo obligatorio.'],
  ['Stock — Costo USD',         'Bloqueante', 'Si se carga, debe ser ≥ 0 y menor al precio de venta.'],
  ['Stock — Batería',           'Bloqueante', 'Si se carga en usados, debe estar entre 1 y 100.'],
  ['Stock — Cantidad',          'Bloqueante', 'Para accesorios: debe ser al menos 1 (sin negativos ni cero).'],
  ['Stock — Modelo',            'Bloqueante', 'Campo obligatorio. No se puede guardar sin modelo.'],
  ['Venta — Cuotas',            'Bloqueante', 'En modalidad cuotas: mínimo 2 cuotas, máximo 60.'],
  ['Venta — Anticipo',          'Bloqueante', 'Debe ser ≥ 0 y menor al precio total (no puede cubrir el monto completo).'],
  ['Venta — Seña (apartado)',   'Bloqueante', 'Debe ser ≥ 0 y menor al precio total (reserva parcial).'],
  ['Venta — Canje valor',       'Bloqueante', 'Debe ser ≥ 0 y menor al precio total del equipo.'],
  ['Venta — IMEI canje',        'Bloqueante', 'Si el equipo en canje es un iPhone/iPad, el IMEI debe pasar la validación de formato.'],
  ['Venta — Batería canje',     'Bloqueante', 'Si el equipo en canje es usado, la batería debe estar entre 1 y 100.'],
  ['Cliente — DNI',             'Bloqueante', '7 u 8 dígitos numéricos. Acepta puntos y espacios como separadores.'],
  ['Cliente — Teléfono',        'Bloqueante', 'Si se carga, debe tener entre 8 y 15 dígitos (acepta +, guiones y espacios).'],
];

async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '2C3E50' },
        },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children: [

        // ── Portada ──────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: 'GESTION ICONIC', size: 52, bold: true, color: AZUL })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 720, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Informe de Validaciones Implementadas', size: 34, color: GRIS })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Versión 1.0  ·  Junio 2026`, size: 22, color: 'A0AAB4' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 720 },
        }),
        ruled(),

        // ── 1. Resumen ejecutivo ──────────────────────────────────
        h1('1. Resumen ejecutivo'),
        p('Este documento describe las validaciones de seguridad y consistencia de datos implementadas en la aplicación Gestion Iconic. El objetivo fue prevenir el ingreso de datos incorrectos, duplicados o incoherentes que pudieran afectar la integridad del stock, las ventas y la información de clientes.'),
        p('Se implementaron 15 reglas de validación distribuidas en tres módulos principales: Stock, Venta y Clientes. Todas las validaciones son del tipo "bloqueante" — impiden guardar el formulario hasta que el dato sea correcto — y muestran mensajes de error descriptivos en la interfaz.'),
        ruled(),

        // ── 2. Módulo de validación compartido ───────────────────
        h1('2. Módulo compartido: src/lib/validation.js'),
        p('Se creó un módulo centralizado de funciones de validación reutilizables. Esto garantiza que la misma lógica se aplique de manera consistente en todos los formularios.'),

        h3('Funciones exportadas'),
        bullet('validateIMEI(raw, required) — Formato 15 dígitos + algoritmo Luhn'),
        bullet('isIMEIDuplicate(imei, equipos, excludeId) — Unicidad en stock'),
        bullet('validatePrecio(usd) — Precio obligatorio y positivo'),
        bullet('validateCosto(costo, usd) — Costo opcional, debe ser menor al precio'),
        bullet('validateBat(bat) — Batería entre 1 y 100'),
        bullet('validateCantidad(cantidad) — Cantidad mínima de 1'),
        bullet('validateDNI(dni) — DNI argentino de 7 u 8 dígitos'),
        bullet('validateTel(tel) — Teléfono con 8 a 15 dígitos'),
        bullet('validateSenia(senia, precioARS) — Seña menor al precio total'),
        bullet('validateAnticipo(anticipo, precioARS) — Anticipo menor al precio total'),
        bullet('validateCanjeValor(valor, precioARS) — Canje menor al precio total'),
        bullet('validateCuotas(n) — Entre 2 y 60 cuotas'),

        h3('Algoritmo Luhn (verificación de IMEI)'),
        p('El algoritmo de Luhn es el estándar internacional para validar IMEIs. Consiste en multiplicar por 2 los dígitos en posición par (de derecha a izquierda), restar 9 a los resultados mayores a 9, y verificar que la suma total sea divisible por 10. Esto detecta errores de tipeo en hasta 1 dígito.'),
        ruled(),

        // ── 3. Stock ─────────────────────────────────────────────
        h1('3. Módulo Stock (src/screens/Stock.jsx)'),
        p('El formulario de alta y edición de productos recibió las siguientes validaciones. Los errores se muestran en un panel rojo sobre el botón "Agregar al stock" / "Guardar cambios", y el botón queda deshabilitado hasta resolverlos.'),

        h2('3.1 IMEI — Formato'),
        p('Aplica a: iPhone, iPad, Mac y cualquier categoría reconocida como "phone" por esPhone().'),
        p('Regla: el valor debe ser exactamente 15 dígitos numéricos y pasar la verificación del algoritmo de Luhn.'),
        p('Antes de guardar, el IMEI se normaliza eliminando espacios y guiones.'),

        h2('3.2 IMEI — Unicidad'),
        p('No se puede guardar un equipo si ya existe otro en la lista de stock (array equipos del estado de App) con el mismo IMEI.'),
        p('Excepción: al editar un equipo, se excluye su propio ID de la comparación para permitir guardar sin cambiar el IMEI.'),

        h2('3.3 Precio de venta (USD)'),
        p('Campo obligatorio. Debe ser un número estrictamente mayor a 0. Un precio de 0 o negativo es rechazado.'),

        h2('3.4 Costo (USD)'),
        p('Campo opcional. Si se completa, debe ser mayor o igual a 0 y estrictamente menor al precio de venta. Registrar un costo mayor al precio indicaría una pérdida imposible que probablemente sea un error de carga.'),

        h2('3.5 Batería'),
        p('Solo aplica a teléfonos/iPads en condición "Usado". Si se completa, el valor debe estar entre 1 y 100 (porcentaje).'),

        h2('3.6 Cantidad'),
        p('Solo aplica a accesorios (no-phones). Debe ser un entero mayor o igual a 1. No se aceptan cantidades negativas ni cero.'),

        h2('3.7 Modelo'),
        p('Campo obligatorio para cualquier categoría. No se puede guardar un producto sin nombre/modelo.'),
        ruled(),

        // ── 4. Venta ─────────────────────────────────────────────
        h1('4. Módulo Venta (src/screens/Venta.jsx)'),
        p('El formulario de nueva venta valida las condiciones de pago antes de habilitar el botón de confirmación. Los errores se muestran en el panel comprobante (columna derecha), con un mensaje específico para cada problema.'),
        p('El mensaje del botón deshabilitado es dinámico: indica si falta equipo, cliente, o si hay errores a corregir.'),

        h2('4.1 Cuotas'),
        p('En modalidad "En cuotas": se requieren al menos 2 cuotas (una sola cuota es equivalente a contado) y no más de 60 (límite razonable para este negocio).'),

        h2('4.2 Anticipo (modalidad cuotas)'),
        p('El anticipo debe ser ≥ 0 y menor al precio total en ARS. Si el anticipo cubre el precio total, la venta debería registrarse como contado.'),

        h2('4.3 Seña (modalidad apartado)'),
        p('La seña debe ser ≥ 0 y menor al precio total en ARS. Una seña igual al total significaría que el cliente ya pagó todo, lo que sería una venta contado, no un apartado.'),

        h2('4.4 Valor del canje'),
        p('Debe ser ≥ 0 y menor al precio total en ARS. Un canje que cubra el precio completo no tendría saldo a cobrar, lo que sería un intercambio sin diferencia (caso especial que debe tratarse fuera del flujo normal de venta).'),

        h2('4.5 IMEI del equipo en canje'),
        p('Si el equipo entregado en canje es un teléfono/iPad (detectado por categoría), y si se ingresó un IMEI, debe pasar la validación de formato de 15 dígitos + Luhn. El campo es opcional para canje, pero si se completa debe ser válido.'),

        h2('4.6 Batería del equipo en canje'),
        p('Si se ingresa un valor de batería para el equipo en canje, debe estar entre 1 y 100.'),
        ruled(),

        // ── 5. Clientes ──────────────────────────────────────────
        h1('5. Módulo Clientes — Registro rápido (src/screens/Venta.jsx)'),
        p('El modal "Registrar nuevo cliente" que aparece durante el flujo de venta recibió validaciones en los campos opcionales DNI y Teléfono. El borde del campo se torna naranja cuando hay un error, y se muestra el mensaje debajo del campo.'),

        h2('5.1 DNI'),
        p('Si se completa, debe contener 7 u 8 dígitos numéricos. Se aceptan puntos y espacios como separadores (se normalizan antes de validar). Ejemplos válidos: 34521890, 34.521.890, 8 045 321.'),

        h2('5.2 Teléfono'),
        p('Si se completa, debe contener entre 8 y 15 dígitos. Se ignoran +, guiones, paréntesis y espacios. Esto cubre números locales y formatos internacionales.'),
        ruled(),

        // ── 6. Tabla resumen ─────────────────────────────────────
        h1('6. Tabla resumen de validaciones'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            tableRow(['Regla', 'Tipo', 'Descripción'], true),
            ...validaciones.map(([r, t, d]) => tableRow([r, t, d])),
          ],
        }),
        ruled(),

        // ── 7. Próximos pasos ─────────────────────────────────────
        h1('7. Próximos pasos recomendados'),
        bullet('Restricción UNIQUE en la columna imei de la tabla equipos en Supabase (garantía a nivel base de datos).'),
        bullet('Restricción CHECK en la columna usd (usd > 0) y costo (costo >= 0 AND costo < usd) en Supabase.'),
        bullet('Restricción CHECK en bat (bat BETWEEN 1 AND 100) en Supabase.'),
        bullet('Validar unicidad de DNI al registrar clientes desde la pantalla Clientes (actualmente solo se valida formato).'),
        bullet('Agregar validación de stock mínimo: alertar cuando la cantidad de accesorios llega a 1.'),

        new Paragraph({ spacing: { after: 360 } }),
        new Paragraph({
          children: [new TextRun({ text: 'Generado automáticamente por Claude Code · Junio 2026', size: 18, color: 'A0AAB4', italics: true })],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, 'informe_validaciones.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('✓ Informe generado:', outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
