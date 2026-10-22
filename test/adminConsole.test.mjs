import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminConsoleExitUrl,
  buildAdminConsoleUrl,
  isAdminConsoleActive,
  readAdminConsoleRequest,
  startAdminConsole,
  stopAdminConsole
} from '../src/utils/adminConsole.js';
import {
  foldSearchText,
  formatOwnerLabel,
  getAdminProjectStatus,
  listProjectOwners,
  searchAdminProjects
} from '../src/utils/adminProjectSearch.js';
import { withProjectTrashed } from '../src/utils/projectTrash.js';

test('le paramètre de la console se pose, se lit et se retire', () => {
  const url = buildAdminConsoleUrl('https://tenant.sharepoint.com/sites/cn/SitePages/App.aspx?x=1#top');
  assert.equal(readAdminConsoleRequest(new URL(url).search), true);
  assert.equal(readAdminConsoleRequest('?adminConsole=0'), false);
  assert.equal(readAdminConsoleRequest(''), false);
  assert.equal(buildAdminConsoleExitUrl(url), 'https://tenant.sharepoint.com/sites/cn/SitePages/App.aspx?x=1#top');
});

test('la console est un état de module qui se réinitialise', () => {
  stopAdminConsole();
  assert.equal(isAdminConsoleActive(), false);
  startAdminConsole();
  assert.equal(isAdminConsoleActive(), true);
  stopAdminConsole();
  assert.equal(isAdminConsoleActive(), false);
});

const projects = [
  { id: 'p1', projectName: 'Campagne <b>vaccin</b> Hélène', ownerEmail: 'Helene.Martin@lfb.fr', status: 'draft', lastUpdated: '2026-10-01T00:00:00Z', answers: {} },
  { id: 'p2', projectName: 'Congrès Lyon', ownerEmail: 'paul.durand@lfb.fr', sharedWith: ['helene.martin@lfb.fr'], status: 'submitted', lastUpdated: '2026-10-05T00:00:00Z', answers: { teamLead: 'Zoé Petit' } },
  { id: 'p3', projectName: 'Partenariat Martinique', ownerEmail: 'paul.durand@lfb.fr', status: 'cancelled', lastUpdated: '2026-09-01T00:00:00Z', answers: {} },
  { id: 'p4', projectName: 'Ancien projet', ownerEmail: 'helene.martin@lfb.fr', status: 'submitted', lastUpdated: '2026-10-10T00:00:00Z', answers: withProjectTrashed({}, { by: 'helene.martin@lfb.fr' }) }
];

test('le texte de recherche ignore la casse et les accents', () => {
  assert.equal(foldSearchText('Hélène ÉTÉ'), 'helene ete');
  assert.equal(formatOwnerLabel('helene.martin@lfb.fr'), 'Helene Martin');
  assert.equal(formatOwnerLabel(''), '');
});

test('la recherche retrouve un projet par son porteur et le fait passer devant', () => {
  const ids = searchAdminProjects(projects, { query: 'martin' }).map((project) => project.id);
  // p4 et p1 appartiennent à Martin (le plus récent d'abord), p3 n'a que « Martin » dans son
  // nom et p2 que dans ses co-porteurs : ils viennent après.
  assert.deepEqual(ids.slice(0, 2), ['p4', 'p1']);
  assert.deepEqual(ids.slice(2).sort(), ['p2', 'p3']);
});

test('tous les mots doivent correspondre, balises et accents compris', () => {
  assert.deepEqual(searchAdminProjects(projects, { query: 'helene vaccin' }).map((p) => p.id), ['p1']);
  assert.deepEqual(searchAdminProjects(projects, { query: 'zoe' }).map((p) => p.id), ['p2']);
  assert.deepEqual(searchAdminProjects(projects, { query: 'p3' }).map((p) => p.id), ['p3']);
  assert.deepEqual(searchAdminProjects(projects, { query: 'helene lyon zzz' }), []);
});

test('filtres porteur et statut, corbeille comprise', () => {
  assert.deepEqual(
    searchAdminProjects(projects, { ownerEmail: 'PAUL.durand@lfb.fr' }).map((p) => p.id),
    ['p2', 'p3']
  );
  assert.equal(getAdminProjectStatus(projects[3]), 'trashed');
  assert.deepEqual(searchAdminProjects(projects, { status: 'trashed' }).map((p) => p.id), ['p4']);
  assert.deepEqual(searchAdminProjects(projects, { status: 'submitted' }).map((p) => p.id), ['p2']);
});

test('la liste des porteurs compte leurs projets', () => {
  assert.deepEqual(listProjectOwners(projects), [
    { email: 'helene.martin@lfb.fr', label: 'Helene Martin', count: 2 },
    { email: 'paul.durand@lfb.fr', label: 'Paul Durand', count: 2 }
  ]);
});
