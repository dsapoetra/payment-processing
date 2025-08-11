module.exports = async (req, res) => {
  try {
    // Simple response for now to test if the function works
    res.status(200).json({
      message: 'NestJS API is working!',
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: req.headers
    });
  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  }
};
