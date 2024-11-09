const mqtt = require('mqtt');
const dotenv = require('dotenv');
const axios = require('axios');
const { createNotificationDirect } = require('../controllers/notificationControllers');
const { processResponse } = require('../controllers/responsesControllers');

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

const publishTurnOn = async (req, res) => {
  const { block } = req.body;
  const message = 'ON-' + block;

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

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response') {
        responseReceived = true;
        console.log ('Response received from control', message.toString());
        client.unsubscribe('PJU-Response');
    
        const responseData = message.toString();
        const dataParts = responseData.split('-');
    
        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }
    
        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);
    
        await createNotificationDirect(1, anchorCode);
    
        if (anchorStatus !== 1) {
          const problemMapping = { 0: "komunikasi", 2: "lampu", 3: "lampu", 4: "sensor" };
          const payloadResponse = {
            type: 0,
            problem: problemMapping[anchorStatus] || "unknown",
            anchor_code: anchorCode
          };
          
          // Panggil fungsi processResponse langsung
          await processResponse(payloadResponse);
        }
    
        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          await createNotificationDirect(1, anchorCode, streetlightCode);
    
          if (nodeStatuses[i] !== 1) {
            const problemMapping = { 0: "komunikasi", 2: "lampu", 3: "lampu", 4: "sensor" };
            const payloadResponse = {
              type: 0,
              problem: problemMapping[nodeStatuses[i]] || "unknown",
              anchor_code: anchorCode,
              streetlight_code: streetlightCode
            };
    
            // Panggil fungsi processResponse langsung
            await processResponse(payloadResponse);
          }
        }
    
        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });    
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const sendNotificationOn = async (status, anchorCode, streetlightCode = null) => {
  const type = status === 1 ? 1 : 3;

  const notificationData = {
    type,
    anchor_code: anchorCode,
    ...(streetlightCode && { streetlight_code: streetlightCode })
  };

  try {
    await axios.post('https://pju-backend.vercel.app/api/notification', notificationData);
  } catch (error) {
    console.error(`Failed to send notification for ${anchorCode}${streetlightCode ? ` node ${streetlightCode}` : ''}:`, error.message);
  }
};

const sendNotificationOff = async (status, anchorCode, streetlightCode = null) => {
  const type = status === 0 ? 0 : 3;

  const notificationData = {
    type,
    anchor_code: anchorCode,
    ...(streetlightCode && { streetlight_code: streetlightCode })
  };

  try {
    console.log('Sending notification for', anchorCode, streetlightCode, notificationData);
    await axios.post('https://pju-backend.vercel.app/api/notification', notificationData);
  } catch (error) {
    console.error(`Failed to send notification for ${anchorCode}${streetlightCode ? ` node ${streetlightCode}` : ''}:`, error.message);
  }
};

const publishTurnOff = async (req, res) => {
  const { block } = req.body;
  const message = 'OFF-' + block;

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

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response') {
        responseReceived = true;
        client.unsubscribe('PJU-Response');
    
        const responseData = message.toString();
        const dataParts = responseData.split('-');
    
        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }
    
        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);
    
        await createNotificationDirect(0, anchorCode);
    
        if (anchorStatus !== 2) {
          const problemMapping = { 0: "komunikasi", 1: "lampu", 3: "lampu", 4: "sensor" };
          const payloadResponse = {
            type: 0,
            problem: problemMapping[anchorStatus] || "unknown",
            anchor_code: anchorCode
          };
    
          // Panggil fungsi processResponse langsung
          await processResponse(payloadResponse);
        }
    
        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          await createNotificationDirect(0, anchorCode, streetlightCode);
    
          if (nodeStatuses[i] !== 2) {
            const problemMapping = { 0: "komunikasi", 1: "lampu", 3: "lampu", 4: "sensor" };
            const payloadResponse = {
              type: 0,
              problem: problemMapping[nodeStatuses[i]] || "unknown",
              anchor_code: anchorCode,
              streetlight_code: streetlightCode
            };
    
            // Panggil fungsi processResponse langsung
            await processResponse(payloadResponse);
          }
        }
    
        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });    
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  publishGetInfo,
  publishTurnOn,
  publishTurnOff,
};
