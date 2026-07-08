import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListRepliesQueryKey,
  ReplyStatusFilter,
  useListReplies,
  useUpdateReply,
  type ReplyItem,
  type ReplyUpdate,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';
import { formatShortDate, formatTime } from '@/lib/format';

const FILTERS: { key: ReplyStatusFilter; label: string }[] = [
  { key: ReplyStatusFilter.all, label: 'Alle' },
  { key: ReplyStatusFilter.CONFIRMED, label: 'Bekreftet' },
  { key: ReplyStatusFilter.RESCHEDULE_REQUESTED, label: 'Vil endre' },
  { key: ReplyStatusFilter.CANCELLED, label: 'Avlyst' },
  { key: ReplyStatusFilter.REMINDED, label: 'Påminnet' },
];

export default function RepliesScreen() {
  const c = useColors();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReplyStatusFilter>(ReplyStatusFilter.all);

  const { data, isLoading, isRefetching, refetch } = useListReplies({
    status: filter,
  });

  const update = useUpdateReply({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepliesQueryKey() });
      },
      onError: () => Alert.alert('Noe gikk galt', 'Kunne ikke oppdatere. Prøv igjen.'),
    },
  });

  const act = (item: ReplyItem, data: ReplyUpdate) =>
    update.mutate({ id: item.id, data });

  const openActions = (item: ReplyItem) => {
    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Marker som bekreftet', onPress: () => act(item, { status: 'CONFIRMED' }) },
      { text: 'Marker som avlyst', style: 'destructive', onPress: () => act(item, { status: 'CANCELLED' }) },
      { text: 'Send oppfølging (SMS)', onPress: () => act(item, { action: 'send_followup' }) },
    ];
    if (item.clientPhone) {
      buttons.push({
        text: `Ring ${item.clientPhone}`,
        onPress: () => Linking.openURL(`tel:${item.clientPhone}`),
      });
    }
    buttons.push({ text: 'Avbryt', style: 'cancel' });
    Alert.alert(item.clientName, 'Velg en handling', buttons);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Svar"
        subtitle={data ? `${data.total} svar` : 'Kundesvar'}
      />

      <View style={{ maxHeight: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.primary : c.card,
                    borderColor: active ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? c.primaryForeground : c.mutedForeground },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.mutedForeground }]}>
              Ingen svar i denne kategorien ennå.
            </Text>
          }
          renderItem={({ item }) => (
            <ReplyRow
              item={item}
              onCall={
                item.clientPhone
                  ? () => Linking.openURL(`tel:${item.clientPhone}`)
                  : undefined
              }
              onActions={() => openActions(item)}
            />
          )}
        />
      )}
    </View>
  );
}

function ReplyRow({
  item,
  onCall,
  onActions,
}: {
  item: ReplyItem;
  onCall?: () => void;
  onActions: () => void;
}) {
  const c = useColors();
  const when = new Date(item.scheduledAt);
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
      ]}
    >
      <View style={styles.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.foreground }]} numberOfLines={1}>
            {item.clientName}
          </Text>
          <Text style={[styles.meta, { color: c.mutedForeground }]}>
            {formatShortDate(when)} · {formatTime(when)}
          </Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={styles.actions}>
        {onCall ? (
          <Pressable
            onPress={onCall}
            style={[styles.actionBtn, { borderColor: c.border }]}
          >
            <Feather name="phone" size={16} color={c.primary} />
            <Text style={[styles.actionText, { color: c.foreground }]}>Ring</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onActions}
          style={[styles.actionBtn, { borderColor: c.border }]}
        >
          <Feather name="more-horizontal" size={16} color={c.primary} />
          <Text style={[styles.actionText, { color: c.foreground }]}>Handlinger</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  list: { padding: 16, paddingBottom: Platform.OS === 'web' ? 110 : 48, gap: 10 },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  row: { borderWidth: 1, padding: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actionText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
});
