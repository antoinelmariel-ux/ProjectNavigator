# Environnements SharePoint

## DEV — `ProjectNavigator_DEV`

- **Site** : `https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV`
- **Page de l'app** : `https://lfb1.sharepoint.com/sites/ProjectNavigator_DEV/CN-App/index.aspx`
- **Structure créée le** : 2026-08-28 (script console, sans avertissement)

| Conteneur | Type | GUID |
|---|---|---|
| CN-App | Bibliothèque | `95222150-1f52-43fc-b72a-d1cfcc168084` |
| CN-Config | Bibliothèque | `7a85e00d-ce42-4c0c-9184-77bbbfee54a6` |
| CN-Documents | Bibliothèque | `0b757b8c-4905-4acb-88a2-a809ecf06d30` |
| CN_Projects | Liste | `562ea90f-7ce9-45ca-8e48-cb69a1fd4491` |
| CN_Inspirations | Liste | `7e9656f0-f7a7-4635-a65d-6a0c9c9ef5cb` |
| CN_ComplianceComments | Liste | `de8cf747-9a21-42bf-8c7d-31bdaeeca145` |
| CN_ProjectDiscussions | Liste | `99562c1e-f44e-42d9-8f4c-756ff3e7390a` |
| CN_ProjectMembers | Liste | `68edcb69-94b7-41f3-ad54-fd79980ecca6` |
| CN_BackofficeChanges | Liste | `13ee1004-ad1a-477b-ae3a-8471da8104ca` |
| CN_ShowcaseStickyNotes | Liste | `ec4d7823-a28f-4bcc-97f4-ba6b282ccc31` |
| CN_FilesIndex | Liste | `a0854267-45c9-43a2-8707-bc67fe4d1a19` |
| CN_NotificationsQueue | Liste | `2c197090-6347-44a8-a51b-a31503cff842` |
| CN_UserProfiles | Liste | *à créer (voir VERIFICATION-CONFIGURATION-SHAREPOINT.md)* |

## PROD — à créer

Rejouer le script de création de structure sur le site de production, puis compléter ce tableau.

## ⚠️ Les GUID ne doivent JAMAIS entrer dans le code applicatif

Ils sont consignés ici **uniquement** pour la traçabilité et pour la configuration des flux
Power Automate. Le code adresse les listes par leur nom
(`/_api/web/lists/getbytitle('CN_Projects')`) et déduit l'URL du site depuis
`window.location` : c'est ce qui permet au **même build de fonctionner sur DEV et sur PROD**
sans modification. Coder un GUID en dur romprait cette portabilité.
