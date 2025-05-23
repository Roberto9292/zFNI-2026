import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'xfnigo',
        appId: '1:47006498418:web:a26eb47056b1e083984ceb',
        storageBucket: 'xfnigo.firebasestorage.app',
        apiKey: 'AIzaSyCrgfT5_AsQ-n6D83BmyO0qa6PasaK0AIQ',
        authDomain: 'xfnigo.firebaseapp.com',
        messagingSenderId: '47006498418',
        measurementId: 'G-KYZK941MME',
      })
    ),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    ScreenTrackingService,
    UserTrackingService,
    provideFirestore(() => getFirestore()),
  ],
};
