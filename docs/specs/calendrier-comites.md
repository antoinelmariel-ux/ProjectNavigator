# Calendrier des comités — spécification

Statut : **étape 1 livrée** (application) ; **étapes 2 et 3 livrées côté application**
(`CN_CommitteeInvitations` : invitations des chefs de projet et des membres). Le flux Power
Automate est décrit dans `PREPARATION-SHAREPOINT-POWERAUTOMATE.md` (étape 5 quater) et reste à
construire et tester. Les rappels restent calculés dans l'application (voir §13). Points ouverts : §14.

## 1. Objectif

Aujourd'hui, un projet peut déclencher un ou plusieurs comités de validation. Les séances
tournent par une invitation Outlook récurrente, corrigée à la main (vacances, jours fériés,
séances supplémentaires), et l'ordre du jour se construit hors de l'application.

Cible : le calendrier des séances vit dans l'application. Le chef de projet y inscrit
lui-même son projet ; le président et le co-président animent la séance depuis une page
« Ordre du jour » ; les invitations Outlook sont produites par Power Automate à partir de ce
calendrier.

## 2. Rôles

| Rôle | Qui | Peut |
|---|---|---|
| Président / co-président | Deux membres désignés par comité | Gérer les séances, gérer tous les passages, traiter les demandes de temps, saisir les présences |
| Administrateur | `adminEmails` | Tout ce que peut le président, sur tous les comités |
| Membre du comité | `emails` du comité | Consulter l'ordre du jour et ouvrir en lecture la synthèse et la vitrine des projets inscrits, brouillons compris |
| Chef de projet | Porteur ou co-porteur | Inscrire, déplacer et désinscrire son projet ; inviter qui il veut ; demander plus de temps |

## 3. Les séances

- **Chaque comité a ses propres séances.**
- Une séance a : date et heure de début, durée totale (1 h par défaut), lieu (lien Teams
  aujourd'hui ; salle ou hybride possible), statut **brouillon → publiée → annulée**.
- **Planification** par le président : génération à partir d'une règle (« 2e mardi du mois,
  14h–15h ») sur une période libre — un trimestre ou davantage, **sans limite d'horizon** —,
  puis retouches séance par séance (déplacer, annuler, ajouter une séance supplémentaire).
- **Brouillon puis publication** : une séance en brouillon n'est visible que du président et
  du co-président. La publier ouvre les inscriptions (il n'y a pas de date d'ouverture
  distincte) et déclenche l'invitation des membres.
- **Pilotage**, dans l'onglet du comité : nombre de projets qui déclenchent le comité sans être
  inscrits, temps libre restant sur les séances publiées.
- **Rappel au président** 4 semaines avant la dernière séance publiée, pour planifier la suite.
- Pas de notion de « trimestre » dans les données : uniquement des séances datées.

## 4. Le temps d'une séance

- Une séance est **un temps à répartir**, pas une grille de créneaux.
- Les passages s'enchaînent depuis l'heure de début, sans trous, **dans l'ordre d'inscription**.
  Le président peut réorganiser.
- **Durée d'un passage : 20 min par défaut, réglable par comité.** Le président peut la modifier
  pour un projet (minimum **10 min**, par pas de 5 min) ; les horaires suivants se recalculent.
- **Temps restant** = durée de la séance − somme des passages (demandes de temps en option
  comprises).
- **Dépassement** : si une action du président fait dépasser la durée, un avertissement
  l'indique (« la séance dépasse de 15 min ») ; s'il confirme, **la séance est prolongée**
  d'autant, et les invitations des membres et des chefs de projet sont mises à jour.
- **Les horaires ne sont jamais figés** : le président ajuste jusqu'au dernier moment.

## 5. L'inscription (chef de projet)

- **Où** : dans le bloc du comité de la synthèse (« Enjeux du projet »).
- **Quand** : dès que le comité est déclenché, brouillon compris. **S'inscrire ne vaut pas
  sollicitation du comité** (aucune notification de soumission, aucun statut).
- **Séances proposées** : publiées, à plus de **3 jours** (J-3), avec un temps restant au moins
  égal à la durée par défaut du comité. Une séance complète ou trop proche n'est pas proposée.
  Si aucune séance ne convient, un message l'indique.
- **Le chef de projet choisit une séance, pas un horaire.** Il doit considérer qu'il peut passer
  à n'importe quel moment de la séance ; son ordre et son heure de passage sont affichés comme
  **indicatifs**.
