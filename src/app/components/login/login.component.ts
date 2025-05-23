import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AuthService],
})
export default class LoginComponent {
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  isLoginMode = signal(true);
  hidePassword = signal(true);

  loginForm: FormGroup;
  signupForm: FormGroup;

  constructor() {
    if (this.authService.currentUser()) {
      this.router.navigate(['/dashboard']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.signupForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      return { passwordMismatch: true };
    }
    return null;
  }

  toggleMode(): void {
    this.isLoginMode.set(!this.isLoginMode());
    this.resetForms();
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  async onEmailLogin(): Promise<void> {
    if (this.loginForm.valid) {
      try {
        const { email, password } = this.loginForm.value;
        await this.authService.signInWithEmail(email, password);
        this.snackBar.open('Inicio de sesión exitoso', 'Cerrar', {
          duration: 3000,
        });
      } catch (error: any) {
        this.snackBar.open(error.message, 'Cerrar', {
          duration: 5000,
        });
      }
    }
  }

  async onEmailSignup(): Promise<void> {
    if (this.signupForm.valid) {
      try {
        const { email, password } = this.signupForm.value;
        await this.authService.signUpWithEmail(email, password);

        this.snackBar.open('Registro exitoso', 'Cerrar', {
          duration: 3000,
        });
      } catch (error: any) {
        this.snackBar.open(error.message, 'Cerrar', {
          duration: 5000,
        });
      }
    }
  }

  async onGoogleSignIn(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();

      this.snackBar.open('Inicio de sesión con Google exitoso', 'Cerrar', {
        duration: 3000,
      });
    } catch (error: any) {
      this.snackBar.open(error.message, 'Cerrar', {
        duration: 5000,
      });
    }
  }

  private resetForms(): void {
    this.loginForm.reset();
    this.signupForm.reset();
  }
}
