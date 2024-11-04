const mqtt = require('mqtt');
const client = mqtt.connect('pju-c09.cloud.shiftr.io', {
  username: 'your-username',
  password: 'your-password',
});

const publishGetInfo = async (req, res) => {
  const { block } = req.body;
  const message = 'INFO-' + block;

  if (!block) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res
          .status(500)
          .json({ message: 'Failed to publish message', error: error.message });
      }
      res.status(200).json({ message: 'Message published successfully' });
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

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res
          .status(500)
          .json({ message: 'Failed to publish message', error: error.message });
      }
      res.status(200).json({ message: 'Message published successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const publishTurnOff = async (req, res) => {
  const { block } = req.body;
  const message = 'OFF-' + block;

  if (!block) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    client.publish('PJU-Control', message, (error) => {
      if (error) {
        return res
          .status(500)
          .json({ message: 'Failed to publish message', error: error.message });
      }
      res.status(200).json({ message: 'Message published successfully' });
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
