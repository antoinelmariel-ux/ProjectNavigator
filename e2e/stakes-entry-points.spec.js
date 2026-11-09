import { test, expect } from '@playwright/test';
import {
  collectConsoleErrors,
  createAndSubmitProject,
  goToProjectsHome,
  gotoHome,
  grantSelfComplianceExpertAndCommitteeAccess,
  patchStateOnBoot
} from './fixtures.js';

// Points d'entrée de « Enjeux du projet » : où mène chaque lien (mail, accueil), et ce qui doit
// être déplié, cerné, visible à l'arrivée. Ce fichier sert de filet pendant la refonte de la page
// (équipes en une colonne, points à préparer en tête de fil, bloc du haut en deux colonnes) : la
// mise en page peut tout changer, pas ces arrivées.
//
// Contrat que la nouvelle page doit garder (c'est tout ce que lisent les tests ci-dessous) :
// - le titre « Enjeux du projet » (rôle heading) ;
// - `#compliance-team-block-<teamId>` / `#compliance-committee-block-<committeeId>` : la carte
//   d'un périmètre, avec dedans un bouton `aria-expanded` qui la replie ;
// - `#compliance-opinion-team-<teamId>` / `#compliance-opinion-committee-<id>` : l'avis ;
// - `#compliance-message-<replyId>` : une réponse du fil ;
// - `data-cn-link-target="true"` sur la cible d'un lien (src/utils/linkTarget.js).
//
// Les états sont injectés dans le projet (patchStateOnBoot), puis on arrive par l'URL exacte que
// fabriquent les mails : la génération des mails eux-mêmes est couverte par
// notification-message-links.spec.js, qui passe par l'interface actuelle.
//
// Le dernier bloc décrit ce que la page réunie ajoute : nouveaux messages mis en avant, équipes
// qui ont du nouveau en tête, équipe de l'expert d'abord, frise des étapes.

const OTHER_OWNER = 'porteur.externe@lfb.fr';
const TEAM = 'controle_pub';
const COMMITTEE = 'committee-default';

const readMails = (page) => page.evaluate(() => window.__cnMockNotifications || []);

const isInViewport = (locator) => locator.evaluate((element) => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
});

const teamToggle = (page, teamId = TEAM) => page.locator(`#compliance-team-block-${teamId} button[aria-expanded]`).first();

async function submittedProjectId(page) {
  const stored = await page.evaluate(() => window.__cnReadPersistedState());
  return stored.projects.find((entry) => entry?.status === 'submitted' && String(entry.id).startsWith('project-')).id;
}

const stakesUrl = (projectId, params = {}) => {
  const search = new URLSearchParams({ projectId, view: 'synthesis', ...params });
  return `/index.html?${search.toString()}`;
};

// Le compte de test est porteur du projet et contact de « Contrôle pub » (fixtures). `owner`
// confie le projet à quelqu'un d'autre : le compte de test n'est alors plus qu'expert.
async function seedProject(page, { owner, teams = {}, committees = {} } = {}) {
  // Quitter les enjeux marque la visite au rendu suivant : on laisse ce marquage se faire avant de
  // dater les messages injectés, sinon un message « nouveau » serait plus ancien que la visite.
  await page.waitForTimeout(300);
  const seededAt = new Date().toISOString();
  await patchStateOnBoot(page, (stored, arg) => {
    const state = stored || {};
    (state.projects || []).forEach((project) => {
      if (project?.status !== 'submitted' || !String(project.id || '').startsWith('project-')) {
        return;
      }
      if (arg.owner) {
        project.ownerEmail = arg.owner;
        project.sharedWith = [];
      }
      project.answers = project.answers || {};
      const comments = project.answers.__compliance_team_comments__ || {};
      const mergeEntries = (current, patch) => {
        const next = { ...(current || {}) };
        Object.entries(patch || {}).forEach(([id, entry]) => {
          const replies = (entry.replies || []).map((reply) => ({
            authorName: reply.authorEmail,
            ...reply,
            createdAt: reply.createdAt === 'now' ? arg.seededAt : reply.createdAt
          }));
          next[id] = { ...(next[id] || {}), ...entry, ...(entry.replies ? { replies } : {}) };
        });
        return next;
      };
      project.answers.__compliance_team_comments__ = {
        ...comments,
        teams: mergeEntries(comments.teams, arg.teams),
        committees: mergeEntries(comments.committees, arg.committees)
      };
    });
    return state;
    // « now » est figé au moment où le test injecte : le patch rejoue à chaque navigation, et un
    // message daté à chaque chargement resterait « nouveau » pour toujours.
  }, { owner, teams, committees, seededAt });
  await page.reload();
}

