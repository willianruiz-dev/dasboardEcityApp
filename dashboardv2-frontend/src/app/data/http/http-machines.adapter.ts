import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from '../../core/http/api-client.service';
import { ApiPath } from '../../core/config/api-paths';
import { MachinesPort } from '../../core/ports/machines.port';
import type { Client, Load, Machine, MachineStorageLine, Office, Subscription, Tonnage } from '../../core/models/machines.model';

/** Adapter real: `PayPadController` + `TonnageController` + `LoadController` + `ClientController`. */
@Injectable({ providedIn: 'root' })
export class HttpMachinesAdapter extends MachinesPort {
  private readonly api = inject(ApiClientService);

  override all(): Observable<Machine[]> {
    return this.api.get<Machine[]>(ApiPath.payPad.all, { emptyValue: [] });
  }

  override byStatus(status: number): Observable<Machine[]> {
    return this.api.get<Machine[]>(ApiPath.payPad.byStatus(status), { emptyValue: [] });
  }

  override storage(idPayPad: number): Observable<MachineStorageLine[]> {
    return this.api.get<MachineStorageLine[]>(ApiPath.payPad.storage(idPayPad), { emptyValue: [] });
  }

  override tonnages(idPayPad: number): Observable<Tonnage[]> {
    return this.api.get<Tonnage[]>(ApiPath.tonnage.byMachine(idPayPad), { emptyValue: [] });
  }

  override loads(idPayPad: number): Observable<Load[]> {
    return this.api.get<Load[]>(ApiPath.load.byMachine(idPayPad), { emptyValue: [] });
  }

  override subscriptions(idPayPad: number): Observable<Subscription[]> {
    return this.api.get<Subscription[]>(ApiPath.alerts.byMachine(idPayPad), { emptyValue: [] });
  }

  override offices(): Observable<Office[]> {
    return this.api.get<Office[]>(ApiPath.office.all, { emptyValue: [] });
  }

  override clients(): Observable<Client[]> {
    return this.api.get<Client[]>(ApiPath.client.all, { emptyValue: [] });
  }
}
