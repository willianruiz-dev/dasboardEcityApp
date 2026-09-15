import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface SelectOption<T = number> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Select accesible y con señales (`value = model()` → `[(value)]`).
 * Se usa para máquina / estado / rol en los filtros de consulta.
 */
@Component({
  selector: 'ui-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block">
      @if (label()) {
        <span class="label">{{ label() }}</span>
      }
      <div class="relative">
        <select
          class="field appearance-none pr-9"
          [value]="asString()"
          [disabled]="disabled()"
          (change)="onPick($any($event.target).value)"
          [attr.aria-label]="label() ?? 'Seleccionar'"
        >
          @if (placeholder()) {
            <option [value]="''">{{ placeholder() }}</option>
          }
          @for (option of options(); track trackBy(option)) {
            <option [value]="stringify(option.value)">{{ option.label }}</option>
          }
        </select>
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      @if (hint()) {
        <span class="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{{ hint() }}</span>
      }
    </label>
  `
})
export class SelectComponent<T> {
  readonly options = input<readonly SelectOption<T>[]>([]);
  readonly value = model<T | null>(null);
  readonly label = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly disabled = input(false);

  protected readonly asString = computed(() => (this.value() == null ? '' : this.stringify(this.value())));

  protected stringify(value: T | null): string {
    return value == null ? '' : String(value);
  }

  protected trackBy(option: SelectOption<T>): string {
    return this.stringify(option.value);
  }

  protected onPick(raw: string): void {
    const match = this.options().find((option) => this.stringify(option.value) === raw);
    this.value.set(match ? match.value : (null as T | null));
  }
}
