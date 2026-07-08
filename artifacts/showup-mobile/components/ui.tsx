import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/** A bordered surface card used to group rows. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const c = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, borderRadius: c.radius },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** An uppercase muted section heading. */
export function SectionLabel({ text }: { text: string }) {
  const c = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
      {text}
    </Text>
  );
}

/** A thin divider line. */
export function Sep() {
  const c = useColors();
  return <View style={[styles.sep, { backgroundColor: c.border }]} />;
}

/** A tappable navigation row with icon, title, optional value and chevron. */
export function MenuRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}) {
  const c = useColors();
  const tint = danger ? c.destructive : c.foreground;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
    >
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: danger ? 'rgba(231,0,11,0.12)' : c.secondary },
        ]}
      >
        <Feather name={icon} size={18} color={danger ? c.destructive : c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, { color: tint }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.menuSubtitle, { color: c.mutedForeground }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.menuValue, { color: c.mutedForeground }]}>{value}</Text>
      ) : null}
      <Feather name="chevron-right" size={18} color={c.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  sep: { height: 1 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  menuSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  menuValue: { fontFamily: 'Inter_500Medium', fontSize: 14, marginRight: 4 },
});
