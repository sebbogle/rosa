import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RecipeStore } from '../../recipe/recipe-store';

@Component({
  selector: 'app-tag-input',
  templateUrl: './tag-input.html',
  styleUrl: './tag-input.css',
})
export class TagInput {
  private readonly recipes = inject(RecipeStore);

  readonly tags = input.required<readonly string[]>();
  readonly changed = output<readonly string[]>();

  protected readonly query = signal('');

  protected readonly highlighted = signal(-1);

  protected readonly focused = signal(false);

  protected readonly suggestions = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (query === '') return [];

    const already = new Set(this.tags());
    return this.recipes
      .vocabulary()
      .filter((tag) => !already.has(tag) && tag.toLowerCase().includes(query));
  });

  readonly listing = computed(() => this.focused() && this.suggestions().length > 0);

  protected type(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.highlighted.set(-1);
  }

  protected key(event: KeyboardEvent): void {
    const suggestions = this.suggestions();

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.commit(suggestions[this.highlighted()] ?? this.query());
        return;

      case 'ArrowDown':
        event.preventDefault();
        this.highlighted.update((at) => (at + 1 < suggestions.length ? at + 1 : -1));
        return;

      case 'ArrowUp':
        event.preventDefault();
        this.highlighted.update((at) => (at > -1 ? at - 1 : suggestions.length - 1));
        return;

      case 'Escape':
        if (this.query() === '') return;
        event.preventDefault();
        this.query.set('');
        this.highlighted.set(-1);
        return;

      case 'Backspace':
        if (this.query() === '' && this.tags().length) {
          this.changed.emit(this.tags().slice(0, -1));
        }
        return;
    }
  }

  protected pick(tag: string): void {
    this.commit(tag);
  }

  protected remove(tag: string): void {
    this.changed.emit(this.tags().filter((held) => held !== tag));
  }

  private commit(tag: string): void {
    const trimmed = tag.trim();
    this.query.set('');
    this.highlighted.set(-1);
    if (trimmed === '' || this.tags().includes(trimmed)) return;
    this.changed.emit([...this.tags(), trimmed]);
  }
}
