import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions, Alert, Animated } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Colors } from '../../constants/Colors';
import { Storage, Entry } from '../../utils/storage';
import Heatmap from '../../components/Heatmap';
import HistoryItem from '../../components/HistoryItem';

export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [favorites, setFavorites] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const data = await Storage.getEntries();
    const favs = await Storage.getFavorites();
    setEntries(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setFavorites(favs);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAdd = (favorite: Entry) => {
    Alert.alert(
      'Quick Add',
      `Add entry for ${favorite.amountSpent} (${favorite.grams}g)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            try {
              await Storage.addEntry({
                ...favorite,
                date: new Date().toISOString(),
              });
              await loadData();
              Alert.alert('Success', 'Entry added!');
            } catch (e) {
              Alert.alert('Error', 'Failed to add entry');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFavorite = (favorite: Entry) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this favorite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await Storage.removeFavorite(favorite.id);
              await loadData();
            } catch (e) {
              Alert.alert('Error', 'Failed to remove favorite');
            }
          },
        },
      ]
    );
  };

  const totalSpent = entries.reduce((sum, e) => sum + e.amountSpent, 0);
  const totalGrams = entries.reduce((sum, e) => sum + e.grams, 0);

  const now = new Date();
  const firstEntryDate = entries.length > 0 ? new Date(entries[entries.length - 1].date) : now;
  const monthsDiff = (now.getFullYear() - firstEntryDate.getFullYear()) * 12 + (now.getMonth() - firstEntryDate.getMonth()) + 1;
  const avgMonthlySpend = totalSpent / (monthsDiff || 1);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.greeting}>Welcome Back</Text>

      <View style={styles.statsRow}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Spent</Text>
          <Text style={styles.cardValue}>${totalSpent.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Grams</Text>
          <Text style={styles.cardValue}>{totalGrams.toFixed(1)}g</Text>
        </View>
      </View>
      <View style={styles.fullCard}>
        <Text style={styles.cardLabel}>Avg Monthly Spend</Text>
        <Text style={styles.cardValue}>${avgMonthlySpend.toFixed(2)}</Text>
      </View>

      {favorites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Favorites</Text>
          <View style={styles.favoritesContainer}>
            {favorites.map((fav) => (
              <TouchableOpacity
                key={fav.id}
                style={styles.favoriteButton}
                onPress={() => handleQuickAdd(fav)}
                onLongPress={() => handleRemoveFavorite(fav)}
              >
                <Text style={styles.favoriteButtonText}>{fav.type}</Text>
                <Text style={styles.favoriteButtonSubtext}>${fav.amountSpent}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Activity Calendar</Text>
      <View style={styles.chartCard}>
        <Heatmap entries={entries} numDays={91} />
      </View>

      <Text style={styles.sectionTitle}>Recent History</Text>
    </View>
  );

  const handleDelete = async (id: string) => {
    try {
      await Storage.removeEntry(id);
      await loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete entry');
    }
  };

  const renderItem = ({ item }: { item: Entry }) => (
    <HistoryItem item={item} onDelete={handleDelete} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No entries yet. Start tracking!</Text>
        }
      />

      <Link href="/add" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 20,
    paddingTop: 20, // Add some top padding since we hid the header
  },
  greeting: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  chartCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  cardValue: {
    color: Colors.dark.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  favoritesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  favoriteButton: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 12,
    width: '31%', // Approx 3 per row with gap
    borderWidth: 1,
    borderColor: '#FFD700',
    alignItems: 'center',
  },
  favoriteButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  favoriteButtonSubtext: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: Colors.dark.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: '#000',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
