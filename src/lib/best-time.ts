const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const BUCKETS: { label: string; start: number; end: number }[] = [
  { label: "6 AM - 9 AM", start: 6, end: 9 },
  { label: "9 AM - 12 PM", start: 9, end: 12 },
  { label: "12 PM - 3 PM", start: 12, end: 15 },
  { label: "3 PM - 6 PM", start: 15, end: 18 },
  { label: "6 PM - 9 PM", start: 18, end: 21 },
  { label: "9 PM - 12 AM", start: 21, end: 24 },
  { label: "12 AM - 6 AM", start: 0, end: 6 },
];

export type BestTimeResult = {
  bestDay: string;
  bestDayCount: number;
  bestBucket: string;
  bestBucketCount: number;
  totalAnalyzed: number;
  insight: string;
};

/** Analyzes real review timestamps (no AI, no fabrication) to find when
 * this business actually receives the most reviews - a genuine proxy for
 * when customers are engaged, useful for timing review-ask reminders and
 * GMB posts. Returns null if there isn't enough data yet. */
export function computeBestTimeToPost(reviewTimestamps: string[]): BestTimeResult | null {
  if (reviewTimestamps.length < 5) return null;

  const dayCounts = new Array(7).fill(0);
  const bucketCounts = new Array(BUCKETS.length).fill(0);

  for (const ts of reviewTimestamps) {
    const d = new Date(ts);
    if (isNaN(d.getTime())) continue;
    dayCounts[d.getDay()]++;
    const hour = d.getHours();
    const bucketIdx = BUCKETS.findIndex((b) => (b.start < b.end ? hour >= b.start && hour < b.end : hour >= b.start || hour < b.end));
    if (bucketIdx >= 0) bucketCounts[bucketIdx]++;
  }

  const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const bestBucketIdx = bucketCounts.indexOf(Math.max(...bucketCounts));

  const bestDay = DAYS[bestDayIdx];
  const bestBucket = BUCKETS[bestBucketIdx].label;
  const bestDayCount = dayCounts[bestDayIdx];
  const bestBucketCount = bucketCounts[bestBucketIdx];

  return {
    bestDay,
    bestDayCount,
    bestBucket,
    bestBucketCount,
    totalAnalyzed: reviewTimestamps.length,
    insight: `Most of your reviews (${bestDayCount} of ${reviewTimestamps.length}) come in on ${bestDay}s, and reviewers are most active between ${bestBucket}. That's a good window to send review reminders or publish a new GMB post.`,
  };
}
