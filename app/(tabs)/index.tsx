import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DayDetailModal from '../../components/DayDetailModal';
import Heatmap from '../../components/Heatmap';
import HistoryItem from '../../components/HistoryItem';
import { StaggeredFadeInView } from '../../components/StaggeredFadeInView';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColor } from '../../context/ThemeContext';
import { Entry, Storage } from '../../utils/storage';

export default function Dashboard() {
  const router = useRouter();
  const { i18n } = useLanguage();
  const { primaryColor } = useThemeColor();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [favorites, setFavorites] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayEntries, setSelectedDayEntries] = useState<Entry[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null);

  // Pagination control
  const [displayedCount, setDisplayedCount] = useState(25);
  const LOAD_MORE_COUNT = 25;

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
    setDisplayedCount(25); // Reset pagination on refresh
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAdd = (favorite: Entry) => {
    Alert.alert(
      i18n.t('dashboard.quickAdd'),
      `${i18n.t('dashboard.quickAddConfirm')} ${favorite.amountSpent.toFixed(2).replace('.', ',')} €?`,
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.add'),
          onPress: async () => {
            try {
              await Storage.addEntry({
                ...favorite,
                date: new Date().toISOString(),
              });
              await loadData();
            } catch (e) {
              Alert.alert(i18n.t('common.error'), i18n.t('dashboard.failedToAdd'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveFavorite = (favorite: Entry) => {
    Alert.alert(
      i18n.t('dashboard.removeFavorite'),
      i18n.t('dashboard.removeFavoriteConfirm'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Storage.removeFavorite(favorite.id);
              await loadData();
            } catch (e) {
              Alert.alert(i18n.t('common.error'), i18n.t('dashboard.failedToRemove'));
            }
          },
        },
      ]
    );
  };

  const totalSpent = entries.reduce((sum, e) => sum + e.amountSpent, 0);
  const totalEntries = entries.length;

  const now = new Date();
  const firstEntryDate = entries.length > 0 ? new Date(entries[entries.length - 1].date) : now;
  const monthsDiff = (now.getFullYear() - firstEntryDate.getFullYear()) * 12 + (now.getMonth() - firstEntryDate.getMonth()) + 1;
  const avgMonthlySpend = totalSpent / (monthsDiff || 1);

  const headerComponent = (
    <View style={styles.headerContainer}>
      <StaggeredFadeInView key={`greet-${viewKey}`} delay={0}>
        <Text style={styles.greeting}>{i18n.t('dashboard.welcome')}</Text>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`stats-${viewKey}`} delay={50}>
        <View style={styles.statsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{i18n.t('dashboard.totalSpent')}</Text>
            <Text style={[styles.cardValue, { color: primaryColor }]}>{totalSpent.toFixed(2).replace('.', ',')} €</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{i18n.t('dashboard.totalEntries')}</Text>
            <Text style={[styles.cardValue, { color: primaryColor }]}>{totalEntries}</Text>
          </View>
        </View>
      </StaggeredFadeInView>

      <StaggeredFadeInView key={`avg-${viewKey}`} delay={100}>
        <View style={styles.fullCard}>
          <Text style={styles.cardLabel}>{i18n.t('dashboard.avgMonthlySpend')}</Text>
          <Text style={[styles.cardValue, { color: primaryColor }]}>{avgMonthlySpend.toFixed(2).replace('.', ',')} €</Text>
        </View>
      </StaggeredFadeInView>

      {favorites.length > 0 && (
        <StaggeredFadeInView key={`favs-${viewKey}`} delay={150}>
          <>
            <Text style={styles.sectionTitle}>{i18n.t('dashboard.favorites')}</Text>
            <View style={styles.favoritesContainer}>
              {favorites.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={styles.favoriteButton}
                  onPress={() => handleQuickAdd(fav)}
                  onLongPress={() => handleRemoveFavorite(fav)}
                >
                  <Text style={styles.favoriteButtonText}>{fav.type}</Text>
                  <Text style={[styles.favoriteButtonSubtext, { color: primaryColor }]}>{fav.amountSpent.toFixed(2).replace('.', ',')} €</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        </StaggeredFadeInView>
      )}

      <StaggeredFadeInView key={`cal-title-${viewKey}`} delay={favorites.length > 0 ? 200 : 150}>
        <Text style={styles.sectionTitle}>{i18n.t('dashboard.activityCalendar')}</Text>
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
        <Text style={styles.sectionTitle}>{i18n.t('dashboard.recentHistory')}</Text>
      </StaggeredFadeInView>
    </View>
  );

  const handleDelete = async (id: string) => {
    try {
      await Storage.removeEntry(id);
      await loadData();
    } catch (e) {
      Alert.alert(i18n.t('common.error'), i18n.t('dashboard.failedToDelete'));
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
        data={entries.slice(0, displayedCount)}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{i18n.t('dashboard.noEntries')}</Text>
        }
        ListFooterComponent={
          displayedCount < entries.length ? (
            <TouchableOpacity
              style={[styles.loadMoreButton, { borderColor: primaryColor }]}
              onPress={() => setDisplayedCount(prev => prev + LOAD_MORE_COUNT)}
            >
              <Text style={[styles.loadMoreText, { color: primaryColor }]}>
                {i18n.t('dashboard.loadMore')} ({entries.length - displayedCount} {i18n.t('dashboard.moreEntries')})
              </Text>
            </TouchableOpacity>
          ) : null
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

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
        onPress={() => {
          isNavigatingInternal.current = true;
          router.push('/add');
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  loadMoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
