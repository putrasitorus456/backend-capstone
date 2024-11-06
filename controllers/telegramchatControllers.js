const axios = require('axios');
const Event = require('../models/event');
const { processResponse } = require('./responsesControllers');

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const TELEGRAM_BOT_TOKEN = '8145457978:AAFTNtPFHIzN9Xh8XMYey8tblCEMjBMErfM';
const CHAT_ID = '-1002364357380';

const sendRepairNotification = async (anchor_code, streetlight_code, problem, location) => {
  const [latitude, longitude] = location;
  const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const message = `*Pemberitahuan Perbaikan Lampu Jalan*\n\nYth. Petugas Perbaikan,\n\nKami ingin menginformasikan bahwa terdapat lampu jalan yang bermasalah di lokasi berikut:\n\nKode anchor: ${anchor_code}\nKode lampu: ${streetlight_code || 'Tidak ada'}\nLokasi: [Klik untuk melihat lokasi](${googleMapsLink})\nDetail masalah: ${problem}\n\nSilakan klik tombol di bawah ini untuk memulai perbaikan.`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: 'Mulai Perbaikan',
          callback_data: `start_repair|${anchor_code}|${streetlight_code || 'none'}`,
        },
      ],
    ],
  };

  try {
    await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.error('Error sending message: ', error.message);
  }
};

const handleTelegramCallbackQuery = async (req, res) => {
  const callbackQuery = req.body.callback_query;
  if (!callbackQuery || !callbackQuery.data) {
    return res.sendStatus(200);
  }

  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const [action, anchor_code, streetlight_code] = callbackQuery.data.split('|');

  if (action === 'start_repair') {
    await Event.findOneAndUpdate(
      { anchor_code, streetlight_code: streetlight_code === 'none' ? { $exists: false } : streetlight_code },
      { repaired_yet: 1 }
    );

    const confirmMessage = `Perbaikan pada lampu dengan kode anchor: ${anchor_code} dan kode lampu: ${streetlight_code === 'none' ? 'Tidak ada' : streetlight_code} telah dimulai.`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: 'Selesai Perbaikan',
            callback_data: `finish_repair|${anchor_code}|${streetlight_code}`,
          },
        ],
      ],
    };

    await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });

    await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: confirmMessage,
    });
  } else if (action === 'finish_repair') {
    const updateResult = await Event.findOneAndUpdate(
      { anchor_code, streetlight_code: streetlight_code === 'none' ? { $exists: false } : streetlight_code },
      { repaired_yet: 2 }
    );

    if (updateResult) {
      console.log('repaired_yet berhasil diubah menjadi 2');

      // Panggil processResponse segera setelah repaired_yet diubah menjadi 2
      await processResponse({
        type: 1,
        problem: updateResult.problem,
        anchor_code: updateResult.anchor_code,
        streetlight_code: updateResult.streetlight_code,
      });
      console.log('processResponse selesai setelah perubahan menjadi 2');
    } else {
      console.log('Gagal menemukan dan memperbarui dokumen untuk finish_repair');
    }

    const finishMessage = `Perbaikan pada lampu dengan kode anchor: ${anchor_code} dan kode lampu: ${streetlight_code === 'none' ? 'Tidak ada' : streetlight_code} telah selesai dan akan diverifikasi.`;

    await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });

    await axios.post(`${TELEGRAM_API_URL}${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: finishMessage,
    });
  }

  res.sendStatus(200);
};

const sendMessage = async (req, res) => {
  const { anchor_code, streetlight_code, problem, location } = req.body;

  if (!anchor_code || !problem || !location) {
    return res.status(400).json({ message: 'Not enough data' });
  }

  await sendRepairNotification(anchor_code, streetlight_code, problem, location);

  res.status(200).json({ message: 'Pesan sedang dikirim ke Telegram' });
};

module.exports = {
  sendMessage,
  handleTelegramCallbackQuery,
};