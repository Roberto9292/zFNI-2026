import {
  Component,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import DashboardComponent from './components/dashboard/dashboard.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [DashboardComponent, RouterOutlet],
  templateUrl: 'app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      // Esperamos a que Firebase resuelva la sesion: antes de eso "sin usuario"
      // es un falso negativo y nos mandaba a /login aunque hubiera sesion.
      if (!this.authService.isReady()) {
        return;
      }

      const user = this.authService.currentUser();
      const onLogin = this.router.url.startsWith('/login');

      if (!user && !onLogin) {
        this.router.navigate(['/login']);
      } else if (user && onLogin) {
        // Sin esto la URL se quedaba en /login mientras se veia el dashboard.
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
