import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

export function useHeaderTopInset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'web' ? Math.max(insets.top, 12) + 8 : insets.top;
}

export function GradientHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const top = useHeaderTopInset();

  return (
    <LinearGradient
      colors={[colors.brand[700], colors.brand[500], colors.brand[400]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: top + 14 }]}
    >
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              onBack();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            testID="header-back"
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    marginLeft: -6,
    marginRight: 2,
  },
  titles: {
    flex: 1,
  },
  right: {
    marginLeft: 8,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#fff',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffffcc',
    marginTop: 2,
  },
});
