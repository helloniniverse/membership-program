const S = {
  standard:{fee:2999,duration:6,meals:26,fixed:300,bday:0,txWeek:2,atv:900,checkpoint:3},
  premium:{fee:5999,duration:12,meals:104,fixed:300,bday:1,txWeek:5,atv:1100,checkpoint:6}
};
const gpDefault=.1296, bufferDefault=.20, mealCostDefault=186.52;
const $=id=>document.getElementById(id);
const money=n=>`₱${Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const pct=n=>`${(Number(n||0)).toFixed(2)}%`;
function n(id, fallback=0){const v=parseFloat($(id)?.value);return Number.isFinite(v)?v:fallback}
function set(id,v){if($(id))$(id).value=v}
function card(label,value,sub='',cls=''){return `<div class="result-card ${cls}"><div class="label">${label}</div><div class="value">${value}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>`}
function syncTargetTier(){const t=$('targetTier').value;const d=S[t];set('targetFee',d.fee);set('targetDuration',d.duration);set('targetMeals',d.meals);set('targetFixed',d.fixed);set('targetBirthdayMeals',d.bday);set('targetTxWeek',d.txWeek);set('targetAtv',d.atv);set('targetCheckpoint',d.checkpoint);calculateTarget()}
function calculateTarget(){
 const fee=n('targetFee'), duration=Math.max(1,n('targetDuration')), scenario=n('targetScenario')/100, meals=n('targetMeals'), mealCost=n('targetMealCost',mealCostDefault), fixed=n('targetFixed'), bday=n('targetBirthdayMeals'), gp=n('targetGpRate',12.96)/100, buffer=n('targetBuffer',20)/100, txWeek=Math.max(.01,n('targetTxWeek')), atv=n('targetAtv'), checkpoint=Math.max(1,Math.min(duration,n('targetCheckpoint')));
 const baseMealCost=meals*scenario*mealCost;
 const birthdayCost=bday*mealCost;
 const programCost=baseMealCost+birthdayCost+fixed;
 const netFee=fee/1.12;
 const gap=programCost-netFee;
 const breakEvenSales=Math.max(0,gap/gp);
 const protectedGP=Math.max(0,gap*(1+buffer));
 const protectedSales=Math.max(0,protectedGP/gp);
 const weeksCheckpoint=checkpoint*4.345;
 const plannedTx=Math.ceil(weeksCheckpoint*txWeek);
 const minATV=plannedTx>0?protectedSales/plannedTx:0;
 const opSales=plannedTx*atv;
 const projectedGP=opSales*gp;
 const surplus=projectedGP-gap;
 const annualEquivalent=duration?opSales*(12/duration):0;
 const status=opSales>=protectedSales;
 $('targetResults').innerHTML=[
  card('Program Cost',money(programCost),`${scenario*100}% utilization scenario`),
  card('Net Membership Revenue',money(netFee),'VAT-exclusive'),
  card('Membership Gap',money(gap),gap<=0?'No gap under this scenario':'Cost not covered by fee',gap<=0?'good':'warn'),
  card('Break-Even Sales',money(breakEvenSales),'GP needed to cover gap'),
  card('Protected Sales Requirement',money(protectedSales),'Gap + profit buffer', 'warn'),
  card('Minimum ATV',money(minATV),'Based on selected transaction frequency'),
  card('Operating Sales Target',money(opSales),`${plannedTx} checkpoint transactions × ${money(atv)} ATV`,status?'good':'bad'),
  card('Projected Conservative GP',money(projectedGP),'Operating target × GP rate'),
  card('GP Surplus',money(surplus),surplus>=0?'Above gap':'Below gap',surplus>=0?'good':'bad'),
  card('Checkpoint',`${checkpoint} mo`,`${weeksCheckpoint.toFixed(1)} weeks`),
  card('Monthly Pace',money(opSales/checkpoint), 'checkpoint sales ÷ months'),
  card('12-Month Equivalent',money(annualEquivalent),'For comparison only')
 ].join('');
 $('formulaOutput').textContent = `PROGRAM COST\n= (${meals} meals × ${scenario*100}% utilization × ${money(mealCost)}) + (${bday} birthday × ${money(mealCost)}) + ${money(fixed)} fixed\n= ${money(programCost)}\n\nNET MEMBERSHIP REVENUE\n= ${money(fee)} ÷ 1.12\n= ${money(netFee)}\n\nMEMBERSHIP GAP\n= ${money(programCost)} − ${money(netFee)}\n= ${money(gap)}\n\nBREAK-EVEN SALES\n= ${money(gap)} ÷ ${pct(gp*100)}\n= ${money(breakEvenSales)}\n\nPROTECTED GP\n= ${money(gap)} × (1 + ${pct(buffer*100)})\n= ${money(protectedGP)}\n\nPROTECTED SALES\n= ${money(protectedGP)} ÷ ${pct(gp*100)}\n= ${money(protectedSales)}\n\nOPERATING SALES TARGET\n= ${plannedTx} transactions × ${money(atv)} ATV\n= ${money(opSales)}\n\nPROJECTED CONSERVATIVE GP\n= ${money(opSales)} × ${pct(gp*100)}\n= ${money(projectedGP)}\n\nGP SURPLUS\n= ${money(projectedGP)} − ${money(gap)}\n= ${money(surplus)}\n\nCONTROL\nOperating Target ${status?'≥':'<'} Protected Sales Requirement`;
 $('gpRateLabel').textContent=pct(gp*100);$('bufferLabel').textContent=pct(buffer*100);
}
function calculateRenewal(){
 const tier=$('renewTier').value, duration=S[tier].duration, sales=n('renewSales'), memberMonths=Math.max(1,n('renewMemberMonths')), benefitCost=n('renewBenefitCost'), terms=Math.max(1,n('renewTerms')), recovery=n('renewRecovery',80)/100, minFee=n('renewMinFee');
 const avgMonthly=sales/memberMonths, avgTermSales=avgMonthly*duration, avgGP=avgTermSales*gpDefault, avgBenefit=benefitCost/terms, econGap=avgBenefit-avgGP, baseFee=Math.max(minFee,econGap*recovery);
 const pcqp=Math.floor(Math.max(0,avgGP)*.10);
 const thresholds=[1,2,3,4,5].map(i=>({t:n('b'+i),d:n('d'+i)})).sort((a,b)=>a.t-b.t);
 const band=thresholds.reduce((acc,x)=>pcqp>=x.t?x:acc,thresholds[0]||{t:0,d:0});
 const discounted=baseFee*(1-band.d/100);
 $('renewResults').innerHTML=[
  card('Average Monthly Spend',money(avgMonthly),'Total sales ÷ active member-months'),
  card('Average Term Sales',money(avgTermSales),`${duration}-month tier`),
  card('Average Conservative GP',money(avgGP),'Avg term sales × 12.96%'),
  card('Average Benefit Cost',money(avgBenefit),'Actual cost ÷ eligible member-terms'),
  card('Average Renewal Economic Gap',money(econGap),econGap>=0?'Still to recover':'GP already exceeds benefit cost',econGap<=0?'good':'warn'),
  card('Base Renewal Fee',money(baseFee),'Program-level fee',baseFee>=minFee?'good':'warn'),
  card('Average PCQP',pcqp.toLocaleString(),'External PCQP logic basis'),
  card('Performance Band',`≥ ${band.t} PCQP`,`${band.d}% renewal discount`),
  card('Final Renewal Fee',money(discounted),'Base fee × (1 − discount)',discounted<=baseFee?'good':'warn')
 ].join('');
 $('renewFormulaOutput').textContent=`AVERAGE MONTHLY MEMBER SPEND\n= Total Qualified Paid Sales ÷ Total Active Member-Months\n= ${money(sales)} ÷ ${memberMonths}\n= ${money(avgMonthly)}\n\nAVERAGE TERM SALES\n= ${money(avgMonthly)} × ${duration}\n= ${money(avgTermSales)}\n\nAVERAGE CONSERVATIVE GP\n= ${money(avgTermSales)} × 12.96%\n= ${money(avgGP)}\n\nAVERAGE BENEFIT COST\n= ${money(benefitCost)} ÷ ${terms}\n= ${money(avgBenefit)}\n\nAVERAGE RENEWAL ECONOMIC GAP\n= ${money(avgBenefit)} − ${money(avgGP)}\n= ${money(econGap)}\n\nBASE RENEWAL FEE\n= MAX(${money(minFee)}, ${money(econGap)} × ${pct(recovery*100)})\n= ${money(baseFee)}\n\nMEMBER PCQP (reference)\n= FLOOR(Conservative GP × 10%)\n= ${pcqp}\n\nFINAL RENEWAL FEE\n= ${money(baseFee)} × (1 − ${pct(band.d)})\n= ${money(discounted)}`;
}
function calculateMember(){
 const sales=n('memberSales'), months=Math.max(1,n('memberMonths')), pcqpInput=n('memberPcqp');
 const avg=sales/months, gp=sales*gpDefault, pcqp=Math.max(0,Math.floor(gp*.10));
 $('memberResults').innerHTML=[
  card('Qualified Paid Sales',money(sales),'Actual member sales'),
  card('Average Monthly Spend',money(avg),`${months} active month(s)`),
  card('Conservative GP',money(gp),'Sales × 12.96%'),
  card('Calculated PCQP',pcqp.toLocaleString(),'Reference calculation'),
  card('PCQP from External System',pcqpInput.toLocaleString(),'Displayed/synced value'),
  card('Sales Achievement',`${avg>0?'Normalized':'—'}`,'Use with tier benchmark')
 ].join('');
}
function bind(){
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab,.tab-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.tab).classList.add('active')}));
 $('targetTier').addEventListener('change',syncTargetTier); document.querySelectorAll('#target input,#target select').forEach(e=>e.addEventListener('input',calculateTarget));
 document.querySelectorAll('#renewal input,#renewal select').forEach(e=>e.addEventListener('input',calculateRenewal));
 document.querySelectorAll('#member input,#member select').forEach(e=>e.addEventListener('input',calculateMember));
 $('resetBtn').addEventListener('click',()=>location.reload());
}
// Corrected export handler installed separately for clarity
function installExport(){ $('exportBtn').onclick=()=>{const ids=['targetTier','targetFee','targetDuration','targetScenario','targetMeals','targetMealCost','targetFixed','targetBirthdayMeals','targetGpRate','targetBuffer','targetTxWeek','targetAtv','targetCheckpoint','renewTier','renewSales','renewMemberMonths','renewBenefitCost','renewTerms','renewRecovery','renewMinFee','memberTier','memberSales','memberMonths','memberPcqp'];const payload={timestamp:new Date().toISOString(),inputs:{}};ids.forEach(id=>payload.inputs[id]=$(id).value);const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='harrison-membership-simulator-scenario.json';a.click();URL.revokeObjectURL(a.href)}};
S.standard && syncTargetTier();
installExport();
bind();
calculateRenewal();calculateMember();
