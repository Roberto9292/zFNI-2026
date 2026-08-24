import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { AuthService } from './core/services/auth.service';
import { LocationService } from './core/services/location.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    AuthService,
    LocationService,
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'fni-2026',
        appId: '1:130881664428:web:6f094309e1e7b83d26b609',
        storageBucket: 'fni-2026.firebasestorage.app',
        apiKey: 'AIzaSyAF5Yo4zV41Sl_3g1tC3ffEYP6VNVu7ycU',
        authDomain: 'fni-2026.firebaseapp.com',
        messagingSenderId: '130881664428',
        measurementId: 'G-LJWFGGN3JF',
      })
    ),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => getFirestore()),
  ],
};
