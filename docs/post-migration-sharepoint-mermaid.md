> **⛔ OBSOLÈTE — NE PAS SUIVRE CE DOCUMENT.** Diagramme basé sur la stratégie Microsoft Graph +
> MSAL, abandonnée. Document de référence en vigueur :
> [`migration-v2/README.md`](migration-v2/README.md).

# Graphique Mermaid — architecture cible post-migration SharePoint

```mermaid
flowchart LR
    %% Utilisateurs et UI
    User[Utilisateurs métiers / compliance]
    Browser[Web App React]

    %% Fichiers/Modules principaux
    subgraph Frontend[Infra technique - Frontend]
      App[src/App.jsx\nOrchestrateur global]
      DP[src/utils/dataProvider.js\nProvider projets]
      IDP[src/utils/inspirationDataProvider.js\nProvider inspirations]
      PRJ["src/components/*\nQuestionnaireScreen, SynthesisReport, BackOffice"]
      CFG["src/data/*\nquestions, rules, teams, riskWeights"]
    end

    %% Couche d'accès API
    subgraph ApiLayer[Couche d'intégration Microsoft 365]
      GraphClient["Graph client / Auth MSAL\n(adapter applicatif)"]
      GraphAPI[(Microsoft Graph API)]
    end

    %% Objets SharePoint
    subgraph SharePoint["SharePoint Online (site Compliance Navigator)"]
      SPLProjects[(Liste SP: Projects)]
      SPLInspirations[(Liste SP: Inspirations)]
      SPLMembers[(Liste SP: ProjectMembers)]
      SPLDiscussions[(Liste SP: ProjectDiscussions)]
      SPLComments[(Liste SP: ComplianceComments)]
      SPLChanges[(Liste SP: BackOfficeChanges)]
      SPFiles[(Bibliothèque SP: ProjectFiles)]
      SPShowcase[(Liste SP: ShowcaseStickyNotes)]
    end

    %% Fichiers export / index
    subgraph Documents[Documents / groupes de fichiers]
      ExportJSON[(Exports projet .json)]
      Attachments[(Pièces jointes\nPPTX/PDF/DOCX)]
      Evidence[(Dossiers de preuves conformité)]
    end

    User --> Browser
    Browser --> App
    App --> PRJ
    App --> CFG
    App --> DP
    App --> IDP

    DP --> GraphClient
    IDP --> GraphClient
    GraphClient --> GraphAPI

    %% Appels Graph majeurs
    GraphAPI -- "GET /sites/{site-id}/lists/Projects/items?expand=fields" --> SPLProjects
    GraphAPI -- "GET /sites/{site-id}/lists/Inspirations/items?expand=fields" --> SPLInspirations
    GraphAPI -- "GET /sites/{site-id}/lists/ProjectMembers/items?expand=fields" --> SPLMembers
    GraphAPI -- "GET /sites/{site-id}/lists/ProjectDiscussions/items?expand=fields" --> SPLDiscussions
    GraphAPI -- "GET /sites/{site-id}/lists/ComplianceComments/items?expand=fields" --> SPLComments
    GraphAPI -- "GET /sites/{site-id}/lists/BackOfficeChanges/items?expand=fields" --> SPLChanges
    GraphAPI -- "GET /sites/{site-id}/lists/ShowcaseStickyNotes/items?expand=fields" --> SPShowcase

    GraphAPI -- "GET /sites/{site-id}/drives/{drive-id}/root:/ProjectFiles:/children" --> SPFiles
    GraphAPI -- "PUT /sites/{site-id}/drives/{drive-id}/items/{parent-id}:/{fileName}:/content" --> SPFiles

    %% Flux d'écriture
    App -- "Création / MAJ projet" --> GraphClient
    GraphAPI -- "POST/PATCH /sites/{site-id}/lists/Projects/items" --> SPLProjects
    GraphAPI -- "POST /sites/{site-id}/lists/ProjectDiscussions/items" --> SPLDiscussions
    GraphAPI -- "POST /sites/{site-id}/lists/ComplianceComments/items" --> SPLComments

    %% Flux documentaire
    SPLProjects --> ExportJSON
    SPFiles --> Attachments
    SPFiles --> Evidence
```

## Notes de lecture

- Le front reste structuré autour de `App.jsx` et des providers de données (`dataProvider`, `inspirationDataProvider`) qui branchent désormais les écrans métier sur Microsoft Graph.
- Les listes SharePoint représentent les entités métiers principales (projets, inspirations, membres, discussions, commentaires, changements back-office, sticky notes).
- La bibliothèque SharePoint (`ProjectFiles`) centralise les livrables et preuves documentaires, avec lecture/écriture via les endpoints `drives` de Microsoft Graph.
