import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSheetXml, buildXlsxWorkbook, columnLetter, crc32, toExcelDateSerial } from '../src/utils/xlsxWriter.js';

const decoder = new TextDecoder();

// Relit une archive en mode stocké via son répertoire central.
const readStoredZip = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = bytes.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const files = {};
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(offset, true), 0x02014b50);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const data = bytes.subarray(localOffset + 30 + localNameLength, localOffset + 30 + localNameLength + size);
    assert.equal(crc32(data), crc, `crc de ${name}`);
    files[name] = decoder.decode(data);
    offset += 46 + nameLength;
  }
  return files;
};

test('crc32 de référence', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('lettres de colonnes et dates Excel', () => {
  assert.deepEqual([0, 25, 26, 27, 701, 702].map(columnLetter), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  assert.equal(toExcelDateSerial('1900-03-01'), 61);
  assert.equal(toExcelDateSerial('2026-01-15'), 46037);
  assert.equal(toExcelDateSerial('nope'), null);
});

test('la feuille échappe le texte et type les cellules', () => {
  const xml = buildSheetXml([
    [{ type: 'text', value: 'Nom' }, { type: 'text', value: 'Montant' }],
    [{ type: 'text', value: 'A & <B> "c"\u0001' }, { type: 'number', value: 12.5 }],
    [{ type: 'date', value: '2026-01-15' }, { type: 'text', value: '' }]
  ]);
  assert.match(xml, /A &amp; &lt;B&gt; &quot;c&quot;</);
  assert.equal(xml.includes(String.fromCharCode(1)), false);
  assert.match(xml, /<c r="B2"><v>12.5<\/v><\/c>/);
  assert.match(xml, /<c r="A3" s="2"><v>46037<\/v><\/c>/);
  assert.match(xml, /<autoFilter ref="A1:B3"\/>/);
  assert.doesNotMatch(xml, /r="B3"/);
});

test('le classeur est une archive ZIP lisible avec les parties attendues', () => {
  const bytes = buildXlsxWorkbook([[{ type: 'text', value: 'Équipe' }]], { sheetName: 'Projets/2026' });
  const files = readStoredZip(bytes);
  assert.deepEqual(Object.keys(files).sort(), [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/workbook.xml',
    'xl/worksheets/sheet1.xml'
  ]);
  assert.match(files['xl/workbook.xml'], /name="Projets 2026"/);
  assert.match(files['xl/worksheets/sheet1.xml'], /Équipe/);
});
