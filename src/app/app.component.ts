import {
  Component,
  inject,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { LocationFormComponent } from './components/location-form/location-form.component';
import { MapViewComponent } from './components/map-view/map-view.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    MatTabsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    LocationFormComponent,
    MapViewComponent,
    RouterOutlet,
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AuthService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  async onSignOut(): Promise<void> {
    await this.authService.signOut();
  }
}
