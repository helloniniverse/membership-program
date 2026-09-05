/* Harrison VIP Program Simulator
   Connected model:
   Year 1: Membership Fee + Paid Food Sales -> Conservative GP -> covers Base Privilege Cost gap
   Loyalty: Paid Sales -> House Points; Paid Sales -> Conservative GP -> PCQP
   Renewal: Annualized Paid Sales is the gateway; PCQP selects discount tier; renewal is always paid.
*/

const CONFIG = Object.freeze({
  conservativeCostRate: 0.8704,
  conservativeGpRate: 0.1296,
  pcqpRate: 0.10,
  maxScenarioCount: 12,
  annualDays: 365,
  annualWeeks: 52,
  annualMonths: 12
});

const defaults = {
  boss: [25, 50, 75, 100],
  marketing: [25, 50, 75, 100]
};

const data = {
  boss: null,
  marketing: null
};

let renewalTiers = [
  { pcqp: 0, discount: 0 },
  { pcqp: 100, discount: 5 },
  { pcqp: 200, discount: 10 },
  { pcqp: 300, discount: 15 },
  { pcqp: 500, discount: 20 }
];

function money(value) {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(n);
}

function num(value) {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(n);
}

function pct(value, digits = 1) {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return n.toFixed(digits) + '%';
}

function el(id) { return document.getElementById(id); }

function getNumber(id, fallback = 0) {
  const node = el(id);
  if (!node) return fallback;
  const n = parseFloat(node.value);
  return Number.isFinite(n) ? n : fallback;
}

function setText(id, value) {
  const node = el(id);
  if (node) node.textContent = value;
}

function setValue(id, value) {
  const node = el(id);
  if (node) node.value = value;
}

function isChecked(id) {
  const node = el(id);
  return !!node?.checked;
}

function getRadioValue(name, fallback = 'any') {
  const node = document.querySelector(`input[name="${name}"]:checked`);
  return node ? node.value : fallback;
}

function checkedDays(type) {
  return [...document.querySelectorAll(`.${type}-day:checked`)];
}

