const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { runGenericTest } = require('./runner');
const { 
  saveTestSession, 
  getTestSessions, 
  getTestSessionById,
  getAllowedUrls,
  addAllowedUrl,
  removeAllowedUrl,
  removeTestSession
} = require('./db');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: process.env.SOCKET_PATH || '/maquinadeteste/socket.io',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 8084;
const PREFIX = process.env.API_PREFIX || '/maquinadeteste';

app.use(cors());
app.use(express.json());

// Routes Router
const router = express.Router();

router.use('/screenshots', express.static(path.join(__dirname, 'public/screenshots')));

router.post('/api/tests/run', async (req, res) => {
  const { url, goal, context } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const testId = Date.now().toString();
  const testData = {
    id: testId,
    url,
    goal,
    context,
    status: 'starting',
    logs: [],
    screenshots: [],
    startTime: new Date()
  };

  try {
    await saveTestSession(testData);
    
    runGenericTest(testId, testData, io, async (updatedData) => {
       await saveTestSession(updatedData);
    })
      .then(async () => {
        testData.status = 'completed';
        testData.endTime = new Date();
        await saveTestSession(testData);
        console.log(`Test ${testId} completed successfully`);
      })
      .catch(async (err) => {
        testData.status = 'failed';
        testData.error = err.message;
        testData.endTime = new Date();
        await saveTestSession(testData);
        console.error(`Test ${testId} failed:`, err);
      });

    res.json({ testId, message: 'Test started' });
  } catch (err) {
    res.status(500).json({ error: 'Database error starting the test' });
  }
});

router.get('/api/history', async (req, res) => {
  const sessions = await getTestSessions();
  res.json(sessions);
});

router.get('/api/tests/:id', async (req, res) => {
  const test = await getTestSessionById(req.params.id);
  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }
  res.json(test);
});

router.delete('/api/tests/:id', async (req, res) => {
  try {
    await removeTestSession(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting test session' });
  }
});

// Allowed URLs management
router.get('/api/allowed-urls', async (req, res) => {
  try {
    const urls = await getAllowedUrls();
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching allowed URLs' });
  }
});

router.post('/api/allowed-urls', async (req, res) => {
  const { label, url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    await addAllowedUrl(label, url);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error adding allowed URL' });
  }
});

router.delete('/api/allowed-urls/:id', async (req, res) => {
  try {
    await removeAllowedUrl(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error removing allowed URL' });
  }
});

// Apply router with prefix
app.use(PREFIX, router);

server.listen(PORT, () => {
  console.log(`AutoTesteAI Server running at: http://localhost:${PORT}${PREFIX}`);
});
