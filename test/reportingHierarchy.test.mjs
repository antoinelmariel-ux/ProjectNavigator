import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectReportingHierarchy,
  parsePersonProperties,
  selectTeamProjects,
  summarizeTeamBranches
} from '../src/utils/reportingHierarchy.js';

const ORG = {
  'boss@lfb.fr': ['claire@lfb.fr', 'marc@lfb.fr'],
  'claire@lfb.fr': ['sophie@lfb.fr'],
  'sophie@lfb.fr': ['leo@lfb.fr'],
  'marc@lfb.fr': ['boss@lfb.fr']
};
const NAMES = { 'claire@lfb.fr': 'Claire', 'marc@lfb.fr': 'Marc', 'sophie@lfb.fr': 'Sophie', 'leo@lfb.fr': 'Léo' };
const fetchPerson = async (email) => ({ email, displayName: NAMES[email] || email, directReports: ORG[email] || [] });

test('parsePersonProperties : lit DirectReports en nometadata comme en verbose', () => {
  assert.deepEqual(
    parsePersonProperties({
      AccountName: 'i:0#.f|membership|boss@lfb.fr',
      DisplayName: 'Boss',
      Email: '',
      DirectReports: ['i:0#.f|membership|Claire@LFB.fr', 'i:0#.f|membership|claire@lfb.fr']
    }),
    { email: 'boss@lfb.fr', displayName: 'Boss', directReports: ['claire@lfb.fr'] }
  );
  assert.deepEqual(
    parsePersonProperties({ d: { Email: 'a@lfb.fr', DisplayName: 'A', DirectReports: { results: ['i:0#.f|membership|b@lfb.fr'] } } })
      .directReports,
    ['b@lfb.fr']
  );
  assert.deepEqual(parsePersonProperties({ Email: 'x@lfb.fr' }).directReports, []);
});

test('collectReportingHierarchy : tous les niveaux, branche et manager immédiat, sans boucle', async () => {
  const { people, isPartial } = await collectReportingHierarchy('Boss@lfb.fr', fetchPerson);
  assert.equal(isPartial, false);
  const byEmail = Object.fromEntries(people.map((person) => [person.email, person]));
  assert.deepEqual(Object.keys(byEmail).sort(), ['claire@lfb.fr', 'leo@lfb.fr', 'marc@lfb.fr', 'sophie@lfb.fr']);
  assert.equal(byEmail['leo@lfb.fr'].depth, 3);
  assert.equal(byEmail['leo@lfb.fr'].branchEmail, 'claire@lfb.fr');
  assert.equal(byEmail['leo@lfb.fr'].managerEmail, 'sophie@lfb.fr');
  assert.equal(byEmail['marc@lfb.fr'].depth, 1);
});

test('collectReportingHierarchy : un plafond tronque et le signale', async () => {
  const capped = await collectReportingHierarchy('boss@lfb.fr', fetchPerson, { maxPeople: 2 });
  assert.equal(capped.people.length, 2);
  assert.equal(capped.isPartial, true);
  const shallow = await collectReportingHierarchy('boss@lfb.fr', fetchPerson, { maxDepth: 1 });
  assert.equal(shallow.people.length, 2);
  assert.equal(shallow.isPartial, true);
});

test('collectReportingHierarchy : une fiche illisible ne coupe pas le parcours', async () => {
  const flaky = async (email) => {
    if (email === 'marc@lfb.fr') {
      throw new Error('404');
    }
    return fetchPerson(email);
  };
  const { people } = await collectReportingHierarchy('boss@lfb.fr', flaky);
  assert.ok(people.some((person) => person.email === 'marc@lfb.fr'));
  assert.ok(people.some((person) => person.email === 'leo@lfb.fr'));
});

test('selectTeamProjects : projets soumis de l’équipe, sans brouillon ni projet déjà co-porté', async () => {
  const { people } = await collectReportingHierarchy('boss@lfb.fr', fetchPerson);
  const projects = [
    { id: 'p1', status: 'submitted', ownerEmail: 'Leo@lfb.fr' },
    { id: 'p2', status: 'draft', ownerEmail: 'leo@lfb.fr' },
    { id: 'p3', status: 'submitted', ownerEmail: 'sophie@lfb.fr', sharedWith: ['boss@lfb.fr'] },
    { id: 'p4', status: 'submitted', ownerEmail: 'outsider@lfb.fr' },
    { id: 'p5', status: 'cancelled', ownerEmail: 'marc@lfb.fr' },
    { id: 'p6', status: 'submitted', ownerEmail: 'marc@lfb.fr' }
  ];
  const entries = selectTeamProjects(projects, people, 'boss@lfb.fr');
  assert.deepEqual(entries.map((entry) => entry.project.id), ['p1', 'p6']);
  const leo = entries[0];
  assert.equal(leo.isDirect, false);
  assert.equal(leo.branch.email, 'claire@lfb.fr');
  assert.equal(leo.manager.email, 'sophie@lfb.fr');
  assert.equal(entries[1].isDirect, true);
  assert.deepEqual(
    summarizeTeamBranches(entries).map(({ email, count }) => [email, count]),
    [['claire@lfb.fr', 1], ['marc@lfb.fr', 1]]
  );
  assert.deepEqual(selectTeamProjects(projects, [], 'boss@lfb.fr'), []);
});