function safeFloor(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function weeksForMonths(months) {
  return Math.max(0, Number(months || 0) * CONFIG.annualWeeks / CONFIG.annualMonths);
}

function toggleTime(type) {
  const fieldId = type + 'TimeFields';
  const node = el(fieldId);
  if (!node) return;
  const mode = getRadioValue(type + 'TimeMode', 'any');
  node.style.display = mode === 'any' ? 'none' : 'grid';
}

function makeDays(type, selected = ['Saturday', 'Sunday']) {
  const box = el(type + 'Days');
  if (!box) return;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  box.innerHTML = days.map(day => `
    <label class="day">
      <input class="${type}-day" type="checkbox" value="${day}" ${selected.includes(day) ? 'checked' : ''} onchange="calculate('${type}')">
      ${day}
    </label>
  `).join('');
}

function scenarioPercents(type) {
  const count = Math.max(1, Math.min(CONFIG.maxScenarioCount, Math.round(getNumber(type + 'ScenarioCount', 4))));
  const existing = [...document.querySelectorAll(`#${type}ScenarioInputs .scenario-pct`)]
    .map(node => parseFloat(node.value))
    .filter(Number.isFinite);
  const base = existing.length ? existing : defaults[type];
  return Array.from({ length: count }, (_, i) => {
    const fallback = (i + 1) * 25;
    return Math.max(0, Math.min(100, Number.isFinite(base[i]) ? base[i] : fallback));
  });
}

function renderScenarioInputs(type) {
  const box = el(type + 'ScenarioInputs');
  if (!box) return;
  const values = scenarioPercents(type);
  box.innerHTML = values.map((value, i) => `
    <div class="two" style="margin-bottom:7px">
      <div>
        <label>Scenario ${i + 1} — Redemption %</label>
        <input class="scenario-pct" data-type="${type}" type="number" min="0" max="100" step=".1" value="${value}" oninput="calculate('${type}')">
      </div>
      <div style="display:flex;align-items:end">
        <span class="badge">${value >= 100 ? 'Maximum case' : value <= 25 ? 'Low utilization' : 'Planning case'}</span>
      </div>
    </div>
  `).join('');
  calculate(type);
}

function getScenarioPercents(type) {
  return [...document.querySelectorAll(`#${type}ScenarioInputs .scenario-pct`)].map(node =>
    Math.max(0, Math.min(100, parseFloat(node.value) || 0))
  );
}

function calculate(type) {
  const membership = Math.max(0, getNumber(type + 'Membership'));
  const duration = Math.max(0, getNumber(type + 'Duration'));
  const mealPrice = Math.max(0, getNumber(type + 'MealPrice'));
  const mealCost = Math.max(0, getNumber(type + 'MealCost'));
  const perDay = Math.max(0, Math.min(1, getNumber(type + 'PerDay', 1)));

  const selectedDayCount = checkedDays(type).length;
  const weeks = weeksForMonths(duration);

  let redemptionsPerWeek;
  if (type === 'marketing') {
    // Marketing = choose one of two days, but only one redemption per week.
    redemptionsPerWeek = selectedDayCount > 0 ? perDay : 0;
  } else {
    // Boss = every selected eligible day can be redeemed once.
    redemptionsPerWeek = selectedDayCount * perDay;
  }

  const maxMeals = safeFloor(redemptionsPerWeek * weeks);

  let otherRewardValue = 0;
  let otherRewardCost = 0;
  if (type === 'marketing') {
    if (isChecked('marketingBirthdayEnabled')) {
      otherRewardValue += Math.max(0, getNumber('marketingBirthdayValue'));
      otherRewardCost += Math.max(0, getNumber('marketingBirthdayCost'));
    }
    if (isChecked('marketingAnniversaryEnabled')) {
      otherRewardValue += Math.max(0, getNumber('marketingAnniversaryValue'));
      otherRewardCost += Math.max(0, getNumber('marketingAnniversaryCost'));
    }
  }

  const cardCost = Math.max(0, getNumber(type + 'CardCost'));
  const otherProgramCost = Math.max(0, getNumber(type + 'OtherCost'));

  // Base Privilege Cost = maximum actual company cost of the full base package.
  const mealPrivilegeCost = maxMeals * mealCost;
  const basePrivilegeCost = mealPrivilegeCost + otherRewardCost + cardCost + otherProgramCost;
  const customerValue = maxMeals * mealPrice + otherRewardValue;

  const membershipContribution = membership - basePrivilegeCost;
  const gap = Math.max(0, basePrivilegeCost - membership);
  const surplus = Math.max(0, membership - basePrivilegeCost);

  // The sales target is the paid food sales needed to recover the first-year gap.
  const requiredSales = gap / CONFIG.conservativeGpRate;
  const conservativeGpAtTarget = requiredSales * CONFIG.conservativeGpRate;
  const firstYearDirectContribution = membership + conservativeGpAtTarget - basePrivilegeCost;

  const annualSales = requiredSales;
  const monthlySales = duration > 0 ? annualSales / duration : 0;
  const weeklySales = weeks > 0 ? annualSales / weeks : 0;
  const dailySales = weeks > 0 ? annualSales / (weeks * 7) : 0;
  const valueMultiple = membership > 0 ? customerValue / membership : 0;

  data[type] = {
    membership, duration, weeks, selectedDayCount, redemptionsPerWeek,
    maxMeals, mealPrice, mealCost,
    otherRewardValue, otherRewardCost, cardCost, otherProgramCost,
    mealPrivilegeCost, basePrivilegeCost, customerValue,
    membershipContribution, gap, surplus,
    requiredSales, conservativeGpAtTarget, firstYearDirectContribution,
    annualSales, monthlySales, weeklySales, dailySales, valueMultiple
  };

  setText(type + 'MaxMeals', num(maxMeals));
  setText(type + 'CustomerValue', money(customerValue));
  setText(type + 'Revenue', money(membership));
  setText(type + 'MaxCost', money(basePrivilegeCost));
  setText(type + 'RequiredSales', money(requiredSales));
  setText(type + 'MembershipContribution', money(membershipContribution));
  setText(type + 'TargetGP', money(conservativeGpAtTarget));
  setText(type + 'FirstYearContribution', money(firstYearDirectContribution));
  setText(type + 'AnnualSales', money(annualSales));
  setText(type + 'MonthlySales', money(monthlySales));
  setText(type + 'WeeklySales', money(weeklySales));
  setText(type + 'DailySales', money(dailySales));

  const gapNode = el(type + 'Gap');
  if (gapNode) {
    gapNode.textContent = gap > 0 ? '-' + money(gap) : '+' + money(surplus);
    gapNode.className = 'value ' + (gap > 0 ? 'negative' : 'positive');
  }

  toggleTime(type);
  buildScenarioTable(type);
  updateComparison();
  // Keep the selected proposal's required sales automatically connected to the
  // Target Sales field. Custom targets remain untouched.
  if (el('targetSource') && el('targetSource').value !== 'custom') {
    syncTargetFromSource();
  } else {
    refreshTargetSourceLabel();
    calculateLoyalty();
  }
}

function buildScenarioTable(type) {
  const d = data[type];
  const body = el(type + 'ScenarioTable');
  if (!body || !d) return;

  const values = getScenarioPercents(type);
  body.innerHTML = values.map((redemptionPct, index) => {
    const meals = safeFloor(d.maxMeals * redemptionPct / 100);
    const mealCost = meals * d.mealCost;

    // Fixed costs remain incurred even at 0% utilization.
    const totalCost = mealCost + d.otherRewardCost + d.cardCost + d.otherProgramCost;
    const gap = Math.max(0, totalCost - d.membership);
    const surplus = Math.max(0, d.membership - totalCost);
    const requiredSales = gap / CONFIG.conservativeGpRate;
    const conservativeGP = requiredSales * CONFIG.conservativeGpRate;
    const firstYearContribution = d.membership + conservativeGP - totalCost;

    const status = redemptionPct >= 100 ? 'Maximum' : redemptionPct <= 25 ? 'Expected / Low' : 'Planning';

    if (type === 'marketing') {
      return `<tr>
        <td><b>Scenario ${index + 1}</b><br><small>${status}</small></td>
        <td>${pct(redemptionPct)}</td>
        <td>${num(meals)}</td>
        <td>${money(mealCost)}</td>
        <td>${money(d.otherRewardCost)}</td>
        <td>${money(d.cardCost)}</td>
        <td>${money(totalCost)}</td>
        <td class="${gap ? 'negative' : 'positive'}">${gap ? '-' + money(gap) : '+' + money(surplus)}</td>
        <td>${money(requiredSales)}</td>
        <td>${money(conservativeGP)}</td>
        <td>${money(firstYearContribution)}</td>
      </tr>`;
    }

    return `<tr>
      <td><b>Scenario ${index + 1}</b><br><small>${status}</small></td>
      <td>${pct(redemptionPct)}</td>
      <td>${num(meals)}</td>
      <td>${money(mealCost)}</td>
      <td>${money(d.cardCost + d.otherProgramCost)}</td>
      <td>${money(totalCost)}</td>
      <td class="${gap ? 'negative' : 'positive'}">${gap ? '-' + money(gap) : '+' + money(surplus)}</td>
      <td>${money(requiredSales)}</td>
      <td>${money(conservativeGP)}</td>
      <td>${money(firstYearContribution)}</td>
    </tr>`;
  }).join('');
}

function switchTab(tab, button) {
  document.querySelectorAll('.program').forEach(node => node.classList.remove('active'));
  const target = el(tab);
  if (target) target.classList.add('active');
  document.querySelectorAll('.tab').forEach(node => node.classList.remove('active'));
  if (button) button.classList.add('active');
}

function updateComparison() {
  const b = data.boss;
  const m = data.marketing;
  if (!b || !m) return;

  const fields = [
    ['cMembershipBoss', money(b.membership)], ['cMembershipMarketing', money(m.membership)],
    ['cDurationBoss', b.duration + ' months'], ['cDurationMarketing', m.duration + ' months'],
    ['cMealsBoss', num(b.maxMeals)], ['cMealsMarketing', num(m.maxMeals)],
    ['cValueBoss', money(b.customerValue)], ['cValueMarketing', money(m.customerValue)],
    ['cCostBoss', money(b.basePrivilegeCost)], ['cCostMarketing', money(m.basePrivilegeCost)],
    ['cGapBoss', b.gap ? '-' + money(b.gap) : '+' + money(b.surplus)],
    ['cGapMarketing', m.gap ? '-' + money(m.gap) : '+' + money(m.surplus)],
    ['cSalesBoss', money(b.requiredSales)], ['cSalesMarketing', money(m.requiredSales)],
    ['cRatioBoss', b.valueMultiple.toFixed(2) + '×'], ['cRatioMarketing', m.valueMultiple.toFixed(2) + '×']
  ];
  fields.forEach(([id, value]) => setText(id, value));

  setText('higherValue', b.customerValue > m.customerValue ? 'Boss' : m.customerValue > b.customerValue ? 'Marketing' : 'Equal');
  setText('lowerCost', b.basePrivilegeCost < m.basePrivilegeCost ? 'Boss' : m.basePrivilegeCost < b.basePrivilegeCost ? 'Marketing' : 'Equal');
  setText('lowerSales', b.requiredSales < m.requiredSales ? 'Boss' : m.requiredSales < b.requiredSales ? 'Marketing' : 'Equal');
}

function sortTiers() {
  renewalTiers.sort((a, b) => {
    if (a.pcqp !== b.pcqp) return a.pcqp - b.pcqp;
    return a.discount - b.discount;
  });
}

function renderRenewalTiers() {
  const box = el('renewalTiers');
  if (!box) return;
  sortTiers();
  box.innerHTML = renewalTiers.map((tier, index) => `
    <div class="tier-row">
      <div>
        <label>Tier ${index + 1} — Minimum PCQP</label>
        <input class="tier-pcqp" type="number" min="0" step="1" value="${tier.pcqp}" oninput="updateTier(${index}, 'pcqp', this.value)">
      </div>
      <div>
        <label>Renewal Discount (%)</label>
        <input class="tier-discount" type="number" min="0" max="99" step=".1" value="${tier.discount}" oninput="updateTier(${index}, 'discount', this.value)">
      </div>
      <button class="btn secondary" type="button" onclick="removeRenewalTier(${index})">×</button>
    </div>
  `).join('');
}

function updateTier(index, key, value) {
  if (!renewalTiers[index]) return;
  const n = Math.max(0, parseFloat(value) || 0);
  renewalTiers[index][key] = key === 'discount' ? Math.min(99, n) : n;
  calculateLoyalty();
}

function addRenewalTier() {
  sortTiers();
  const maxPcqp = renewalTiers.length ? Math.max(...renewalTiers.map(t => t.pcqp)) : 0;
  const maxDiscount = renewalTiers.length ? Math.max(...renewalTiers.map(t => t.discount)) : 0;
  renewalTiers.push({ pcqp: maxPcqp + 100, discount: Math.min(99, maxDiscount + 5) });
  renderRenewalTiers();
  calculateLoyalty();
}

function removeRenewalTier(index) {
  if (renewalTiers.length <= 1) return;
  renewalTiers.splice(index, 1);
  renderRenewalTiers();
  calculateLoyalty();
}

function getRenewalDiscount(pcqp) {
  sortTiers();
  let selected = renewalTiers[0] || { pcqp: 0, discount: 0 };
  renewalTiers.forEach(tier => {
    if (pcqp >= tier.pcqp) selected = tier;
  });
  return Math.max(0, Math.min(99, selected.discount));
}

function getRenewalTier(pcqp) {
  sortTiers();
  let selected = renewalTiers[0] || { pcqp: 0, discount: 0 };
  renewalTiers.forEach(tier => {
    if (pcqp >= tier.pcqp) selected = tier;
  });
  return selected;
}

function getSelectedTarget() {
  return Math.max(0, getNumber('targetSalesInput'));
}

function getRenewalBasePrivilegeCost() {
  const basis = el('renewalPackageBasis')?.value || 'boss';
  return basis === 'marketing'
    ? (data.marketing?.basePrivilegeCost || 0)
    : (data.boss?.basePrivilegeCost || 0);
}

function refreshTargetSourceLabel() {
  const source = el('targetSource')?.value;
  const input = el('targetSalesInput');
  if (!input) return;
  input.readOnly = source !== 'custom';
  input.title = source === 'custom'
    ? 'Custom target: editable'
    : 'Source-linked target: use Sync to pull the current required sales';
}

function syncTargetFromSource() {
  const source = el('targetSource')?.value || 'custom';
  if (source === 'custom') {
    refreshTargetSourceLabel();
    calculateLoyalty();
    return;
  }

  const sourceData = source === 'marketing' ? data.marketing : data.boss;
  const target = sourceData?.requiredSales || 0;
  setValue('targetSalesInput', target.toFixed(2));
  refreshTargetSourceLabel();
  calculateLoyalty();
}

function editTargetSales() {
  // Once the user types a custom value, the target becomes explicitly custom.
  const source = el('targetSource');
  if (source && source.value !== 'custom') source.value = 'custom';
  refreshTargetSourceLabel();
  calculateLoyalty();
}

function annualizeSpend(raw, basis) {
  const spend = Math.max(0, Number(raw) || 0);
  if (basis === 'day') return spend * CONFIG.annualDays;
  if (basis === 'week') return spend * CONFIG.annualWeeks;
  if (basis === 'month') return spend * CONFIG.annualMonths;
  return spend;
}

function calculateLoyalty() {
  const hpSpendThreshold = Math.max(1, getNumber('hpSpend', 500));
  const hpPerBlock = Math.max(0, getNumber('hpPoints', 5));
  const gpRate = CONFIG.conservativeGpRate;
  const pcqpRate = CONFIG.pcqpRate;

  const basis = el('sampleBasis')?.value || 'week';
  const rawSampleSpend = Math.max(0, getNumber('sampleSpend'));
  const annualizedSales = annualizeSpend(rawSampleSpend, basis);
  const dailySales = annualizedSales / CONFIG.annualDays;
  const weeklySales = annualizedSales / CONFIG.annualWeeks;
  const monthlySales = annualizedSales / CONFIG.annualMonths;

  // One connected loyalty chain from the same paid sales figure.
  const sampleGP = annualizedSales * gpRate;
  const sampleHP = safeFloor(annualizedSales / hpSpendThreshold) * hpPerBlock;
  const samplePCQP = safeFloor(sampleGP * pcqpRate);

  const targetSales = getSelectedTarget();
  const targetGP = targetSales * gpRate;
  const targetHP = safeFloor(targetSales / hpSpendThreshold) * hpPerBlock;
  const targetPCQP = safeFloor(targetGP * pcqpRate);

  // Renewal inputs: only these two monetary thresholds are manually editable.
  const minimumAnnualSales = Math.max(0, getNumber('renewSales', 15000));
  const minimumAnnualGP = minimumAnnualSales * gpRate;
  const minimumAnnualHP = safeFloor(minimumAnnualSales / hpSpendThreshold) * hpPerBlock;
  const minimumAnnualPCQP = safeFloor(minimumAnnualGP * pcqpRate);

  // Renewal package cost is tied to the explicitly selected first-year proposal.
  const renewalBasePrivilegeCost = getRenewalBasePrivilegeCost();
  const baseRenewalFee = Math.max(0, getNumber('renewFee', 5999));

  // Sales is the gateway. PCQP determines the discount tier. HP is shown as an
  // automatically-derived activity indicator, not a second blocking gate.
  const salesQualified = annualizedSales >= minimumAnnualSales;
  const earnedTier = getRenewalTier(samplePCQP);
  const tierDiscount = salesQualified ? getRenewalDiscount(samplePCQP) : 0;

  // Safety floor: discounted renewal fee must not drop below the same first-year
  // Base Privilege Cost used for the selected renewal package.
  const maxSafeDiscount = baseRenewalFee > 0
    ? Math.max(0, Math.min(99, (1 - renewalBasePrivilegeCost / baseRenewalFee) * 100))
    : 0;
  const appliedDiscount = salesQualified ? Math.min(tierDiscount, maxSafeDiscount) : 0;
  const discountAmount = baseRenewalFee * appliedDiscount / 100;
  const finalRenewalFee = Math.max(0, baseRenewalFee - discountAmount);

  // Renewal economics must use the actual final fee the customer pays.
  const renewalGap = Math.max(0, renewalBasePrivilegeCost - finalRenewalFee);
  const renewalSurplus = Math.max(0, finalRenewalFee - renewalBasePrivilegeCost);
  const renewalSalesNeeded = renewalGap / gpRate;

  setText('loyDailySales', money(dailySales));
  setText('loyWeeklySales', money(weeklySales));
  setText('loyMonthlySales', money(monthlySales));
  setText('loyAnnualSales', money(annualizedSales));

  setText('loySampleSpend', money(annualizedSales));
  setText('loySampleHP', num(sampleHP));
  setText('loySampleGP', money(sampleGP));
  setText('loySamplePCQP', num(samplePCQP));

  setText('loyTargetSales', money(targetSales));
  setText('loyTargetGP', money(targetGP));
  setText('loyTargetHP', num(targetHP));
  setText('loyTargetPCQP', num(targetPCQP));

  setText('renewMinSalesAuto', money(minimumAnnualSales));
  setText('renewMinGPAuto', money(minimumAnnualGP));
  setText('renewMinHPAuto', num(minimumAnnualHP));
  setText('renewMinPCQPAuto', num(minimumAnnualPCQP));
  setText('renewHPDisplay', num(minimumAnnualHP));
  setText('renewPCQPDisplay', num(minimumAnnualPCQP));

  setText('renewBasePrivilegeCost', money(renewalBasePrivilegeCost));
  setText('renewFeeCoverage', money(baseRenewalFee));
  setText('renewalGapEconomics', renewalGap > 0 ? '-' + money(renewalGap) : '+' + money(renewalSurplus));
  setText('renewalSalesNeededEconomics', money(renewalSalesNeeded));
  setText('maxSafeRenewalDiscount', pct(maxSafeDiscount));
  setText('renewalDiscountedFeeEconomics', money(finalRenewalFee));
  setText('renewalCoverageAfterDiscount', finalRenewalFee >= renewalBasePrivilegeCost
    ? '+' + money(finalRenewalFee - renewalBasePrivilegeCost)
    : '-' + money(renewalBasePrivilegeCost - finalRenewalFee));

  setText('renewDiscount', pct(appliedDiscount));
  setText('renewBaseFee', money(baseRenewalFee));
  setText('renewDiscountAmount', money(discountAmount));
  setText('renewFinalFee', money(finalRenewalFee));

  setText('renewSalesResult', `${money(annualizedSales)} / ${money(minimumAnnualSales)} — ${salesQualified ? 'Met' : 'Not met'}`);
  setText('renewHPResult', `${num(sampleHP)} / ${num(minimumAnnualHP)} HP — ${sampleHP >= minimumAnnualHP ? 'Met' : 'Not met'}`);
  setText('renewPCQPResult', `${num(samplePCQP)} / ${num(minimumAnnualPCQP)} PCQP — ${samplePCQP >= minimumAnnualPCQP ? 'Met' : 'Not met'}`);

  const status = el('renewStatus');
  if (status) {
    status.textContent = 'PAID RENEWAL AVAILABLE';
    status.className = 'positive';
  }

  let reason;
  if (!salesQualified) {
    reason = 'The member can still renew, but annual paid sales did not reach the discount gateway. Renewal is available at 0% discount / full base renewal fee.';
  } else if (tierDiscount > maxSafeDiscount) {
    reason = `The member reached the sales gateway and earned the ${pct(tierDiscount)} PCQP tier. The applied discount is capped at ${pct(maxSafeDiscount)} so the final renewal fee does not fall below the same Base Privilege Cost.`;
  } else {
    reason = `The member reached the annual paid-sales gateway and earned the ${pct(appliedDiscount)} PCQP-based renewal discount. Renewal remains paid.`;
  }
  setText('renewReason', reason);

  const tierText = el('renewReason');
  if (tierText) tierText.dataset.tier = `${earnedTier.pcqp} PCQP / ${earnedTier.discount}%`;

  const table = el('loyaltyTargetTable');
  if (table) {
    const levels = [0, 0.25, 0.5, 0.75, 1];
    table.innerHTML = levels.map(level => {
      const sales = targetSales * level;
      const gp = sales * gpRate;
      const hp = safeFloor(sales / hpSpendThreshold) * hpPerBlock;
      const pcqp = safeFloor(gp * pcqpRate);
      return `<tr>
        <td>${level * 100}% of target</td>
        <td>${money(sales)}</td>
        <td>${money(gp)}</td>
        <td>${num(hp)}</td>
        <td>${num(pcqp)}</td>
      </tr>`;
    }).join('');
  }

  refreshTargetSourceLabel();
}

function resetProgram(type) {
  if (type === 'boss') {
    setValue('bossMembership', 5999);
    setValue('bossDuration', 12);
    setValue('bossMealName', '₱199 Meal');
    setValue('bossMealPrice', 199);
    setValue('bossMealCost', 140.10);
    setValue('bossPerDay', 1);
    setValue('bossCardCost', 300);
    setValue('bossOtherCost', 0);
    setValue('bossScenarioCount', 4);
    makeDays('boss', ['Saturday', 'Sunday']);
  } else {
    setValue('marketingMembership', 5999);
    setValue('marketingDuration', 12);
    setValue('marketingMealName', '₱199 Meal');
    setValue('marketingMealPrice', 199);
    setValue('marketingMealCost', 140.10);
    setValue('marketingPerDay', 1);
    setValue('marketingDayRule', 'either');
    if (el('marketingBirthdayEnabled')) el('marketingBirthdayEnabled').checked = true;
    setValue('marketingBirthdayValue', 229);
    setValue('marketingBirthdayCost', 186.52);
    if (el('marketingAnniversaryEnabled')) el('marketingAnniversaryEnabled').checked = true;
    setValue('marketingAnniversaryValue', 229);
    setValue('marketingAnniversaryCost', 186.52);
    setValue('marketingCardCost', 300);
    setValue('marketingOtherCost', 0);
    setValue('marketingScenarioCount', 4);
    makeDays('marketing', ['Saturday', 'Sunday']);
  }
  renderScenarioInputs(type);
  calculate(type);
}

function resetAll() {
  resetProgram('boss');
  resetProgram('marketing');
  renewalTiers = [
    { pcqp: 0, discount: 0 },
    { pcqp: 100, discount: 5 },
    { pcqp: 200, discount: 10 },
    { pcqp: 300, discount: 15 },
    { pcqp: 500, discount: 20 }
  ];
  renderRenewalTiers();
  setValue('hpSpend', 500);
  setValue('hpPoints', 5);
  setValue('sampleBasis', 'week');
  setValue('sampleSpend', 500);
  setValue('targetSource', 'boss');
  setValue('renewalPackageBasis', 'boss');
  setValue('renewFee', 5999);
  setValue('renewSales', 15000);
  syncTargetFromSource();
  calculateLoyalty();
}

function initializeSystem() {
  makeDays('boss', ['Saturday', 'Sunday']);
  makeDays('marketing', ['Saturday', 'Sunday']);
  renderRenewalTiers();
  renderScenarioInputs('boss');
  renderScenarioInputs('marketing');
  calculate('boss');
  calculate('marketing');
  setValue('targetSource', 'boss');
  setValue('renewalPackageBasis', 'boss');
  syncTargetFromSource();
  calculateLoyalty();
}

document.addEventListener('DOMContentLoaded', initializeSystem);
