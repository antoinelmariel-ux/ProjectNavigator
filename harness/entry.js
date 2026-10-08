// Harnais de dev : monte l'application hors SharePoint (fournisseurs mock), avec le même
// code et la même transformation que le web part SPFx. Sert aux tests e2e Playwright.
import { mountApp } from 'project-navigator-app';

mountApp(document.getElementById('root'));
