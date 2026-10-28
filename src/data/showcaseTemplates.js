// Modèles de vitrine livrés par défaut, un par type de projet dont le récit ne suit pas
// « problème → solution » : ces trois types étaient auparavant privés de vitrine. Ils se
// retouchent dans le back-office (onglet « Modèles de vitrine »).
const block = (id, type, title, description) => ({ kind: 'block', id, type, title, description });
const builtin = (id, options = {}) => ({ kind: 'builtin', id, ...options });
// Emplacements d'un bloc : texte de départ que le porteur réécrit, texte fixé par le modèle
// (`{{questionId}}` y cite une réponse), ou réponse à une question du questionnaire.
const slotBlock = (id, type, slots) => ({ kind: 'block', id, type, slots });
const text = (value) => ({ state: 'used', source: 'text', text: value });
const locked = (value) => ({ state: 'locked', source: 'text', text: value });
const fromQuestion = (questionId) => ({ state: 'used', source: 'question', questionId, text: '' });
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
      // Le bouton du hero mène à « Le problème », absent de ce récit.
      builtin('hero', {
        hiddenParts: ['heroCta'],
        labels: {
          eyebrow: {
            fr: 'Un soutien de LFB',
            en: 'Supported by LFB',
            de: 'Eine Unterstützung von LFB',
            es: 'Un apoyo de LFB'
          }
        }
      }),
      slotBlock('amount', 'figure', {
        accent: locked({
          fr: 'Le soutien',
          en: 'The support',
          de: 'Die Unterstützung',
          es: 'El apoyo'
        }),
        title: locked({
          fr: 'Pour {{donationBeneficiary}}',
          en: 'For {{donationBeneficiary}}',
          de: 'Für {{donationBeneficiary}}',
          es: 'Para {{donationBeneficiary}}'
        }),
        figure: fromQuestion('donationAmount'),
        description: fromQuestion('donationPaymentSchedule')
      }),
      slotBlock('beneficiary', 'story', {
        accent: locked({
          fr: 'Le bénéficiaire',
          en: 'The beneficiary',
          de: 'Der Begünstigte',
          es: 'El beneficiario'
        }),
        title: fromQuestion('donationBeneficiary'),
        description: text({
          fr: 'Présentez la structure ou la personne soutenue et ce qui motive ce soutien.',
          en: 'Introduce the organisation or person supported and what motivates this support.',
          de: 'Stellen Sie die unterstützte Organisation oder Person vor und erläutern Sie den Anlass der Unterstützung.',
          es: 'Presente la organización o la persona apoyada y lo que motiva este apoyo.'
        })
      }),
      slotBlock('purpose', 'highlight', {
        accent: locked({
          fr: 'Objet du soutien',
          en: 'Purpose of the support',
          de: 'Gegenstand der Unterstützung',
          es: 'Objeto del apoyo'
        }),
        title: text({
          fr: 'Ce que ce soutien rend possible',
          en: 'What this support makes possible',
          de: 'Was diese Unterstützung möglich macht',
          es: 'Lo que este apoyo hace posible'
        }),
        description: fromQuestion('donationPurpose')
      }),
      slotBlock('audience', 'stack', {
        subtitle: locked({
          fr: 'Destinataires',
          en: 'Recipients',
          de: 'Empfänger',
          es: 'Destinatarios'
        }),
        title: text({
          fr: 'À qui s’adresse ce soutien',
          en: 'Who this support is for',
          de: 'An wen sich diese Unterstützung richtet',
          es: 'A quién se dirige este apoyo'
        }),
        items: fromQuestion('q10_copy')
      }),
      slotBlock('terms', 'checklist', {
        accent: locked({
          fr: 'Modalités',
          en: 'Terms',
          de: 'Modalitäten',
          es: 'Modalidades'
        }),
        title: text({
          fr: 'Un cadre clair, sans contrepartie cachée',
          en: 'A clear framework, with no hidden consideration',
          de: 'Ein klarer Rahmen ohne versteckte Gegenleistung',
          es: 'Un marco claro, sin contrapartidas ocultas'
        }),
        description: fromQuestion('donationSelectionCriteria'),
        items: locked({
          fr: 'Montant : {{donationAmount}}\nVersement : {{donationPaymentSchedule}}\nContrepartie attendue : {{donationCounterpart}}',
          en: 'Amount: {{donationAmount}}\nPayment: {{donationPaymentSchedule}}\nExpected in return: {{donationCounterpart}}',
          de: 'Betrag: {{donationAmount}}\nAuszahlung: {{donationPaymentSchedule}}\nErwartete Gegenleistung: {{donationCounterpart}}',
          es: 'Importe: {{donationAmount}}\nPago: {{donationPaymentSchedule}}\nContrapartida esperada: {{donationCounterpart}}'
        })
      }),
      builtin('team', {
        hiddenParts: ['teamCoreMembers'],
        labels: {
          headline: {
            fr: 'Qui porte ce soutien chez LFB',
            en: 'Who carries this support at LFB',
            de: 'Wer diese Unterstützung bei LFB trägt',
            es: 'Quién lleva este apoyo en LFB'
          }
        }
      }),
      // Le coût estimé du projet ferait doublon avec le montant du soutien.
      builtin('timeline', {
        hiddenParts: ['budget'],
        labels: {
          headline: {
            fr: 'Les étapes du soutien',
            en: 'The stages of the support',
            de: 'Die Etappen der Unterstützung',
            es: 'Las etapas del apoyo'
          }
        }
      })
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
      builtin('hero', { hiddenParts: ['heroCta'] }),
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

// Réponses fictives de l'aperçu du back-office, par modèle : un don se juge sur un montant et
// un bénéficiaire plausibles. Ce qu'un modèle lit encore sans réponse ici reçoit une réponse
// inventée selon son type (buildShowcaseTemplatePreviewAnswers). Jamais enregistrées.
export const showcaseTemplatePreviewAnswers = {
  'don-bourse-appel-a-projets': {
    ProjectType: 'don_bourse_appel_a_projets',
    projectName: 'Fonds Solidarité Hémophilie 2027',
    projectSlogan: 'Soutenir celles et ceux qui accompagnent les patients au quotidien.',
    donationAmount: '50000',
    donationBeneficiary: 'Association Hémophilie Solidaire',
    donationBeneficiaryCount: '120',
    donationPurpose: 'Le soutien finance, sur trois ans, un programme d’éducation thérapeutique pour les jeunes patients et leurs familles.',
    donationCounterpart: 'aucune_contrepartie',
    donationPaymentSchedule: 'versements_echelonnes',
    donationSelectionCriteria: 'Structure à but non lucratif, sans lien avec la prescription de nos produits, retenue par un comité indépendant.',
    q10_copy: ['association_ou_organisme_a_but_non_lucratif', 'expert_ou_reseau_professionnel']
  }
};
