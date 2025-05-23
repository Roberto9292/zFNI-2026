import { Injectable, inject, signal } from '@angular/core';
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
} from '@angular/fire/firestore';
import { Location } from '../models/location.interface';

@Injectable()
export class LocationService {
  private firestore = inject(Firestore);

  locations = signal<Location[]>([]);

  isLoading = signal(false);

  constructor() {
    this.setupRealtimeListener();
  }

  public setupRealtimeListener(): void {
    const locationsRef = collection(this.firestore, 'locations');
    const allLocationsQuery = query(locationsRef, orderBy('subject', 'desc'));

    onSnapshot(allLocationsQuery, (snapshot) => {
      const locations: Location[] = [];
      snapshot.forEach((doc) => {
        locations.push({ id: doc.id, ...doc.data() } as Location);
      });
      this.locations.set(locations);
    });
  }

  refreshListener(): void {
    this.setupRealtimeListener();
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
