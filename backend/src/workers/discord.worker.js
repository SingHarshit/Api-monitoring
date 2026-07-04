const axios = require('axios')

async function sendDiscordAlert(message) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    return false
  }

  await axios.post(webhookUrl, {
    content: message,
  })

  return true
}

module.exports = {
  sendDiscordAlert,
}