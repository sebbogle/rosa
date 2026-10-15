import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { sidebarWidth } from './app/contents/sidebar-width';
import { appearance } from './app/shell/appearance';
import { dividerFraction } from './app/shell/divider/divider';
import { restoreMeasures } from './app/shell/measure';

function unopenable(error: unknown): void {
  console.error(error);
  const root = document.querySelector('app-root');
  if (root) root.textContent = 'rosa cannot open your cookbook on this device.';
}

restoreMeasures(sidebarWidth, dividerFraction, appearance);

bootstrapApplication(App, appConfig).catch(unopenable);
