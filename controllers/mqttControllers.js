const mqtt = require('mqtt');
const dotenv = require('dotenv');

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
  }, 90 * 1000);

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

        client.unsubscribe('PJU-Response');
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
      res.status(504).json({ message: 'Timeout: No response from control within 1.5 minutes' });
    }
  }, 90 * 1000);

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
      if (topic === 'PJU-Response') {
        clearTimeout(timeout);
        responseReceived = true;
        res.status(200).json({ message: 'Response received from control', data: message.toString() });
        client.unsubscribe('PJU-Response');
      }
    });
  } catch (error) {
    clearTimeout(timeout);
    res.status(500).json({ message: 'Server Error', error: error.message });
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
  }, 90 * 1000);

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
      if (topic === 'PJU-Response') {
        clearTimeout(timeout);
        responseReceived = true;
        res.status(200).json({ message: 'Response received from control', data: message.toString() });
        client.unsubscribe('PJU-Response');
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
