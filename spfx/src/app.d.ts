// Point d'entrée de l'application (../src/main.jsx), résolu par l'alias webpack déclaré dans
// config/app-webpack-rules.js : TypeScript ne compile pas les .jsx de l'application.
declare module 'project-navigator-app' {
  export interface IMountOptions {
    webAbsoluteUrl?: string;
    user?: { email?: string; displayName?: string; loginName?: string };
    cultureName?: string;
  }
  export function mountApp(rootElement: HTMLElement, options?: IMountOptions): Promise<void>;
  export function unmountApp(rootElement: HTMLElement): void;
}
