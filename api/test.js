module.exports = (req, res) => {
  res.status(200).json({
    message: 'Vercel function is working!',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
  });
};
