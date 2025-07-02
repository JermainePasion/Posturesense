// HomeStack.js

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

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StickFigureScreen from './StickFigureScreen';

const ESP_IP = '192.168.100.66';
const BACKEND_IP = '192.168.100.8';

const Stack = createNativeStackNavigator();

function HomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [baseline, setBaseline] = useState(null);

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
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 1500);
    return () => clearInterval(interval);
  }, []);

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
//test
export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
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
    marginBottom: 30,
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
