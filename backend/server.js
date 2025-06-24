const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
const PORT = 3000;

const ESP8266_IP = 'http://192.168.100.47'; // Replace with your actual ESP8266 IP

let baseline = -1;

// Allow JSON parsing and CORS
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // 👈 Required for mobile
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  next();
});

app.get('/read', async (req, res) => {
  try {
    const response = await axios.get(`${ESP8266_IP}/read`);
    res.send(response.data);
  } catch (error) {
    res.status(500).send('❌ Failed to fetch from ESP8266');
  }
});

app.get('/set_baseline', (req, res) => {
  const value = req.query.value;
  if (!value) return res.status(400).json({ error: 'Missing value' });

  baseline = parseInt(value);
  res.json({ baseline });
});

app.get('/get_baseline', (req, res) => {
  res.json({ baseline });
});

app.get('/log', (req, res) => {
  const { value, label } = req.query;
  if (!value || !label) return res.status(400).json({ error: 'Missing data' });

  const row = `${Date.now()},${value},${label}\n`;
  fs.appendFile('posture_data.csv', row, err => {
    if (err) return res.status(500).json({ error: 'Failed to log' });
    res.json({ status: 'logged', value, label });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