- **Invités** : les personnes qu'il souhaite (sélecteur de personnes).
- **Changer de séance** : possible jusqu'au dernier moment, mais la séance d'arrivée doit
  respecter J-3. **Se désinscrire** : possible jusqu'au dernier moment.
- **Demander plus de temps**, avec une justification obligatoire. Durée demandée par défaut :
  **20 min de plus, ou le temps restant s'il y en a moins**. Ce temps est **mis en option** sur
  la séance en attendant la décision ; la demande est envoyée au président et au co-président.
- **Un projet peut passer plusieurs fois devant le même comité**, typiquement quand le comité
  lui demande de revoir des points et de revenir présenter. Les passages sont numérotés
  (« 1er passage », « 2e passage »…) et l'historique est conservé.
- Le chef de projet ne peut avoir qu'**un passage à venir à la fois** par comité : il se
  réinscrit une fois le passage précédent tenu. Le président, lui, n'a pas cette limite.
- **Comité « à solliciter ensuite »** (consultation par vagues) : l'inscription à ce comité est
  bloquée tant qu'il n'a pas été sollicité ; le bloc du comité l'explique.

## 6. Ce que fait le président / co-président

Sur **tous** les projets de ses séances :

- **Inscrire** un projet sur une séance (la règle J-3 ne s'applique pas à lui).
- **Modifier la durée** d'un passage (≥ 10 min).
- **Réorganiser** l'ordre des passages.
- **Déplacer** un passage vers une autre séance.
- **Accepter ou refuser** une demande de temps.
- **Annuler** un passage, avec un motif transmis au chef de projet.
- **Saisir les présences** (§8).
- **Ajouter un sujet hors projet** à l'ordre du jour (point d'information, retour d'expérience,
  point divers) : un intitulé, une durée (10 min par défaut), des intervenants et une précision
  facultatifs. Il prend du temps de séance comme un projet, se réordonne, se redimensionne et se
  retire de la même façon, mais n'a ni porteur ni présences propres. Ses **intervenants reçoivent
  l'invitation Outlook** de la séance (étape 2), comme un chef de projet ; un sujet sans
  intervenant n'invite personne. Aucun mail n'est envoyé pour un sujet.
- **Annuler la séance**, depuis le back-office ou directement depuis la page « Ordre du jour » :
  les inscrits sont prévenus et leurs invitations Outlook annulées (étape 2).
- **Demander un nouveau passage** à l'issue d'un passage : le chef de projet est prévenu et
  invité à se réinscrire ; le bloc du comité de la synthèse l'affiche tant qu'aucun nouveau
  passage n'est pris.

Chaque action qui touche un passage prévient le chef de projet. Une action qui fait dépasser
la séance suit la règle du §4.

## 7. La page « Ordre du jour » (animer la séance)

Une page par séance, ouverte par un **lien permanent** placé dans l'invitation des membres
(l'invitation n'est jamais modifiée pour ajouter ou retirer un projet). Elle sert au président
à **animer la séance**.

- **En-tête** : comité, date, horaire, lien Teams, temps attribué / durée, avertissement de
  dépassement.
- **Un bloc par passage**, dans l'ordre, avec l'heure prévue et la durée :
  - nom du projet, chef de projet, invités ;
  - liens **« Enjeux du projet »** (synthèse) et **« Vitrine »** — la vitrine est le support de
    présentation ;
  - **experts déclenchés mis en avant** : équipes concernées, leurs contacts, l'état de leur avis ;
  - demande de temps en attente, le cas échéant.
- **Pendant la séance** : le passage en cours est mis en évidence d'après l'heure ; « ouvrir la
  vitrine » en un clic ; accès direct au bloc du comité de la synthèse pour saisir l'avis.
- **Commandes du président** : flèches de réorganisation, durée, déplacer, annuler, accepter /
  refuser une demande, ajouter un sujet hors projet, annuler la séance.
- **Présences** de la séance (§8).
- Les membres voient la même page sans les commandes.

## 8. Les présences

- **Seuls les membres du comité** ; trois états : **Présent / Excusé / Absent** (non renseigné
  par défaut). Président et co-président signalés par un badge.
- **Saisie par le président ou le co-président uniquement.**
- **Saisie une fois par séance** sur la page « Ordre du jour », appliquée à tous les projets de
  la séance ; **corrigeable projet par projet** (membre parti avant la fin). Bouton
  « Tous présents ».
