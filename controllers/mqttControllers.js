const mqtt = require('mqtt');
const dotenv = require('dotenv');
const axios = require('axios');

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

  const timeout = setTimeout(() => {
    if (!responseReceived) {
      res.status(504).json({ message: 'Timeout: No response from control within 1.5 minutes' });
    }
  }, 60 * 1000);

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', (topic, message) => {
      if (topic === 'PJU-Response'){
        clearTimeout(timeout);
        responseReceived = true;

        res.status(200).json({ message: 'Response received from control', data: message.toString() });

        // client.unsubscribe('PJU-Response');
      }
    });
  } catch (error) {
    clearTimeout(timeout);
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
  const timeout = setTimeout(() => {
    if (!responseReceived) {
      res.status(504).json({ message: 'Timeout: No response from control within 1 minute' });
    }
  }, 60 * 1000);

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response') {
        clearTimeout(timeout);
        responseReceived = true;

        const responseData = message.toString();
        const dataParts = responseData.split('-');
        
        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }

        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);

        console.log(anchorStatus, anchorCode);
        await sendNotificationOn(1, anchorCode);

        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          console.log(nodeStatuses[i], anchorCode, streetlightCode);
          await sendNotificationOn(1, anchorCode, streetlightCode);
        }

        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });
  } catch (error) {
    clearTimeout(timeout);
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
    console.log('Sending notification for', anchorCode, streetlightCode, notificationData);
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
  const timeout = setTimeout(() => {
    if (!responseReceived) {
      res.status(504).json({ message: 'Timeout: No response from control within 1.5 minutes' });
    }
  }, 60 * 1000);

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to publish message', error: error.message });
      }
    });

    client.subscribe('PJU-Response', (err) => {
      if (err) {
        clearTimeout(timeout);
        return res.status(500).json({ message: 'Failed to subscribe to response topic', error: err.message });
      }
    });

    client.on('message', async (topic, message) => {
      if (topic === 'PJU-Response') {
        clearTimeout(timeout);
        responseReceived = true;

        const responseData = message.toString();
        const dataParts = responseData.split('-'); // split data by '-'
        
        if (dataParts.length < 4) {
          return res.status(500).json({ message: 'Invalid response format' });
        }

        const [prefix, blockNumber, anchorCode, statusString] = dataParts;
        const anchorStatus = parseInt(statusString.charAt(0));
        const nodeStatuses = statusString.slice(1).split('').map(Number);

        // Send notification for anchor
        await sendNotificationOff(0, anchorCode);

        // Send notifications for each node status
        for (let i = 0; i < nodeStatuses.length; i++) {
          const streetlightCode = i + 1;
          await sendNotificationOff(0, anchorCode, streetlightCode);
        }

        res.status(200).json({ message: 'Response received from control', data: responseData });
      }
    });
  } catch (error) {
    clearTimeout(timeout);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  publishGetInfo,
  publishTurnOn,
  publishTurnOff,
};
