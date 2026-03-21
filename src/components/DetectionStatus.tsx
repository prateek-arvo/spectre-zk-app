import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Status = 'searching' | 'detected' | 'stable' | 'capturing';

type Props = {
  status: Status;
  mode: 'document' | 'label';
};

const STATUS_TEXT: Record<Status, string> = {
  searching: 'Point camera at a document',
  detected: 'Document detected - hold steady',
  stable: 'Hold steady... auto-capturing',
  capturing: 'Capturing...',
};

const STATUS_COLORS: Record<Status, string> = {
  searching: '#FF9800',
  detected: '#2196F3',
  stable: '#4CAF50',
  capturing: '#9C27B0',
};

export function DetectionStatus({ status, mode }: Props) {
  const text = STATUS_TEXT[status].replace(
    'document',
    mode === 'label' ? 'label' : 'document'
  );

  return (
    <View style={[styles.container, { backgroundColor: STATUS_COLORS[status] + 'DD' }]}>
      <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
