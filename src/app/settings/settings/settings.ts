import { Component, computed, inject } from '@angular/core';
import { DriveService } from '../../drive/drive-service';
import { Sheet } from '../../shell/sheet/sheet';
import { AppearanceSection } from '../appearance-section/appearance-section';
import { DriveSection } from '../drive-section/drive-section';
import { ExportPicker } from '../export-picker/export-picker';
import { ImportControl } from '../import-control/import-control';
import { SettingsSheet } from '../settings-sheet';

@Component({
  selector: 'app-settings',
  imports: [AppearanceSection, DriveSection, ExportPicker, ImportControl, Sheet],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly settings = inject(SettingsSheet);

  protected readonly drive = inject(DriveService).available;

  protected readonly shown = computed(() => this.settings.open() || undefined);

  protected close(): void {
    this.settings.hide();
  }
}
