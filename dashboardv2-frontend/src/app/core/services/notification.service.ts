import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
  timeoutMs: number;
}

/** Canal único de feedback al usuario (éxito, errores de API, bloqueos de solo lectura). */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  push(kind: ToastKind, title: string, detail?: string, timeoutMs = kind === 'error' ? 9000 : 4500): number {
    const id = this.nextId++;
    this._toasts.update((list) => [...list.slice(-3), { id, kind, title, detail, timeoutMs }]);
    if (timeoutMs > 0) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), timeoutMs)
      );
    }
    return id;
  }

  error(title: string, detail?: string): number {
    return this.push('error', title, detail);
  }

  success(title: string, detail?: string): number {
    return this.push('success', title, detail);
  }

  warn(title: string, detail?: string): number {
    return this.push('warning', title, detail);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    [...this.timers.keys()].forEach((id) => this.dismiss(id));
    this._toasts.set([]);
  }
}
