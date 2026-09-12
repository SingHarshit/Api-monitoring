const axios = require('axios')

const fastApiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || 'http://localhost:8000',
  timeout: Number(process.env.FASTAPI_TIMEOUT_MS || 15000),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

if (process.env.FASTAPI_API_KEY) {
  fastApiClient.defaults.headers.common.Authorization = `Bearer ${process.env.FASTAPI_API_KEY}`
}

function normalizeError(error) {
  if (error.response) {
    const responseData = error.response.data

    return new Error(
      responseData?.detail ||
        responseData?.message ||
        `FastAPI request failed with status ${error.response.status}`
    )
  }

  if (error.request) {
    return new Error('FastAPI service did not respond')
  }

  return new Error(error.message || 'FastAPI request failed')
}

async function analyzeMonitor(payload, options = {}) {
  const {
    signal,
    requestId,
  } = options

  try {
    const response = await fastApiClient.post('/v1/analyze/monitor', payload, {
      signal,
      headers: requestId
        ? {
            'X-Request-ID': requestId,
          }
        : undefined,
    })

    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

async function checkFastApiHealth() {
  try {
    const response = await fastApiClient.get('/health')
    return response.data
  } catch (error) {
    throw normalizeError(error)
  }
}

module.exports = {
  analyzeMonitor,
  checkFastApiHealth,
}