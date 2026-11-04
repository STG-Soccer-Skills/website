/* Live bracket schedule (Rising Strikers and Winter Youth League).
   Each page sets SHEET_ID, SHEET_TAB, and PAGE_TITLE (and may set
   HOME_WEAR / AWAY_WEAR). Games are read from the published Google Sheet,
   so edits show up here without a redeploy.

   Sheet columns (row 1 is the header):
   A Bracket, B Date, C Week, D Time, E Field,
   F Home Team, G Home Score, H Away Team, I Away Score.
   Dates and times are plain text ("Sat 11/7/2026", "8:00 AM").

   headers=1 is required: without it, the Visualization API treats the first
   rows of some tabs as headers and those games never appear.

   Every row on the tab is shown. Do not filter on the Bracket cell: Winter
   Youth tab names use dashes ("Girls U10-U11") while the Bracket values use
   slashes ("Girls U10/U11").
*/
(function () {
    var SHEET_ID = window.SHEET_ID;
    var SHEET_TAB = window.SHEET_TAB;
    var PAGE_TITLE = window.PAGE_TITLE || SHEET_TAB || "Schedule";
    var HOME_WEAR = window.HOME_WEAR || "";
    var AWAY_WEAR = window.AWAY_WEAR || "";

    // Standings (assets/standings.js, loaded in the footer) read these.
    window.SHEET_HEADERS = (typeof window.SHEET_HEADERS === "undefined") ? 1 : window.SHEET_HEADERS;
    window.STANDINGS_COLS = window.STANDINGS_COLS || {
        week: 2, home: 5, homeScore: 6, away: 7, awayScore: 8
    };

    var COL = { date: 1, week: 2, time: 3, field: 4, homeTeam: 5, homeScore: 6, awayTeam: 7, awayScore: 8 };

    var MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];

    /* bg / fg chosen so the pill reads as the team color and text stays
       above WCAG AA. Names that don't name a color get a distinct accent.
       "Artic Foxes" is the sheet spelling; "Arctic Foxes" is accepted too. */
    var TEAM_COLORS = {
        "blue stars":          { bg: "#1D4ED8", fg: "#FFFFFF" },
        "green dragons":       { bg: "#15803D", fg: "#FFFFFF" },
        "violet vipers":       { bg: "#4C1D95", fg: "#FFFFFF" },
        "good guys":           { bg: "#9A3412", fg: "#FFFFFF" },
        "black stars":         { bg: "#111827", fg: "#FFFFFF" },
        "pink":                { bg: "#FBCFE8", fg: "#831843", border: "#9D174D" },
        "turquoise tornadoes": { bg: "#99F6E4", fg: "#134E4A", border: "#0F766E" },
        "purple unicorns":     { bg: "#7E22CE", fg: "#FFFFFF" },
        "yellow jackets":      { bg: "#FACC15", fg: "#111111", border: "#111111", stripe: true },
        "golden eagles":       { bg: "#F6C445", fg: "#3F2A00", border: "#92400E" },
        "jr surfers":          { bg: "#0369A1", fg: "#FFFFFF" },
        "silver sharks":       { bg: "#E5E7EB", fg: "#111827", border: "#6B7280" },
        "blue ninjas":         { bg: "#1E3A8A", fg: "#FFFFFF" },
        "red raptors":         { bg: "#B91C1C", fg: "#FFFFFF" },
        "lv united":           { bg: "#1F2937", fg: "#F6D36B", border: "#F6D36B" },
        "ladybugs":            { bg: "#FECACA", fg: "#7F1D1D", border: "#111111" },
        "orange blaze":        { bg: "#F97316", fg: "#431407", border: "#9A3412" },
        "sky strikers":        { bg: "#7DD3FC", fg: "#0C4A6E", border: "#0369A1" },
        "yellow thunder":      { bg: "#FDE047", fg: "#1C1917", border: "#A16207" },
        "artic foxes":         { bg: "#F0F9FF", fg: "#0F172A", border: "#38BDF8" },
        "arctic foxes":        { bg: "#F0F9FF", fg: "#0F172A", border: "#38BDF8" }
    };

    /* Stable fallback colors for team names that are not listed above.
       Hues alternate so neighbors stay easy to tell apart. Same name always
       prefers the same swatch; if that swatch is already used on this page,
       the next free one is used so a bracket never gets two identical pills. */
    var AUTO_PALETTE = [
        { bg: "#1D4ED8", fg: "#FFFFFF" },
        { bg: "#15803D", fg: "#FFFFFF" },
        { bg: "#B91C1C", fg: "#FFFFFF" },
        { bg: "#FDE047", fg: "#1C1917", border: "#A16207" },
        { bg: "#7E22CE", fg: "#FFFFFF" },
        { bg: "#99F6E4", fg: "#134E4A", border: "#0F766E" },
        { bg: "#C2410C", fg: "#FFFFFF" },
        { bg: "#FBCFE8", fg: "#831843", border: "#9D174D" },
        { bg: "#1E3A8A", fg: "#FFFFFF" },
        { bg: "#F6C445", fg: "#3F2A00", border: "#92400E" },
        { bg: "#0F766E", fg: "#FFFFFF" },
        { bg: "#7DD3FC", fg: "#0C4A6E", border: "#0369A1" },
        { bg: "#9F1239", fg: "#FFFFFF" },
        { bg: "#9A3412", fg: "#FFFFFF" },
        { bg: "#3730A3", fg: "#FFFFFF" },
        { bg: "#1F2937", fg: "#F6D36B", border: "#F6D36B" }
    ];
    var autoAssigned = {};
    var autoUsed = {};

    function canon(name) {
        return String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function autoColor(name) {
        var key = canon(name);
        if (autoAssigned[key]) return autoAssigned[key];
        var h = 0;
        for (var i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0;
        var start = AUTO_PALETTE.length ? h % AUTO_PALETTE.length : 0;
        var idx = start;
        for (var n = 0; n < AUTO_PALETTE.length; n++) {
            idx = (start + n) % AUTO_PALETTE.length;
            if (!autoUsed[idx]) break;
        }
        autoUsed[idx] = true;
        autoAssigned[key] = AUTO_PALETTE[idx];
        return autoAssigned[key];
    }

    function styleFor(name) {
        return TEAM_COLORS[canon(name)] || autoColor(name);
    }

    function makePill(name) {
        var pill = document.createElement("span");
        pill.className = "team-pill";
        pill.textContent = name;
        var style = styleFor(name);
        if (!style) return pill;
        pill.style.backgroundColor = style.bg;
        pill.style.color = style.fg;
        pill.style.borderColor = style.border || style.bg;
        if (style.stripe) {
            pill.style.backgroundImage = "linear-gradient(90deg, #111111 0 6px, " + style.bg + " 6px)";
            pill.style.paddingLeft = "12px";
        }
        return pill;
    }

    // Used by the schedule table and, when scores exist, by standings.js.
    window.colorScheduleTeam = function (el, name) {
        el.textContent = "";
        el.appendChild(makePill(name));
    };

    var titleEl = document.getElementById("scheduleTitle");
    if (titleEl) titleEl.textContent = PAGE_TITLE;

    function gvizUrl(id, tab) {
        return "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(id) +
               "/gviz/tq?tqx=out:json&headers=1&sheet=" + encodeURIComponent(tab);
    }

    function parseGviz(text) {
        var start = text.indexOf("{");
        var end = text.lastIndexOf("}");
        if (start === -1 || end === -1) throw new Error("Unexpected response from Google Sheets.");
        return JSON.parse(text.substring(start, end + 1));
    }

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    function cellText(cell) {
        if (!cell) return "";
        if (cell.f !== undefined && cell.f !== null && cell.f !== "") return String(cell.f).trim();
        if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
        return "";
    }

    function parseDate(cell) {
        if (!cell) return null;
        var v = cell.v;
        if (typeof v === "string") {
            var m = v.match(/^Date\((\d+),(\d+),(\d+)/);
            if (m) return new Date(+m[1], +m[2], +m[3]);
            var iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
            var md = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (md) return new Date(+md[3], +md[1] - 1, +md[2]);
        }
        var f = cell.f;
        if (typeof f === "string") {
            var fiso = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (fiso) return new Date(+fiso[1], +fiso[2] - 1, +fiso[3]);
            var fmd = f.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (fmd) return new Date(+fmd[3], +fmd[1] - 1, +fmd[2]);
            var d = new Date(f);
            if (!isNaN(d.getTime())) return d;
        }
        return null;
    }

    function headerDate(d) {
        return MONTHS[d.getMonth()] + " " + pad2(d.getDate());
    }

    function isFinalsWeek(weekValue) {
        return !weekValue.trim() || /final/i.test(weekValue);
    }

    function weekLabel(weekValue, dateObj, rawDateText) {
        var name;
        if (isFinalsWeek(weekValue)) name = "Finals";
        else if (/^\d+$/.test(weekValue.trim())) name = "Week " + weekValue.trim();
        else name = weekValue;
        var datePart = dateObj ? headerDate(dateObj) : (rawDateText || "");
        return datePart ? name + " – " + datePart : name;
    }

    function formatField(text) {
        return /^\d+$/.test(text) ? "Field " + text : text;
    }

    function formatTime(cell) {
        if (!cell) return "";
        if (typeof cell.v === "string") {
            var m = cell.v.match(/^Date\(\d+,\d+,\d+,(\d+),(\d+)/);
            if (m) {
                var h = +m[1], min = +m[2];
                var ap = h >= 12 ? "PM" : "AM";
                var h12 = h % 12; if (h12 === 0) h12 = 12;
                return h12 + ":" + pad2(min) + " " + ap;
            }
        }
        return cellText(cell).replace(/(\d{1,2}:\d{2}):\d{2}(\s*[AaPp][Mm])/, "$1$2");
    }

    function rowsToGames(rows) {
        var games = [];
        rows.forEach(function (row) {
            var c = row.c || [];
            var get = function (i) { return cellText(c[i]); };

            var dateText = get(COL.date);
            var homeTeam = get(COL.homeTeam);
            var awayTeam = get(COL.awayTeam);

            if (dateText.toLowerCase() === "date") return;
            if (homeTeam.toLowerCase() === "home team") return;
            if (!homeTeam && !awayTeam) return;

            var dateObj = parseDate(c[COL.date]);

            games.push({
                dateObj:   dateObj,
                dateText:  dateText,
                week:      get(COL.week),
                field:     formatField(get(COL.field)),
                time:      formatTime(c[COL.time]),
                homeTeam:  homeTeam,
                homeScore: get(COL.homeScore),
                awayTeam:  awayTeam,
                awayScore: get(COL.awayScore)
            });
        });
        return games;
    }

    function groupByWeek(games) {
        var order = [], map = {};
        games.forEach(function (g) {
            var key = g.week;
            if (!map[key]) { map[key] = []; order.push(key); }
            map[key].push(g);
        });
        return order.map(function (key) {
            return { week: key, games: map[key] };
        });
    }

    function buildCell(text, className) {
        var td = document.createElement("td");
        if (className) td.className = className;
        td.textContent = text || "";
        return td;
    }

    function buildTeamCell(text, className) {
        var td = document.createElement("td");
        if (className) td.className = className;
        if (!text) return td;
        if (className === "bye-week") {
            td.textContent = text;
            return td;
        }
        td.appendChild(makePill(text));
        return td;
    }

    function buildHeaderCell(label, className, wearText, wearClass) {
        var th = document.createElement("th");
        if (className) th.className = className;
        th.appendChild(document.createTextNode(label));
        if (wearText) {
            var note = document.createElement("span");
            note.className = "wear-note " + wearClass;
            note.textContent = "(" + wearText + ")";
            th.appendChild(note);
        }
        return th;
    }

    function buildHead() {
        var thead = document.createElement("thead");
        var tr = document.createElement("tr");
        tr.appendChild(buildHeaderCell("Date", "text-center"));
        tr.appendChild(buildHeaderCell("Field", "text-center"));
        tr.appendChild(buildHeaderCell("Time", "text-center"));
        tr.appendChild(buildHeaderCell("Home", null, HOME_WEAR, "wear-white"));
        tr.appendChild(buildHeaderCell("Score", "text-center"));
        tr.appendChild(buildHeaderCell("Away", null, AWAY_WEAR, "wear-black"));
        tr.appendChild(buildHeaderCell("Score", "text-center"));
        thead.appendChild(tr);
        return thead;
    }

    function render(games) {
        var mount = document.getElementById("scheduleMount");
        mount.innerHTML = "";
        var groups = groupByWeek(games);

        groups.forEach(function (group) {
            var isFinals = isFinalsWeek(group.week);
            var firstWithDate = group.games.find(function (g) { return g.dateObj; });
            var headerDateObj = firstWithDate ? firstWithDate.dateObj : null;
            var rawDate = group.games[0] ? group.games[0].dateText : "";

            var header = document.createElement("div");
            header.className = "week-header";
            header.textContent = weekLabel(group.week, headerDateObj, rawDate);
            mount.appendChild(header);

            var table = document.createElement("table");
            table.className = "schedule-table";
            table.appendChild(buildHead());
            var tbody = document.createElement("tbody");
            tbody.className = "filterable-body";

            group.games.forEach(function (g) {
                var tr = document.createElement("tr");
                var teamClass = isFinals ? "team-name" : null;

                var homeText = g.homeTeam, awayText = g.awayTeam;
                var homeClass = teamClass, awayClass = teamClass;
                if (g.homeTeam && !g.awayTeam)      { awayText = "Bye Week"; awayClass = "bye-week"; }
                else if (!g.homeTeam && g.awayTeam) { homeText = "Bye Week"; homeClass = "bye-week"; }

                tr.appendChild(buildCell(g.dateText, "text-center"));
                var fieldCell = buildCell(g.field, "text-center");
                if (g.field && !/^field\b/i.test(g.field)) fieldCell.classList.add("field-bare");
                tr.appendChild(fieldCell);
                tr.appendChild(buildCell(g.time, "text-center"));
                tr.appendChild(buildTeamCell(homeText, homeClass));
                tr.appendChild(buildCell(g.homeScore, "score-cell"));
                tr.appendChild(buildTeamCell(awayText, awayClass));
                tr.appendChild(buildCell(g.awayScore, "score-cell"));

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            mount.appendChild(table);
        });
    }

    function showStatus(msg) {
        var s = document.getElementById("scheduleStatus");
        if (!s) return;
        s.className = "";
        s.textContent = msg;
        s.style.display = msg ? "block" : "none";
    }

    function showUnavailable() {
        var s = document.getElementById("scheduleStatus");
        if (!s) return;
        s.className = "schedule-unavailable";
        s.textContent = "Schedule not available yet. It will show here as soon as the sheet is shared.";
        s.style.display = "block";
        var search = document.getElementById("teamSearch");
        if (search) search.style.display = "none";
    }

    function isUnavailable(err, status) {
        if (status === 401 || status === 403) return true;
        var msg = String((err && err.message) || err || "");
        return /unavailable|Failed to fetch|NetworkError|Load failed|Unexpected response/i.test(msg);
    }

    function loadSchedule() {
        if (!SHEET_ID || SHEET_ID === "PASTE_YOUR_SHEET_ID_HERE") {
            showStatus("Set SHEET_ID on this page to load live games.");
            return;
        }
        fetch(gvizUrl(SHEET_ID, SHEET_TAB))
            .then(function (r) {
                if (r.status === 401 || r.status === 403) {
                    var denied = new Error("unavailable");
                    denied.code = "unavailable";
                    throw denied;
                }
                if (!r.ok) throw new Error("Could not reach the sheet (HTTP " + r.status + ").");
                return r.text();
            })
            .then(function (text) {
                if (/^\s*</.test(text) || /ServiceLogin/.test(text)) {
                    var denied = new Error("unavailable");
                    denied.code = "unavailable";
                    throw denied;
                }
                var data = parseGviz(text);
                if (data.status && data.status !== "ok") {
                    var reason = (data.errors && data.errors[0] && (data.errors[0].detailed_message || data.errors[0].message)) || data.status;
                    throw new Error(reason);
                }
                if (!data.table || !data.table.rows) throw new Error("No data found in tab \"" + SHEET_TAB + "\".");
                var games = rowsToGames(data.table.rows);
                if (!games.length) throw new Error("Tab \"" + SHEET_TAB + "\" has no games yet.");
                showStatus("");
                render(games);
            })
            .catch(function (err) {
                if ((err && err.code === "unavailable") || isUnavailable(err)) showUnavailable();
                else showStatus("Couldn't load the schedule: " + (err.message || err));
            });
    }

    loadSchedule();

    var search = document.getElementById("teamSearch");
    if (search) {
        search.addEventListener("keyup", function () {
            var filter = this.value.toUpperCase();
            var containers = document.querySelectorAll(".schedule-table");

            containers.forEach(function (table) {
                var body = table.querySelector(".filterable-body");
                if (!body) return;
                var rows = body.getElementsByTagName("tr");
                var hasVisibleRow = false;

                for (var i = 0; i < rows.length; i++) {
                    var homeTeam = rows[i].cells[3] ? rows[i].cells[3].textContent.toUpperCase() : "";
                    var awayTeam = rows[i].cells[5] ? rows[i].cells[5].textContent.toUpperCase() : "";

                    if (homeTeam.indexOf(filter) > -1 || awayTeam.indexOf(filter) > -1 || filter === "") {
                        rows[i].style.display = "";
                        hasVisibleRow = true;
                    } else {
                        rows[i].style.display = "none";
                    }
                }

                table.style.display = hasVisibleRow ? "" : "none";

                var header = table.previousElementSibling;
                if (header && header.classList.contains("week-header")) {
                    header.style.display = hasVisibleRow ? "" : "none";
                }
            });
        });
    }
})();
