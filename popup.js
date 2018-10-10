var currentUrl;

function formatDate(msAgo) {
  let value = msAgo;
  function toString(unit) {
    return Math.floor(value) + unit + ' ago';
  }
  if (value < 1000) { return toString('ms'); }
  value/=1000;
  if (value < 60) { return toString('s'); }
  value/=60;
  if (value < 60) { return toString('m'); }
  value/=60;
  if (value < 24) { return toString('h'); }
  value/=24;
  if (value < 365) { return toString('d'); }
  value/=365;
  return toString('y');
}

function displayLedger(ledgers, neighbor) {
  var html = '';
  if (typeof ledgers[neighbor] === 'undefined') { 
    html = 'No ledger (yet) with ' + neighbor;
  } else {
    let loops = {};
    html += `<h2>${neighbor}</h2><p>Your balance: ${ledgers[neighbor].balance}</p>`;
    let k;
    let now = new Date().getTime();
    for (k in ledgers[neighbor].committed) {
      const entry = ledgers[neighbor].committed[k];
      html += `<li><strong>${k} (${formatDate(now - entry.date)} ago): ${entry.amount}</strong></li>`;
      if (entry.msgType === 'COND') {
        if (!loops[entry.routeId]) {
          loops[entry.routeId] = {
          };
        }
        if (entry.sender == 'reader') { // FIXME: see https://github.com/ledgerloops/ledgerloops/issues/24
          loops[entry.routeId].fside = entry.beneficiary;
        } else {
          loops[entry.routeId].cside = entry.sender;
        }
      }
    }
    for (k in ledgers[neighbor].pending) {
      const entry = ledgers[neighbor].pending[k];
      html += `<li>(entry ${k} since ${formatDate(now - entry.date)}: ${entry.amount})</li>`;
    }
    html += '</ul></li>';
    for (let routeId in loops) {
      html += `<h2>Loop ${routeId}:</h2><p>${loops[routeId].cside} -> me -> ${loops[routeId].fside}</p>`;
    }
  }
  html += '<h2>Other Ledgers:</h2><ul>';
  let i=0;
  let clickers = {};
  for (let k in ledgers) {
    if (k !== neighbor) {
      html += `<li><a href="${k}" id="link-${i}">${k}</a>: ${ledgers[k].balance}</li>`;
      clickers[i] = k;
      i++;
    }
  }
  html += '</ul>';
  document.getElementById('ledger').innerHTML = html;
  for(i in clickers) {
    document.getElementById(`link-${i}`).onclick = function() {
      currentUrl = clickers[i]
      chrome.tabs.update({ url: currentUrl });
      displayLedger(ledgers, currentUrl);
    };
  }
}

function pay() {
  const amount = parseFloat(document.getElementById('amount').value);
  const recurring = document.getElementById('recurring').checked;
  console.log('Pay!', { amount, recurring, currentUrl });
  chrome.runtime.sendMessage({ cmd: 'pay', amount, recurring, currentUrl }, function (response) {
    console.log('Paid!', { amount, recurring, response, currentUrl });
  });
};

function request() {
  const amount = parseFloat(document.getElementById('amount').value);
  const recurring = document.getElementById('recurring').checked;
  console.log('Requesting!', { amount, recurring, currentUrl });
  chrome.runtime.sendMessage({ cmd: 'request', amount, recurring, currentUrl }, function (response) {
    console.log('Requested!', { amount, recurring, response, currentUrl });
  });
};

function updateUI() {
  console.log('updating ui!');
  //  chrome.runtime.sendMessage({ cmd: 'pay', amount: 0.001, recurring: false, currentUrl }, function (response) {
  //    console.log('Paid default donation!', { response, currentUrl });
  //  });
  chrome.runtime.sendMessage({ cmd: 'getLedger' }, function (response) {
    console.log(response);
    // displayLedger(response.ledgers, currentUrl);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('pay-button').onclick = pay;
  document.getElementById('request-button').onclick = request;
  document.getElementById('ledger').innerHTML = 'popup script loaded';
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
    currentUrl = tabs[0].url;
    console.log({ currentUrl });
    setInterval(updateUI, 1000);
  });
});
