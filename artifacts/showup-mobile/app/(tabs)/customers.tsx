import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListCustomersQueryKey,
  useCreateCustomer,
  useListCustomers,
  type CustomerListItem,
} from '@workspace/api-client-react';
import { GradientHeader } from '@/components/GradientHeader';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { formatShortDate } from '@/lib/format';

export default function CustomersScreen() {
  const c = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useListCustomers(
    query.trim() ? { q: query.trim() } : undefined,
  );

  const items = data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar style="light" />
      <GradientHeader
        title="Kunder"
        subtitle={
          data
            ? `${data.total}${data.limit != null ? ` av ${data.limit}` : ''} kunder`
            : 'Dine kunder'
        }
        right={
          <Pressable
            testID="add-customer"
            onPress={() => setModalOpen(true)}
            hitSlop={10}
          >
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        }
      />

      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
          ]}
        >
          <Feather name="search" size={18} color={c.mutedForeground} />
          <TextInput
            testID="customer-search"
            value={query}
            onChangeText={setQuery}
            placeholder="Søk på navn eller telefon"
            placeholderTextColor={c.mutedForeground}
            style={[styles.searchInput, { color: c.foreground }]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Feather name="x" size={18} color={c.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />
      ) : (
        <FlatList
          data={items}
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
              {query
                ? 'Ingen kunder matcher søket.'
                : 'Ingen kunder ennå. Trykk + for å legge til.'}
            </Text>
          }
          renderItem={({ item }) => (
            <CustomerRow
              item={item}
              onPress={() => router.push(`/customer/${item.id}`)}
            />
          )}
        />
      )}

      <AddCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          queryClient.invalidateQueries({ queryKey: getListCustomersQueryKey() });
        }}
      />
    </View>
  );
}

function CustomerRow({
  item,
  onPress,
}: {
  item: CustomerListItem;
  onPress: () => void;
}) {
  const c = useColors();
  const initials = item.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderRadius: c.radius,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: c.secondary }]}>
        <Text style={[styles.avatarText, { color: c.primary }]}>{initials || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: c.foreground }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.meta, { color: c.mutedForeground }]} numberOfLines={1}>
          {item.phone ?? item.email ?? 'Ingen kontaktinfo'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.count, { color: c.foreground }]}>
          {item.appointmentCount} avt.
        </Text>
        {item.lastVisitAt ? (
          <Text style={[styles.meta, { color: c.mutedForeground }]}>
            {formatShortDate(new Date(item.lastVisitAt))}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function AddCustomerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const c = useColors();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const create = useCreateCustomer({
    mutation: {
      onSuccess: () => {
        setName('');
        setPhone('');
        setEmail('');
        onCreated();
      },
      onError: (err: unknown) => {
        const status = (err as { status?: number })?.status;
        if (status === 403) {
          Alert.alert(
            'Kundegrense nådd',
            'Du har nådd kundegrensen for planen din. Oppgrader for å legge til flere.',
          );
        } else {
          Alert.alert('Kunne ikke lagre', 'Prøv igjen om litt.');
        }
      },
    },
  });

  const submit = () => {
    if (!name.trim()) {
      Alert.alert('Navn mangler', 'Skriv inn et navn.');
      return;
    }
    create.mutate({
      data: {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      },
    });
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Ny kunde</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={c.mutedForeground} />
            </Pressable>
          </View>

          <Field label="Navn" value={name} onChange={setName} placeholder="Kari Nordmann" testID="new-name" />
          <Field
            label="Telefon"
            value={phone}
            onChange={setPhone}
            placeholder="+47 900 00 000"
            keyboardType="phone-pad"
            testID="new-phone"
          />
          <Field
            label="E-post"
            value={email}
            onChange={setEmail}
            placeholder="kari@epost.no"
            keyboardType="email-address"
            testID="new-email"
          />

          <AppButton
            testID="save-customer"
            label={create.isPending ? 'Lagrer…' : 'Lagre kunde'}
            onPress={submit}
            disabled={create.isPending}
            style={{ marginTop: 12 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  testID?: string;
}) {
  const c = useColors();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        style={[
          styles.fieldInput,
          { color: c.foreground, backgroundColor: c.background, borderColor: c.border, borderRadius: c.radius },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  list: { padding: 16, paddingBottom: Platform.OS === 'web' ? 110 : 48, gap: 10 },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  count: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  fieldLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 2,
  },
  fieldInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});
