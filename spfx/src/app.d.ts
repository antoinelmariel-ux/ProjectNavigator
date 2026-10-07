// Point d'entrée de l'application (../src/main.jsx), résolu par l'alias webpack déclaré dans
// config/app-webpack-rules.js : TypeScript ne compile pas les .jsx de l'application.
declare module 'project-navigator-app' {
  export function mountApp(rootElement: HTMLElement): Promise<void>;
  export function unmountApp(rootElement: HTMLElement): void;
}
