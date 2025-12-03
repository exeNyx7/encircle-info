const express = require('express');
const router = express.Router();
const SecurityLog = require('../models/SecurityLog');
const { authenticate } = require('../middleware/auth');
const { logSecurityEvent, EVENT_TYPES, getIpAddress } = require('../utils/securityLogger');

// Get security statistics (last 24 hours)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get counts by event type
    const stats = await SecurityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: twentyFourHoursAgo }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get critical events count
    const criticalCount = await SecurityLog.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      severity: 'CRITICAL'
    });

    // Format response
    const formattedStats = {
      authFailure: 0,
      authSuccess: 0,
      replayAttack: 0,
      messageSent: 0,
      invalidSignature: 0,
      decryptionFailure: 0,
      criticalCount: criticalCount
    };

    stats.forEach(stat => {
      switch (stat._id) {
        case 'auth_failure':
          formattedStats.authFailure = stat.count;
          break;
        case 'auth_success':
          formattedStats.authSuccess = stat.count;
          break;
        case 'replay_attack_detected':
          formattedStats.replayAttack = stat.count;
          break;
        case 'message_sent':
          formattedStats.messageSent = stat.count;
          break;
        case 'invalid_signature':
          formattedStats.invalidSignature = stat.count;
          break;
        case 'decryption_failure':
          formattedStats.decryptionFailure = stat.count;
          break;
      }
    });

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching security stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch security statistics' });
  }
});

// Get all security logs with pagination and filtering
router.get('/logs', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const filter = {};
    
    // Filter by event type
    if (req.query.eventType && req.query.eventType !== 'all') {
      filter.eventType = req.query.eventType;
    }
    
    // Filter by severity
    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    const logs = await SecurityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await SecurityLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching security logs:', error.message);
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

// Log client-side security event
router.post('/log', authenticate, async (req, res) => {
  try {
    const { eventType, details, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    await logSecurityEvent(eventType, {
      userId: req.userId,
      ipAddress: getIpAddress(req),
      details: details || '',
      metadata: metadata || {}
    });

    res.status(201).json({ message: 'Security event logged' });
  } catch (error) {
    console.error('Error logging client event:', error.message);
    res.status(500).json({ error: 'Failed to log security event' });
  }
});

module.exports = router;
