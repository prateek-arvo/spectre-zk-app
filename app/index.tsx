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
import { Image } from 'expo-image';
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
  debug_original?: string;
  debug_warped?: string;
}

export default function HomeScreen() {
  const [ready, setReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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
    setShowDebug(false);

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

        const res = await fetch(`${SERVER_URL}/detect?debug=true`, {
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
        } else if (data.warning) {
          setWarning(data.warning);
          setResult({
            id: data.id,
            confidence: data.confidence,
            debug_original: data.debug_original,
            debug_warped: data.debug_warped,
          });
        } else {
          setResult({
            id: data.id,
            confidence: data.confidence,
            debug_original: data.debug_original,
            debug_warped: data.debug_warped,
          });
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
            <View style={styles.resultRow}>
              <View style={styles.resultItem}>
                <Text style={styles.resultNumber}>{result.id}</Text>
                <Text style={styles.resultLabel}>ID</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultItem}>
                <Text style={styles.resultNumber}>
                  {(result.confidence * 100).toFixed(1)}%
                </Text>
                <Text style={styles.resultLabel}>Confidence</Text>
              </View>
            </View>

            {(result.debug_original || result.debug_warped) && (
              <TouchableOpacity
                style={styles.debugToggle}
                onPress={() => setShowDebug((s) => !s)}
                activeOpacity={0.7}
              >
                <Text style={styles.debugToggleText}>
                  {showDebug ? 'Hide Debug Images' : 'Show Debug Images'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showDebug && result?.debug_original && (
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Detection Overlay</Text>
            <Image
              source={{ uri: `data:image/jpeg;base64,${result.debug_original}` }}
              style={styles.debugImage}
              contentFit="contain"
            />
          </View>
        )}

        {showDebug && result?.debug_warped && (
          <View style={styles.debugCard}>
            <Text style={styles.debugLabel}>Warped Grid</Text>
            <Image
              source={{ uri: `data:image/jpeg;base64,${result.debug_warped}` }}
              style={styles.debugImage}
              contentFit="contain"
            />
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
    backgroundColor: '#0a0a0a',
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
    color: '#fff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginTop: 8,
    lineHeight: 23,
  },
  resultCard: {
    backgroundColor: '#0d1f0d',
    borderWidth: 1,
    borderColor: '#1a4a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  resultHeading: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultNumber: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  resultLabel: {
    color: '#6a9a6a',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#1a3a1a',
  },
  warningCard: {
    backgroundColor: '#1f1a0d',
    borderWidth: 1,
    borderColor: '#4a3a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    color: '#e0a030',
    fontSize: 15,
    lineHeight: 22,
  },
  errorCard: {
    backgroundColor: '#1f0d0d',
    borderWidth: 1,
    borderColor: '#4a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#e06060',
    fontSize: 15,
    lineHeight: 22,
  },
  scanButton: {
    backgroundColor: '#2196F3',
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
  debugToggle: {
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a3a1a',
    alignItems: 'center',
  },
  debugToggleText: {
    color: '#5588bb',
    fontSize: 14,
    fontWeight: '600',
  },
  debugCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    padding: 12,
  },
  debugLabel: {
    color: '#88aacc',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  debugImage: {
    width: '100%',
    height: 280,
    borderRadius: 8,
  },
  footer: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
});
