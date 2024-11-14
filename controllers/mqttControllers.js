const mqtt = require('mqtt');
const dotenv = require('dotenv');
const axios = require('axios');
const { createNotificationDirect } = require('../controllers/notificationControllers');
const { processResponse } = require('../controllers/responsesControllers');
const Response = require('../models/responses');

dotenv.config();

const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

const publishGetInfo = async (req, res) => {
  const { block } = req.body;
  const message = 'INFO-' + block;

  if (!block) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let responseReceived = false;

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', (topic, message) => {
      if (topic === 'PJU-Response'){
        responseReceived = true;

        res.status(200).json({ message: 'Response received from control', data: message.toString() });

        client.unsubscribe('PJU-Response');
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Fungsi untuk mengecek apakah sudah ada response dalam 2 menit terakhir
const checkRecentResponse = async (anchorCode, streetlightCode = undefined) => {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  // Buat query dasar untuk anchorCode dan waktu
  const query = {
    anchor_code: anchorCode,
    date: { $gte: twoMinutesAgo } // Menggunakan field `date` untuk filter waktu
  };

  // Jika streetlightCode disediakan, tambahkan ke query
  if (streetlightCode !== undefined) {
    query.streetlight_code = streetlightCode;
  }

  const recentResponse = await Response.findOne(query);

  return !!recentResponse; // Mengembalikan true jika ada data, false jika tidak
};

const publishTurnOn = async (req, res) => {
  const { block } = req.body;
  const message = 'ON-' + block;

  if (!block) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let responseReceived = false; // Flag untuk memastikan respons hanya dikirim sekali

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response' && !responseReceived) { // Cek apakah respons sudah diterima
        responseReceived = true; // Set flag menjadi true
        client.unsubscribe('PJU-Response'); // Unsubscribe setelah menerima respons pertama

        const responseData = message.toString();
        const dataParts = responseData.split('-');

        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }

        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);

        await createNotificationDirect(1, anchorCode);

        // Cek data anchorCode sebelum proses response
        if (anchorStatus !== 1) {
          const alreadyProcessed = await checkRecentResponse(anchorCode);
          if (!alreadyProcessed) {
            const problemMapping = { 0: "komunikasi", 2: "lampu", 3: "lampu", 4: "sensor" };
            const payloadResponse = {
              type: 0,
              problem: problemMapping[anchorStatus] || "unknown",
              anchor_code: anchorCode
            };
            await processResponse(payloadResponse);
          }
        }

        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          await createNotificationDirect(1, anchorCode, streetlightCode);

          if (nodeStatuses[i] !== 1) {
            const alreadyProcessed = await checkRecentResponse(anchorCode, streetlightCode);
            if (!alreadyProcessed) {
              const problemMapping = { 0: "komunikasi", 2: "lampu", 3: "lampu", 4: "sensor" };
              const payloadResponse = {
                type: 0,
                problem: problemMapping[nodeStatuses[i]] || "unknown",
                anchor_code: anchorCode,
                streetlight_code: streetlightCode
              };
              await processResponse(payloadResponse);
            }
          }
        }

        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });
  } catch (error) {
    // Jika terjadi error sebelum respons dikirim, pastikan kita mengirim respons error
    if (!responseReceived) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
};

const publishTurnOff = async (req, res) => {
  const { block } = req.body;
  const message = 'OFF-' + block;

  if (!block) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let responseReceived = false; // Flag untuk memastikan respons hanya dikirim sekali

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response' && !responseReceived) { // Cek apakah respons sudah diterima
        responseReceived = true; // Set flag menjadi true
        client.unsubscribe('PJU-Response'); // Unsubscribe setelah menerima respons pertama

        const responseData = message.toString();
        const dataParts = responseData.split('-');

        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }

        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);

        await createNotificationDirect(0, anchorCode);

        // Cek data anchorCode sebelum proses response
        if (anchorStatus !== 2) {
          const alreadyProcessed = await checkRecentResponse(anchorCode);
          if (!alreadyProcessed) {
            const problemMapping = { 0: "komunikasi", 1: "lampu", 3: "lampu", 4: "sensor" };
            const payloadResponse = {
              type: 0,
              problem: problemMapping[anchorStatus] || "unknown",
              anchor_code: anchorCode
            };
            await processResponse(payloadResponse);
          }
        }

        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          await createNotificationDirect(0, anchorCode, streetlightCode);

          if (nodeStatuses[i] !== 2) {
            const alreadyProcessed = await checkRecentResponse(anchorCode, streetlightCode);
            if (!alreadyProcessed) {
              const problemMapping = { 0: "komunikasi", 1: "lampu", 3: "lampu", 4: "sensor" };
              const payloadResponse = {
                type: 0,
                problem: problemMapping[nodeStatuses[i]] || "unknown",
                anchor_code: anchorCode,
                streetlight_code: streetlightCode
              };
              await processResponse(payloadResponse);
            }
          }
        }

        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });
  } catch (error) {
    // Jika terjadi error sebelum respons dikirim, pastikan kita mengirim respons error
    if (!responseReceived) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
  }
};

module.exports = {
  publishGetInfo,
  publishTurnOn,
  publishTurnOff,
};