- **Pas de quorum.**
- **Dans la synthèse**, bloc du comité, une ligne repliée :
  « Séance du 12/11 · 4 présents · 1 excusé · 1 absent › » avec les avatars des membres ; elle se
  déplie sur la liste des membres et leur sélecteur à trois états (pour le président). Le
  lecteur voit la ligne, sans pouvoir la modifier.

## 9. L'avis du comité

- Il reste saisi dans le projet, comme aujourd'hui (statut + commentaire du comité).
- Il est daté au moment où il est rendu (voir la correction de la date des avis).
- Il est **rattaché à la séance** où le projet est passé : « Avis rendu en séance du 12/11 ».
- Avec plusieurs passages, le bloc du comité affiche l'avis en cours et, repliée, la liste des
  passages précédents : date, présences, et l'avis rendu à l'issue de chacun (statut et
  commentaire tels qu'ils étaient alors), pour que le comité retrouve ce qu'il avait demandé.

## 10. Quand le projet ou la séance change

| Événement | Effet |
|---|---|
| Une modification du projet fait que le comité n'est plus déclenché | Le passage **n'est pas retiré en silence** : un bandeau le signale au chef de projet (questionnaire et enjeux), qui choisit de retirer son passage ou de corriger sa réponse. La confirmation vient juste après la modification, pas avant : intercepter chaque réponse du questionnaire avant son enregistrement automatique aurait touché tout le formulaire |
| Projet mis à la corbeille ou supprimé | Passage retiré automatiquement |
| Séance déplacée | Les inscrits sont prévenus ; leurs passages suivent la séance |
| Séance prolongée | Les inscrits et les membres sont prévenus |
| Séance annulée | Les inscrits sont prévenus, avec un lien pour se réinscrire ; leurs passages sont libérés |

## 11. Notifications et Outlook

### Mails (file `CN_NotificationsQueue` existante)

Les mails donnent la date et l'heure de la séance, **jamais le lien Teams ni la salle** : un mail
se transfère et son texte est conservé dans `CN_NotificationsQueue`. Ils renvoient à
l'invitation Outlook et à l'application pour savoir comment rejoindre. La vraie protection d'une
réunion reste ses options Teams (salle d'attente, qui peut la contourner).

| Destinataire | Quand |
|---|---|
| Président + co-président | Chaque inscription, désinscription, changement de séance, demande de temps |
| Chef de projet | Chaque action du président sur son passage ; séance déplacée, prolongée ou annulée |
| Chef de projet | Rappels **J-7 et J-1**, génériques : finaliser la vitrine et les questions |
| Président | Rappel de planification 4 semaines avant la dernière séance publiée |

### Invitations Outlook (Power Automate, boîte partagée organisatrice)

- **Séance publiée** → invitation Teams aux membres, avec le lien vers l'ordre du jour.
  Déplacée / prolongée → mise à jour ; annulée → annulation.
- **Passage** → le chef de projet et ses invités sont invités **sur toute la durée de la
  séance** (même lien Teams). Mise à jour uniquement si la séance bouge ou si les invités
  changent ; annulation si le passage est retiré. Changer l'ordre ou la durée d'un passage ne
  modifie **aucune** invitation : seule la page « Ordre du jour » change.
- **À tester** : ajouter le chef de projet directement à l'invitation de la séance par une mise
  à jour Graph limitée aux participants (seuls les ajoutés seraient prévenus d'après la
  documentation Microsoft, à confirmer) ; sinon, invitation séparée portant le même lien Teams.
- L'application n'envoie jamais de mail ni d'invitation elle-même : elle écrit des lignes que les
  flux traitent.

## 12. Données

### Configuration du comité (`validationCommitteeConfig`, `settings.json`)

Ajouts sur chaque comité : `presidentEmail`, `vicePresidentEmail`, `defaultPassageMinutes`
(20 par défaut).

### `CN_CommitteeSessions` — une ligne par séance

| Colonne | Type | Rôle |
|---|---|---|
| SessionId | Texte (clé) | Identifiant stable |
| CommitteeId | Texte | Comité |
| StartAt | Date et heure | Début |
| DurationMinutes | Nombre | Durée totale (prolongée en cas de dépassement) |
| Location | Texte | Lien Teams ou salle |
| Status | Texte | `draft` / `published` / `cancelled` |
| AgendaJson | Texte long (JSON) | Passages ordonnés (ci-dessous) |
| AttendanceJson | Texte long (JSON) | `{email: present|excused|absent}` de la séance |
| OutlookEventId | Texte | Écrit par le flux |
| RowVersion | Nombre | Concurrence optimiste |
| CreatedByEmail / UpdatedByEmail | Texte | Traçabilité |

Un passage dans `AgendaJson` : `{passageId, projectId, minutes, guests[], bookedBy, bookedAt,
timeRequest: {minutes, note, status, requestedAt, decidedBy, decidedAt}, remindersSent[]}`.

**Pourquoi l'ordre du jour dans la ligne de séance** : deux inscriptions simultanées doivent
être départagées sur le temps restant de *la séance*. Avec tout l'ordre du jour sur une seule
ligne versionnée (`RowVersion`, `ConflictError` comme pour les projets), la seconde écriture est
refusée, l'application relit et revérifie le temps restant. Volume faible (quelques passages par
séance), donc pas de contention réelle.

### `CN_CommitteeInvitations` — l'invitation Outlook de chaque passage (étape 2)

Une ligne par passage (`InvitationId` = `<séance>::<passage>`), qui décrit l'invitation **telle
qu'elle doit être** plutôt qu'une suite d'ordres : `Status` (`active`/`cancelled`), objet, texte,
`StartAt`/`EndAt` (toute la séance), `Location`, `Attendees` (porteur, co-porteurs, invités).
L'application incrémente `Revision` à chaque changement réel ; le flux réconcilie Outlook et écrit
`OutlookEventId`, `ProcessedRevision`, `SyncState`, `ErrorMessage`, `ProcessedAt`. Un état plutôt
qu'un ordre rend le flux rejouable sans dégât. L'application est seule à écrire
`CN_CommitteeSessions` ; le flux n'écrit que ses colonnes de cette liste. Logique :
`src/utils/committeeInvitations.js`.

### Dans le projet (`answers.__compliance_team_comments__.committees[id]`)

`sessionId` de la séance où l'avis en cours a été rendu, et `sessionOutcomes`
(`{[sessionId]: {status, comment, renderedAt}}`), l'avis figé à l'issue de chaque séance. Ils sont
posés quand l'avis est rendu ou repris pendant ou après un passage du projet
(`stampCommitteeOpinionSessions`). Côté SharePoint, ils voyagent dans `ClaimJson`, comme la date
de l'avis.

Tout le reste d'un passage vit dans la séance (`AgendaJson`), pas dans le projet : les
présences propres à un projet (`attendanceOverride`, seulement les écarts avec la séance) et la
demande de nouveau passage (`representationRequest`). L'historique des passages d'un projet est
donc relu sur les séances, et une seule écriture (celle de la séance) suffit au président.

### Mode local

Les séances vivent dans une tranche `committeeSessions` de `complianceNavigatorState` ; les
invitations ne sont pas produites (pas de flux).

## 13. Découpage

1. **Application** : configuration des comités (président, co-président, durée par défaut),
   planification des séances, inscription, actions du président, demandes de temps, page
   « Ordre du jour », présences, rattachement de l'avis à la séance, notifications par mail.
   Invitations Outlook encore manuelles.
2. **Flux des passages** : invitations des chefs de projet, mises à jour, annulations.
3. **Flux des séances** : invitations des membres (abandon de la série récurrente), réunion Teams
   créée par le flux quand la séance n'a pas de lieu — **fait côté application**, même liste et même
   flux que l'étape 2 (`Kind = members`). Les rappels planifiés côté serveur n'ont **pas** été faits :
   les rappels J-7/J-1 et de planification restent calculés dans l'application (ils partent quand
   une personne concernée l'ouvre), ce qui marche dans les deux modes et a été jugé suffisant.

## 14. Points ouverts

1. ~~Consultation par vagues~~ — tranché : inscription bloquée tant que le comité n'est pas
   sollicité (§5).
2. **Lecture des brouillons par les membres** : c'est une règle d'affichage ; vérifier que les
   droits de la liste des projets dans SharePoint permettent bien aux membres de lire ces
   éléments.
3. **Lien Teams partagé** entre l'invitation des membres et celle du chef de projet : à tester.
4. ~~Rappels avant l'étape 3~~ — tranché : en attendant le flux planifié, ils partent quand un
   utilisateur concerné ouvre l'application, comme les relances existantes.
