import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

type Props = {
  onPress: () => void;
  isCapturing: boolean;
  isAutoCapture: boolean;
};

export function ShutterButton({ onPress, isCapturing, isAutoCapture }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={isCapturing}
      activeOpacity={0.7}
    >
      {isCapturing ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <View
          style={[
            styles.inner,
            isAutoCapture && styles.innerAutoCapture,
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  inner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  innerAutoCapture: {
    backgroundColor: '#4CAF50',
  },
});
