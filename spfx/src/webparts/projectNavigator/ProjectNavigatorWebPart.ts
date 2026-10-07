import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import * as strings from 'ProjectNavigatorWebPartStrings';

export interface IProjectNavigatorWebPartProps {}

// Coquille de la phase 1 : le montage de l'application (src/main.jsx) arrive en phase 3.
export default class ProjectNavigatorWebPart extends BaseClientSideWebPart<IProjectNavigatorWebPartProps> {
  public render(): void {
    const placeholder = document.createElement('p');
    placeholder.textContent = strings.PlaceholderMessage;
    this.domElement.replaceChildren(placeholder);
  }

  protected onDispose(): void {
    this.domElement.replaceChildren();
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
