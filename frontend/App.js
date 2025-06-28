import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Button,
} from 'react-native';
import axios from 'axios';

const ESP_IP = '192.168.100.66'; // your ESP32 IP

export default function App() {
  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [flexStatus, setFlexStatus] = useState('N/A');
  const [gyroYStatus, setGyroYStatus] = useState('N/A');
  const [gyroZStatus, setGyroZStatus] = useState('N/A');

  const fetchSensorData = async () => {
    try {
      const response = await axios.get(`http://${ESP_IP}/read`);
      const json = response.data;
      console.log(json);
      setData(json);

      if (baseline) {
        evaluatePosture(json);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not fetch data from ESP.');
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

  const evaluatePosture = (current) => {
    // --- FLEX ---
    const flexDelta = Math.abs(current.flexAngle - baseline.flexAngle);
    let flexLabel = 'good posture';
    if (flexDelta > 25) {
      flexLabel = 'bad posture';
    } else if (flexDelta > 15) {
      flexLabel = 'slouching';
    }
    setFlexStatus(flexLabel);

    // --- GYRO Y ---
    const gyroYDelta = Math.abs(current.angleY - baseline.angleY);
    setGyroYStatus(gyroYDelta > 90 ? 'bad posture' : 'good posture');

    // --- GYRO Z ---
    const gyroZDelta = Math.abs(current.angleZ - baseline.angleZ);
    setGyroZStatus(gyroZDelta > 90 ? 'bad posture' : 'good posture');
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 1500);
    return () => clearInterval(interval);
  }, [baseline]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>ESP32 Live Posture Monitor</Text>

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
            <Text style={styles.label}>Flex Value:</Text>
            <Text style={styles.value}>{data.flexValue}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Flex Angle:</Text>
            <Text style={styles.value}>{data.flexAngle?.toFixed(1)}°</Text>
          </View>

          <View style={{ marginVertical: 20 }}>
            <Button title="Set Baseline" onPress={handleSetBaseline} />
          </View>

          {baseline && (
            <>
              <Text style={styles.sectionHeader}>Posture Status</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Flex:</Text>
                <Text style={[styles.status, getColor(flexStatus)]}>
                  {flexStatus}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Gyro Y:</Text>
                <Text style={[styles.status, getColor(gyroYStatus)]}>
                  {gyroYStatus}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Gyro Z:</Text>
                <Text style={[styles.status, getColor(gyroZStatus)]}>
                  {gyroZStatus}
                </Text>
              </View>
            </>
          )}
        </>
      ) : (
        <Text style={styles.loading}>Loading data...</Text>
      )}
    </ScrollView>
  );
}

function getColor(status) {
  switch (status) {
    case 'good posture':
      return { color: 'green' };
    case 'slouching':
      return { color: 'orange' };
    case 'bad posture':
      return { color: 'red' };
    default:
      return { color: '#333' };
  }
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
    marginBottom: 30,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
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
  status: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loading: {
    fontSize: 18,
    color: '#999',
  },
});
