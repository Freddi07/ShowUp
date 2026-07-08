import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { formatShortDate, formatTime } from '@/lib/format';
import type { AppointmentStatus } from '@workspace/api-client-react';

export interface ActionableAppointment {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  scheduledAt: string;
  status: string;
}

export function AppointmentActionsSheet({
  appointment,
  visible,
  onClose,
}: {
  appointment: ActionableAppointment | null;
  visible: boolean;
  onClose: () => void;
}) {
  const c = useColors();

  if (!appointment) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.card, borderColor: c.border },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />
        <Sheet appointment={appointment} onClose={onClose} />
      </View>
    </Modal>
  );
}

function Sheet({
  appointment,
  onClose,
}: {
  appointment: ActionableAppointment;
  onClose: () => void;
}) {
  const c = useColors();
  const { setStatus, sendReminder, callCustomer, isUpdating, isReminding } =
    useAppointmentActions(appointment.id);

  const date = new Date(appointment.scheduledAt);
  const hasPhone = Boolean(appointment.clientPhone);
  const busy = isUpdating || isReminding;

  return (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.foreground }]} numberOfLines={1}>
            {appointment.clientName}
          </Text>
          <Text style={[styles.when, { color: c.mutedForeground }]}>
            {formatShortDate(date)} kl. {formatTime(date)}
          </Text>
        </View>
        <StatusBadge status={appointment.status} size="sm" />
      </View>

      <View style={styles.group}>
        <ActionRow
          icon="call"
          label="Ring kunde"
          tint={c.primary}
          disabled={!hasPhone}
          onPress={() => callCustomer(appointment.clientPhone)}
        />
        <ActionRow
          icon="notifications"
          label="Send påminnelse på nytt"
          tint="#e49e22"
          disabled={!hasPhone || isReminding}
          loading={isReminding}
          onPress={() => sendReminder(onClose)}
        />
      </View>

      <Text style={[styles.groupTitle, { color: c.mutedForeground }]}>
        Sett status
      </Text>
      <View style={styles.group}>
        <ActionRow
          icon="checkmark-circle"
          label="Bekreft"
          tint="#2e9e52"
          disabled={busy || appointment.status === 'CONFIRMED'}
          onPress={() => applyStatus('CONFIRMED')}
        />
        <ActionRow
          icon="calendar"
          label="Vil endre tid"
          tint="#3a84ca"
          disabled={busy || appointment.status === 'RESCHEDULE_REQUESTED'}
          onPress={() => applyStatus('RESCHEDULE_REQUESTED')}
        />
        <ActionRow
          icon="close-circle"
          label="Avlys"
          tint="#de3b3d"
          disabled={busy || appointment.status === 'CANCELLED'}
          onPress={() => applyStatus('CANCELLED')}
        />
      </View>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          styles.cancel,
          {
            backgroundColor: c.secondary,
            borderRadius: c.radius,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.cancelText, { color: c.foreground }]}>Lukk</Text>
      </Pressable>
    </>
  );

  function applyStatus(status: AppointmentStatus) {
    setStatus(status, onClose);
  }
}

function ActionRow({
  icon,
  label,
  tint,
  onPress,
  disabled,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: hexAlpha(tint, 0.14) }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <Ionicons name={icon} size={20} color={tint} />
        )}
      </View>
      <Text style={[styles.rowLabel, { color: c.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22,16,14,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  when: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  groupTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  group: {
    gap: 4,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  cancel: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
