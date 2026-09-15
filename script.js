const contactButton = document.querySelector('.contact-trigger');
const contactPopover = document.querySelector('.contact-popover');
const serviceSelect = document.querySelector('#serviceSelect');
const otherField = document.querySelector('#otherField');
const quoteForm = document.querySelector('#quoteForm');
const decisionPanel = document.querySelector('.estimate-decision');
let currentEstimateId = null;

contactButton.addEventListener('click', () => {
  const open = contactPopover.classList.toggle('open');
  contactButton.setAttribute('aria-expanded', String(open));
  contactPopover.setAttribute('aria-hidden', String(!open));
});

document.addEventListener('click', (event) => {
  if (!contactPopover.contains(event.target) && !contactButton.contains(event.target)) {
    contactPopover.classList.remove('open');
    contactButton.setAttribute('aria-expanded', 'false');
    contactPopover.setAttribute('aria-hidden', 'true');
  }
});

function updateOtherField() {
  const show = serviceSelect.value === 'Other';
  otherField.classList.toggle('visible', show);
  otherField.querySelector('textarea').required = show;
}

serviceSelect.addEventListener('change', updateOtherField);

document.querySelectorAll('[data-service]').forEach((button) => {
  button.addEventListener('click', () => {
    serviceSelect.value = button.dataset.service;
    updateOtherField();
    document.querySelector('#quote').scrollIntoView({ behavior: 'smooth' });
  });
});

quoteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!quoteForm.reportValidity()) return;
  const button = quoteForm.querySelector('.submit-button');
  const result = quoteForm.querySelector('.estimate-result');
  const data = Object.fromEntries(new FormData(quoteForm).entries());
  button.disabled = true;
  button.textContent = 'Calculating…';
  result.className = 'estimate-result';
  try {
    const rulesResponse = await fetch('./pricing_rules.json');
    if (!rulesResponse.ok) throw new Error('Pricing information could not be loaded. Please refresh and try again.');
    const rules = await rulesResponse.json();
    const estimate = calculateEstimate(data, rules);
    const reasons = estimate.adjustments.map((item) => `<li>${item}</li>`).join('');
    result.innerHTML = `<p class="estimate-label">Your instant estimated quote</p>
      <p class="estimate-price">$${estimate.estimateLow.toLocaleString()} – $${estimate.estimateHigh.toLocaleString()}</p>
      <p class="estimate-rate">Estimated total for the work described</p>
      <ul><li>${estimate.service}</li>${reasons}</ul>
      <p class="estimate-disclaimer">Estimate only. Final price may change if the on-site scope differs from the information provided.</p>`;
    result.classList.add('show');
    currentEstimateId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    decisionPanel.classList.add('show');
    decisionPanel.querySelector('.rejection-panel').classList.remove('show');
    decisionPanel.querySelector('.decision-status').textContent = '';
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    const message = error.message || 'Unable to calculate an estimate. Please try again.';
    result.innerHTML = `<p class="estimate-error">${message}</p>`;
    result.classList.add('show');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Recalculate my estimate <span>→</span>';
  }
});

function calculateEstimate(data, rules) {
  const service = rules.services[data.service];
  const squareFeet = Number(data.squareFeet);
  const description = `${data.notes || ''} ${data.otherService || ''}`.toLowerCase();
  if (!Number.isFinite(squareFeet) || squareFeet <= 0) throw new Error('Please enter the home’s square footage.');
  if (!description.trim()) throw new Error('Please describe the work you would like completed.');
  if (!service) throw new Error('Instant pricing is currently available for Airbnb turnover, standard, deep, and move-out cleaning. Please contact us for a custom quote.');

  let score = 0;
  const adjustments = [];
  rules.conditionRules.forEach((rule) => {
    if (rule.keywords.some((keyword) => description.includes(keyword))) {
      score += Number(rule.weight);
      adjustments.push(rule.explanation);
    }
  });
  const lowerPositions = { '-1': 0, '0': 0.25, '1': 0.55 };
  const upperPositions = { '-1': 0.25, '0': 0.55, '1': 0.8 };
  const lowerPosition = lowerPositions[String(score)] ?? 0.8;
  const upperPosition = upperPositions[String(score)] ?? 1;
  const lowerRate = service.minimumRate + ((service.maximumRate - service.minimumRate) * lowerPosition);
  const upperRate = service.minimumRate + ((service.maximumRate - service.minimumRate) * upperPosition);
  const estimateLow = Math.max(Math.ceil(rules.minimumCharge), Math.ceil(squareFeet * lowerRate));
  const rawHigh = Math.max(rules.minimumCharge, squareFeet * upperRate);
  const estimateHigh = Math.max(Math.ceil(rawHigh * 1.05), Math.ceil(estimateLow * 1.1));
  if (estimateLow === Math.ceil(rules.minimumCharge) && squareFeet * lowerRate < rules.minimumCharge) {
    adjustments.push(`$${Math.ceil(rules.minimumCharge)} minimum service charge applied`);
  }
  if (!adjustments.length) adjustments.push('Standard condition assumed from your description');
  return { service: service.label, estimateLow, estimateHigh, adjustments };
}

async function submitDecision(decision, reason = '') {
  if (!currentEstimateId) return;
  decisionPanel.querySelector('.decision-status').textContent =
    decision === 'accepted'
      ? 'Thank you—please call or text us to confirm the estimate and schedule your service.'
      : `Thank you. ${reason ? 'Your feedback has been noted for this visit.' : ''}`;
  decisionPanel.querySelectorAll('button').forEach((button) => { button.disabled = true; });
}

document.querySelector('.accept-estimate').addEventListener('click', async () => {
  try { await submitDecision('accepted'); }
  catch (error) { decisionPanel.querySelector('.decision-status').textContent = error.message; }
});

document.querySelector('.reject-estimate').addEventListener('click', () => {
  decisionPanel.querySelector('.rejection-panel').classList.add('show');
});

document.querySelector('.submit-rejection').addEventListener('click', async () => {
  const reason = document.querySelector('#rejectionReason').value;
  if (!reason) {
    decisionPanel.querySelector('.decision-status').textContent = 'Please select a rejection reason.';
    return;
  }
  try { await submitDecision('rejected', reason); }
  catch (error) { decisionPanel.querySelector('.decision-status').textContent = error.message; }
});
