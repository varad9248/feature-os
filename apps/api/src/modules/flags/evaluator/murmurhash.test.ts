import { getBucketScore } from './murmurhash';

function testMurmurHashDistribution() {
  console.log('--- Testing MurmurHash3 Sticky Bucketing Uniformity ---');

  const flagKey = 'new-checkout-v2';
  const envId = 'production';
  const totalUsers = 10000;
  const rolloutThreshold = 50.0; // 50% rollout target

  let enabledCount = 0;

  for (let i = 0; i < totalUsers; i++) {
    const userId = `user_${i}_uuid_${Math.sin(i).toString(36).substring(2, 8)}`;
    const score = getBucketScore(userId, flagKey, envId);

    if (score < rolloutThreshold) {
      enabledCount++;
    }
  }

  const enabledPercentage = (enabledCount / totalUsers) * 100;
  console.log(`Total Users Evaluated: ${totalUsers}`);
  console.log(`Enabled Bucket Count : ${enabledCount} (${enabledPercentage.toFixed(2)}%)`);
  console.log(`Target Percentage    : ${rolloutThreshold}%`);

  // Assert distribution is within +/- 2.5% tolerance (47.5% - 52.5%)
  const minTolerance = 47.5;
  const maxTolerance = 52.5;

  if (enabledPercentage >= minTolerance && enabledPercentage <= maxTolerance) {
    console.log('✅ MurmurHash3 Uniformity Test PASSED!');
  } else {
    throw new Error(
      `❌ MurmurHash3 distribution failed! Got ${enabledPercentage}%, expected between ${minTolerance}% and ${maxTolerance}%`,
    );
  }
}

testMurmurHashDistribution();
