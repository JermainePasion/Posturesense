import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import axios from 'axios';

const ESP_IP = '192.168.100.66';

export default function StickFigureScreen() {
  const [flexAngle, setFlexAngle] = useState(0);
  const [angleY, setAngleY] = useState(0);
  const [angleZ, setAngleZ] = useState(0);

  const [flexColor, setFlexColor] = useState('gray');
  const [yColor, setYColor] = useState('gray');
  const [zColor, setZColor] = useState('gray');

 const fetchData = async () => {
  try {
    const response = await axios.get(`http://${ESP_IP}/read`);
    const json = response.data;

    setFlexAngle(json.flexAngle || 0);
    setAngleY(json.angleY || 0);
    setAngleZ(json.angleZ || 0);

    // Flex posture
    const flex = json.flexAngle;
    if (flex <= 15) setFlexColor('green');
    else if (flex > 15 && flex <= 35) setFlexColor('yellow');
    else setFlexColor('red');

    // Y posture
    if (Math.abs(json.angleY) <= 35) setYColor('green');
    else setYColor('red');

    // Z posture
    if (Math.abs(json.angleZ) <= 45) setZColor('green');
    else setZColor('red');

  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'Failed to fetch data.');
  }
};
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Flex stickman */}
      <Text style={styles.title}>Flex Sensor</Text>
      <Text style={styles.value}>
        Flex Angle: {flexAngle?.toFixed(1)}°
      </Text>
      <StickmanSideways
        color={flexColor}
        rotation={flexAngle}
      />
      <Text style={styles.statusText}>
        {flexColor === 'green' ? 'Good posture!' :
          flexColor === 'yellow' ? 'Slouching' :
            flexColor === 'red' ? 'Bad posture!' : ''}
      </Text>

      {/* Angle Y stickman */}
      <Text style={styles.title}>Gyro Y (Forward-Backward Tilt)</Text>
      <Text style={styles.value}>
        Angle Y: {angleY?.toFixed(1)}°
      </Text>
      <StickmanSideways
        color={yColor}
        rotation={angleY}
      />
      <Text style={styles.statusText}>
        {yColor === 'green' ? 'Good posture!' :
          yColor === 'red' ? 'Bad posture!' : ''}
      </Text>

      {/* Angle Z stickman */}
      <Text style={styles.title}>Gyro Z (Sideways Tilt)</Text>
        <Text style={styles.value}>
        Angle Z: {angleZ?.toFixed(1)}°
        </Text>
        <StickmanSideways
        color={zColor}
        rotation={-angleZ}
        />
        <Text style={styles.statusText}>
        {zColor === 'green' ? 'Good posture!' :
            zColor === 'red' ? 'Bad posture!' : ''}
      </Text>
    </ScrollView>
  );
}

/**
 * A sideways stickman component
 * (always drawn sideways, rotation reflects tilt)
 */
function StickmanSideways({ color, rotation }) {
  return (
    <View style={styles.figureContainer}>
      <View style={[
        styles.stickFigure,
        { transform: [{ rotate: `${rotation}deg` }] }
      ]}>
        {/* Head (side view) */}
        <View style={[
          styles.head,
          { backgroundColor: color }
        ]} />
        {/* Torso (side view) */}
        <View style={[
          styles.torso,
          { backgroundColor: color }
        ]} />
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
