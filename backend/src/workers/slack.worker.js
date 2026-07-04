
const axios = require('axios')

async function sendSlackAlert(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    return false
  }

  await axios.post(webhookUrl, {
    text: message,
  })

  return true
}

module.exports = {
  sendSlackAlert,
}