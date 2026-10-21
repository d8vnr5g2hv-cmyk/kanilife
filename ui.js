/* Kani Life - 画面 */
(function () {
  'use strict';
  var KL = window.KL, U = KL.U;
  var app = document.getElementById('app');
  var sheet = document.getElementById('sheet');
  var sheetBody = sheet.querySelector('.sheet-body');
  var S = null, alloc = {}, tab = 'home', setup = null, flow = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stars(n, fam) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= n ? (fam && i > n - fam ? '<span class="fam">★</span>' : '★') : '<span class="off">★</span>'; return s; }
  function r0(v) { return Math.round(v); }
  function openSheet(html) { sheetBody.innerHTML = html; sheet.hidden = false; sheetBody.scrollTop = 0; }
  function closeSheet() { sheet.hidden = true; sheetBody.innerHTML = ''; }

  // ================= タイトル =================
  function title() {
    var sv = KL.load(), hall = KL.hall();
    var hallHtml = hall.length ? '<div class="hall"><h3>これまでの人生</h3>' + hall.slice(0, 6).map(function (h) {
      return '<div class="hall-row"><b>' + esc(h.rank) + '</b><div>' + esc(h.name) + '（' + h.age + '歳）<br><small style="color:var(--sub)">' + esc(h.title) + '</small></div><span>' + new Date(h.when).toLocaleDateString('ja-JP') + '</span></div>';
    }).join('') + '</div>' : '';
    app.innerHTML =
      '<div class="title-screen">' +
      '<h1 class="logo">Kani Life<small>もしもの人生シミュレーター</small></h1>' +
      '<p class="title-lead">生まれてから老後まで、<br>半年ずつ、もうひとつの人生を。</p>' +
      '<p class="title-sub">選択と積み重ねで能力が育ち、周りの見る目が変わっていく。サッカー選手にも、アイドルにも、会社員にもなれる。</p>' +
      '<div class="title-actions">' +
      (sv && !sv.dead ? '<button class="btn btn-main" data-a="continue">続きから（' + esc(sv.sei + ' ' + sv.mei) + '・' + KL.age(sv) + '歳）</button>' : '') +
      '<button class="btn ' + (sv && !sv.dead ? 'btn-ghost' : 'btn-main') + '" data-a="new">新しい人生をはじめる</button>' +
      '</div>' + hallHtml + '</div>';
  }

  // ================= 人生の設定 =================
  function rollFamily() { return U.wpick(KL.FAMILIES, function (f) { return f.w; }); }
  function newSetup() {
    var tal = {}; KL.STATS.forEach(function (s) { tal[s.k] = 2; });
    setup = { sei: '', mei: '', sex: 'm', loveSex: 'f', pref: '大阪', family: rollFamily(), tal: tal, pts: 7 };
  }
  function famBonus(k) { return setup.family.bonus.indexOf(k) >= 0 ? 1 : 0; }
  function setupView() {
    var st = setup;
    var talRows = KL.STATS.map(function (s) {
      var fb = famBonus(s.k), v = Math.min(5, st.tal[s.k] + fb);
      return '<div class="tal-row"><span class="n">' + s.n + '</span><span class="stars">' + stars(v, Math.min(fb, v - st.tal[s.k])) + '</span>' +
        '<div class="step"><button data-a="tal" data-k="' + s.k + '" data-d="-1" ' + (st.tal[s.k] <= 1 ? 'disabled' : '') + ' aria-label="' + s.n + 'を下げる">−</button>' +
        '<button data-a="tal" data-k="' + s.k + '" data-d="1" ' + (st.pts <= 0 || st.tal[s.k] >= 5 ? 'disabled' : '') + ' aria-label="' + s.n + 'を上げる">＋</button></div></div>';
    }).join('');
    app.innerHTML =
      '<div class="page">' +
      '<button class="btn btn-sm btn-line" data-a="toTitle">戻る</button>' +
      '<h2>どんなふうに生まれる？</h2>' +
      '<p class="lead">' + KL.BIRTH_YEAR + '年生まれ。18歳でちょうど2026-27シーズンを迎える世代です。</p>' +
      '<div class="field"><label>名前</label><div class="row2"><input class="input" id="sei" placeholder="姓（空欄でおまかせ）" value="' + esc(st.sei) + '"><input class="input" id="mei" placeholder="名（空欄でおまかせ）" value="' + esc(st.mei) + '"></div></div>' +
      '<div class="field"><label>性別</label><div class="seg"><button data-a="sex" data-v="m" class="' + (st.sex === 'm' ? 'on' : '') + '">男性</button><button data-a="sex" data-v="f" class="' + (st.sex === 'f' ? 'on' : '') + '">女性</button></div></div>' +
      '<div class="field"><label>恋愛の対象</label><div class="seg"><button data-a="love" data-v="f" class="' + (st.loveSex === 'f' ? 'on' : '') + '">女性</button><button data-a="love" data-v="m" class="' + (st.loveSex === 'm' ? 'on' : '') + '">男性</button><button data-a="love" data-v="any" class="' + (st.loveSex === 'any' ? 'on' : '') + '">どちらも</button></div></div>' +
      '<div class="field"><label>出身地</label><select class="input" id="pref">' + KL.PREFS.map(function (p) { return '<option' + (p === st.pref ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>生まれる家庭</label><div class="family"><div><b>' + esc(st.family.name) + '</b><p>' + esc(st.family.desc) + '</p></div><button class="btn btn-sm btn-ghost" data-a="reroll">引き直す</button></div></div>' +
      '<div class="field"><div class="tal-head"><label>素質（伸びしろ）</label><span class="pts">残り ' + st.pts + 'pt</span></div>' + talRows +
      '<p class="note">素質は「どこまで・どれだけ速く伸びるか」。今の能力ではなく、行動で積み上げていきます。<span style="color:var(--gold)">金色の★</span>は家庭からのボーナス。</p></div>' +
      '<button class="btn btn-main" data-a="start" style="margin:8px 0 32px">この条件で生まれる</button>' +
      '</div>';
    ['sei', 'mei'].forEach(function (id) { document.getElementById(id).addEventListener('input', function (e) { setup[id] = e.target.value.trim(); }); });
    document.getElementById('pref').addEventListener('change', function (e) { setup.pref = e.target.value; });
  }
  function startLife() {
    var st = setup, tal = {};
    KL.STATS.forEach(function (s) { tal[s.k] = Math.min(5, st.tal[s.k] + famBonus(s.k)); });
    var luck = null, r = Math.random();
    if (r < 0.02) { var ks = U.shuffle(Object.keys(tal)).slice(0, 2); ks.forEach(function (k) { tal[k] = Math.min(5, tal[k] + 1); }); luck = '神童の素質！（' + ks.map(function (k) { return KL.STATS.filter(function (s) { return s.k === k; })[0].n; }).join('・') + 'の素質が上がった）'; }
    else if (r < 0.12) { var k = U.pick(Object.keys(tal).filter(function (x) { return tal[x] < 5; })) || 'men'; tal[k] = Math.min(5, tal[k] + 1); luck = '天賦の才（' + KL.STATS.filter(function (s) { return s.k === k; })[0].n + 'の素質が上がった）'; }
    S = KL.newGame({
      sei: st.sei || U.pick(KL.NAMES.sei), mei: st.mei || U.pick(st.sex === 'm' ? KL.NAMES.m : KL.NAMES.f),
      sex: st.sex, loveSex: st.loveSex, pref: st.pref, family: st.family.id, tal: tal, luck: luck
    });
    alloc = {}; tab = 'home';
    KL.save(S);
    render();
    // 誕生イベントだけ先に見せる
    S._queue = []; S._lines = [];
    var birth = KL.EVENTS.filter(function (e) { return e.id === 'birth'; })[0];
    S.done.birth = 1;
    showEvent(KL.evInstance(S, birth), true);
  }

  // ================= メイン =================
  function render() {
    if (!S) return title();
    if (S.dead) return resultView();
    var body = tab === 'home' ? homeView() : tab === 'rec' ? recView() : tab === 'rel' ? relView() : logView();
    app.innerHTML = topbar() + body + tabsView() + (tab === 'home' ? goView() : '');
  }
  function topbar() {
    return '<div class="topbar"><div class="age num">' + KL.age(S) + '<small>歳</small></div>' +
      '<div class="who"><b>' + esc(S.sei + ' ' + S.mei) + '・' + esc(KL.stageLabel(S)) + '</b><span>' + esc(KL.period(S)) + '</span></div>' +
      '<div class="money"><span>所持金</span><b class="num">' + U.yen(S.money) + '</b></div>' +
      '<button class="menu-btn" data-a="menu" aria-label="メニュー">≡</button></div>';
  }
  function tabsView() {
    var t = [['home', '🏠', 'ホーム'], ['rec', '🏆', '成績'], ['rel', '💞', '人間関係'], ['log', '📜', '年表']];
    return '<nav class="tabs">' + t.map(function (x) { return '<button data-a="tab" data-v="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '"><i>' + x[1] + '</i>' + x[2] + '</button>'; }).join('') + '</nav>';
  }
  function fromLabel() {
    var a = KL.age(S);
    if (S.stage === 'pro' || S.stage === 'idol' || (S.track && S.rep.nat >= 40) || S.talent) return '世間から見たあなた';
    if (a < 6 || S.stage === 'retired') return '近所の人から見たあなた';
    if (KL.isStudent(S)) return '同級生から見たあなた';
    if (S.stage === 'work') return '職場の人から見たあなた';
    return '周りから見たあなた';
  }
  function homeView() {
    var p = KL.perception(S);
    var h = '<div class="eyes"><p class="from">' + fromLabel() + '</p><div class="bubble"><p class="q">「' + esc(p.main) + '」</p>' +
      (p.tags && p.tags.length ? '<div class="tags">' + p.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      '</div><div class="me"><i>' + (S.sex === 'm' ? '🧑' : '👩') + '</i>' + esc(S.sei + ' ' + S.mei) + '</div></div>';
    if (S.track === 'soccer' && S.soccer) h += soccerCard();
    if (S.track === 'idol' && S.idol) h += idolCard();
    h += '<div class="sec"><div class="sec-h"><h3>能力</h3><span>★＝素質</span></div><div class="panel">' +
      KL.STATS.map(function (s) {
        var v = S.st[s.k], cap = KL.capOf(S, s.k);
        return '<div class="bar"><span class="n">' + s.n + '<small>' + '★'.repeat(S.tal[s.k]) + '</small></span><div class="track"><div class="fill" style="width:' + v + '%"></div><div class="cap" style="left:' + cap + '%"></div></div><span class="v num">' + r0(v) + '</span></div>';
      }).join('') +
      '<div class="bar ' + (S.fat > 60 ? 'warn' : '') + '"><span class="n">疲労</span><div class="track"><div class="fill" style="width:' + S.fat + '%;' + (S.fat <= 60 ? 'background:#9DC7C8' : '') + '"></div></div><span class="v num">' + r0(S.fat) + '</span></div>' +
      '</div></div>';
    h += actionsView();
    return h;
  }
  function skillBars(defs, vals, caps) {
    return defs.map(function (d) {
      var v = vals[d.k];
      return '<div class="bar"><span class="n">' + d.n + '</span><div class="track" style="background:#fff"><div class="fill" style="width:' + v + '%"></div>' + (caps ? '<div class="cap" style="left:' + caps[d.k] + '%"></div>' : '') + '</div><span class="v num">' + r0(v) + '</span></div>';
    }).join('');
  }
  function soccerCard() {
    var so = S.soccer, SO = KL.Soccer, ovr = SO.ovr(so), c = so.club ? SO.club(S) : null;
    var sub = c ? KL.LEAGUES[c.l].name + '・年俸' + U.yen(so.salary) + '・契約残り' + Math.max(0, so.contract) + '年' : SO.leagueName(S);
    if (so.pending) sub += '（' + KL.clubById(so.pending.club).n + 'に内定）';
    var defs = SO.SK.filter(function (s) { return so.pos === 'GK' ? ['gk', 'iq', 'phy', 'pas'].indexOf(s.k) >= 0 : s.k !== 'gk'; });
    var mates = c ? SO.teammates(S).slice(0, 5) : [];
    return '<div class="sec"><div class="sec-h"><h3>サッカー</h3><span>' + esc(SO.POS[so.pos].jp) + '</span></div><div class="track-card">' +
      '<div class="track-head"><div class="ovr"><div><b class="num">' + ovr + '</b><small>OVR</small></div></div><div class="t"><b>' + esc(SO.teamName(S)) + '</b><span>' + esc(sub) + '</span></div></div>' +
      skillBars(defs, so.sk) +
      (so.ntNow ? '<p class="mates">🇯🇵 日本代表に招集中（通算' + so.caps + '試合' + so.ntGoals + '得点）</p>' : '') +
      (mates.length ? '<p class="mates">チームメイト：' + mates.map(function (m) { return esc(m.name) + '（' + m.pos + ' ' + m.ovr + '）'; }).join('、') + '</p>' : '') +
      '</div></div>';
  }
  function idolCard() {
    var id = S.idol, ID = KL.Idol;
    return '<div class="sec"><div class="sec-h"><h3>アイドル</h3><span>' + esc(id.agency) + '</span></div><div class="track-card">' +
      '<div class="track-head"><div class="ovr" style="background:var(--gold)"><div><b class="num">' + ID.power(id) + '</b><small>総合</small></div></div><div class="t"><b>' + esc(id.groupName) + '・' + ID.STATUS[id.status] + '</b><span>ファン ' + id.fans.toLocaleString() + '人・人気' + (id.rank || ID.calcRank(id)) + '位/' + id.size + '人</span></div></div>' +
      skillBars(ID.SK, id.sk) + '</div></div>';
  }
  function actionsView() {
    var acts = KL.getActions(S), ap = KL.apOf(S);
    if (!acts.length || !ap) return '<div class="sec"><div class="panel"><p class="empty">まだ小さいので、すくすく育つのを見守ろう。</p></div></div>';
    var ids = acts.map(function (a) { return a.id; });
    Object.keys(alloc).forEach(function (k) { if (ids.indexOf(k) < 0) delete alloc[k]; });
    var used = used0();
    while (used > ap) { var k0 = Object.keys(alloc).filter(function (k) { return alloc[k] > 0; }).pop(); alloc[k0]--; used--; }
    var dots = ''; for (var i = 0; i < ap; i++) dots += '<i class="' + (i < used ? '' : 'off') + '"></i>';
    return '<div class="sec"><div class="sec-h"><h3>この半年の過ごし方</h3><div class="ap" aria-label="残り' + (ap - used) + '回">' + dots + '</div></div><div class="panel">' +
      acts.map(function (a) {
        var v = alloc[a.id] || 0;
        var tg = a.soccer ? '<span class="tag-s soc">⚽</span>' : a.idol ? '<span class="tag-s idl">🎤</span>' : '';
        return '<div class="act ' + (v ? 'on' : '') + '"><div class="info"><b>' + esc(a.n) + tg + '</b><span>' + esc(a.d) + '</span></div>' +
          '<div class="step"><button data-a="al" data-k="' + a.id + '" data-d="-1" ' + (v <= 0 ? 'disabled' : '') + ' aria-label="減らす">−</button><span class="v num">' + v + '</span>' +
          '<button data-a="al" data-k="' + a.id + '" data-d="1" ' + (used >= ap ? 'disabled' : '') + ' aria-label="増やす">＋</button></div></div>';
      }).join('') + '</div><p class="note">余った回数は「休養」になります。配分は次の半年にも引き継がれます。</p></div>';
  }
  function used0() { return Object.keys(alloc).reduce(function (t, k) { return t + (alloc[k] || 0); }, 0); }
  function goView() {
    var label = KL.apOf(S) ? 'この半年を過ごす' : 'すくすく育つ（半年後へ）';
    return '<div class="go"><button class="btn btn-main" data-a="play">' + label + '</button></div>';
  }

  // ---------- 成績 ----------
  function recView() {
    var h = '';
    var so = S.soccer;
    if (so) {
      var SO = KL.Soccer;
      h += '<div class="sec"><div class="sec-h"><h3>サッカーの成績</h3><span>' + esc(SO.POS[so.pos].jp) + (so.retired ? '・引退' : '') + '</span></div>' +
        '<div class="totals"><div><small>出場</small><b class="num">' + so.totalApps + '</b></div><div><small>得点</small><b class="num">' + so.totalGoals + '</b></div><div><small>アシスト</small><b class="num">' + so.totalAst + '</b></div><div><small>代表</small><b class="num">' + so.caps + '</b></div></div>';
      var ss = so.seasons.slice(); if (so.cur && !so.cur.closed) ss.push(so.cur);
      ss = ss.filter(function (x) { return x.apps > 0 || x.club; }).reverse();
      h += ss.length ? ss.map(function (x) {
        var rt = x.rn ? (x.rs / x.rn).toFixed(2) : '-';
        var notes = (x.notes || []).filter(function (n, i, a) { return a.indexOf(n) === i; });
        return '<div class="season"><div class="season-h"><span class="y num">' + esc(x.label) + '</span><span class="tm">' + esc(x.team) + '（' + esc(x.lg) + '）' + (x.closed ? '' : ' 進行中') + '</span><span class="o num">OVR ' + (x.ovrEnd || SO.ovr(so)) + '</span></div>' +
          '<div class="cells"><div><small>出場</small><b class="num">' + x.apps + '</b></div><div><small>得点</small><b class="num">' + x.goals + '</b></div><div><small>アシスト</small><b class="num">' + x.ast + '</b></div><div><small>評価</small><b class="num">' + rt + '</b></div><div><small>代表</small><b class="num">' + x.ntApps + '</b></div><div><small>代表点</small><b class="num">' + x.ntGoals + '</b></div></div>' +
          (notes.length ? '<div class="notes">' + notes.map(function (n) { return '<span class="' + (/優勝|王|MVP|イレブン|賞|昇格/.test(n) ? '' : 'plain') + '">' + esc(n) + '</span>'; }).join('') + '</div>' : '') + '</div>';
      }).join('') : '<p class="empty">まだ公式戦の記録はありません。</p>';
      h += '</div>';
    }
    if (S.idol) {
      var id = S.idol, ID = KL.Idol;
      h += '<div class="sec"><div class="sec-h"><h3>アイドルの記録</h3><span>' + esc(id.groupName) + '</span></div><div class="totals"><div><small>ファン</small><b class="num">' + U.r1(id.fans / 10000) + '万</b></div><div><small>最高</small><b class="num">' + U.r1(id.peakFans / 10000) + '万</b></div><div><small>センター</small><b class="num">' + id.centerCount + '</b></div><div><small>シングル</small><b class="num">' + id.singles + '</b></div></div>' +
        (id.hist.length ? '<div class="panel">' + id.hist.slice().reverse().map(function (x) { return '<div class="trophy"><i>🗳️</i>' + x.year + '年 人気投票 ' + x.rank + '位<span>ファン' + x.fans.toLocaleString() + '人</span></div>'; }).join('') + '</div>' : '<p class="empty">人気投票はまだです。</p>') + '</div>';
    }
    if (S.job) {
      h += '<div class="sec"><div class="sec-h"><h3>仕事</h3><span>勤続' + S.job.years + '年</span></div><div class="panel"><div class="trophy"><i>💼</i>' + esc(S.job.name) + '・' + esc(KL.jobTitles(S)[S.job.title]) + '<span>年収' + U.yen(KL.salary(S)) + '</span></div>' +
        '<div class="bar"><span class="n">評価</span><div class="track"><div class="fill" style="width:' + S.job.perf + '%"></div></div><span class="v num">' + r0(S.job.perf) + '</span></div></div></div>';
    }
    h += '<div class="sec"><div class="sec-h"><h3>獲得タイトル・称号</h3><span>' + S.titles.length + '</span></div><div class="panel">' +
      (S.titles.length ? S.titles.slice().reverse().map(function (t) { return '<div class="trophy"><i>🏅</i>' + esc(t.name) + '<span>' + t.year + '年・' + t.age + '歳</span></div>'; }).join('') : '<p class="empty">まだありません。これからの人生で。</p>') + '</div></div>';
    if (S.track !== 'soccer' && !S.soccer) h += '<div class="sec"><p class="note">サッカー教室や部活でサッカー経験を積むと、少年団やサッカー部から声がかかります。ダンス・歌の経験や見た目が育つと、アイドルのオーディションに挑戦できます。</p></div>';
    return h;
  }

  // ---------- 人間関係 ----------
  function moteStars(m) { var n = Math.max(1, Math.min(5, Math.round(m / 20))); return '<span class="stars" style="flex:none;color:#E07A95">' + '♥'.repeat(n) + '<span class="off">' + '♥'.repeat(5 - n) + '</span></span>'; }
  function profRows(n) {
    KL.ensureProfile(S, n);
    var a = KL.npcAge(S, n), rows = [
      ['見た目', (KL.lookWord(n) ? KL.lookWord(n) + ' ' : '') + n.vt],
      ['性格', n.pers], ['年齢', a + '歳（' + (n.ad > 0 ? n.ad + '歳上' : n.ad < 0 ? (-n.ad) + '歳下' : '同い年') + '）'],
      ['身長', n.ht + 'cm'], ['職業・学校', KL.npcJob(S, n)], ['趣味', n.hobby],
      ['好きなタイプ', KL.prefName(n.pref)], ['出会い', n.met]
    ];
    if (n.how) rows.push(['なれそめ', n.how]);
    return rows;
  }
  function partnerCard(pt) {
    var yrs = Math.floor((S.t - (S.spouseId ? (S.marriedT || pt.since) : pt.since)) / 2);
    return '<div class="sec"><div class="sec-h"><h3>' + (S.spouseId ? '配偶者' : '恋人') + '</h3><span>' + (S.spouseId ? '結婚して' : '付き合って') + (yrs ? yrs + '年' : '半年未満') + '</span></div>' +
      '<div class="track-card"><div class="track-head"><div class="ava ' + (pt.sex || 'f') + '" style="width:56px;height:56px;font-size:22px">' + esc((pt.name.split(' ')[1] || pt.name).charAt(0)) + '</div><div class="t"><b>' + esc(pt.name) + (pt.dead ? '（故人）' : '') + '</b><span>' + esc(KL.profileLine(S, pt)) + '</span></div></div>' +
      '<dl class="kv" style="margin:8px 0 6px">' + profRows(pt).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>' +
      '<div class="bar"><span class="n">好感度</span><div class="track" style="background:#fff"><div class="fill" style="width:' + pt.like + '%;background:#E07A95"></div></div><span class="v num">' + r0(pt.like) + '</span></div></div></div>';
  }
  function relView() {
    var h = '', m = KL.mote(S), a = KL.age(S);
    if (a >= 10) {
      h += '<div class="sec"><div class="sec-h"><h3>恋愛</h3><span>' + esc(KL.moteLabel(S)) + '</span></div><div class="panel">' +
        '<div class="bar"><span class="n">モテ度</span><div class="track"><div class="fill" style="width:' + m + '%;background:#E07A95"></div></div><span class="v num">' + m + '</span></div>' +
        '<div class="totals" style="margin:6px 0 8px"><div><small>告白された</small><b class="num">' + (S.flags.confessed || 0) + '</b></div><div><small>告白した</small><b class="num">' + (S.confessOk + S.confessNg) + '</b></div><div><small>交際人数</small><b class="num">' + (S.flags.dated || 0) + '</b></div><div><small>' + (S.sex === 'm' || S.loveSex === 'f' ? 'チョコ' : '成功') + '</small><b class="num">' + (S.sex === 'm' || S.loveSex === 'f' ? S.choc : S.confessOk) + '</b></div></div>' +
        '<p class="note" style="margin:0 0 8px">モテ度は 見た目・コミュ力・' + (a < 22 ? '運動神経・学校での評判' : 'メンタル・知名度') + ' で決まります。</p></div></div>';
    }
    var pt = KL.partner(S);
    if (pt) h += partnerCard(pt);
    var fam = S.family_members.map(function (f) { return person({ name: f.name, sex: /父|兄/.test(f.rel) ? 'm' : 'f' }, f.rel, null); });
    S.kids.forEach(function (k) { fam.push(person({ name: S.sei + ' ' + k.name, sex: k.sex }, (k.sex === 'm' ? '息子' : '娘') + '・' + Math.floor((S.t - k.born) / 2) + '歳', null)); });
    if (S.flags.cat) fam.push('<div class="person"><div class="ava" style="background:var(--gold)">🐈</div><div class="p"><b>' + esc(S.flags.cat) + '</b><span class="rel">ねこ</span></div></div>');
    h += '<div class="sec"><div class="sec-h"><h3>家族</h3></div><div class="panel">' + fam.join('') + '</div></div>';
    var list = S.npcs.filter(function (n) { return n.id !== S.partnerId && n.id !== S.spouseId; }).sort(function (x, y) { return (y.since - x.since) || (y.like - x.like); });
    var canCrush = function (n) { return !S.spouseId && !S.partnerId && a >= 10 && n.rel !== 'ex' && (S.loveSex === 'any' || n.sex === S.loveSex); };
    h += '<div class="sec"><div class="sec-h"><h3>知り合い</h3><span>' + list.length + '人・タップで詳細</span></div><div class="panel">' +
      (list.length ? list.map(function (n) {
        var lbl = KL.relLabel(n) + (KL.roleLabel(n) ? '・' + KL.roleLabel(n) : '') + '（' + n.met + '）';
        var act = S.crushId === n.id ? '<span class="crush-mark">♥ 気になる人</span>' : canCrush(n) ? '<button class="btn btn-sm btn-ghost" data-a="crush" data-id="' + n.id + '">気になる</button>' : '';
        return person(n, lbl, n.like, act, true);
      }).join('') : '<p class="empty">まだ出会いはこれから。</p>') + '</div></div>';
    h += '<div class="sec"><p class="note">「気になる人」と過ごす時間を増やすと、告白のチャンスがやってきます。成否は好感度・見た目・コミュ力に加えて、相手の「好きなタイプ」に自分が合っているかで決まります。</p></div>';
    return h;
  }
  function person(n, rel, like, act, tap) {
    var ini = (n.name.split(' ')[1] || n.name).charAt(0);
    var love = n.id && (S.loveSex === 'any' || n.sex === S.loveSex) && n.pers;
    return '<div class="person"><div class="ava ' + (n.sex || 'm') + '">' + esc(ini) + '</div><div class="p"' + (tap && n.id ? ' data-a="who" data-id="' + n.id + '" role="button" tabindex="0" style="cursor:pointer"' : '') + '><b>' + esc(n.name) + '</b><span class="rel">' + esc(rel) + '</span>' +
      (love ? '<div style="font-size:11px;color:var(--sub)">' + esc(KL.profileLine(S, n)) + '</div>' : '') +
      (like != null ? '<div class="like"><i style="width:' + like + '%"></i></div>' : '') + '</div>' + (act || '') + '</div>';
  }
  function whoSheet(id) {
    var n = KL.npc(S, id); if (!n) return;
    openSheet('<div class="ev-title"><i>' + (n.sex === 'm' ? '🧑' : '👩') + '</i><h2>' + esc(n.name) + '</h2></div>' +
      '<p class="ev-when" style="margin-bottom:10px">' + esc(KL.relLabel(n)) + (S.crushId === n.id ? '・♥ 気になる人' : '') + '</p>' +
      '<dl class="kv">' + profRows(n).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '<dt>好感度</dt><dd>' + r0(n.like) + ' / 100</dd></dl>' +
      '<button class="btn btn-main" data-a="closeSheet">閉じる</button>');
  }

  // ---------- 年表 ----------
  function logView() {
    return '<div class="sec"><div class="sec-h"><h3>年表</h3><span>' + S.log.length + '件</span></div><div class="log">' +
      S.log.slice().reverse().map(function (l) { return '<div class="log-item i' + l.imp + '"><small>' + l.age + '歳・' + esc(l.p) + '</small><p>' + esc(l.text) + '</p></div>'; }).join('') + '</div></div>';
  }

  // ================= ターン進行 =================
  function play() {
    var acts = KL.getActions(S), ap = KL.apOf(S), a = {};
    acts.forEach(function (x) { if (alloc[x.id]) a[x.id] = alloc[x.id]; });
    var left = ap - Object.keys(a).reduce(function (t, k) { return t + a[k]; }, 0);
    if (left > 0 && acts.some(function (x) { return x.id === 'rest'; })) a.rest = (a.rest || 0) + left;
    flow = { period: KL.period(S), age: KL.age(S), stOld: JSON.parse(JSON.stringify(S.st)) };
    KL.runTurn(S, a);
    flow.lines = S._lines.slice();
    nextEvent();
  }
  function nextEvent() {
    if (S._queue && S._queue.length) showEvent(S._queue.shift());
    else finishTurn();
  }
  function showEvent(ev, standalone) {
    flow = flow || {};
    flow.ev = ev; flow.standalone = !!standalone;
    if (ev.fx) { try { ev.fx(S); } catch (e) { console.error(e); } }
    var ch = ev.choices || [];
    var rest = S._queue ? S._queue.length : 0;
    var html = '<p class="ev-when">' + KL.age(S) + '歳・' + esc(KL.period(S)) + '</p>' +
      '<div class="ev-title"><i>' + (ev.icon || '✨') + '</i><h2>' + esc(ev.title) + '</h2></div>' +
      '<p class="ev-text">' + esc(ev.text) + '</p>';
    if (ch.length) html += '<div class="choices">' + ch.map(function (c, i) { return '<button class="choice" data-a="choose" data-i="' + i + '" ' + (c.ok === false ? 'disabled' : '') + '>' + esc(c.t) + '</button>'; }).join('') + '</div>';
    else html += '<button class="btn btn-main" data-a="evnext">' + (rest ? '次へ' : '続ける') + '</button>';
    if (rest) html += '<p class="count" style="margin-top:12px">このあと出来事がもう' + rest + 'つ</p>';
    openSheet(html);
  }
  function choose(i) {
    var ev = flow.ev, c = ev.choices[i];
    if (!c || c.ok === false) return;
    var res = '';
    try { res = c.fx(S) || ''; } catch (e) { console.error(e); res = '（処理中にエラーが起きました）'; }
    var rest = S._queue ? S._queue.length : 0;
    openSheet('<p class="ev-when">' + KL.age(S) + '歳・' + esc(KL.period(S)) + '</p><div class="ev-title"><i>' + (ev.icon || '✨') + '</i><h2>' + esc(ev.title) + '</h2></div>' +
      '<p class="ev-text" style="color:var(--sub);font-size:14px">' + esc(c.t) + '</p><p class="result">' + esc(res) + '</p>' +
      '<button class="btn btn-main" data-a="evnext">' + (rest ? '次へ' : '続ける') + '</button>');
  }
  function evNext() {
    if (flow && flow.standalone) { flow = null; closeSheet(); KL.save(S); render(); return; }
    nextEvent();
  }
  function finishTurn() {
    var d = S._d || {}, sd = S._sd || {}, lines = flow.lines || [];
    var period = flow.period;
    KL.endTurn(S);
    d = S._d || d;
    if (S.dead) { KL.addHall(S); KL.clearSave(); closeSheet(); render(); return; }
    KL.save(S);
    var chips = [];
    KL.STATS.forEach(function (s) { var v = d[s.k] || 0; if (Math.abs(v) >= 0.5) chips.push('<span class="chip ' + (v < 0 ? 'dn' : '') + '">' + s.n + (v > 0 ? '+' : '') + r0(v) + '</span>'); });
    var skn = S.soccer ? KL.Soccer.skName : {}; var ikn = S.idol ? KL.Idol.skName : {};
    Object.keys(sd).forEach(function (k) { var v = sd[k]; if (Math.abs(v) >= 0.5) chips.push('<span class="chip sk ' + (v < 0 ? 'dn' : '') + '">' + (skn[k] || ikn[k] || k) + (v > 0 ? '+' : '') + r0(v) + '</span>'); });
    if (S._money && Math.abs(S._money) >= 1000) chips.push('<span class="chip mo">お金' + (S._money > 0 ? '+' : '') + U.yen(S._money) + '</span>');
    var html = '<p class="ev-when">' + flow.age + '歳・' + esc(period) + '</p><div class="ev-title"><i>🗓️</i><h2>この半年のまとめ</h2></div>' +
      (lines.length ? '<ul class="sum-lines">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
      (chips.length ? '<div class="chips">' + chips.join('') + '</div>' : '<p class="note" style="margin-bottom:16px">大きな変化はなかった。</p>') +
      (flow.age !== KL.age(S) ? '<p class="result">' + KL.age(S) + '歳になった。' + esc(KL.stageLabel(S)) + '</p>' : '') +
      '<button class="btn btn-main" data-a="sumclose">次の半年へ</button>';
    flow = null;
    openSheet(html);
  }

  // ================= 結果 =================
  function resultView() {
    var r = KL.lifeScore(S), p = KL.perception(S);
    var so = S.soccer, id = S.idol, pt = KL.npc(S, S.spouseId);
    var kv = [['生まれ', S.pref + '・' + KL.familyOf(S).name], ['享年', S.deathAge + '歳（' + S.deathYear + '年）'], ['最後の印象', '「' + p.main + '」']];
    if (so && (so.totalApps || so.proYears)) kv.push(['サッカー', SO_sum(so)]);
    if (id) kv.push(['アイドル', id.groupName + '・最高' + (id.hist.length ? Math.min.apply(null, id.hist.map(function (x) { return x.rank; })) + '位' : '-') + '・ファン最大' + id.peakFans.toLocaleString() + '人']);
    if (S.job) kv.push(['仕事', S.job.name + '・' + KL.jobTitles(S)[S.job.title]]);
    kv.push(['恋愛', '告白された' + (S.flags.confessed || 0) + '回・交際' + (S.flags.dated || 0) + '人']);
    kv.push(['家族', (pt ? pt.name + '（' + KL.profileLine(S, pt) + '）と結婚' : '独身') + (S.kids.length ? '・子ども' + S.kids.length + '人' : '') + (S.flags.mago ? '・孫' + S.flags.mago + '人' : '')]);
    kv.push(['遺した財産', U.yen(S.money)]);
    app.innerHTML = '<div class="result-screen"><p class="ending">' + esc(S.sei + ' ' + S.mei) + 'の人生</p><h1>' + esc(KL.lifeTitle(S)) + '</h1>' +
      '<div class="rank"><div class="r ' + r.rank.toLowerCase() + '">' + r.rank + '</div><p>人生スコア<b class="num">' + r.score + '</b>獲得タイトル ' + S.titles.length + '個</p></div>' +
      '<dl class="kv">' + kv.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>' +
      (S.titles.length ? '<div class="sec" style="margin:0 0 20px"><div class="sec-h"><h3>獲得タイトル</h3></div><div class="panel">' + uniqTitles().map(function (t) { return '<div class="trophy"><i>🏅</i>' + esc(t[0]) + (t[1] > 1 ? ' ×' + t[1] : '') + '</div>'; }).join('') + '</div></div>' : '') +
      '<div class="sec" style="margin:0 0 20px"><div class="sec-h"><h3>年表（ハイライト）</h3></div><div class="log">' + S.log.filter(function (l) { return l.imp >= 2; }).map(function (l) { return '<div class="log-item i' + l.imp + '"><small>' + l.age + '歳</small><p>' + esc(l.text) + '</p></div>'; }).join('') + '</div></div>' +
      '<button class="btn btn-main" data-a="newAfter">新しい人生をはじめる</button><button class="btn btn-line" style="margin-top:10px" data-a="toTitle">タイトルへ</button></div>';
  }
  function SO_sum(so) { return '通算' + so.totalApps + '試合' + so.totalGoals + '得点・代表' + so.caps + '試合' + (so.ballon ? '・バロンドール' : ''); }
  function uniqTitles() { var m = {}, o = []; S.titles.forEach(function (t) { if (!m[t.name]) { m[t.name] = [t.name, 0]; o.push(m[t.name]); } m[t.name][1]++; }); return o; }

  // ================= メニュー =================
  function menu() {
    openSheet('<div class="ev-title"><i>≡</i><h2>メニュー</h2></div><div class="menu-list">' +
      '<button class="btn btn-ghost" data-a="closeSheet">閉じる</button>' +
      '<button class="btn btn-line" data-a="toTitle">タイトルに戻る（自動で保存済み）</button>' +
      '<button class="btn btn-line" style="color:var(--red)" data-a="abandon">この人生を終えて、最初からやり直す</button>' +
      '</div><p class="note" style="margin-top:14px">データはこの端末のブラウザに保存されます。</p>');
  }

  // ================= 操作 =================
  var A = {
    'new': function () { newSetup(); setupView(); window.scrollTo(0, 0); },
    'continue': function () { S = KL.load(); alloc = {}; tab = 'home'; render(); },
    toTitle: function () { closeSheet(); S = null; title(); window.scrollTo(0, 0); },
    sex: function (d) { setup.sex = d.v; if (d.v === 'f' && setup.loveSex === 'f') setup.loveSex = 'm'; else if (d.v === 'm' && setup.loveSex === 'm') setup.loveSex = 'f'; setupView(); },
    love: function (d) { setup.loveSex = d.v; setupView(); },
    reroll: function () { setup.family = rollFamily(); setupView(); },
    tal: function (d) { var k = d.k, dv = +d.d; if (dv > 0 && setup.pts > 0 && setup.tal[k] < 5) { setup.tal[k]++; setup.pts--; } if (dv < 0 && setup.tal[k] > 1) { setup.tal[k]--; setup.pts++; } setupView(); },
    start: startLife,
    tab: function (d) { tab = d.v; render(); window.scrollTo(0, 0); },
    al: function (d) {
      var ap = KL.apOf(S), k = d.k, v = alloc[k] || 0;
      if (+d.d > 0 && used0() < ap) alloc[k] = v + 1;
      if (+d.d < 0 && v > 0) alloc[k] = v - 1;
      var y = window.scrollY; render(); window.scrollTo(0, y);
    },
    play: play,
    choose: function (d) { choose(+d.i); },
    evnext: evNext,
    sumclose: function () { closeSheet(); render(); window.scrollTo(0, 0); },
    menu: menu,
    closeSheet: closeSheet,
    abandon: function () { if (confirm('この人生を終わりにして、新しい人生を始めますか？（今のデータは消えます）')) { KL.clearSave(); closeSheet(); S = null; newSetup(); setupView(); } },
    who: function (d) { whoSheet(+d.id); },
    crush: function (d) { S.crushId = +d.id; KL.save(S); var y = window.scrollY; render(); window.scrollTo(0, y); },
    newAfter: function () { S = null; newSetup(); setupView(); window.scrollTo(0, 0); }
  };
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var f = A[b.dataset.a]; if (f) f(b.dataset);
  }
  app.addEventListener('click', onClick);
  sheetBody.addEventListener('click', onClick);

  title();
})();