async function setUpSubmittedProject(page) {
  await gotoHome(page);
  await grantSelfComplianceExpertAndCommitteeAccess(page);
  await createAndSubmitProject(page);
  await goToProjectsHome(page);
  return submittedProjectId(page);
}

const expertReply = (id, message, createdAt = '2026-11-02T09:05:00.000Z') => ({
  id, message, authorEmail: 'laure.chevalier@lfb.fr', createdAt
});
const ownerReply = (id, message, createdAt = '2026-11-02T10:00:00.000Z') => ({
  id, message, authorEmail: OTHER_OWNER, createdAt
});

test.describe('Liens des mails : chaque lien arrive sur le bon affichage', () => {
  test('mail de sollicitation d’une équipe : « Enjeux du projet », carte de l’équipe présente', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setUpSubmittedProject(page);
    const mail = (await readMails(page)).find((entry) => entry.to.includes('laure.chevalier@lfb.fr'));
    expect(mail).toBeTruthy();
    const link = new URL(mail.body.match(/href="([^"]+view=synthesis[^"]*)"/)[1].replace(/&amp;/g, '&'));
    expect(link.searchParams.get('view')).toBe('synthesis');

    await page.goto(link.pathname + link.search);
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(page.locator(`#compliance-team-block-${TEAM}`)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('mail de confirmation d’envoi au porteur : le lien sans écran ouvre la vitrine', async ({ page }) => {
    await setUpSubmittedProject(page);
    const mail = (await readMails(page)).find((entry) => entry.subject.includes('Submission confirmation'));
    const link = new URL(mail.body.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&'));
    expect(link.searchParams.get('view')).toBeNull();

    await page.goto(link.pathname + link.search);
    await expect(page.locator('[data-showcase-section]').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toHaveCount(0);
  });

  test('lien vers une équipe, sans message précis : carte dépliée sur le dernier message du porteur', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, {
      owner: OTHER_OWNER,
      teams: {
        [TEAM]: {
          replies: [
            expertReply('reply-expert-1', 'Quel est le public visé ?'),
            ownerReply('reply-owner-1', 'Le grand public, en France.'),
            expertReply('reply-expert-2', 'Merci, et la date de diffusion ?', '2026-11-02T11:00:00.000Z')
          ]
        }
      }
    });

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM }));
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(teamToggle(page)).toHaveAttribute('aria-expanded', 'true');
    const ownerMessage = page.locator('#compliance-message-reply-owner-1');
    await expect(ownerMessage).toContainText('Le grand public, en France.');
    await expect.poll(() => isInViewport(ownerMessage)).toBe(true);
    // Le fil est déplié en entier : le message suivant est là aussi.
    await expect(page.locator('#compliance-message-reply-expert-2')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('lien vers une équipe sans aucun message du porteur : la carte de l’équipe, dépliée', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, { owner: OTHER_OWNER });

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM }));
    await expect(teamToggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => isInViewport(page.locator(`#compliance-team-block-${TEAM}`))).toBe(true);
  });

  test('lien vers l’avis d’une équipe : l’avis est cerné et à l’écran', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, {
      teams: {
        [TEAM]: {
          status: 'validated_with_conditions',
          comment: '<p>Mentions légales à ajouter sur le visuel.</p>',
          statusUpdatedAt: '2026-11-02T09:00:00.000Z'
        }
      }
    });

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM, focusMessage: 'opinion' }));
    const opinion = page.locator(`#compliance-opinion-team-${TEAM}`);
    await expect(opinion).toHaveAttribute('data-cn-link-target', 'true');
    await expect(opinion).toContainText('Mentions légales à ajouter sur le visuel.');
    await expect.poll(() => isInViewport(opinion)).toBe(true);
    await expect(teamToggle(page)).toHaveAttribute('aria-expanded', 'true');
    expect(errors).toEqual([]);
  });

  test('lien vers une réponse : la réponse est cernée ; une réponse disparue retombe sur la carte', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, {
      teams: {
        [TEAM]: {
          replies: [
            expertReply('reply-expert-old', 'Première question.'),
            ...Array.from({ length: 6 }, (_, index) => expertReply(`reply-filler-${index}`, `Relance ${index}.`, `2026-11-02T09:1${index}:00.000Z`)),
            expertReply('reply-expert-target', 'Pouvez-vous joindre le devis ?', '2026-11-02T12:00:00.000Z')
          ]
        }
      }
    });

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM, focusMessage: 'reply-expert-target' }));
    const reply = page.locator('#compliance-message-reply-expert-target');
    await expect(reply).toHaveAttribute('data-cn-link-target', 'true');
    await expect(reply).toContainText('Pouvez-vous joindre le devis ?');
    await expect.poll(() => isInViewport(reply)).toBe(true);
    // Un fil long n'est pas tronqué à l'arrivée : la première question est toujours dans la page.
    await expect(page.locator('#compliance-message-reply-expert-old')).toBeAttached();

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM, focusMessage: 'reply-disparue' }));
    await expect(page.locator(`#compliance-team-block-${TEAM}`)).toHaveAttribute('data-cn-link-target', 'true');
  });

  test('lien vers l’avis et vers une réponse d’un comité', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const projectId = await setUpSubmittedProject(page);
    // Le comité par défaut n'a aucun déclencheur : un membre l'intègre au projet depuis l'accueil.
    await page.getByRole('button', { name: /Hors comité \(1\)/ }).click();
    await page.getByRole('button', { name: 'Intégrer au comité' }).click();
    await expect(page.getByRole('button', { name: /Hors comité \(0\)/ })).toBeVisible();
    await seedProject(page, {
      committees: {
        [COMMITTEE]: {
          status: 'pending_information',
          comment: '<p>Le comité souhaite voir le budget.</p>',
          statusUpdatedAt: '2026-11-02T09:00:00.000Z',
          replies: [expertReply('reply-committee-1', 'Merci de présenter le projet en séance.')]
        }
      }
    });

    await page.goto(stakesUrl(projectId, { focusKind: 'committee', focusId: COMMITTEE, focusMessage: 'opinion' }));
    const opinion = page.locator(`#compliance-opinion-committee-${COMMITTEE}`);
    await expect(opinion).toHaveAttribute('data-cn-link-target', 'true');
    await expect(opinion).toContainText('Le comité souhaite voir le budget.');
    await expect.poll(() => isInViewport(opinion)).toBe(true);

    await page.goto(stakesUrl(projectId, { focusKind: 'committee', focusId: COMMITTEE, focusMessage: 'reply-committee-1' }));
    const reply = page.locator('#compliance-message-reply-committee-1');
    await expect(reply).toHaveAttribute('data-cn-link-target', 'true');
    await expect.poll(() => isInViewport(reply)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('lien vers un périmètre qui ne concerne plus le projet : la page s’ouvre, sans erreur ni cible', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const projectId = await setUpSubmittedProject(page);

    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: 'equipe-inconnue', focusMessage: 'opinion' }));
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await page.waitForTimeout(2500);
    await expect(page.locator('[data-cn-link-target="true"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('lien vers un projet qui n’existe plus : « Projet introuvable », pas une page vide', async ({ page }) => {
    await setUpSubmittedProject(page);
    await page.goto(stakesUrl('project-supprime', { focusKind: 'team', focusId: TEAM, focusMessage: 'opinion' }));
    await expect(page.getByText('Projet introuvable')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toHaveCount(0);
  });
});

