const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('../config/db');
const userRoutes = require('../routes/userRoutes');
const responsesRoutes = require('../routes/responsesRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const telegramchatRoutes = require('../routes/telegramchatRoutes');
const streetlightRoutes = require('../routes/streetlightRoutes');
const eventRoutes = require('../routes/eventRoutes');
const graphRoutes = require('../routes/graphRoutes');
const mqttRoutes = require('../routes/mqttRoutes')
const cron = require('node-cron');

const apiKeyAuth = require('../middleware/api-auth-key');

dotenv.config();

connectDB();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://frontend-capstone-rho.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
  })
);

const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api", apiKeyAuth);

app.use('/api/users', userRoutes);
app.use('/api/responses', responsesRoutes);
app.use('/api/notification', notificationRoutes);
app.use('/api/message', telegramchatRoutes);
app.use('/api/streetlights', streetlightRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/mqtt', mqttRoutes)

app.get('/', (req, res) => {
  res.send('Backend for PJU Dashboard!');
});

cron.schedule('0 18 * * *', () => {
  console.log('Penyalaan lampu pada jadwal 18.00');
}, {
  timezone: "Asia/Jakarta"
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});