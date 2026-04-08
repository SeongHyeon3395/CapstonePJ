require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const base = 'http://localhost:3000/api/news';

function buildCounts(rows){
  const counts = {};
  for (const row of rows || []) {
    const k = String(row.keyword || '').trim();
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  return counts;
}

(async () => {
  const before = await supabase.from('articles').select('keyword');
  if (before.error) throw before.error;

  const beforeCounts = buildCounts(before.data);
  const singles = Object.entries(beforeCounts)
    .filter(([, v]) => v === 1)
    .map(([k]) => k);

  console.log('singleCategoriesBefore=' + singles.length);
  if (singles.length === 0) {
    console.log('No single-count categories found.');
    return;
  }

  const details = [];
  let grandAdded = 0;

  for (const keyword of singles) {
    let added = 0;
    let attempts = 0;

    while (added < 10 && attempts < 5) {
      attempts += 1;
      const need = 10 - added;
      try {
        const res = await axios.get(base, {
          params: {
            keyword,
            targetCount: need,
            sinceYear: 2026,
          },
          timeout: 240000,
        });
        const now = Number(res.data?.total || 0);
        added += now;
        console.log(`keyword=${keyword}, attempt=${attempts}, addedNow=${now}, addedTotal=${added}`);
        if (now === 0) break;
      } catch (error) {
        const msg = error?.message || String(error);
        console.log(`keyword=${keyword}, attempt=${attempts}, error=${msg}`);
        break;
      }
    }

    grandAdded += added;
    details.push({ keyword, added, attempts });
  }

  const after = await supabase.from('articles').select('keyword');
  if (after.error) throw after.error;
  const afterCounts = buildCounts(after.data);

  const stillLessThanEleven = singles.filter((k) => (afterCounts[k] || 0) < 11);

  console.log('totalAddedForSingleCategories=' + grandAdded);
  console.log('details=' + JSON.stringify(details));
  console.log('stillBelow11Count=' + stillLessThanEleven.length);
  console.log('stillBelow11=' + JSON.stringify(stillLessThanEleven));
})();
