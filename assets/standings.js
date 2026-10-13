/* League standings, built live from the scores in the league Google Sheet.

   Points and tie-breakers follow the official rules at /indoor-tournament-rules/:
   Win 3, Draw 1, Loss 0; ties broken by head-to-head, wins, goal difference
   (max +5 per game), fewest goals allowed, goals scored, shutouts.
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
  // Official STG rules (stgsoccerskills.com/indoor-tournament-rules/): Win 3, Draw 1, Loss 0.
  function gamePoints(scored, allowed) {
    return scored > allowed ? 3 : (scored === allowed ? 1 : 0);
  }
  function cap(n) { return Math.max(-5, Math.min(5, n)); }   // goal differential counts at most +/-5 per game

  // Stats for one team, optionally only from games against the teams in `only`.
  function stats(name, games, only) {
    var s = { pts: 0, w: 0, gd: 0, ga: 0, gf: 0, so: 0 };
    games.forEach(function (g) {
      var mine, theirs, opp;
      if (g.home === name) { mine = g.hs; theirs = g.as; opp = g.away; }
      else if (g.away === name) { mine = g.as; theirs = g.hs; opp = g.home; }
      else return;
      if (only && !only[opp]) return;
      s.pts += gamePoints(mine, theirs);
      if (mine > theirs) s.w++;
      s.gd += cap(mine - theirs); s.ga += theirs; s.gf += mine;
      if (theirs === 0) s.so++;
    });
    return s;
  }
  function keyOf(s) { return [s.pts, s.w, s.gd, -s.ga, s.gf, s.so]; }
  function cmpKeys(a, b) { for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i]; return 0; }

  // Order a group of teams that are level on points, following the rules' tie-breakers.
  function breakTie(names, games) {
    if (names.length < 2) return names.map(function (n) { return { name: n, tied: false }; });
    var keys = {};
    if (names.length === 2) {
      var h2h = {}; h2h[names[0]] = 1; h2h[names[1]] = 1;
      names.forEach(function (n) {
        var o = stats(n, games), h = stats(n, games, h2h);
        // head-to-head result, most wins, capped GD, fewest GA, most GF, most shutouts
        keys[n] = [h.pts, o.w, o.gd, -o.ga, o.gf, o.so];
      });
    } else {
      var only = {}; names.forEach(function (n) { only[n] = 1; });
      names.forEach(function (n) {
        var m = stats(n, games, only), o = stats(n, games);
        keys[n] = keyOf(m).concat([o.gd, -o.ga, o.gf, o.so]);
      });
    }
    var sorted = names.slice().sort(function (a, b) { return cmpKeys(keys[a], keys[b]) || a.localeCompare(b); });
    var out = [], i = 0;
    while (i < sorted.length) {
      var j = i + 1;
      while (j < sorted.length && cmpKeys(keys[sorted[i]], keys[sorted[j]]) === 0) j++;
      var group = sorted.slice(i, j);
      if (group.length === 1) out.push({ name: group[0], tied: false });
      else if (group.length < names.length) out = out.concat(breakTie(group, games));   // re-apply to the smaller group
      else group.forEach(function (n) { out.push({ name: n, tied: true }); });         // still level: disciplinary record / coin toss
      i = j;
    }
    return out;
  }

  function compute(rows) {
    var teams = {}, games = [];
    function team(name) {
      if (!teams[name]) teams[name] = { name: name, gp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
      return teams[name];
    }
    rows.forEach(function (r) {
      var c = r.c || [];
      var week = text(c[COLS.week]);
      var home = text(c[COLS.home]), away = text(c[COLS.away]);
      if (isFinals(week) || !home || !away || /^home team$/i.test(home)) return;
      if (/^bye( week)?$/i.test(home) || /^bye( week)?$/i.test(away)) return;   // bye weeks aren't games
      var h = team(home), a = team(away);
      var hs = num(c[COLS.homeScore]), as = num(c[COLS.awayScore]);
      if (hs === null || as === null) return;   // not played yet
      games.push({ home: home, away: away, hs: hs, as: as });
      h.gp++; a.gp++;
      h.gf += hs; h.ga += as; a.gf += as; a.ga += hs;
      h.pts += gamePoints(hs, as); a.pts += gamePoints(as, hs);
      if (hs > as) { h.w++; a.l++; }
      else if (hs < as) { a.w++; h.l++; }
      else { h.d++; a.d++; }
    });
    var byPts = {};
    Object.keys(teams).forEach(function (k) { var x = teams[k]; x.gd = x.gf - x.ga; (byPts[x.pts] = byPts[x.pts] || []).push(k); });
    var list = [];
    Object.keys(byPts).map(Number).sort(function (a, b) { return b - a; }).forEach(function (p) {
      breakTie(byPts[p].sort(), games).forEach(function (t) { var x = teams[t.name]; x.tied = t.tied; list.push(x); });
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
      var pos = 0;
      list.forEach(function (x, i) {
        var prev = list[i - 1];
        if (!(x.tied && prev && prev.tied && prev.pts === x.pts)) pos = i + 1;   // tied teams share a position
        html += '<tr><td>' + (x.tied ? '=' : '') + pos + '</td><td class="t"></td><td>' + x.gp + '</td><td>' + x.w + '</td><td>' + x.d +
          '</td><td>' + x.l + '</td><td>' + x.gf + '</td><td>' + x.ga + '</td><td>' + (x.gd > 0 ? '+' : '') + x.gd +
          '</td><td class="p">' + x.pts + '</td></tr>';
      });
      html += '</tbody></table></div><div class="standings-note">Win = 3 pts, draw = 1, loss = 0. Ties are broken using the <a href="/indoor-tournament-rules/">official tie-breakers</a>. Updates automatically as scores are entered.</div>';
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
