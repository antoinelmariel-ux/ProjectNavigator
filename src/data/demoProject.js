import { initialQuestions } from './questions.js';
import { initialRules } from './rules.js';
import { initialRiskLevelRules } from './riskLevelRules.js';
import { initialRiskWeights } from './riskWeights.js';
import { analyzeAnswers } from '../utils/rules.js';

const COMPLIANCE_COMMENTS_KEY = '__compliance_team_comments__';

const demoProjectAnswers = {
  projectName: 'Plasma 360',
  showcaseTheme: 'Universel',
  projectSlogan: 'Du don à la vie : découvrez comment chaque goutte de plasma devient un traitement vital',
  targetAudience: ['grand_public', 'Patients', 'professionnels_de_sante'],
  problemPainPoints:
    'Les professionnels de santé manquent souvent de supports pédagogiques simples et fiables pour expliquer à leurs patients comment les médicaments dérivés du plasma sont fabriqués.\nLe grand public a une perception floue du lien entre le don de plasma et la production de traitements : le processus industriel leur semble abstrait.',
  solutionDescription:
    'Plasma 360 est une plateforme web immersive et éducative qui raconte le parcours du plasma, depuis le don jusqu’au médicament final.\nLe site propose :\n- Une expérience interactive et visuelle retraçant étape par étape le processus de fractionnement.\n- Deux parcours de navigation : un mode grand public, simple et narratif, et un mode professionnel, plus technique et structuré.\n- Des vidéos immersives tournées sur les sites du LFB.\n- Une bibliothèque de contenus avec infographies, fiches explicatives et ressources téléchargeables.',
  solutionBenefits:
    'Une meilleure compréhension du rôle du LFB et de la valeur du plasma comme matière première vitale.\nUn format interactif et immersif qui se distingue des ressources actuelles souvent statiques.\nUne double lecture adaptée à chaque public, avec des contenus validés scientifiquement.\nUn outil de communication réutilisable pour la formation, la sensibilisation et les relations institutionnelles.',
  innovationProcess:
    'Renforcer la compréhension et la confiance envers les médicaments dérivés du plasma.\nValoriser la mission sociétale et le rôle industriel du LFB.\nAccroître la notoriété du LFB auprès des professionnels et du grand public.\nCréer un actif digital durable, réutilisable pour la formation et la communication.',
  visionStatement:
    'Nombre de visiteurs uniques mensuels.\nTemps moyen passé sur les pages.\nTaux de complétion du parcours interactif.\nNombre de téléchargements de ressources et de quiz complétés.\nMentions ou citations du site sur les réseaux sociaux et dans la presse spécialisée.',
  campaignKickoffDate: '2025-11-03',
  launchDate: '2025-12-20',
  roadmapMilestones: [
    {
      date: '2025-10-01',
      description: 'Validation du concept et du budget'
    },
    {
      date: '2025-10-15',
      description: 'Atelier immersif avec les équipes métier pour définir le parcours interactif'
    },
    {
      date: '2025-11-05',
      description: 'Production des contenus vidéo et rédaction des fiches pédagogiques'
    },
    {
      date: '2025-11-25',
      description: 'Recette utilisateur sur un panel mixte grand public / professionnels'
    }
  ],
  teamLead: 'Bertrand Darieux',
  teamLeadTeam: 'marketing_doi',
  teamCoreMembers:
    'Julien Morel - Directeur du site de production de Lille\nClaire Martin - Responsable Médicale\nSophie Leclerc - Responsable Communication Digitale\nStudio Nova - Agence de communication scientifique et design interactif',
  ProjectType: 'projet_du_lfb',
  q11: ['visuels_crees_specifiquement_pour_le_projet', 'contenu_genere_via_l_ia'],
  q3: ['oui_donnees_de_sante', 'oui_donnees_personnelles_standard_ex_email_satisfaction'],
  q10: ['professionnel_de_sante_francais_ou_association_de_pds_societe_savante', 'agence'],
  q14: ['via_les_canaux_digitaux_du_lfb', 'communique_de_presse'],
  q17: ['possibilite_de_renouveler_facilement_ce_type_de_projets_dans_le_temps'],
  q19: ['digital', 'redaction_d_abstract_de_poster_articles_scientifiques'],
  q24: ['partager_des_informations_sur_des_sujets_sensibles_ex_defaillance_industrielle_tension_d_approvisionnement_augmentation_de_capital'],
  q27: ['france', 'pays_lies_a_des_filiales_hors_france'],
  agencyRanking: {
    prioritized: ['critere-2', 'critere-1', 'critere-3'],
    ignored: []
  },
  q15:
    'Le projet prévoit un point d’étape trimestriel avec les équipes Médical, Communication et Compliance pour ajuster les contenus selon les retours terrain.',
  q15_copy: {
    name: 'plasma360-note-cadrage.pdf',
    size: 248000,
    type: 'application/pdf'
  },
  BUDGET: '30'
};

demoProjectAnswers[COMPLIANCE_COMMENTS_KEY] = {
  teams: {
    com: {
      comment:
        'Le dispositif de communication est validé sous réserve de soumettre les visuels finaux pour contrôle.',
      status: 'validated_with_conditions'
    },
    legal: {
      comment: 'Le parcours contractuel est conforme aux exigences réglementaires.',
      status: 'validated'
    }
  },
  committees: {
    'committee-default': {
      comment: 'Le comité valide le lancement avec un suivi mensuel des indicateurs de risque.',
      status: 'validated'
    }
  }
};

const DEMO_VERSION = 1;
const DEMO_TIMESTAMP = '2025-10-19T06:08:36.021Z';

export const createDemoProject = ({
  questions = initialQuestions,
  rules = initialRules,
  riskLevelRules = initialRiskLevelRules,
  riskWeights = initialRiskWeights
} = {}) => {
  const analysis = analyzeAnswers(demoProjectAnswers, rules, riskLevelRules, riskWeights);
  const totalQuestions = Array.isArray(questions) ? questions.length : Object.keys(demoProjectAnswers).length;
  const sanitizedTotal = totalQuestions > 0 ? totalQuestions : Object.keys(demoProjectAnswers).length;

  return {
    id: 'demo-project',
    version: DEMO_VERSION,
    projectName: demoProjectAnswers.projectName,
    answers: { ...demoProjectAnswers },
    metadata: {
      version: DEMO_VERSION,
      generatedAt: DEMO_TIMESTAMP,
      project: {
        name: demoProjectAnswers.projectName,
        projectName: demoProjectAnswers.projectName,
        answers: { ...demoProjectAnswers }
      }
    },
    analysis,
    status: 'submitted',
    generatedAt: DEMO_TIMESTAMP,
    lastUpdated: DEMO_TIMESTAMP,
    submittedAt: DEMO_TIMESTAMP,
    lastQuestionIndex: sanitizedTotal > 0 ? sanitizedTotal - 1 : 0,
    totalQuestions: sanitizedTotal,
    answeredQuestions: sanitizedTotal,
    isDemo: true
  };
};

export const demoProjectAnswersSnapshot = { ...demoProjectAnswers };
