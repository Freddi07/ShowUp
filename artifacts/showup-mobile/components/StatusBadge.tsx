import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors, {
  type AppointmentStatusKey,
  statusMeta,
} from '@/constants/colors';

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: string;
  size?: 'sm' | 'md';
}) {
  const meta =
    statusMeta[status as AppointmentStatusKey] ?? statusMeta.PENDING;
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: hexWithAlpha(meta.color, 0.14),
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? 8 : 10,
        },
      ]}
    >
      <Ionicons
        name={meta.icon as keyof typeof Ionicons.glyphMap}
        size={small ? 12 : 14}
        color={meta.color}
      />
      <Text
        style={[
          styles.text,
          { color: meta.color, fontSize: small ? 11 : 13 },
        ]}
      >
        {small ? meta.short : meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: colors.radius,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
  },
});
