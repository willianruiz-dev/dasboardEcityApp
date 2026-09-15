import { Observable } from 'rxjs';

import type { Client, Load, Machine, MachineStorageLine, Office, Subscription, Tonnage } from '../models/machines.model';

/** Catálogo de máquinas y su situación física. Sólo lectura. */
export abstract class MachinesPort {
  abstract all(): Observable<Machine[]>;
  abstract byStatus(status: number): Observable<Machine[]>;
  /** Contenido actual del billete/moneda (`GET api/PayPad/GetStorage/{id}`). */
  abstract storage(idPayPad: number): Observable<MachineStorageLine[]>;
  abstract tonnages(idPayPad: number): Observable<Tonnage[]>;
  abstract loads(idPayPad: number): Observable<Load[]>;
  abstract subscriptions(idPayPad: number): Observable<Subscription[]>;
  abstract offices(): Observable<Office[]>;
  abstract clients(): Observable<Client[]>;
}
