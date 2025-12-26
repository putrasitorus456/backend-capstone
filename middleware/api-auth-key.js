module.exports = function apiKeyAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ message: "Missing API key" });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  next();
};