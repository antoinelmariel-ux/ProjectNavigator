> **⛔ OBSOLÈTE — NE PAS SUIVRE CE DOCUMENT.** Prompt basé sur une stratégie de migration
> antérieure, abandonnée. Document de référence en vigueur :
> [`migration-v2/README.md`](migration-v2/README.md).

# Prompt ChatGPT Codex — Migration SharePoint

Copiez-collez le prompt ci-dessous dans ChatGPT Codex en remplaçant tous les placeholders `{{...}}`.

```text
Tu es un expert en migration de contenus vers SharePoint Online.

Contexte projet
- Nom du projet : {{PROJECT_NAME}}
- Owner : Antoine Lassauge (antoine.lassauge@lfb.fr)
- Environnement source : {{SOURCE_SYSTEM}}
- Environnement cible SharePoint : {{TARGET_SHAREPOINT_SITE_URL}}
- Objectif de migration : {{MIGRATION_OBJECTIVE}}
- Date cible de mise en production : {{GO_LIVE_DATE}}

Informations d’accès (à compléter)
- API key / token : {{API_KEY}}
- Tenant ID : {{TENANT_ID}}
- Client ID : {{CLIENT_ID}}
- Client Secret : {{CLIENT_SECRET}}
- Scope(s) OAuth : {{OAUTH_SCOPES}}

Données à migrer
- Types de contenus : {{CONTENT_TYPES}}
- Volumétrie estimée : {{VOLUME_ESTIMATE}}
- Métadonnées clés à reprendre : {{METADATA_MAPPING}}
- Pièces jointes / fichiers : {{ATTACHMENTS_POLICY}}
- Règles de droits / permissions : {{PERMISSIONS_RULES}}

Contraintes
- Exigences compliance : {{COMPLIANCE_CONSTRAINTS}}
- Exigences sécurité : {{SECURITY_CONSTRAINTS}}
- Fenêtre de migration : {{MIGRATION_WINDOW}}
- Critères de succès : {{SUCCESS_CRITERIA}}

Ta mission
1. Proposer une stratégie de migration pas-à-pas (préparation, pilote, run complet, rollback).
2. Fournir un plan technique détaillé (API endpoints, mapping de schéma, gestion des erreurs, reprise sur incident).
3. Générer une checklist opérationnelle avant / pendant / après migration.
4. Proposer un script type (pseudo-code ou JavaScript) pour exécuter la migration via API.
5. Ajouter un plan de validation (tests fonctionnels, contrôle d’intégrité, validation des permissions).
6. Lister les risques principaux avec actions de mitigation.

Format de sortie attendu
- Section 1 : Architecture et prérequis
- Section 2 : Plan de migration détaillé
- Section 3 : Script type commenté
- Section 4 : Plan de tests et validation
- Section 5 : Risques, mitigations, rollback
- Section 6 : Prochaines actions concrètes (J+1 / J+7 / J+30)
```
