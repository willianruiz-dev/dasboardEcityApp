import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticationService } from '../../../core/services/authentication.service';
import { AppConfigService } from '../../../core/config/app-config.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * Login contra `POST api/Auth/Login`.
 *
 * La contraseña se cifra con la clave pública RSA del backend antes de salir del
 * navegador (nunca viaja en claro) y el `DashboardKeyId` lo inyecta el interceptor.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly authentication = inject(AuthenticationService);
  private readonly router = inject(Router);
  protected readonly config = inject(AppConfigService);

  protected readonly userName = signal('');
  protected readonly password = signal('');
  protected readonly showPwd = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSubmit = computed(() => !this.busy() && this.userName().trim().length > 1 && this.password().length > 0);

  protected readonly isMock = computed(() => this.config.dataProvider() === 'mock');

  protected readonly demos: readonly string[] = ['lruiz', 'cperez', 'sdiaz', 'aestrada', 'nvargas'];

  /** Submit nativo del <form>: sin FormsModule, `(ngSubmit)` no existiría. */
  protected onSubmit(event: Event): void {
    event.preventDefault();
    void this.submit();
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);

    const outcome = await this.authentication.login(this.userName(), this.password());
    this.busy.set(false);

    if (!outcome.ok) {
      this.error.set(outcome.message);
      return;
    }
    await this.router.navigate(['/dashboard']);
  }

  protected useDemo(user: string): void {
    this.userName.set(user);
    this.password.set('demo1234');
  }
}
