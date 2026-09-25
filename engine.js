/* DecisionLog engine - decision journaling with calibration scoring. */
const DecisionEngine = (() => {
  'use strict';

  const DAY_MS = 86400000;

  function parseDay(s) {
    if (typeof s !== 'string') throw new Error('date must be a string');
    const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new Error('bad date format, want YYYY-MM-DD');
    const y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error('date out of range');
    const ms = Date.UTC(y, mo - 1, d);
    const dt = new Date(ms);
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw new Error('impossible date');
    return Math.floor(ms / DAY_MS);
  }

  function fmtDay(dayNum) {
    const dt = new Date(dayNum * DAY_MS);
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  }

  function normDecision(d) {
    if (!d || typeof d.text !== 'string' || !d.text.trim()) throw new Error('decision needs text');
    if (typeof d.prediction !== 'string' || !d.prediction.trim()) throw new Error('prediction needs text');
    let conf = Number(d.confidence);
    if (!Number.isFinite(conf) || conf < 50 || conf > 99) throw new Error('confidence must be 50-99%');
    conf = Math.round(conf);
    const review = parseDay(d.reviewDate);
    return {
      text: d.text.trim().slice(0, 300),
      prediction: d.prediction.trim().slice(0, 300),
      confidence: conf,
      reviewDate: fmtDay(review),
      created: d.created || fmtDay(parseDay(d.reviewDate)),
      outcome: null
    };
  }

  function resolve(decision, wasRight) {
    if (decision.outcome !== null && decision.outcome !== undefined) throw new Error('already resolved');
    if (wasRight !== true && wasRight !== false) throw new Error('outcome must be true or false');
    return Object.assign({}, decision, { outcome: wasRight ? 'right' : 'wrong' });
  }

  function dueForReview(list, todayDayNum) {
    return list
      .filter(d => !d.outcome && parseDay(d.reviewDate) <= todayDayNum)
      .map(d => ({ decision: d, daysOverdue: todayDayNum - parseDay(d.reviewDate) }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  function pending(list, todayDayNum) {
    return list
      .filter(d => !d.outcome && parseDay(d.reviewDate) > todayDayNum)
      .map(d => ({ decision: d, daysLeft: parseDay(d.reviewDate) - todayDayNum }))
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }

  // Calibration over resolved decisions: 5 buckets [50,60) [60,70) [70,80) [80,90) [90,100)
  function calibration(list) {
    const resolved = list.filter(d => d.outcome === 'right' || d.outcome === 'wrong');
    const buckets = [];
    for (let lo = 50; lo < 100; lo += 10) {
      const inBucket = resolved.filter(d => d.confidence >= lo && d.confidence < lo + 10);
      if (!inBucket.length) continue;
      const avgConf = inBucket.reduce((s, d) => s + d.confidence, 0) / inBucket.length;
      const acc = inBucket.filter(d => d.outcome === 'right').length / inBucket.length;
      buckets.push({ lo: lo, hi: lo + 10, n: inBucket.length, avgConfidence: avgConf, accuracy: acc });
    }
    const brier = resolved.length
      ? resolved.reduce((s, d) => {
          const p = d.confidence / 100;
          const y = d.outcome === 'right' ? 1 : 0;
          return s + (p - y) * (p - y);
        }, 0) / resolved.length
      : null;
    const overallAcc = resolved.length ? resolved.filter(d => d.outcome === 'right').length / resolved.length : null;
    // overconfidence gap: avg confidence - accuracy (positive = overconfident), over all resolved
    let gap = null;
    if (resolved.length) {
      const avgConf = resolved.reduce((s, d) => s + d.confidence, 0) / resolved.length / 100;
      gap = avgConf - overallAcc;
    }
    return { buckets: buckets, brier: brier, overallAccuracy: overallAcc, resolved: resolved.length, overconfidenceGap: gap };
  }

  return { parseDay, fmtDay, normDecision, resolve, dueForReview, pending, calibration };
})();
if (typeof module !== 'undefined') module.exports = DecisionEngine;
