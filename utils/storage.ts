import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entry {
    id: string;
    date: string;
    amountSpent: number;
    grams?: number; // Optional for legacy data
    source: string;
    type: string;
    category: 'Food' | 'Transportation' | 'Shopping' | 'Entertainment' | 'Other';
    notes?: string;
}

const STORAGE_KEY = '@yonkistats_entries';

export const Storage = {
    async getEntries(): Promise<Entry[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load entries', e);
            return [];
        }
    },

    async addEntry(entry: Omit<Entry, 'id'>): Promise<Entry> {
        try {
            const entries = await this.getEntries();
            const newEntry = { ...entry, id: Date.now().toString() };
            const updatedEntries = [newEntry, ...entries];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
            return newEntry;
        } catch (e) {
            console.error('Failed to save entry', e);
            throw e;
        }
    },

    async updateEntry(entry: Entry): Promise<void> {
        try {
            const entries = await this.getEntries();
            const updatedEntries = entries.map(e => e.id === entry.id ? entry : e);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
        } catch (e) {
            console.error('Failed to update entry', e);
            throw e;
        }
    },

    async removeEntry(id: string): Promise<void> {
        try {
            const entries = await this.getEntries();
            const updatedEntries = entries.filter(e => e.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
        } catch (e) {
            console.error('Failed to remove entry', e);
            throw e;
        }
    },

    async clearEntries(): Promise<void> {
        try {
            await AsyncStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear entries', e);
        }
    },

    async getFavorites(): Promise<Entry[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEY + '_favorites');
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load favorites', e);
            return [];
        }
    },

    async addFavorite(entry: Omit<Entry, 'id' | 'date'>): Promise<Entry> {
        try {
            const favorites = await this.getFavorites();
            if (favorites.length >= 6) {
                throw new Error('Max favorites reached');
            }
            const newFavorite = { ...entry, id: Date.now().toString(), date: new Date().toISOString() }; // Date is just for type compatibility, not used for logic
            const updatedFavorites = [...favorites, newFavorite];
            await AsyncStorage.setItem(STORAGE_KEY + '_favorites', JSON.stringify(updatedFavorites));
            return newFavorite;
        } catch (e) {
            console.error('Failed to save favorite', e);
            throw e;
        }
    },

    async removeFavorite(id: string): Promise<void> {
        try {
            const favorites = await this.getFavorites();
            const updatedFavorites = favorites.filter(f => f.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY + '_favorites', JSON.stringify(updatedFavorites));
        } catch (e) {
            console.error('Failed to remove favorite', e);
            throw e;
        }
    },

    async exportData(): Promise<{ entries: Entry[], favorites: Entry[] }> {
        try {
            const entries = await this.getEntries();
            const favorites = await this.getFavorites();
            return {
                entries,
                favorites,
            };
        } catch (e) {
            console.error('Failed to export data', e);
            throw e;
        }
    },

    async importData(data: { entries: Entry[], favorites: Entry[] }): Promise<void> {
        try {
            // Validate data structure
            if (!data || !Array.isArray(data.entries) || !Array.isArray(data.favorites)) {
                throw new Error('Invalid data format');
            }

            // Validate entries have required fields
            const isValidEntry = (entry: any): entry is Entry => {
                return (
                    typeof entry.id === 'string' &&
                    typeof entry.date === 'string' &&
                    typeof entry.amountSpent === 'number' &&
                    typeof entry.grams === 'number' &&
                    typeof entry.source === 'string' &&
                    typeof entry.type === 'string' &&
                    ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Other'].includes(entry.category)
                );
            };

            const allEntriesValid = data.entries.every(isValidEntry);
            const allFavoritesValid = data.favorites.every(isValidEntry);

            if (!allEntriesValid || !allFavoritesValid) {
                throw new Error('Invalid entry format');
            }

            // Import data
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data.entries));
            await AsyncStorage.setItem(STORAGE_KEY + '_favorites', JSON.stringify(data.favorites));
        } catch (e) {
            console.error('Failed to import data', e);
            throw e;
        }
    }
};
