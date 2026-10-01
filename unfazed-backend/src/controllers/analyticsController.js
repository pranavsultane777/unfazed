const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Client = require('../models/Client');

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// @desc    Get dashboard analytics summary for logged-in therapist
// @route   GET /api/analytics/summary?months=12
// @access  Private
const getSummary = async (req, res) => {
  try {
    const therapistId = req.therapist._id;
    const months = Number(req.analyticsMonths || 1);
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const rangeStart = new Date(currentMonthStart);
    rangeStart.setMonth(rangeStart.getMonth() - (months - 1));

    // Real MongoDB aggregations are used for the dashboard metrics.
    const [clientAgg, sessionAgg, revenueAgg, monthlyRevenue, statusBreakdown] = await Promise.all([
      Client.aggregate([
        { $match: { therapist: therapistId } },
        { $group: {
          _id: null,
          totalClients: { $sum: 1 },
          activeClients: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactiveClients: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId } },
        { $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          noShowSessions: { $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] } },
          cancelledSessions: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          bookedSessions: { $sum: { $cond: [{ $eq: ['$status', 'booked'] }, 1, 0] } },
        } },
      ]),
      Payment.aggregate([
        { $match: { therapist: therapistId, status: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$net_amount' }, grossRevenue: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { therapist: therapistId, status: 'paid', createdAt: { $gte: rangeStart } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$net_amount' },
          gross: { $sum: '$amount' },
          transactions: { $sum: 1 },
        } },
        { $sort: { _id: 1 } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const thisMonthSessionAgg = await Session.aggregate([
      { $match: { therapist: therapistId } },
      { $addFields: {
        sessionDate: {
          $dateFromString: {
            dateString: { $concat: ['$date', 'T', '$startTime', ':00'] },
            timezone: '$timezone',
            onError: null,
            onNull: null,
          },
        },
      } },
      { $match: { sessionDate: { $gte: currentMonthStart, $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } } },
      { $count: 'count' },
    ]);

    const upcomingSessions = await Session.find({ therapist: therapistId, status: 'booked' })
      .sort({ date: 1, startTime: 1 })
      .limit(5)
      .populate('client', 'name email')
      .lean();

    const thisMonthRevenueAgg = await Payment.aggregate([
      { $match: { therapist: therapistId, status: 'paid', createdAt: { $gte: currentMonthStart } } },
      { $group: { _id: null, total: { $sum: '$net_amount' } } },
    ]);

    const clientStats = clientAgg[0] || { totalClients: 0, activeClients: 0, inactiveClients: 0 };
    const sessionStats = sessionAgg[0] || {
      totalSessions: 0, completedSessions: 0, noShowSessions: 0,
      cancelledSessions: 0, bookedSessions: 0,
    };
    const revenueStats = revenueAgg[0] || { totalRevenue: 0, grossRevenue: 0 };

    // Attendance excludes cancelled/booked sessions. It is based on the same
    // persisted session statuses used for the no-show metric.
    const attendanceDenominator = sessionStats.completedSessions + sessionStats.noShowSessions;
    const attendanceRate = attendanceDenominator
      ? Number(((sessionStats.completedSessions / attendanceDenominator) * 100).toFixed(2))
      : 0;
    const noShowRate = attendanceDenominator
      ? Number(((sessionStats.noShowSessions / attendanceDenominator) * 100).toFixed(2))
      : 0;

    // Fill missing months server-side so the chart always represents the
    // selected range without inventing revenue values.
    const monthlyMap = new Map(monthlyRevenue.map((row) => [row._id, row]));
    const monthly = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(rangeStart);
      d.setMonth(rangeStart.getMonth() + i);
      const key = monthKey(d);
      const row = monthlyMap.get(key);
      monthly.push({
        month: key,
        total: row?.total || 0,
        gross: row?.gross || 0,
        transactions: row?.transactions || 0,
      });
    }

    res.status(200).json({
      totalClients: clientStats.totalClients,
      activeClients: clientStats.activeClients,
      inactiveClients: clientStats.inactiveClients,
      totalSessions: sessionStats.totalSessions,
      completedSessions: sessionStats.completedSessions,
      noShowSessions: sessionStats.noShowSessions,
      cancelledSessions: sessionStats.cancelledSessions,
      bookedSessions: sessionStats.bookedSessions,
      noShowRate,
      attendanceRate,
      totalEarnings: revenueStats.totalRevenue,
      grossRevenue: revenueStats.grossRevenue,
      thisMonthSessions: thisMonthSessionAgg[0]?.count || 0,
      thisMonthEarnings: thisMonthRevenueAgg[0]?.total || 0,
      statusBreakdown,
      monthlyEarnings: monthly,
      analyticsMonths: months,
      rangeStart: rangeStart.toISOString(),
      upcomingSessions,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { getSummary };
