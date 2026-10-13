/* League standings for the schedule pages.
   Runs on any page that defines SHEET_ID and SHEET_TAB and has a #scheduleMount
   (the live schedule pages). Reads the same Google Sheet tab as the schedule
   and builds a standings table from the scores already entered there.
   Scoring: Win 3 pts, Tie 1 pt, Loss 0. Ties in the table are broken by
   goal difference, then goals scored. Finals/playoff weeks are not counted. */
(function () {
  if (typeof SHEET_ID === 'undefined' || typeof SHEET_TAB === 'undefined') return;
  var mount = document.getElementById('scheduleMount');
  if (!mount) return;

  var COLS = { week: 1, home: 4, homeScore: 5, away: 6, awayScore: 7 };
  var css = '' +
    '.standings{margin:0 0 28px}' +
    '.standings-title{background:#00b0da;color:#fff;padding:12px 15px;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:.5px}' +
    '.standings-wrap{overflow-x:auto}' +
    '.standings table{width:100%;border-collapse:collapse;font-size:14px}' +
    '.standings th{background:#f8f8f8;padding:10px 8px;font-size:11px;color:#666;text-transform:uppercase;border-bottom:1px solid #eee;text-align:center}' +
    '.standings th.t,.standings td.t{text-align:left}' +
    '.standings td{padding:10px 8px;border-bottom:1px solid #eee;text-align:center}' +
    '.standings td.t{font-weight:700}' +
    '.standings td.p{font-weight:800;background:#f9f9f9}' +
    '.standings tr:nth-child(even) td{background-color:#fafafa}' +
    '.standings tr:nth-child(even) td.p{background:#f3f3f3}' +
    '.standings-note{font-size:12px;color:#888;margin-top:6px}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function text(cell) {
    if (!cell) return '';
    var v = cell.f != null ? cell.f : cell.v;
    return v == null ? '' : String(v).trim();
  }
  function num(cell) {
    var t = text(cell);
    return /^\d+$/.test(t) ? parseInt(t, 10) : null;
  }
  function isFinals(week) {
    return /final|playoff|semi|champ/i.test(week);
  }

  function compute(rows) {
    var teams = {};
    function team(name) {
      if (!teams[name]) teams[name] = { name: name, gp: 0, w: 0, l: 0, t: 0, gf: 0, ga: 0 };
      return teams[name];
    }
    rows.forEach(function (r) {
      var c = r.c || [];
      var week = text(c[COLS.week]);
      var home = text(c[COLS.home]), away = text(c[COLS.away]);
      if (isFinals(week) || !home || !away || /^home team$/i.test(home)) return;
      var h = team(home), a = team(away);
      var hs = num(c[COLS.homeScore]), as = num(c[COLS.awayScore]);
      if (hs === null || as === null) return;   // not played yet
      h.gp++; a.gp++;
      h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      if (hs > as) { h.w++; a.l++; }
      else if (hs < as) { a.w++; h.l++; }
      else { h.t++; a.t++; }
    });
    var list = Object.keys(teams).map(function (k) {
      var x = teams[k]; x.gd = x.gf - x.ga; x.pts = x.w * 3 + x.t; return x;
    });
    list.sort(function (x, y) {
      return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name);
    });
    return list;
  }

  function render(list) {
    if (!list.length) return;
    var box = document.createElement('div');
    box.className = 'standings';
    var html = '<div class="standings-title">Standings</div><div class="standings-wrap"><table><thead><tr>' +
      '<th>#</th><th class="t">Team</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
      '</tr></thead><tbody>';
    list.forEach(function (x, i) {
      html += '<tr><td>' + (i + 1) + '</td><td class="t"></td><td>' + x.gp + '</td><td>' + x.w + '</td><td>' + x.l +
        '</td><td>' + x.t + '</td><td>' + x.gf + '</td><td>' + x.ga + '</td><td>' + (x.gd > 0 ? '+' : '') + x.gd +
        '</td><td class="p">' + x.pts + '</td></tr>';
    });
    html += '</tbody></table></div><div class="standings-note">Win = 3 pts, tie = 1 pt. Ties in the standings are broken by goal difference, then goals scored. Updates automatically as scores are entered.</div>';
    box.innerHTML = html;
    var names = box.querySelectorAll('td.t');
    list.forEach(function (x, i) { names[i].textContent = x.name; });   // team names as plain text
    var anchor = document.querySelector('.filter-box') || mount;
    anchor.parentNode.insertBefore(box, anchor);
  }

  var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(SHEET_ID) +
    '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(SHEET_TAB);
  fetch(url).then(function (r) { return r.text(); }).then(function (t) {
    var json = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
    if (json.table && json.table.rows) render(compute(json.table.rows));
  }).catch(function () { /* standings are optional; the schedule still shows */ });
})();
