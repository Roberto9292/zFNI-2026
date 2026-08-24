import {
  Injectable,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from '@angular/fire/firestore';
import { Location } from '../models/location.interface';
import { AuthService } from './auth.service';

@Injectable()
export class LocationService {
  private firestore = inject(Firestore);

  locations = signal<Location[]>([]);

  isLoading = signal(false);

  private auth = inject(AuthService);

  private unsubscribe: Unsubscribe | null = null;

  private listeningAs: string | null = null;

  constructor() {
    // El servicio vive a nivel de app, asi que no puede atarse al ciclo de vida
    // de un componente: sigue la sesion. Al cerrarla las reglas cortan el
    // listener, y al volver a entrar hay que reabrirlo o el mapa queda vacio.
    effect(() => {
      const uid = this.auth.currentUser()?.uid ?? null;
      if (uid === this.listeningAs) {
        return;
      }
      this.listeningAs = uid;

      if (uid) {
        this.setupRealtimeListener();
      } else {
        this.stopRealtimeListener();
        this.locations.set([]);
      }
    });

    inject(DestroyRef).onDestroy(() => this.stopRealtimeListener());
  }

  public setupRealtimeListener(): void {
    this.stopRealtimeListener();

    const locationsRef = collection(this.firestore, 'locations');
    const allLocationsQuery = query(locationsRef, orderBy('subject', 'desc'));

    this.unsubscribe = onSnapshot(
      allLocationsQuery,
      (snapshot) => {
        const locations: Location[] = [];
        snapshot.forEach((doc) => {
          locations.push({ id: doc.id, ...doc.data() } as Location);
        });
        this.locations.set(locations);
      },
      // Al cerrar sesión las reglas cortan el listener: lo damos de baja sin
      // ruido. Reabrirlo es responsabilidad del effect de arriba.
      () => {
        this.locations.set([]);
        this.unsubscribe = null;
        this.listeningAs = null;
      }
    );
  }

  private stopRealtimeListener(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  async addLocation(location: Location): Promise<void> {
    this.isLoading.set(true);
    try {
      const locationsRef = collection(this.firestore, 'locations');
      await addDoc(locationsRef, location);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateLocation(id: string, location: Partial<Location>): Promise<void> {
    this.isLoading.set(true);
    try {
      const locationRef = doc(this.firestore, `locations/${id}`);
      await updateDoc(locationRef, location);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteLocation(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const locationRef = doc(this.firestore, `locations/${id}`);
      await deleteDoc(locationRef);
    } finally {
      this.isLoading.set(false);
    }
  }
}
