// Classeur .xlsx minimal (une feuille), sans dépendance : un .xlsx est une archive ZIP de quelques
// fichiers XML. On écrit l'archive en mode « stocké » (sans compression) — Excel, LibreOffice et
// Numbers l'ouvrent — ce qui évite d'embarquer une bibliothèque de compression dans le bundle.
// Cellules : `{ type: 'text' | 'number' | 'date', value }` ; une date est une chaîne AAAA-MM-JJ.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const encoder = new TextEncoder();

// Les caractères de contrôle (hors tabulation et retours) rendent le XML invalide pour Excel.
const escapeXml = (value) => String(value ?? '')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const columnLetter = (index) => {
  let remaining = index + 1;
  let letters = '';
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    letters = String.fromCharCode(65 + modulo) + letters;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return letters;
};

// Numéro de série Excel (jours depuis le 30/12/1899).
export const toExcelDateSerial = (day) => {
  const match = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const time = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.round((time - Date.UTC(1899, 11, 30)) / 86400000);
};

const STYLE_HEADER = 1;
const STYLE_DATE = 2;
const STYLE_WRAP = 3;

const buildCell = (cell, reference, isHeader) => {
  const type = cell?.type || 'text';
  if (type === 'number' && typeof cell.value === 'number' && Number.isFinite(cell.value)) {
    return `<c r="${reference}"><v>${cell.value}</v></c>`;
  }
  if (type === 'date') {
    const serial = toExcelDateSerial(cell.value);
    if (serial !== null) {
      return `<c r="${reference}" s="${STYLE_DATE}"><v>${serial}</v></c>`;
    }
  }
  const text = String(cell?.value ?? '').slice(0, 32767);
  if (!text) {
    return '';
  }
  const style = isHeader ? STYLE_HEADER : STYLE_WRAP;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
};

const estimateWidth = (rows, columnIndex) => {
  const longest = rows.reduce((max, row) => {
    const value = row[columnIndex];
    const text = value?.type === 'date' ? '00/00/0000' : String(value?.value ?? '');
    const firstLine = text.split('\n')[0];
    return Math.max(max, firstLine.length);
  }, 6);
  return Math.min(60, Math.max(10, longest + 2));
};

export const buildSheetXml = (rows) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columnCount = safeRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  const cols = columnCount
    ? `<cols>${Array.from({ length: columnCount }, (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${estimateWidth(safeRows, index)}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const sheetRows = safeRows.map((row, rowIndex) => {
    const cells = (Array.isArray(row) ? row : [])
      .map((cell, columnIndex) => buildCell(cell, `${columnLetter(columnIndex)}${rowIndex + 1}`, rowIndex === 0))
      .join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  const lastRef = columnCount ? `${columnLetter(columnCount - 1)}${Math.max(safeRows.length, 1)}` : 'A1';
  const pane = safeRows.length > 1
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';
  const autoFilter = columnCount && safeRows.length > 1 ? `<autoFilter ref="A1:${lastRef}"/>` : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + pane + cols + `<sheetData>${sheetRows}</sheetData>` + autoFilter
    + '</worksheet>';
};

const sanitizeSheetName = (name) => {
  const cleaned = String(name || 'Sheet1').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned || 'Sheet1';
};

const buildWorkbookFiles = (rows, sheetName) => ({
  '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '</Types>',
  '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>',
  'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + `<sheets><sheet name="${escapeXml(sanitizeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets>`
    + '</workbook>',
  'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '</Relationships>',
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="4">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
    + '<xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>',
  'xl/worksheets/sheet1.xml': buildSheetXml(rows)
});

const writeUint16 = (view, offset, value) => view.setUint16(offset, value, true);
const writeUint32 = (view, offset, value) => view.setUint32(offset, value >>> 0, true);

// Archive ZIP en mode stocké (méthode 0) : en-tête local + données, puis répertoire central.
export const buildStoredZip = (files) => {
  const entries = Object.entries(files).map(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    return { nameBytes, data, crc: crc32(data) };
  });

  const localSize = entries.reduce((total, entry) => total + 30 + entry.nameBytes.length + entry.data.length, 0);
  const centralSize = entries.reduce((total, entry) => total + 46 + entry.nameBytes.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  const DOS_TIME = 0;
  const DOS_DATE = (1 << 5) | 1;
  const UTF8_FLAG = 0x0800;

  let offset = 0;
  const offsets = [];
  entries.forEach((entry) => {
    offsets.push(offset);
    writeUint32(view, offset, 0x04034b50);
    writeUint16(view, offset + 4, 20);
    writeUint16(view, offset + 6, UTF8_FLAG);
    writeUint16(view, offset + 8, 0);
    writeUint16(view, offset + 10, DOS_TIME);
    writeUint16(view, offset + 12, DOS_DATE);
    writeUint32(view, offset + 14, entry.crc);
    writeUint32(view, offset + 18, entry.data.length);
    writeUint32(view, offset + 22, entry.data.length);
    writeUint16(view, offset + 26, entry.nameBytes.length);
    writeUint16(view, offset + 28, 0);
    output.set(entry.nameBytes, offset + 30);
    output.set(entry.data, offset + 30 + entry.nameBytes.length);
    offset += 30 + entry.nameBytes.length + entry.data.length;
  });

  const centralStart = offset;
  entries.forEach((entry, index) => {
    writeUint32(view, offset, 0x02014b50);
    writeUint16(view, offset + 4, 20);
    writeUint16(view, offset + 6, 20);
    writeUint16(view, offset + 8, UTF8_FLAG);
    writeUint16(view, offset + 10, 0);
    writeUint16(view, offset + 12, DOS_TIME);
    writeUint16(view, offset + 14, DOS_DATE);
    writeUint32(view, offset + 16, entry.crc);
    writeUint32(view, offset + 20, entry.data.length);
    writeUint32(view, offset + 24, entry.data.length);
    writeUint16(view, offset + 28, entry.nameBytes.length);
    writeUint16(view, offset + 30, 0);
    writeUint16(view, offset + 32, 0);
    writeUint16(view, offset + 34, 0);
    writeUint16(view, offset + 36, 0);
    writeUint32(view, offset + 38, 0);
    writeUint32(view, offset + 42, offsets[index]);
    output.set(entry.nameBytes, offset + 46);
    offset += 46 + entry.nameBytes.length;
  });

  writeUint32(view, offset, 0x06054b50);
  writeUint16(view, offset + 4, 0);
  writeUint16(view, offset + 6, 0);
  writeUint16(view, offset + 8, entries.length);
  writeUint16(view, offset + 10, entries.length);
  writeUint32(view, offset + 12, offset - centralStart);
  writeUint32(view, offset + 16, centralStart);
  writeUint16(view, offset + 20, 0);
  return output;
};

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const buildXlsxWorkbook = (rows, { sheetName = 'Sheet1' } = {}) => buildStoredZip(buildWorkbookFiles(rows, sheetName));
