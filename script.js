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
    const response = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const estimate = await response.json();
    if (!response.ok) throw new Error(estimate.error || 'Unable to calculate estimate.');
    const reasons = estimate.adjustments.map((item) => `<li>${item}</li>`).join('');
    result.innerHTML = `<p class="estimate-label">Your instant estimated quote</p>
      <p class="estimate-price">$${estimate.estimateLow.toLocaleString()} – $${estimate.estimateHigh.toLocaleString()}</p>
      <p class="estimate-rate">Estimated total for the work described</p>
      <ul><li>${estimate.service}</li>${reasons}</ul>
      <p class="estimate-disclaimer">Estimate only. Final price may change if the on-site scope differs from the information provided.</p>`;
    result.classList.add('show');
    currentEstimateId = estimate.estimateId;
    decisionPanel.classList.add('show');
    decisionPanel.querySelector('.rejection-panel').classList.remove('show');
    decisionPanel.querySelector('.decision-status').textContent = '';
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    const message = error instanceof TypeError && error.message.includes('fetch')
      ? 'The estimator service is not running. Start the website with start-website.bat, then use the address shown in that window.'
      : error.message;
    result.innerHTML = `<p class="estimate-error">${message}</p>`;
    result.classList.add('show');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Recalculate my estimate <span>→</span>';
  }
});

async function submitDecision(decision, reason = '') {
  if (!currentEstimateId) return;
  const response = await fetch('/api/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estimateId: currentEstimateId, decision, reason })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to save your response.');
  decisionPanel.querySelector('.decision-status').textContent =
    decision === 'accepted'
      ? 'Thank you—your estimate has been accepted. We will contact you to confirm the details.'
      : 'Thank you. Your feedback has been recorded.';
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
