/* ============================================================
   QUOTE ENGINE
   Looks up real product data (term / whole life / VUL) from
   quote-data.js by age + monthly budget, for the site-wide
   "Get a Quote" popup. Requires quote-data.js to be loaded first.
   ============================================================ */

function qeNum(v) {
  return (typeof v === 'number' && !isNaN(v)) ? v : 0;
}

function qeClosestByField(list, field, target) {
  let best = null, bestDiff = Infinity;
  list.forEach(function (item) {
    const val = item[field];
    if (typeof val !== 'number') return;
    const diff = Math.abs(val - target);
    if (diff < bestDiff) { bestDiff = diff; best = item; }
  });
  return best || (list.length ? list[0] : null);
}

function qeClosestAgeKey(obj, age) {
  const keys = Object.keys(obj).map(Number);
  if (!keys.length) return null;
  let best = keys[0], bestDiff = Math.abs(keys[0] - age);
  keys.forEach(function (k) {
    const diff = Math.abs(k - age);
    if (diff < bestDiff) { bestDiff = diff; best = k; }
  });
  return String(best);
}

/* ---- TERM (MODAL_PLANS): tiers "1000","2500","3000","5000", each an array of per-age entries ---- */
function qePickTerm(age, monthlyBudget) {
  const tiers = Object.keys(MODAL_PLANS);
  let bestEntry = null, bestDiff = Infinity;

  tiers.forEach(function (tier) {
    const arr = MODAL_PLANS[tier];
    // find entry in this tier closest to the requested age
    let ageEntry = null, ageDiff = Infinity;
    arr.forEach(function (e) {
      const d = Math.abs(e.age - age);
      if (d < ageDiff) { ageDiff = d; ageEntry = e; }
    });
    if (!ageEntry) return;
    const diff = Math.abs(qeNum(ageEntry.monthly) - monthlyBudget);
    if (diff < bestDiff) { bestDiff = diff; bestEntry = ageEntry; }
  });

  if (!bestEntry) return null;

  const riders = bestEntry.riders || {};
  const addBase = typeof riders['ADD'] === 'number' ? riders['ADD'] : 0;
  const paAdd = typeof riders['PA-ADD'] === 'number' ? riders['PA-ADD'] : 0;
  const disabilityRider = typeof riders['ATPD'] === 'number' ? riders['ATPD'] : 0;
  const ciRider = typeof riders['ALCB'] === 'number' ? riders['ALCB'] : 0;

  return {
    productLabel: 'Term Insurance',
    premiumAnnual: qeNum(bestEntry.annual),
    life: qeNum(bestEntry.sa),
    ci: ciRider,
    disability: disabilityRider,
    accident: addBase + paAdd,
    fundValue: null // pure protection plan, no cash/fund value
  };
}

/* ---- WHOLE LIFE: keyed by age string -> array of tag'd tiers ---- */
function qePickWholeLife(age, monthlyBudget) {
  const ageKey = qeClosestAgeKey(WHOLE_LIFE, age);
  if (!ageKey) return null;
  const options = WHOLE_LIFE[ageKey];
  if (!options || !options.length) return null;

  let best = null, bestDiff = Infinity;
  options.forEach(function (opt) {
    const monthly = qeNum(opt.premium_annual) / 12;
    const diff = Math.abs(monthly - monthlyBudget);
    if (diff < bestDiff) { bestDiff = diff; best = opt; }
  });
  if (!best) return null;

  const cashFields = ['cash_year5', 'cash_year10', 'cash_year15', 'cash_year20', 'cash_age60', 'cash_age65'];
  let maxCash = null;
  cashFields.forEach(function (f) {
    if (typeof best[f] === 'number') {
      if (maxCash === null || best[f] > maxCash) maxCash = best[f];
    }
  });

  return {
    productLabel: 'Whole Life Insurance',
    premiumAnnual: qeNum(best.premium_annual),
    life: qeNum(best.life_insurance),
    ci: qeNum(best.critical_illness),
    disability: qeNum(best.disability),
    accident: qeNum(best.accident),
    fundValue: maxCash
  };
}

/* ---- VUL: keyed by age string -> array of named plans ---- */
function qePickVUL(age, monthlyBudget) {
  const ageKey = qeClosestAgeKey(VUL, age);
  if (!ageKey) return null;
  const options = VUL[ageKey];
  if (!options || !options.length) return null;

  const best = qeClosestByField(options, 'monthly_premium', monthlyBudget);
  if (!best) return null;

  const cashFields = ['cash_year5', 'cash_year10', 'cash_year15', 'cash_year20', 'cash_year60', 'cash_year65'];
  let maxCash = null;
  cashFields.forEach(function (f) {
    if (typeof best[f] === 'number') {
      if (maxCash === null || best[f] > maxCash) maxCash = best[f];
    }
  });

  return {
    productLabel: 'VUL (Variable Universal Life)',
    premiumAnnual: qeNum(best.annual_premium),
    life: qeNum(best.life_insurance),
    ci: qeNum(best.ci_accelerated),
    disability: qeNum(best.permanent_disability),
    accident: qeNum(best.pa_accident),
    fundValue: maxCash
  };
}

/* type: 'term' | 'whole' | 'vul' */
function qeBuildQuote(type, age, monthlyBudget) {
  const safeAge = Math.max(18, Math.min(75, Math.round(age) || 30));
  if (type === 'term') return qePickTerm(safeAge, monthlyBudget);
  if (type === 'whole') return qePickWholeLife(safeAge, monthlyBudget);
  if (type === 'vul') return qePickVUL(safeAge, monthlyBudget);
  return null;
}
