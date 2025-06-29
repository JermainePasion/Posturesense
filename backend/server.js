const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

// To allow React Native to connect
app.use(cors());
app.use(express.json());

// ----------------------------
// CSV CONFIG
// ----------------------------

const csvFilePath = path.join(__dirname, 'posture_log.csv');

// Initialize CSV Writer
const csvWriter = createCsvWriter({
  path: csvFilePath,
  header: [
    { id: 'timestamp', title: 'timestamp' },
    { id: 'mean_angleY', title: 'mean_angleY' },
    { id: 'mean_angleZ', title: 'mean_angleZ' },
    { id: 'mean_flexAngle', title: 'mean_flexAngle' },
    { id: 'min_flexAngle', title: 'min_flexAngle' },
    { id: 'max_flexAngle', title: 'max_flexAngle' },
  ],
  append: fs.existsSync(csvFilePath),
});

// ----------------------------
// DATA BUFFER
// ----------------------------

let postureBuffer = [];   // stores readings every second
let lastWriteTime = Date.now();

// ----------------------------
// ROUTES
// ----------------------------

// ESP will POST data here every second
app.post('/log', (req, res) => {
  const { angleY, angleZ, flexAngle } = req.body;

  postureBuffer.push({
    angleY,
    angleZ,
    flexAngle,
  });

  // Check if it's time to write averages
  const now = Date.now();
  if (now - lastWriteTime >= 60 * 1000) {
    logAverageToCSV();
    lastWriteTime = now;
  }

  res.json({ message: 'Logged!' });
});

// Fetch all logs if you want (optional)
app.get('/logs', (req, res) => {
  if (fs.existsSync(csvFilePath)) {
    const data = fs.readFileSync(csvFilePath, 'utf-8');
    res.type('text/csv').send(data);
  } else {
    res.send('No logs yet.');
  }
});

// ----------------------------
// LOG AVERAGE FUNCTION
// ----------------------------

function logAverageToCSV() {
  if (postureBuffer.length === 0) {
    console.log('No data to log.');
    return;
  }

  const mean_angleY = average(postureBuffer.map(d => d.angleY));
  const mean_angleZ = average(postureBuffer.map(d => d.angleZ));
  const mean_flex = average(postureBuffer.map(d => d.flexAngle));
  const min_flex = Math.min(...postureBuffer.map(d => d.flexAngle));
  const max_flex = Math.max(...postureBuffer.map(d => d.flexAngle));

  const timestamp = new Date().toISOString();

  csvWriter
    .writeRecords([
      {
        timestamp,
        mean_angleY: round(mean_angleY, 2),
        mean_angleZ: round(mean_angleZ, 2),
        mean_flexAngle: round(mean_flex, 1),
        min_flexAngle: round(min_flex, 1),
        max_flexAngle: round(max_flex, 1),
      },
    ])
    .then(() => {
      console.log(`✅ Logged posture data at ${timestamp}`);
    });

  postureBuffer = [];
}

function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function round(val, decimals) {
  return Number(val.toFixed(decimals));
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
