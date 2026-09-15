import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, map, startWith, switchMap } from 'rxjs';

import type { QueryState } from '../models/api.model';
import { ApiRequestError } from './api-error.model';

/**
 * Contenedor reactivo para "una consulta".
 * Expone señales `state/data/loading/error/isEmpty` y cancela la petición anterior
 * al recargar (crítico al cambiar de máquina rápido con 90 días de datos).
 */
export class Resource<T> {
  private readonly trigger$ = new Subject<void>();
  private readonly _state = signal<QueryState<T>>({
    status: 'idle',
    data: this.seed,
    error: null,
    empty: false,
    fetchedAt: null
  });

  readonly state = this._state.asReadonly();
  readonly data = computed(() => this._state().data);
  readonly loading = computed(() => this._state().status === 'loading');
  readonly failed = computed(() => this._state().status === 'error');
  readonly error = computed(() => this._state().error);
  readonly isEmpty = computed(() => this._state().empty);
  readonly fetchedAt = computed(() => this._state().fetchedAt);

  /**
   * @param fetcher se re-evalúa en cada recarga, así que puede leer señales de filtros vivas
   * @param isEmptyFrom decide si un payload vacío (404 / lista []) se muestra como "sin datos"
   */
  constructor(
    private readonly fetcher: () => Observable<T>,
    private readonly seed: T,
    destroyRef: DestroyRef,
    private readonly isEmptyFrom: (data: T) => boolean = isEmptyLike,
    autoLoad = true
  ) {
    const source$ = autoLoad ? this.trigger$.pipe(startWith(void 0 as void)) : this.trigger$;

    source$
      .pipe(
        switchMap(() => {
          this._state.update((s) => ({ ...s, status: 'loading' }));
          return this.fetcher().pipe(
            map((data) =>
              this._state.set({
                status: 'success',
                data,
                error: null,
                empty: this.isEmptyFrom(data),
                fetchedAt: Date.now()
              })
            ),
            catchError((err: unknown) => {
              const error = err instanceof ApiRequestError ? err : new ApiRequestError(String(err));
              this._state.set({
                status: 'error',
                data: this.seed,
                error: error.message,
                empty: error.notFound,
                fetchedAt: Date.now()
              });
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(destroyRef)
      )
      .subscribe();
  }

  reload(): void {
    this.trigger$.next();
  }

  /** Inyecta datos ya obtenidos por otra vía (p. ej. cacheado entre features). */
  patch(data: T): void {
    this._state.set({ status: 'success', data, error: null, empty: this.isEmptyFrom(data), fetchedAt: Date.now() });
  }
}

function isEmptyLike(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (value == null) return true;
  if (value instanceof Map) return value.size === 0;
  return false;
}
