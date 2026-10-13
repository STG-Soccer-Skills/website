/* League standings, built live from the scores in the league Google Sheet.

   Points per game (STG Soccer Skills league rules):
     Win  = 6 + 1 per goal scored (max 3) + 1 for a shutout
     Tie  = 3
     Loss = 1 per goal scored (max 3)
   Standings are sorted by points, then goal difference, then goals scored.
   Finals/playoff weeks and games without both scores are not counted.

   Where it shows up:
   1) Schedule pages (they define SHEET_ID and SHEET_TAB): a standings table is
      added above the team search box automatically.
   2) Any page element like
        <div class="standings-auto" data-sheet="SHEET_ID" data-tab="Tab Name" data-title="Men's Tier 1"></div>
      becomes a standings table for that tab (used on /adult-league-rankings/). */
(function () {
  var COLS = { week: 1, home: 4, homeScore: 5, away: 6, awayScore: 7 };

  var css = '' +
    '.standings{margin:0 0 28px}' +
    '.standings-title{background:#00b0da;color:#fff;padding:12px 15px;font-weight:bold;text-transform:uppercase;font-size:13px;letter-spacing:.5px}' +
    '.standings-wrap{overflow-x:auto}' +
    '.standings table{width:100%;border-collapse:collapse;font-size:14px;background:#fff}' +
    '.standings th{background:#f8f8f8;padding:10px 8px;font-size:11px;color:#666;text-transform:uppercase;border-bottom:1px solid #eee;text-align:center}' +
    '.standings th.t,.standings td.t{text-align:left}' +
    '.standings td{padding:10px 8px;border-bottom:1px solid #eee;text-align:center;color:#333}' +
    '.standings td.t{font-weight:700}' +
    '.standings td.p{font-weight:800;background:#f9f9f9}' +
    '.standings tr:nth-child(even) td{background-color:#fafafa}' +
    '.standings tr:nth-child(even) td.p{background:#f3f3f3}' +
    '.standings-note{font-size:12px;color:#888;margin-top:6px}' +
    '.standings-empty{padding:14px;color:#888;font-size:14px;background:#fafafa}';
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
  function isFinals(week) { return /final|playoff|semi|champ/i.test(week); }
  function gamePoints(scored, allowed) {
    if (scored > allowed) return 6 + Math.min(3, scored) + (allowed === 0 ? 1 : 0);
    if (scored === allowed) return 3;
    return Math.min(3, scored);
  }

  function compute(rows) {
    var teams = {};
    function team(name) {
      if (!teams[name]) teams[name] = { name: name, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
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
      h.pts += gamePoints(hs, as); a.pts += gamePoints(as, hs);
      if (hs > as) { h.w++; a.l++; }
      else if (hs < as) { a.w++; h.l++; }
      else { h.d++; a.d++; }
    });
    var list = Object.keys(teams).map(function (k) { var x = teams[k]; x.gd = x.gf - x.ga; return x; });
    list.sort(function (x, y) {
      return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name);
    });
    return list;
  }

  function build(list, title) {
    var box = document.createElement('div');
    box.className = 'standings';
    var head = '<div class="standings-title"></div>';
    if (!list.length) {
      box.innerHTML = head + '<div class="standings-empty">Standings will appear once the first scores are in.</div>';
    } else {
      var html = head + '<div class="standings-wrap"><table><thead><tr>' +
        '<th>#</th><th class="t">Team</th><th>GP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>' +
        '</tr></thead><tbody>';
      list.forEach(function (x, i) {
        html += '<tr><td>' + (i + 1) + '</td><td class="t"></td><td>' + x.gp + '</td><td>' + x.w + '</td><td>' + x.d +
          '</td><td>' + x.l + '</td><td>' + x.gf + '</td><td>' + x.ga + '</td><td>' + (x.gd > 0 ? '+' : '') + x.gd +
          '</td><td class="p">' + x.pts + '</td></tr>';
      });
      html += '</tbody></table></div><div class="standings-note">Win = 6 pts + 1 per goal (up to 3) + 1 for a shutout. Tie = 3 pts. Loss = 1 per goal (up to 3). Updates automatically as scores are entered.</div>';
      box.innerHTML = html;
      var names = box.querySelectorAll('td.t');
      list.forEach(function (x, i) { names[i].textContent = x.name; });   // team names as plain text
    }
    box.querySelector('.standings-title').textContent = title;
    return box;
  }

  function load(sheetId, tab, done) {
    var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(sheetId) +
      '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(tab);
    fetch(url).then(function (r) { return r.text(); }).then(function (t) {
      var json = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
      done(json.table && json.table.rows ? compute(json.table.rows) : []);
    }).catch(function () { done(null); });
  }

  // 1) Schedule pages
  var mount = document.getElementById('scheduleMount');
  if (mount && typeof SHEET_ID !== 'undefined' && typeof SHEET_TAB !== 'undefined') {
    load(SHEET_ID, SHEET_TAB, function (list) {
      if (!list || !list.length) return;
      var anchor = document.querySelector('.filter-box') || mount;
      anchor.parentNode.insertBefore(build(list, 'Standings'), anchor);
    });
  }

  // 2) Standings blocks (e.g. the Adult League Rankings page)
  [].forEach.call(document.querySelectorAll('.standings-auto[data-sheet][data-tab]'), function (el) {
    el.innerHTML = '<div class="standings-empty">Loading standings…</div>';
    load(el.getAttribute('data-sheet'), el.getAttribute('data-tab'), function (list) {
      el.innerHTML = '';
      if (list === null) { el.innerHTML = '<div class="standings-empty">Standings couldn\'t load. Please refresh the page.</div>'; return; }
      el.appendChild(build(list, el.getAttribute('data-title') || el.getAttribute('data-tab')));
    });
  });
})();
