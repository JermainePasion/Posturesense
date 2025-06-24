import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import axios from 'axios';

const ESP8266_IP = '192.168.100.63'; // Make sure this matches your ESP8266 IP

export default function App() {
  const [flexValue, setFlexValue] = useState(null);
  const [baselineSet, setBaselineSet] = useState(false);

  const fetchFlexValue = async () => {
    try {
      const response = await axios.get(`http://${ESP8266_IP}/read`);
      const match = response.data.match(/\d+/); // Extract number from plain text
      if (match) {
        setFlexValue(Number(match[0]));
      }
    } catch (error) {
      console.log('Error fetching flex value:', error.message);
      setFlexValue(null);
    }
  };

  const handleSetBaseline = () => {
    if (flexValue === null) {
      Alert.alert('Sensor not ready yet');
      return;
    }

    fetch(`http://${ESP8266_IP}/set_threshold?value=${flexValue}`)
      .then(res => res.text())
      .then(text => {
        Alert.alert('Threshold Set', text);
        setBaselineSet(true);
      })
      .catch(err => {
        Alert.alert('Error', 'Failed to set threshold');
        console.log('Set baseline error:', err.message);
      });
  };

  useEffect(() => {
    fetchFlexValue(); // Initial fetch
    const interval = setInterval(fetchFlexValue, 1000); // Poll every second
    return () => clearInterval(interval); // Cleanup
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Flex Sensor Reading</Text>
      <Text style={styles.value}>
        {flexValue !== null ? flexValue : 'Loading...'}
      </Text>

      <View style={{ marginTop: 20 }}>
        <Button
          title="Set Baseline Threshold"
          onPress={handleSetBaseline}
          color="#C15353"
        />
        {baselineSet && <Text style={styles.success}>✅ Threshold Set</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  label: { fontSize: 20 },
  value: { fontSize: 36, color: '#C15353', marginVertical: 10 },
  success: { marginTop: 10, color: 'green' }
});
