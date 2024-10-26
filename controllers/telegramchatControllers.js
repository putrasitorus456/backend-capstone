const axios = require('axios');

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const TELEGRAM_BOT_TOKEN = '8145457978:AAFTNtPFHIzN9Xh8XMYey8tblCEMjBMErfM';
const CHAT_ID = '-1002364357380';

const sendTelegramMessage = async (anchor_code, streetlight_code, problem, location) => {
  const [latitude, longitude] = location;

  const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const message = `*Pemberitahuan Perbaikan Lampu Jalan*\n\nYth. Petugas Perbaikan,\n\nKami ingin menginformasikan bahwa terdapat lampu jalan yang bermasalah di lokasi berikut:\n\nKode anchor: ${anchor_code}\nKode lampu: ${streetlight_code}\nLokasi: [Klik untuk melihat lokasi](${googleMapsLink})\nDetail masalah: ${problem}\n\nKami mohon agar dapat segera dilakukan perbaikan untuk memastikan keselamatan dan kenyamanan warga sekitar.\n\nTerima kasih atas perhatian dan kerjasamanya.\n\nSalam.`;

  try {
    const response = await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log('Message sent');
  } catch (error) {
    console.error('Error sending message: ', error.message);
  }
};

const sendMessage = async (req, res) => {
  const { anchor_code, streetlight_code, problem, location } = req.body;

  if (!anchor_code || !problem || !location) {
    return res.status(400).json({ message: 'Not enough data' });
  }

  sendTelegramMessage(anchor_code, streetlight_code, problem, location);

  res.status(200).json({ message: 'Pesan sedang dikirim ke Telegram' });
};

module.exports = {
  sendMessage,
};