test.describe('Accueil : chaque carte mène au bon affichage', () => {
  test('porteur : la pastille de la carte mène aux enjeux, et s’éteint après lecture', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setUpSubmittedProject(page);
    await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(0);
    await seedProject(page, { teams: { [TEAM]: { replies: [expertReply('reply-expert-new', 'Pouvez-vous préciser le circuit ?', 'now')] } } });
    await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(1);

    const card = page.locator('article[id^="project-card-"]', { has: page.getByTestId('owner-expert-news-dot') });
    await card.getByRole('button', { name: 'Consulter les enjeux' }).click();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(page.locator(`#compliance-team-block-${TEAM}`)).toBeVisible();

    await goToProjectsHome(page);
    await expect(page.getByTestId('owner-expert-news-dot')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('expert : « Ouvrir » déplie son équipe, sur la réponse du porteur, sans éteindre la puce de la file', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await setUpSubmittedProject(page);
    await seedProject(page, {
      owner: OTHER_OWNER,
      teams: {
        [TEAM]: {
          status: 'pending_information',
          comment: '<p>Merci de préciser le circuit de diffusion.</p>',
          statusUpdatedAt: '2026-11-02T08:00:00.000Z',
          claim: { assigneeEmail: 'bertrand.darieux@lfb.fr', assignedAt: '2026-11-02T08:00:00.000Z', assignedByEmail: 'bertrand.darieux@lfb.fr' },
          replies: [ownerReply('reply-owner-news', 'Diffusion interne uniquement.')]
        }
      }
    });
    await page.getByRole('button', { name: /En cours \(1\)/ }).click();
    await expect(page.getByTestId('expert-queue-news-dot')).toHaveCount(1);

    await page.getByRole('button', { name: 'Ouvrir' }).first().click();
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(teamToggle(page)).toHaveAttribute('aria-expanded', 'true');
    const ownerMessage = page.locator('#compliance-message-reply-owner-news');
    await expect(ownerMessage).toContainText('Diffusion interne uniquement.');
    await expect.poll(() => isInViewport(ownerMessage)).toBe(true);

    // Ouvrir n'est pas répondre : la puce reste jusqu'au prochain geste de l'expert.
    await goToProjectsHome(page);
    await page.getByRole('button', { name: /En cours \(1\)/ }).click();
    await expect(page.getByTestId('expert-queue-news-dot')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

// Page réunie (« Enjeux du projet » en une colonne, bloc du haut en deux colonnes) :
//   stakes-since-last-visit         bloc « Équipes · depuis votre dernière visite » (colonne gauche)
//   stakes-news-<teamId>            une ligne de ce bloc, avec son lien « lire »
//   team-news-badge-<teamId>        étiquette « nouveau » sur l'en-tête d'une équipe
//   data-cn-new-message="true"      sur chaque message arrivé depuis la dernière visite
//   stakes-own-team / stakes-other-teams   vue expert : son équipe, puis les autres
//   ol[aria-label="Étapes du projet"] li[aria-current="step"]   la frise
test.describe('Page réunie : les nouveaux messages sont mis en avant à l’arrivée', () => {
  async function ownerWithUnreadReplies(page) {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, {
      teams: {
        [TEAM]: { replies: [expertReply('reply-old', 'Message déjà lu.', '2026-01-01T09:00:00.000Z'), expertReply('reply-new', 'Pouvez-vous préciser le circuit ?', 'now')] },
        dpo: { replies: [expertReply('reply-dpo-new', 'Où seront hébergées les données ?', 'now')] }
      }
    });
    return projectId;
  }

  test('porteur depuis l’accueil : « Depuis votre dernière visite » liste les équipes qui ont écrit, et « lire » mène au message', async ({ page }) => {
    await ownerWithUnreadReplies(page);
    const card = page.locator('article[id^="project-card-"]', { has: page.getByTestId('owner-expert-news-dot') });
    await card.getByRole('button', { name: 'Consulter les enjeux' }).click();

    const since = page.getByTestId('stakes-since-last-visit');
    await expect(since).toBeVisible();
    await expect(since.getByTestId(`stakes-news-${TEAM}`)).toContainText('nouveau');
    await expect(since.getByTestId('stakes-news-dpo')).toBeVisible();
    await since.getByTestId(`stakes-news-${TEAM}`).getByRole('link', { name: /lire/ }).click();
    const reply = page.locator('#compliance-message-reply-new');
    await expect(reply).toHaveAttribute('data-cn-link-target', 'true');
    await expect.poll(() => isInViewport(reply)).toBe(true);
  });

  test('les équipes qui ont du nouveau sont dépliées d’office, en tête de liste, avec l’étiquette « nouveau »', async ({ page }) => {
    const projectId = await ownerWithUnreadReplies(page);
    await page.goto(stakesUrl(projectId));
    await expect(page.getByTestId(`team-news-badge-${TEAM}`)).toBeVisible();
    const blocks = page.locator('[id^="compliance-team-block-"]');
    const firstTwo = await blocks.evaluateAll((nodes) => nodes.slice(0, 2).map((node) => node.id));
    expect(firstTwo.sort()).toEqual(['compliance-team-block-controle_pub', 'compliance-team-block-dpo'].sort());
    await expect(teamToggle(page, TEAM)).toHaveAttribute('aria-expanded', 'true');
    await expect(teamToggle(page, 'dpo')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId(`team-news-badge-${TEAM}`)).toBeVisible();
  });

  test('seuls les messages arrivés depuis la dernière visite portent « nouveau », et plus à la visite suivante', async ({ page }) => {
    const projectId = await ownerWithUnreadReplies(page);
    await page.goto(stakesUrl(projectId));
    await expect(page.locator('#compliance-message-reply-new')).toHaveAttribute('data-cn-new-message', 'true');
    await expect(page.locator('#compliance-message-reply-dpo-new')).toHaveAttribute('data-cn-new-message', 'true');
    await expect(page.locator('#compliance-message-reply-old')).not.toHaveAttribute('data-cn-new-message', 'true');

    await goToProjectsHome(page);
    await page.goto(stakesUrl(projectId));
    await expect(page.getByRole('heading', { name: 'Enjeux du projet' })).toBeVisible();
    await expect(page.locator('[data-cn-new-message="true"]')).toHaveCount(0);
    await expect(page.getByTestId('stakes-since-last-visit')).toHaveCount(0);
  });

  test('arrivée par le lien d’un mail : le message est cerné et marqué nouveau, les autres nouveautés restent listées', async ({ page }) => {
    const projectId = await ownerWithUnreadReplies(page);
    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM, focusMessage: 'reply-new' }));
    const reply = page.locator('#compliance-message-reply-new');
    await expect(reply).toHaveAttribute('data-cn-link-target', 'true');
    await expect(reply).toHaveAttribute('data-cn-new-message', 'true');
    await expect(page.getByTestId('stakes-since-last-visit').getByTestId('stakes-news-dpo')).toBeVisible();
  });

  test('expert : son équipe avant les autres équipes consultées, dépliée sur la réponse du porteur', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, { owner: OTHER_OWNER, teams: { [TEAM]: { replies: [ownerReply('reply-owner-x', 'Réponse du porteur.')] } } });
    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM }));
    const own = page.getByTestId('stakes-own-team');
    const others = page.getByTestId('stakes-other-teams');
    await expect(own.locator(`#compliance-team-block-${TEAM}`)).toBeVisible();
    await expect(others.locator(`#compliance-team-block-${TEAM}`)).toHaveCount(0);
    const order = await page.evaluate(() => {
      const ownNode = document.querySelector('[data-testid="stakes-own-team"]');
      const othersNode = document.querySelector('[data-testid="stakes-other-teams"]');
      return Boolean(ownNode.compareDocumentPosition(othersNode) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(order).toBe(true);
    await expect(page.locator('#compliance-message-reply-owner-x')).toBeVisible();
  });

  test('« pas encore écrit » ne liste pas une équipe qui a déjà rendu un avis', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, {
      teams: { juridique_international: { status: 'validated', comment: '', statusUpdatedAt: '2026-11-02T09:00:00.000Z' } }
    });
    await page.goto(stakesUrl(projectId));
    await expect(page.getByTestId('stakes-unwritten-pi')).toBeVisible();
    await expect(page.getByTestId('stakes-unwritten-juridique_international')).toHaveCount(0);
  });

  test('expert : les réponses du porteur s’ouvrent dans un panneau à côté du fil, qui reste utilisable', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await seedProject(page, { owner: OTHER_OWNER, teams: { [TEAM]: { replies: [ownerReply('reply-owner-y', 'Réponse du porteur.')] } } });
    await page.goto(stakesUrl(projectId, { focusKind: 'team', focusId: TEAM }));
    const trigger = page.getByTestId(`owner-answers-${TEAM}`).getByRole('button', { name: 'Voir toutes les réponses' });
    await trigger.click();
    const panel = page.getByTestId('owner-answers-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Réponses du porteur' })).toBeVisible();
    await expect(panel.locator('.bg-white.rounded-lg').first()).toBeVisible();
    // Le fil reste à l'écran et l'on peut ouvrir la zone de message sans fermer le panneau.
    const composer = page.getByTestId(`team-composer-${TEAM}`);
    await expect.poll(() => composer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const panelRect = document.querySelector('[data-testid="owner-answers-panel"]').getBoundingClientRect();
      return rect.right <= panelRect.left;
    })).toBe(true);
    await composer.click();
    await expect(panel).toBeVisible();
    await expect(page.locator(`#team-${TEAM}-reply-editor, [id="team-${TEAM}-reply-editor"]`).first()).toBeAttached();
    await panel.getByRole('button', { name: 'Fermer' }).focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('la frise indique l’étape en cours après une demande de validation', async ({ page }) => {
    const projectId = await setUpSubmittedProject(page);
    await page.goto(stakesUrl(projectId));
    await expect(page.locator('ol[aria-label="Étapes du projet"] li[aria-current="step"]')).toContainText('Validation');
  });
});
