import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { User } from '../models/user.interface';

@Injectable()
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);
  private googleProvider = new GoogleAuthProvider();

  currentUser = signal<User | null>(null);

  isLoading = signal(false);

  constructor() {
    this.googleProvider.addScope('profile');
    this.googleProvider.addScope('email');

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.currentUser.set(this.mapFirebaseUser(user));
      } else {
        this.currentUser.set(null);
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await createUserWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    try {
      await signInWithPopup(this.auth, this.googleProvider);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      throw this.handleAuthError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  private mapFirebaseUser(user: FirebaseUser): User {
    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      emailVerified: user.emailVerified,
    };
  }

  private handleAuthError(error: any): Error {
    let message = 'Error de autenticación';

    switch (error.code) {
      case 'auth/user-not-found':
        message = 'Usuario no encontrado';
        break;
      case 'auth/wrong-password':
        message = 'Contraseña incorrecta';
        break;
      case 'auth/email-already-in-use':
        message = 'El email ya está en uso';
        break;
      case 'auth/weak-password':
        message = 'La contraseña es muy débil';
        break;
      case 'auth/invalid-email':
        message = 'Email inválido';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Ventana de autenticación cerrada';
        break;
      default:
        message = error.message || 'Error desconocido';
    }

    return new Error(message);
  }
}
