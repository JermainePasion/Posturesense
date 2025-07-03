// HomeStack.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Button,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import axios from 'axios';
import { BleManager } from 'react-native-ble-plx';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StickFigureScreen from './StickFigureScreen';

const ESP_IP = '192.168.100.66';
const BACKEND_IP = '192.168.100.8';

const ESP_DEVICE_NAME = 'ESP32_Posture';
const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const UUID_ANGLE_Y = 'abcd1234-0001-1000-8000-00805f9b34fb';
const UUID_ANGLE_Z = 'abcd1234-0002-1000-8000-00805f9b34fb';
const UUID_FLEX_ANGLE = 'abcd1234-0003-1000-8000-00805f9b34fb';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [bleStatus, setBleStatus] = useState('Scanning...');
  const [deviceConnected, setDeviceConnected] = useState(false);

  const bleManager = new BleManager();

  const startBLE = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert('Bluetooth permission denied.');
          setBleStatus('Permission denied');
          return;
        }
      }

      setBleStatus('Scanning...');

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('BLE scan error:', error);
          setBleStatus('Scan error');
          return;
        }

        if (device?.name === ESP_DEVICE_NAME) {
          console.log('✅ Found ESP32:', device.name);
          bleManager.stopDeviceScan();
          connectToDevice(device);
        }
      });
    } catch (err) {
      console.error(err);
      setBleStatus('Error starting BLE');
    }
  };

  const connectToDevice = async (device) => {
    try {
      const connectedDevice = await device.connect();
      console.log('✅ Connected to device:', connectedDevice.name);
      setDeviceConnected(true);
      setBleStatus('Connected');

      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Subscribe to notifications
      setupNotifications(connectedDevice);
    } catch (err) {
      console.error('Connection error:', err);
      setBleStatus('Connection failed');
      Alert.alert('Failed to connect to ESP32 via BLE');
    }
  };

  const setupNotifications = async (device) => {
    try {
      await device.monitorCharacteristicForService(
        SERVICE_UUID,
        UUID_ANGLE_Y,
        (error, characteristic) => {
          if (error) {
            console.error(error);
            return;
          }
          const angleY = parseFloat(decodeBase64(characteristic.value));
          updateDataField('angleY', angleY);
        }
      );

      await device.monitorCharacteristicForService(
        SERVICE_UUID,
        UUID_ANGLE_Z,
        (error, characteristic) => {
          if (error) {
            console.error(error);
            return;
          }
          const angleZ = parseFloat(decodeBase64(characteristic.value));
          updateDataField('angleZ', angleZ);
        }
      );

      await device.monitorCharacteristicForService(
        SERVICE_UUID,
        UUID_FLEX_ANGLE,
        (error, characteristic) => {
          if (error) {
            console.error(error);
            return;
          }
          const flexAngle = parseFloat(decodeBase64(characteristic.value));
          updateDataField('flexAngle', flexAngle);
        }
      );

      console.log('✅ BLE notifications set up');
    } catch (err) {
      console.error(err);
      setBleStatus('Notification error');
    }
  };

  const decodeBase64 = (b64) => {
    if (!b64) return null;
    const decoded = Buffer.from(b64, 'base64').toString('utf-8');
    return decoded;
  };

  const updateDataField = (field, value) => {
    setData((prev) => {
      const updated = { ...(prev || {}), [field]: value };

      // Send to backend every update
      axios
        .post(`http://${BACKEND_IP}:3000/log`, {
          angleY: updated.angleY,
          angleZ: updated.angleZ,
          flexAngle: updated.flexAngle,
        })
        .catch((err) => console.error('Backend logging error:', err));

      return updated;
    });
  };

  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`http://${ESP_IP}/read`);
      const json = response.data;

      setData(json);

      await axios.post(`http://${BACKEND_IP}:3000/log`, {
        angleY: json.angleY,
        angleZ: json.angleZ,
        flexAngle: json.flexAngle,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch data from ESP or send to backend.');
    }
  };

  const handleSetBaseline = () => {
    if (!data) {
      Alert.alert('Error', 'No sensor data yet.');
      return;
    }
    const newBaseline = {
      flexAngle: data.flexAngle,
      angleY: data.angleY,
      angleZ: data.angleZ,
    };
    setBaseline(newBaseline);
    Alert.alert('✅ Baseline Set', JSON.stringify(newBaseline, null, 2));
  };

  useEffect(() => {
    startBLE();

    // Optionally fallback to Wi-Fi polling every 1.5 sec
    const interval = setInterval(fetchSensorData, 1500);
    return () => {
      clearInterval(interval);
      bleManager.destroy();
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>ESP32 Live Posture Monitor (BLE + Wi-Fi)</Text>

      <Text style={{ marginBottom: 10, color: deviceConnected ? 'green' : 'red' }}>
        BLE Status: {bleStatus}
      </Text>

      {data ? (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Angle Y:</Text>
            <Text style={styles.value}>{data.angleY?.toFixed(2)}°</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Angle Z:</Text>
            <Text style={styles.value}>{data.angleZ?.toFixed(2)}°</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Flex Angle:</Text>
            <Text style={styles.value}>
              {data.flexAngle?.toFixed(1)}°
            </Text>
          </View>

          <View style={{ marginVertical: 20 }}>
            <Button title="Set Baseline" onPress={handleSetBaseline} />
          </View>
        </>
      ) : (
        <Text style={styles.loading}>Loading data...</Text>
      )}
    </ScrollView>
  );
}

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="StickFigure"
        component={StickFigureScreen}
        options={{ title: 'Stick Figure View' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  value: {
    fontSize: 18,
    color: '#333',
  },
  loading: {
    fontSize: 18,
    color: '#999',
  },
});
