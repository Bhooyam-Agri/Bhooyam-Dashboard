const Alert = require('../models/Alert');

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.user.id })
      .sort('-createdAt');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.configureAlerts = async (req, res) => {
  try {
    const { thresholds } = req.body;
    await Alert.findOneAndUpdate(
      { user: req.user.id },
      { thresholds },
      { upsert: true }
    );
    res.json({ message: 'Alert configuration updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 