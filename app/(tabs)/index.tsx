import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Dimensions, Alert, Animated } from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useRef } from 'react';
import { Colors } from '../../constants/Colors';
import { Storage, Entry } from '../../utils/storage';
import Heatmap from '../../components/Heatmap';
import HistoryItem from '../../components/HistoryItem';
import DayDetailModal from '../../components/DayDetailModal';
import { FadeInView } from '../../components/FadeInView';
import { StaggeredFadeInView } from '../../components/StaggeredFadeInView';

export default function Dashboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [favorites, setFavorites] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayEntries, setSelectedDayEntries] = useState<Entry[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);

  // Animation control
  const [viewKey, setViewKey] = useState(0);
  const isNavigatingInternal = useRef(false);

  const loadData = async () => {
    const data = await Storage.getEntries();
    const favs = await Storage.getFavorites();
    setEntries(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setFavorites(favs);
  };

  useFocusEffect(
    useCallback(() => {
      // If we are NOT returning from an internal navigation (like Add/Edit),
      // we assume it's a tab switch or initial load, so we trigger animation.
      if (!isNavigatingInternal.current) {
        setViewKey(k => k + 1);
      }
      // Reset the flag
      isNavigatingInternal.current = false;

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
      `Add entry for ${favorite.amountSpent.toFixed(2).replace('.', ',')} € (${favorite.grams}g)?`,
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
  const totalGrams = entries.filter(e => e.category === 'Weed').reduce((sum, e) => sum + e.grams, 0);

  const now = new Date();
  const firstEntryDate = entries.length > 0 ? new Date(entries[entries.length - 1].date) : now;
  const monthsDiff = (now.getFullYear() - firstEntryDate.getFullYear()) * 12 + (now.getMonth() - firstEntryDate.getMonth()) + 1;
  const avgMonthlySpend = totalSpent / (monthsDiff || 1);

  const headerComponent = (
    <View style={styles.headerContainer}>
      <StaggeredFadeInView key={`greet-${viewKey}`} delay={0}>
        <Text style={styles.greeting}>Welcome Back</Text>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`stats-${viewKey}`} delay={50}>
        <View style={styles.statsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Spent</Text>
            <Text style={styles.cardValue}>{totalSpent.toFixed(2).replace('.', ',')} €</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Grams</Text>
            <Text style={styles.cardValue}>{totalGrams.toFixed(1).replace('.', ',')}g</Text>
          </View>
        </View>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`avg-${viewKey}`} delay={100}>
        <View style={styles.fullCard}>
          <Text style={styles.cardLabel}>Avg Monthly Spend</Text>
          <Text style={styles.cardValue}>{avgMonthlySpend.toFixed(2).replace('.', ',')} €</Text>
        </View>
      </StaggeredFadeInView>

      {favorites.length > 0 && (
        <StaggeredFadeInView key={`favs-${viewKey}`} delay={150}>
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
                  <Text style={styles.favoriteButtonSubtext}>{fav.amountSpent.toFixed(2).replace('.', ',')} €</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        </StaggeredFadeInView>
      )}

      <StaggeredFadeInView key={`cal-title-${viewKey}`} delay={favorites.length > 0 ? 200 : 150}>
        <Text style={styles.sectionTitle}>Activity Calendar</Text>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`cal-${viewKey}`} delay={favorites.length > 0 ? 250 : 200}>
        <View style={styles.chartCard}>
          <Heatmap
            entries={entries}
            numDays={91}
            onDayPress={(date, dayEntries, position) => {
              setSelectedDate(date);
              setSelectedDayEntries(dayEntries);
              setSelectedPosition(position);
            }}
          />
        </View>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`hist-title-${viewKey}`} delay={favorites.length > 0 ? 300 : 250}>
        <Text style={styles.sectionTitle}>Recent History</Text>
      </StaggeredFadeInView>
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

  const handleEditEntry = (entry: Entry) => {
    // Close modal if open
    setSelectedDate(null);
    setSelectedDayEntries([]);
    setSelectedPosition(null);

    isNavigatingInternal.current = true;
    router.push({
      pathname: '/add',
      params: { editEntry: JSON.stringify(entry) }
    });
  };

  const renderItem = ({ item }: { item: Entry }) => (
    <HistoryItem item={item} onDelete={handleDelete} onPress={() => handleEditEntry(item)} />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No entries yet. Start tracking!</Text>
        }
      />

      <DayDetailModal
        visible={selectedDate !== null}
        date={selectedDate}
        entries={selectedDayEntries}
        position={selectedPosition}
        onClose={() => {
          setSelectedDate(null);
          setSelectedDayEntries([]);
          setSelectedPosition(null);
        }}
        onDeleteEntry={handleDelete}
        onEditEntry={handleEditEntry}
      />

      <Link href="/add" asChild>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            isNavigatingInternal.current = true;
            router.push('/add');
          }}
        >
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
