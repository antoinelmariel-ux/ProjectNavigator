// Modèles de vitrine livrés par défaut, un par type de projet dont le récit ne suit pas
// « problème → solution » : ces trois types étaient auparavant privés de vitrine. Ils se
// retouchent dans le back-office (onglet « Modèles de vitrine »).
const block = (id, type, title, description) => ({ kind: 'block', id, type, title, description });
const builtin = (id) => ({ kind: 'builtin', id });
const whenProjectTypeIs = (value) => ({
  conditionGroups: [{
    logic: 'all',
    conditions: [{ type: 'question', question: 'ProjectType', operator: 'equals', value }]
  }]
});

export const initialShowcaseTemplates = [
  {
    id: 'don-bourse-appel-a-projets',
    name: {
      fr: 'Don / bourse / appel à projets',
      en: 'Donation / grant / call for projects',
      de: 'Spende / Stipendium / Projektausschreibung',
      es: 'Donación / beca / convocatoria de proyectos'
    },
    activation: whenProjectTypeIs('don_bourse_appel_a_projets'),
    sections: [
      builtin('notice'),
      builtin('hero'),
      block('beneficiary', 'story', {
        fr: 'Le bénéficiaire',
        en: 'The beneficiary',
        de: 'Der Begünstigte',
        es: 'El beneficiario'
      }, {
        fr: 'Présentez la structure ou la personne soutenue et ce qui motive ce soutien.',
        en: 'Introduce the organisation or person supported and what motivates this support.',
        de: 'Stellen Sie die unterstützte Organisation oder Person vor und erläutern Sie den Anlass der Unterstützung.',
        es: 'Presente la organización o la persona apoyada y lo que motiva este apoyo.'
      }),
      block('purpose', 'highlight', {
        fr: 'Objet du soutien',
        en: 'Purpose of the support',
        de: 'Gegenstand der Unterstützung',
        es: 'Objeto del apoyo'
      }, {
        fr: 'Décrivez ce que le don, la bourse ou l’appel à projets finance concrètement.',
        en: 'Describe what the donation, grant or call for projects actually funds.',
        de: 'Beschreiben Sie, was die Spende, das Stipendium oder die Ausschreibung konkret finanziert.',
        es: 'Describa lo que financia concretamente la donación, la beca o la convocatoria.'
      }),
      block('selection', 'story', {
        fr: 'Modalités et critères',
        en: 'Terms and criteria',
        de: 'Modalitäten und Kriterien',
        es: 'Modalidades y criterios'
      }, {
        fr: 'Montant, critères de sélection, absence de contrepartie attendue.',
        en: 'Amount, selection criteria, no consideration expected in return.',
        de: 'Betrag, Auswahlkriterien, keine erwartete Gegenleistung.',
        es: 'Importe, criterios de selección, ausencia de contrapartida esperada.'
      }),
      builtin('team'),
      builtin('timeline')
    ]
  },
  {
    id: 'projet-tiers-soutenu',
    name: {
      fr: 'Projet d’un tiers soutenu par LFB',
      en: 'Third-party project supported by LFB',
      de: 'Projekt eines Dritten, das von LFB unterstützt wird',
      es: 'Proyecto de un tercero apoyado por LFB'
    },
    activation: whenProjectTypeIs('projet_d_un_tiers_soutenu_par_le_lfb'),
    sections: [
      builtin('notice'),
      builtin('hero'),
      block('third-party', 'story', {
        fr: 'Le porteur du projet',
        en: 'The project owner',
        de: 'Der Projektträger',
        es: 'El promotor del proyecto'
      }, {
        fr: 'Présentez le tiers qui porte ce projet et son projet en quelques lignes.',
        en: 'Introduce the third party running this project and the project itself in a few lines.',
        de: 'Stellen Sie den Dritten, der das Projekt trägt, und sein Projekt in wenigen Zeilen vor.',
        es: 'Presente en pocas líneas al tercero que lleva el proyecto y el proyecto en sí.'
      }),
      builtin('problem'),
      builtin('solution'),
      block('lfb-role', 'highlight', {
        fr: 'Le rôle de LFB',
        en: 'LFB’s role',
        de: 'Die Rolle von LFB',
        es: 'El papel de LFB'
      }, {
        fr: 'Précisez la nature du soutien apporté par LFB et ce qu’il exclut.',
        en: 'Specify the nature of the support LFB provides and what it excludes.',
        de: 'Erläutern Sie die Art der Unterstützung durch LFB und was sie ausschließt.',
        es: 'Precise la naturaleza del apoyo que aporta LFB y lo que excluye.'
      }),
      builtin('team'),
      builtin('timeline')
    ]
  },
  {
    id: 'advisory-board',
    name: {
      fr: 'Advisory Board non relié à un projet',
      en: 'Advisory Board not linked to a project',
      de: 'Advisory Board ohne Projektbezug',
      es: 'Advisory Board no vinculado a un proyecto'
    },
    activation: whenProjectTypeIs('advisory_board_non_relie_a_un_projet'),
    sections: [
      builtin('notice'),
      builtin('hero'),
      block('purpose', 'highlight', {
        fr: 'Objet de l’Advisory Board',
        en: 'Purpose of the Advisory Board',
        de: 'Zweck des Advisory Boards',
        es: 'Objeto del Advisory Board'
      }, {
        fr: 'Indiquez la question sur laquelle les experts sont consultés et ce que LFB en attend.',
        en: 'State the question the experts are consulted on and what LFB expects from it.',
        de: 'Nennen Sie die Frage, zu der die Experten konsultiert werden, und was LFB davon erwartet.',
        es: 'Indique la cuestión sobre la que se consulta a los expertos y lo que LFB espera de ella.'
      }),
      block('experts', 'story', {
        fr: 'Composition',
        en: 'Membership',
        de: 'Zusammensetzung',
        es: 'Composición'
      }, {
        fr: 'Profils des experts sollicités, mode de sélection et de rémunération.',
        en: 'Profiles of the experts involved, how they are selected and compensated.',
        de: 'Profile der beteiligten Experten, Auswahl und Vergütung.',
        es: 'Perfiles de los expertos, modo de selección y de remuneración.'
      }),
      builtin('objectives'),
      builtin('team'),
      builtin('timeline')
    ]
  }
];
