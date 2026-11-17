# Project owner training — "Event sponsorship" variant: 50-minute run sheet

> **Who is this for?** The trainer running a hands-on session on Project Navigator.
> **The common thread:** LFB sponsors an event organised by a **patient association**. Each participant creates this project **from scratch**, written **in English**. It triggers the Ethics & Compliance team **and a validation committee**: the session shows how to choose a date for the committee presentation.
> **Format:** **everyone does it at the same time.** The trainer shares their screen and clicks; participants click at the same moment on their own computer. Two parts are shown by the trainer only (🎬).
> **Goal:** by the end, each project owner has created a sponsorship project, built its showcase, added a co-owner, requested validation and **registered the project for a committee session**.

**How to read this guide**

- 🖱 **Everyone:** the clicks to do together. Labels in "quotes" are the ones shown on screen, with the interface in English (appendix A gives the French equivalents).
- 🎬 **Trainer only:** a demonstration participants watch without clicking.
- ✅ **Checkpoint:** what everyone must see before moving on.
- 💬 **Say:** the key message, in one sentence, to say **while** participants are clicking.
- ⚠️ **Check:** something this guide cannot settle for you. Check it the day before.

---

## Timing

| Time | Step | Duration |
|---|---|---|
| 00:00 | [1. Sign in and profile](#1-sign-in-and-profile--3-min) | 3 min |
| 00:03 | [2. Create the sponsorship project](#2-create-the-sponsorship-project--10-min) | 10 min |
| 00:13 | [3. Build the showcase and add a block](#3-build-the-showcase-and-add-a-block--7-min) | 7 min |
| 00:20 | [4. Sticky notes (demonstration)](#4-sticky-notes-demonstration--3-min) | 3 min |
| 00:23 | [5. Read the project stakes](#5-read-the-project-stakes--3-min) | 3 min |
| 00:26 | [6. Add a co-owner](#6-add-a-co-owner--2-min) | 2 min |
| 00:28 | [7. Request validation](#7-request-validation--3-min) | 3 min |
| 00:31 | [8. Choose a date for the committee](#8-choose-a-date-for-the-committee--8-min) | 8 min |
| 00:39 | [9. Reply to compliance](#9-reply-to-compliance--3-min) | 3 min |
| 00:42 | [10. Request a committee that was not triggered (demonstration)](#10-request-a-committee-that-was-not-triggered-demonstration--4-min) | 4 min |
| 00:46 | [Wrap-up and questions](#wrap-up--4-min) | 4 min |

### Choices made to fit in 50 minutes

1. **Everyone creates their own project, from a sheet.** The "event sponsorship" path has only about fifteen questions. The English texts are provided in a sheet (appendix B), sent the day before: participants copy and paste them instead of writing them.
2. **The committee is a training committee.** It is only triggered on projects whose name contains `[TRAINING]`, and the trainer is its only member. The sessions offered are training sessions. No real committee and no real member is disturbed.
3. **No live expert.** For "Reply to compliance", participants answer the **"Points to prepare"** that the Ethics & Compliance team always asks on a sponsorship.
4. **The Power Automate flows are switched off during the session**: the notification flow **and** the committee Outlook invitation flow.

---

## Before the session (the day before)

| # | To prepare | Why |
|---|---|---|
| 1 | **A training committee.** Back-office, "Content" section, "Validation committees" tab, "Committee settings" section (collapsed by default, one click opens it). Check that "Enable committees" is ticked, then "Add a committee". "Committee name": `Training committee`. "Email addresses": **you only**. Set yourself as "Chair". Under "Trigger conditions", create a group with a single condition: "What is the project name?" · "Contient" (contains) · `[TRAINING]`. | Steps 5 and 8: the committee must be triggered on every training project, and on them only. You are the only member: nobody else receives the members' Outlook invitation when a session is published. |
| 2 | **The same committee, open to requests.** In its settings, "Triggered on the project owner’s request": tick "Open this committee to requests from the project owner". Under "Criteria to be able to request it", "Conditions on the answers": "What is the project name?" · "Contient" (contains) · `[DEMO]`. | Step 10: the committee can only be requested on your demonstration project. **Without a criterion, every project owner could request it on their real projects.** |
| 3 | **The length of a presentation.** Committee setting "Default presentation length (min)": **5**. | Each registration uses up this length (20 min by default). With 5 min, a 2-hour session takes 24 projects. |
| 4 | **Two published sessions, at least 4 days after the training.** Same tab, "Plan sessions": choose the committee, set "Duration (min)" to **120**, then enter a date and time under "Additional session" and click "Add" (twice, two different dates). Sessions are created as drafts: in the "Session calendar", click each date, then "Publish". | Step 8: a project owner only sees sessions that are **published**, at least **3 days ahead**, and that still have enough free time. The second session is used to show "Change session". |
| 5 | **A `[TRAINING]` test project**, created by you from the sheet in appendix B. Open its "Project stakes": the **Ethics & Compliance** team must be listed under "Teams involved", with "Points to prepare", and the **"Committee opinions"** section must show `Training committee` with the "Committee session" block. **Do not register it for any session.** Keep it for the demonstrations in steps 4 and 9. | Checks the whole chain the day before. It is also used for your sticky-note demonstration. |
| 6 | **A `[DEMO]` demonstration project.** Same sheet, named `[DEMO] Patient Webinar 2027`. Send it: "Request validation". Open its stakes: the "Request a committee" section must offer "Request the Training committee committee". **Do not click**: that is for step 10. | Step 10: a project the committee did not trigger, but for which the owner has the button to request it. The button only appears on a project that has already been sent. |
| 7 | **The sheet in appendix B**, sent to participants the day before (Teams or email). | Step 2: copy and paste rather than write. |
| 8 | **Pairs**, written down in advance. | Step 6: each participant adds their partner as co-owner. |
| 9 | **Power Automate flows switched off** just before the session: the notification flow and the committee Outlook invitation flow (step 5 quater of the SharePoint preparation document). | No email and no Outlook invitation leaves during the session. |

> ⚠️ **Check: your organisation's referential.** This guide follows the referential shipped with the application. In it, the path "Third-party project supported by LFB" → "Event sponsorship" triggers the rule "Sponsoring / partnership - Ethics & Compliance", hence the Ethics & Compliance team, with one point to prepare: "What are the benefits in return for us? How is this valuable for the company?". Your rules may have been changed since in the back-office: the test project (item 5) checks this.

> ⚠️ **Check: team names.** In the shipped referential, the team name is written in French only ("Éthique & Compliance"): it may still show in French with the interface in English. This depends on how the team is set up in your back-office.

> ⚠️ **Check: the conditions on the project name.** I checked in the application's code, with this exact setting, that a name containing `[TRAINING]` triggers the committee; that a name containing `[DEMO]` does not trigger it but allows it to be requested; that any other name does neither; and that upper/lower case does not matter. I have not tested it in your environment: that is what items 5 and 6 are for. In the back-office, the operator list ("Est égal à", "Contient"…) is shown in French even with the interface in English.

> ⚠️ **Check: clean up after the session, before switching the flows back on.**
> - **Outlook invitations.** Each registration writes a row in the SharePoint list `CN_CommitteeInvitations`. According to the preparation document, a "cancelled" row that never created an Outlook event triggers nothing on the flow side. The simplest is therefore to cancel the two training sessions ("Cancel the session" in the calendar) before switching the flow back on. Then check in the list that the training rows are in the cancelled state.
> - **Notifications.** The application keeps writing every notification to `CN_NotificationsQueue`: sends, replies, committee registrations (the chair is told about each registration) and session cancellations (each registered owner is told). I don't know whether your flow will process these items once switched back on: it depends on its trigger. Delete the items created during the session before switching it back on.
> - **The training committee.** Untick "Open this committee to requests from the project owner", or delete the committee.
> - **Training projects.** Trash icon on their card, then "Delete permanently" in the "Trash".

> ⚠️ **Check:** the address of the Project Navigator SharePoint page, to send to participants with the sheet: `______________________`.

---

## 1. Sign in and profile — 3 min

🖱 **Everyone:**
1. Open the Project Navigator SharePoint page.
2. "Welcome to Project Navigator" screen: tick your **activity scope**, then "Continue". On the next screen, click "No thanks, I'll explore on my own".
3. Top right, round "My profile" icon: check your scope and "Interface language" (English), then "Save".

✅ **Checkpoint:** everyone sees the home page with the "Create a project" button.

💬 **Say:** "Your activity scope adapts the questions you are asked."

> 💡 **French interface?** The interface can stay in French: the project itself is written in English either way. Appendix A gives the French labels.

---

## 2. Create the sponsorship project — 10 min

Open the sheet from appendix B next to the application.

🖱 **Everyone:**
1. Click "**Create a project**".
2. "What is the project name?": `[TRAINING] Rare Disease Day 2027 – Patient Forum – ` followed by your first name.
3. Answer the following questions from the sheet. The three answers that matter:
   - "What type of project is this?": "Third-party project supported by LFB";
   - "Can you specify the type of support involved?": "Event sponsorship", then "Other event support";
   - "Who is the support intended for?": "Non-profit organization or association".
4. Along the way, on a question that offers it, click "**Understand this question**".
5. Look at the **outline** on the left: the state of each question, and direct access to any of them.
6. On the last question, click "**View the project showcase**".

✅ **Checkpoint:** everyone is on the showcase of their project, with their own project name.

💬 **Say:** "These three answers are enough to bring up the right questions and involve the right experts. Everything is saved as you go: there is no "Save" button."

> ⚠️ **The word `[TRAINING]` must stay in the name**: it is what triggers the training committee. A participant who forgets it will not see the committee in step 5.

> 💡 **"I have a doubt"**, to mention: on an answer you are not sure of, you keep your answer and write what is missing to decide. It does not prevent asking for preliminary advice, but the doubt must be lifted before validation. For the training, don't use it: step 7 requests validation.

> 🆘 **A participant running late**: "Finish and view the showcase", at the bottom of the current question, goes straight to the showcase. Missing questions will be flagged in step 5.

---

## 3. Build the showcase and add a block — 7 min

🖱 **Everyone** (on the showcase of their project):
1. Click "**Edit**".
2. "**The project owner**" section: click in the text and paste the introduction of the association (sheet).
3. "**LFB’s role**" section: paste what LFB funds and what it excludes (sheet).
4. **Add a block**: hover over the space between "The project owner" and the next section, then click "**Add a section here**". Hover over the templates to see them rendered in place, then choose "**Featured figure**".
5. In the new block, replace the figure and the text with those from the sheet (`300` participants expected).
6. In the right-hand panel ("Selected section"), choose another colour for this block.
7. Press the **P** key ("Preview") to see the real rendering, then **P** again.
8. Click "**Publish**".

✅ **Checkpoint:** the indicator shows "Everything is published", and the "Featured figure" block is visible.

💬 **Say:**
- "A sponsorship does not have the same showcase as an LFB project: the tool offers a suitable template, with "The project owner" and "LFB’s role". That is the section experts read first."
- "You are not filling in a form: you are editing the showcase itself. Until you click "Publish", your changes remain a personal draft."

> 💡 The other templates offered: highlight block, multi-column block, media gallery, document viewer, narrative block, points of attention, card grid.

> ⚠️ **Check**: the titles "The project owner" and "LFB’s role" come from the showcase template "Third-party project supported by LFB", which administrators can edit (back-office, "Showcase" section). Check they have not been renamed in your environment.

---

## 4. Sticky notes (demonstration) — 3 min

🎬 **Trainer only**, on the showcase of your `[TRAINING]` test project:
1. Click "**Share**". Show "**Comments allowed**" and "**Copy the link**": this is the link you send to a colleague to get their feedback. Close the window.
2. Click "**Comment**": the "Annotation mode" banner appears. Click on the showcase: a sticky note is placed at that spot. Write a remark.
3. Show "**Reply**" and "**Close**" on the sticky note, then "**Pause**" in the banner, to click on the showcase without placing a sticky note.

💬 **Say:** "Sticky notes collect feedback before you even involve an expert: have your showcase reviewed by the association or by your management. On the home page, an "N comments" badge flags the sticky notes others have placed that you have not handled yet."

---

## 5. Read the project stakes — 3 min

🖱 **Everyone** (on the showcase of their project, outside edit mode):
1. Top bar: "**Project stakes**".
2. Top right, read "**Next step**": what is missing to ask for advice or validation. If a mandatory question is missing, it is listed there with a link: complete it.
3. Scroll down to "**Teams involved**": the **Ethics & Compliance** team. Expand its card: the risk "Sponsoring or partnership commitment", its mitigation, then the "**Points to prepare**".
4. Carry on to the "**Committee opinions**" section: `Training committee`, with the "**Committee session**" block.

✅ **Checkpoint:** everyone sees the committee under "Committee opinions".

💬 **Say:** "Sponsoring a patient association goes through a committee. The tool tells you right now: you can plan the date ahead rather than discover it at the last minute."

> 🆘 **No committee for a participant?** Check that their project name still contains `[TRAINING]` ("✎ Edit the answers", first question).

---

## 6. Add a co-owner — 2 min

🖱 **Everyone** (still on "Project stakes"):
1. At the top of the page, click "**Members (1)**": the page scrolls down to "**Project sharing**".
2. In the field, type your partner's name or address and select them.

✅ **Checkpoint:** the message "… added to the team." appears, the partner appears under the field, and the top button becomes "Members (2)". On the partner's home page, your project appears in their list.

💬 **Say:** "A co-owner finds the project in their list and can develop it with you. They are also invited to the committee sessions the project is registered for."

> 💡 The small cross next to a name removes them from the project.

---

## 7. Request validation — 3 min

🖱 **Everyone:**
1. In the "Next step" block, read the sentence "On sending, these teams will be notified: …".
2. Click "**Request validation**".

✅ **Checkpoint:** back on the home page, the message "Project submitted: … has been sent for review." appears, and the project card has moved to "Submitted projects".

💬 **Say:** "Sending does not freeze anything: you can still edit the project afterwards, and only the teams affected by your changes are told."

> 🆘 **"Request validation" is greyed out**: a mandatory question has no firm answer. The "Next step" block lists it with a link: just complete it.

> 💡 "Ask for preliminary advice" also exists, for a project still being shaped. With several perimeters (here a team and a committee), the tool then offers to consult only some of them first. A committee not yet requested cannot take a registration. For the training, we request validation: everyone is involved.

---

## 8. Choose a date for the committee — 8 min

This is the heart of this variant.

🖱 **Everyone:**
1. On your project card, "**View the stakes**". Scroll down to "**Committee opinions**", "**Committee session**" block. It says "The project is not registered for any session."
2. "**Choose a session**" list: the two training sessions, with their date and times. Choose the **first** one.
3. Read the sentence below: "You choose a session, not a time: the running order may change until the last moment."
4. Leave the "**People invited to the presentation**" field empty: your co-owner is already invited. This field is for people who are not project owners, for example a representative of the association.
5. Click "**Register the project**".

✅ **Checkpoint:** the message "Project registered." appears, and the block shows "**Next presentation (no. 1)**" with the date and the "Indicative time".

6. Read the indicative time: the project's position on the agenda and its length. Participants who register after you come after you.
7. **Change the date**: "**Change session**" list, choose the second session, then "**Move**".

✅ **Checkpoint:** the message "Presentation moved." appears, with the new date.

8. Click "**View the agenda**": you see your own presentation; the other agenda items are hidden ("Other passage").
9. Click "**All my committee passages**": the "My committee passages" page lists your upcoming and past presentations. It can also be reached from the calendar icon in the home page's top bar, and from "My profile".

💬 **Say:**
- "You book a whole session, not a slot: keep the whole session free in your calendar. The running order can change until the end."
- "Normally, registering sends an Outlook invitation for the session to you, your co-owners and your guests. Today the flow is off: the block shows "Outlook invitation being sent" and nothing leaves."
- "The committee chair is told about each registration; you are told if the session is moved or cancelled."

> 💡 **The other buttons in the block**, to mention without practising: "Guests" (change the guests), "**Ask for more time**" (extra minutes and a justification, sent to the chair and vice-chair), "**Unregister**".

> 💡 **Why are some sessions missing?** A project owner only sees sessions that are **published**, at least **3 days** before their date, and that still have at least one presentation length free. If none fits: "No session is open for registration at the moment." Only the chair, the vice-chair or an administrator plan sessions.

> 🆘 **"This session no longer has enough free time."** The session is full: have them choose the second one. For the next training, make the sessions longer or the presentation length shorter (preparation, item 3).

---

## 9. Reply to compliance — 3 min

🖱 **Everyone** (still on "Project stakes"):
1. Scroll back up to "**Teams involved**", **Ethics & Compliance** card. Read the box "**Points to prepare · what the Ethics & Compliance team will ask you**" again.
2. Under the team's thread, click in the "**Reply**" field and paste the answer from the sheet. Then "**Send reply**".

✅ **Checkpoint:** the reply appears in the team's thread.

💬 **Say:** "On a sponsorship, the expert will always ask what LFB gets in return, and why it is legitimate. Answer before they ask: you save a round trip."

> 💡 As long as no expert has taken the project in charge, your reply is not emailed to anyone: it waits in the team's queue, and the application says so under the field. That is expected.

---

## 10. Request a committee that was not triggered (demonstration) — 4 min

🎬 **Trainer only**, on your `[DEMO] Patient Webinar 2027` project, already sent:
1. Open its "**Project stakes**". Show that there is **no** "Committee opinions" section: no committee was triggered automatically.
2. Scroll down to the "**Request a committee**" section (expand it if it is collapsed): "**Committees you can request**" offers `Training committee`.
3. Click "**Request the Training committee committee**".
4. Show that the section becomes "**Committee opinions (1)**", with the "**Committee session**" block: the owner can now choose a date, exactly as in step 8. The "**Cancel the request**" button lets them go back.

💬 **Say:**
- "A committee is triggered automatically by its criteria. Some committees can also be requested by the project owner, even when nothing triggered them: if you think your project deserves their review, you decide."
- "Once requested, the committee counts as a triggered committee: if it requires a comment, the project will not be "Validated" until it has given its opinion."
- "Cancelling the request also frees the presentation already booked, after a confirmation."

> 💡 This button only appears on a project that has **already been sent**, for its owner or co-owners, and only for committees the back-office has opened to requests. If an owner does not see it, the committee is not open to requests, or the criteria set in the back-office are not met.

---

## Wrap-up — 4 min

```
Create the project → Showcase (the project owner, LFB's role, an extra block)
     → Sticky notes → Project stakes → Co-owner → Request validation
     → Choose a committee session → Reply to the points to prepare
     (→ Request a committee that was not triggered)
```

### Answers to frequent questions

- **"Do I choose my presentation time?"** No: a session. The time is indicative; keep the whole session free.
- **"The date no longer suits me."** "Change session" then "Move", or "Unregister".
- **"No session is offered."** Sessions open when the chair publishes them, and close 3 days before. Contact the committee chair.
- **"My presenter is not a project owner."** Add them under "People invited to the presentation": they receive the Outlook invitation.
- **"Once sent, is my project frozen?"** No. Edit the answers, then "Send the update": only the teams affected by the changes are told, and the committee presentation is kept.
- **"My project should go to a committee, but nothing was triggered."** Look at the "Request a committee" section of the stakes. If there is none, contact the committee chair.

### Going further (to mention)

- The "Inspiration" tab of the home page, to share a project seen elsewhere.
- The "Interactive guide", at the top of the home page, which replays the main journeys on a demonstration project.

### After the session

See the "clean up after the session" box in the preparation: cancel the two training sessions, empty `CN_NotificationsQueue`, check `CN_CommitteeInvitations`, close the committee to requests, delete the training projects, **then** switch the flows back on.

---

## Appendix A — Labels in English and French

To use if the interface is in French ("My profile" → "Interface language" → "Français").

| English | Français |
|---|---|
| My profile · Interface language | Mon profil · Langue de l’interface |
| Create a project | Créer un projet |
| Understand this question | Comprendre cette question |
| I have a doubt | J’ai un doute |
| Finish and view the showcase · View the project showcase | Terminer et voir la vitrine · Voir la vitrine du projet |
| Edit · Publish · Preview | Modifier · Publier · Aperçu |
| Add a section here · Featured figure · Selected section | Ajouter une section ici · Chiffre en avant · Section sélectionnée |
| The project owner · LFB’s role | Le porteur du projet · Le rôle de LFB |
| Share · Comments allowed · Copy the link | Partager · Commentaires possibles · Copier le lien |
| Comment · Pause · Close | Commenter · Mettre en pause · Clôturer |
| Project stakes · View the stakes | Enjeux du projet · Consulter les enjeux |
| Next step | Prochaine étape |
| Teams involved | Équipes concernées |
| Members (N) · Project sharing | Membres (N) · Partage du projet |
| Committee opinions | Avis Comité |
| Request validation · Ask for preliminary advice | Demander la validation · Demander un avis préliminaire |
| Submitted projects | Projets envoyés à la compliance |
| Committee session | Passage en séance |
| Choose a session | Choisir une séance |
| People invited to the presentation | Personnes invitées à la présentation |
| Register the project | Inscrire le projet |
| Next presentation (no. 1) | Prochain passage (n° 1) |
| Change session · Move | Changer de séance · Déplacer |
| Ask for more time · Unregister | Demander plus de temps · Se désinscrire |
| View the agenda | Voir l’ordre du jour |
| All my committee passages · My committee passages | Tous mes passages en comité · Mes passages en comité |
| Outlook invitation being sent | Invitation Outlook en cours d’envoi |
| Reply · Send reply | Répondre · Envoyer la réponse |
| Request a committee · Committees you can request · Cancel the request | Solliciter un comité · Comités que vous pouvez solliciter · Annuler la demande |
| ✎ Edit the answers · Send the update | ✎ Modifier les réponses · Envoyer la mise à jour |

Back-office (preparation):

| English | Français |
|---|---|
| Content · Validation committees · Committee settings | Contenu · Comités de validation · Configuration des comités |
| Enable committees · Add a committee | Activer les comités · Ajouter un comité |
| Committee name · Email addresses · Chair | Nom du comité · Adresses mail · Président(e) |
| Trigger conditions | Conditions de déclenchement |
| Triggered on the project owner’s request · Open this committee to requests from the project owner | Déclenchement à la demande du porteur · Ouvrir ce comité à la demande du porteur |
| Criteria to be able to request it · Conditions on the answers | Critères pour pouvoir le solliciter · Conditions sur les réponses |
| Default presentation length (min) | Durée d’un passage par défaut (min) |
| Plan sessions · Duration (min) · Additional session · Add | Planifier des séances · Durée (min) · Séance supplémentaire · Ajouter |
| Session calendar · Publish · Cancel the session | Calendrier des séances · Publier · Annuler la séance |
| Rules review | Revue des règles |

| Question (English) | Question (français) | Answer |
|---|---|---|
| What type of project is this? | De quel type de projet s’agit-il ? | Third-party project supported by LFB / Projet d’un tiers soutenu par LFB |
| Can you specify the type of support involved? | Pouvez-vous préciser le type de soutien dont il s’agit ? | Event sponsorship → Other event support / Parrainage d’événement → Autre soutien à un événement |
| Who is the support intended for? | À destination de qui porte le soutien ? | Non-profit organization or association / Association ou organisme à but non lucratif |

---

## Appendix B — The project sheet (to send to participants the day before)

Choice answers are clicked; free texts are copied and pasted as they are. The association and event names are fictitious.

| Question | Answer |
|---|---|
| What is the project name? | `[TRAINING] Rare Disease Day 2027 – Patient Forum – ` + your first name |
| Who is leading this project? | *(your name)* |
| Which team is the lead part of? | *(your team)* |
| Who are the members of the project team? | `Event lead – Marketing` · `Medical advisor – Medical affairs` · `Patient Voice France – partner association` |
| What type of project is this? | Third-party project supported by LFB |
| Can you specify the type of support involved? | Event sponsorship → Other event support |
| Describe what your project involves | `Patient Voice France, a patient association for people living with rare bleeding disorders, organises a one-day forum on Rare Disease Day 2027 in Lyon. About 300 patients, families and carers will attend talks and workshops on daily life with the disease. LFB sponsors the logistics of the event (venue and live streaming).` |
| How will you communicate about your project? | Via our partner |
| Who is the support intended for? | Non-profit organization or association |
| What is the estimated cost of the project? (in K€) | `15` |
| What are LFB's objectives behind this project? | `Support the patient community in a transparent way. Help patients and families access reliable information on their disease. LFB has no role in the content of the talks.` |
| What is the desired launch date? | *(date of the event, for example late February 2027)* |
| Would you like to share any other key information about this project? | `The association keeps full editorial independence. LFB's logo appears only on the list of sponsors.` |
| Other questions | optional: leave them empty |

**Showcase — "The project owner" section:**
`Patient Voice France is a patient association created in 2005 by families affected by rare bleeding disorders. It runs support groups, an information line and an annual patient forum.`

**Showcase — "LFB’s role" section:**
`LFB covers the venue rental and the live streaming of the forum (15 K€). LFB does not speak at the forum, does not choose the speakers and expects nothing in return.`

**Showcase — "Featured figure" block:**
figure `300`, text `patients, families and carers expected in Lyon`

**Reply to the point to prepare** ("What are the benefits in return for us? How is this valuable for the company?"):
`There is no commercial benefit in return: LFB's logo appears on the list of sponsors, nothing more. The value for LFB is to support the patient community and to be recognised as a transparent partner of patient associations.`
