import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import * as SplashScreen from 'expo-splash-screen';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SERVER_URL = 'https://spectre-detector-911160267678.asia-south2.run.app';

interface DetectResult {
  id: number;
  confidence: number;
}

export default function HomeScreen() {
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReady(true);
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleScan = async () => {
    const permission = await Camera.requestCameraPermission();
    if (permission === 'denied') {
      Alert.alert('Camera Permission', 'Camera access is required.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    setScanning(true);
    setResult(null);
    setWarning(null);
    setError(null);

    try {
      const scanResult = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 1,
        responseType: ResponseType.ImageFilePath,
      });

      if (
        scanResult.status === ScanDocumentResponseStatus.Success &&
        scanResult.scannedImages &&
        scanResult.scannedImages.length > 0
      ) {
        const photoPath = scanResult.scannedImages[0];
        const imageUri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;

        setScanning(false);
        setDetecting(true);

        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'scan.jpg',
        } as any);

        const res = await fetch(`${SERVER_URL}/detect`, {
          method: 'POST',
          body: formData,
        });

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          setError(`Server returned invalid response (${res.status}): ${text.slice(0, 120)}`);
          return;
        }

        if (!res.ok) {
          setError(data.error || `Server error: ${res.status}`);
        } else if (data.confidence != null && data.confidence < 0.5) {
          setWarning('Try a closer well lit photo');
        } else if (data.warning) {
          setWarning(data.warning);
        } else {
          setResult({ id: data.id, confidence: data.confidence });
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setScanning(false);
      setDetecting(false);
    }
  };

  if (!ready) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.title}>Spectre</Text>
          <Text style={styles.subtitle}>
            Scan printed documents to detect and decode hidden Spectre dot-patterns
          </Text>
        </View>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultHeading}>Pattern Detected</Text>
            <Text style={styles.resultNumber}>{result.id}</Text>
            <Text style={styles.resultLabel}>Pattern ID</Text>
          </View>
        )}

        {warning && (
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.scanButton, (scanning || detecting) && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={scanning || detecting}
          activeOpacity={0.8}
        >
          {scanning || detecting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.scanButtonText}>
                {scanning ? 'Opening Scanner...' : 'Detecting Pattern...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.scanButtonText}>
              {result ? 'Scan Again' : 'Scan Document'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>Point camera at a Spectre-encoded document</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  hero: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0a1a2a',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A7A8A',
    marginTop: 8,
    lineHeight: 23,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D0E4F0',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultHeading: {
    color: '#0077CC',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  resultNumber: {
    color: '#0a1a2a',
    fontSize: 48,
    fontWeight: '800',
  },
  resultLabel: {
    color: '#5A7A8A',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  warningCard: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#E8D8A0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    color: '#8A6A10',
    fontSize: 15,
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#F0C0C0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#AA3030',
    fontSize: 15,
    lineHeight: 22,
  },
  scanButton: {
    backgroundColor: '#0077CC',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    color: '#A0B0C0',
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
});
