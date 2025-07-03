import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const ESP_DEVICE_NAME = 'ESP32_Posture';
const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab';
const UUID_ANGLE_Y = 'abcd1234-0001-1000-8000-00805f9b34fb';
const UUID_ANGLE_Z = 'abcd1234-0002-1000-8000-00805f9b34fb';
const UUID_FLEX_ANGLE = 'abcd1234-0003-1000-8000-00805f9b34fb';

export default function StickFigureScreen() {
  const [flexAngle, setFlexAngle] = useState(0);
  const [angleY, setAngleY] = useState(0);
  const [angleZ, setAngleZ] = useState(0);

  const [flexColor, setFlexColor] = useState('gray');
  const [yColor, setYColor] = useState('gray');
  const [zColor, setZColor] = useState('gray');
  const [connected, setConnected] = useState(false);

  const bleManager = new BleManager();

  useEffect(() => {
    const connectBLE = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            {
              title: 'Bluetooth Permission',
              message: 'This app requires Bluetooth to connect to ESP32.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission denied for Bluetooth');
            return;
          }
        }

        bleManager.startDeviceScan(null, null, (error, device) => {
          if (error) {
            console.log('BLE Scan error:', error);
            return;
          }

          if (device?.name === ESP_DEVICE_NAME) {
            console.log('✅ Found ESP32:', device.name);
            bleManager.stopDeviceScan();

            device
              .connect()
              .then((d) => {
                console.log('✅ Connected to device:', d.name);
                setConnected(true);
                return d.discoverAllServicesAndCharacteristics();
              })
              .then((d) => {
                // Subscribe to angle Y
                d.monitorCharacteristicForService(
                  SERVICE_UUID,
                  UUID_ANGLE_Y,
                  (error, characteristic) => {
                    if (error) {
                      console.log('Angle Y notify error:', error);
                      return;
                    }
                    const val = decodeValue(characteristic.value);
                    console.log('Angle Y:', val);
                    setAngleY(val);
                  }
                );

                // Subscribe to angle Z
                d.monitorCharacteristicForService(
                  SERVICE_UUID,
                  UUID_ANGLE_Z,
                  (error, characteristic) => {
                    if (error) {
                      console.log('Angle Z notify error:', error);
                      return;
                    }
                    const val = decodeValue(characteristic.value);
                    console.log('Angle Z:', val);
                    setAngleZ(val);
                  }
                );

                // Subscribe to flex angle
                d.monitorCharacteristicForService(
                  SERVICE_UUID,
                  UUID_FLEX_ANGLE,
                  (error, characteristic) => {
                    if (error) {
                      console.log('Flex notify error:', error);
                      return;
                    }
                    const val = decodeValue(characteristic.value);
                    console.log('Flex Angle:', val);
                    setFlexAngle(val);
                  }
                );
              })
              .catch((err) => {
                console.log('BLE connect error:', err);
                Alert.alert('BLE connection error', err.message);
              });
          }
        });
      } catch (e) {
        console.log('BLE connection error:', e);
      }
    };

    connectBLE();

    return () => {
      bleManager.destroy();
    };
  }, []);

  // Logic for colors
  useEffect(() => {
    if (flexAngle <= 15) setFlexColor('green');
    else if (flexAngle > 15 && flexAngle <= 35) setFlexColor('yellow');
    else setFlexColor('red');

    if (Math.abs(angleY) <= 35) setYColor('green');
    else setYColor('red');

    if (Math.abs(angleZ) <= 45) setZColor('green');
    else setZColor('red');
  }, [flexAngle, angleY, angleZ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        {connected ? '✅ BLE Connected' : '🔄 Scanning for ESP32...'}
      </Text>

      {/* Flex stickman */}
      <Text style={styles.title}>Flex Sensor</Text>
      <Text style={styles.value}>
        Flex Angle: {flexAngle?.toFixed(1)}°
      </Text>
      <StickmanSideways color={flexColor} rotation={flexAngle} />
      <Text style={styles.statusText}>
        {flexColor === 'green'
          ? 'Good posture!'
          : flexColor === 'yellow'
          ? 'Slouching'
          : flexColor === 'red'
          ? 'Bad posture!'
          : ''}
      </Text>

      {/* Angle Y stickman */}
      <Text style={styles.title}>Gyro Y (Forward-Backward Tilt)</Text>
      <Text style={styles.value}>
        Angle Y: {angleY?.toFixed(1)}°
      </Text>
      <StickmanSideways color={yColor} rotation={angleY} />
      <Text style={styles.statusText}>
        {yColor === 'green' ? 'Good posture!' : yColor === 'red' ? 'Bad posture!' : ''}
      </Text>

      {/* Angle Z stickman */}
      <Text style={styles.title}>Gyro Z (Sideways Tilt)</Text>
      <Text style={styles.value}>
        Angle Z: {angleZ?.toFixed(1)}°
      </Text>
      <StickmanSideways color={zColor} rotation={-angleZ} />
      <Text style={styles.statusText}>
        {zColor === 'green' ? 'Good posture!' : zColor === 'red' ? 'Bad posture!' : ''}
      </Text>
    </ScrollView>
  );
}

function decodeValue(base64) {
  if (!base64) return 0;
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  return parseFloat(decoded) || 0;
}

function StickmanSideways({ color, rotation }) {
  return (
    <View style={styles.figureContainer}>
      <View
        style={[
          styles.stickFigure,
          { transform: [{ rotate: `${rotation}deg` }] },
        ]}
      >
        <View style={[styles.head, { backgroundColor: color }]} />
        <View style={[styles.torso, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#eef',
  },
  header: {
    fontSize: 18,
    marginVertical: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 10,
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
  },
  figureContainer: {
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stickFigure: {
    alignItems: 'center',
  },
  head: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
  },
  torso: {
    width: 4,
    height: 60,
    backgroundColor: '#333',
  },
  statusText: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
