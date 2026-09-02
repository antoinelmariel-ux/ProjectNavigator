const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const SOURCES = [
  {
    jsonPath: path.join(ROOT_DIR, 'mock-sharepoint-lists', 'projects.json'),
    jsPath: path.join(ROOT_DIR, 'src', 'data', 'mockSharePointProjects.js'),
    exportName: 'initialMockSharePointProjects'
  },
  {
    jsonPath: path.join(ROOT_DIR, 'mock-sharepoint-lists', 'inspirations.json'),
    jsPath: path.join(ROOT_DIR, 'src', 'data', 'mockSharePointInspirations.js'),
    exportName: 'initialMockSharePointInspirations'
  }
];

const generateModule = ({ jsonPath, jsPath, exportName }) => {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  const banner = '/* Auto-generated from mock-sharepoint-lists. Do not edit manually. */';
  const content = `${banner}\nexport const ${exportName} = ${JSON.stringify(parsed, null, 2)};\n`;
  fs.writeFileSync(jsPath, content, 'utf8');
};

SOURCES.forEach(generateModule);

console.log('Mock SharePoint data modules synchronized.');
