import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '@/components/StatusBadge';
import { useColors } from '@/hooks/useColors';
import { formatTime } from '@/lib/format';

export function AppointmentCard({
  clientName,
  scheduledAt,
  status,
  clientPhone,
  onPress,
}: {
  clientName: string;
  scheduledAt: string;
  status: string;
  clientPhone?: string | null;
  onPress?: () => void;
}) {
  const c = useColors();
  const time = formatTime(new Date(scheduledAt));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderRadius: c.radius,
          opacity: pressed && onPress ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.timeCol}>
        <Text style={[styles.time, { color: c.foreground }]}>{time}</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: c.border }]} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: c.foreground }]} numberOfLines={1}>
          {clientName}
        </Text>
        {clientPhone ? (
          <Text
            style={[styles.phone, { color: c.mutedForeground }]}
            numberOfLines={1}
          >
            {clientPhone}
          </Text>
        ) : null}
        <View style={{ marginTop: 8 }}>
          <StatusBadge status={status} />
        </View>
      </View>
      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={c.mutedForeground}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    gap: 12,
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(22,16,14,0.05)' },
      default: {
        shadowColor: '#16100e',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      },
    }),
  },
  timeCol: {
    width: 52,
    alignItems: 'center',
  },
  time: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  phone: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
});
