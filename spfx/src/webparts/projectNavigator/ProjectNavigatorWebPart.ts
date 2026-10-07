import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { mountApp, unmountApp } from 'project-navigator-app';

export interface IProjectNavigatorWebPartProps {}

export default class ProjectNavigatorWebPart extends BaseClientSideWebPart<IProjectNavigatorWebPartProps> {
  private _mounted: boolean = false;

  public render(): void {
    if (this._mounted) {
      return;
    }
    this._mounted = true;
    mountApp(this.domElement).catch((error: unknown) => {
      console.error('Project Navigator : montage impossible.', error);
    });
  }

  protected onDispose(): void {
    unmountApp(this.domElement);
    this._mounted = false;
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
