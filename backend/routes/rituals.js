const express = require('express');
const { getRitualSummary } = require('../services/db');
const { getCurrentUserId } = require('../services/membership');

const router = express.Router();

router.get('/:contactId/summary', (req, res) => {
  const summary = getRitualSummary(req.params.contactId, getCurrentUserId(req));
  if (!summary) {
    return res.status(404).json({ error: '关系记录不存在' });
  }
  res.json(summary);
});

module.exports = router;
