import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F8FB' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F8FB' },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style="dark" />
    </View>
  );
}
