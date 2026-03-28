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
  removeTestSession,
  knex
} = require('./db');
const { login, changePassword, authMiddleware, verify } = require('./auth');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  path: process.env.SOCKET_PATH || '/socket.io',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3002;
const PREFIX = process.env.API_PREFIX || '';

app.use(cors());
app.use(express.json());

// Routes Router
const router = express.Router();

router.use('/screenshots', express.static(path.join(__dirname, 'public/screenshots')));

router.post('/api/tests/run', async (req, res) => {
  const { url, goal, context, engine } = req.body;

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
    engine: engine || 'playwright',
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
        if (testData.status !== 'failed') {
          testData.status = 'completed';
        }
        testData.endTime = new Date();
        await saveTestSession(testData);
        console.log(`Test ${testId} finished with status: ${testData.status}`);
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
    const testId = req.params.id;
    const test = await getTestSessionById(testId);

    if (test && test.screenshots && test.screenshots.length > 0) {
      console.log(`Starting cleanup for test ${testId}: ${test.screenshots.length} files found.`);
      test.screenshots.forEach(s => {
        try {
          if (s && typeof s === 'string') {
            const fileName = path.basename(s);
            const filePath = path.join(__dirname, 'public/screenshots', fileName);
            console.log(`Checking file: ${filePath}`);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`✓ Deleted file: ${fileName}`);
            } else {
              console.log(`- File not found on disk: ${fileName}`);
            }
          }
        } catch (fileErr) {
          console.error(`! Failed to delete file ${s}:`, fileErr);
        }
      });
    } else {
      console.log(`No screenshots found for test ${testId}.`);
    }

    await removeTestSession(testId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting test session:', err);
    res.status(500).json({ error: 'Error deleting test session' });
  }
});

// Auth routes
router.post('/api/auth/login', login);
router.post('/api/auth/change-password', changePassword);
router.get('/api/auth/verify', authMiddleware, verify);

// Allowed URLs management
router.get('/api/allowed-urls', authMiddleware, async (req, res) => {
  try {
    const urls = await getAllowedUrls();
    res.json(urls);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching allowed URLs' });
  }
});

router.post('/api/allowed-urls', authMiddleware, async (req, res) => {
  const { label, url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    await addAllowedUrl(label, url);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error adding allowed URL' });
  }
});

router.delete('/api/allowed-urls/:id', authMiddleware, async (req, res) => {
  try {
    await removeAllowedUrl(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error removing allowed URL' });
  }
});

router.get('/api/health', async (req, res) => {
  const status = {
    server: 'online',
    database: 'offline',
    playwright: 'offline',
    selenium: 'offline',
    cypress: 'offline'
  };

  try {
    await knex.raw('SELECT 1');
    status.database = 'online';
  } catch (e) { }

  try {
    require.resolve('playwright');
    status.playwright = 'online';
  } catch (e) { }

  try {
    require.resolve('selenium-webdriver');
    status.selenium = 'online';
  } catch (e) { }

  try {
    require.resolve('cypress');
    status.cypress = 'online';
  } catch (e) { }

  res.json(status);
});

// Apply router with prefix
app.use(PREFIX, router);

server.listen(PORT, () => {
  console.log(`Máquina de Testes Server running at: http://localhost:${PORT}${PREFIX}`);
});
