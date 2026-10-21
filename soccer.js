/* Kani Life - サッカーの道 */
(function () {
  'use strict';
  var KL = window.KL, U = KL.U;
  var SO = KL.Soccer = {};
  KL.EVENTS = KL.EVENTS || [];

  SO.POS = {
    GK: { n: 'GK', jp: 'ゴールキーパー', w: { gk: 0.7, iq: 0.2, phy: 0.1 }, g: 0, a: 0.01 },
    CB: { n: 'CB', jp: 'センターバック', w: { def: 0.45, phy: 0.3, iq: 0.15, spd: 0.1 }, g: 0.05, a: 0.03 },
    SB: { n: 'SB', jp: 'サイドバック', w: { spd: 0.3, def: 0.3, pas: 0.2, phy: 0.2 }, g: 0.04, a: 0.12 },
    DM: { n: 'DM', jp: 'ボランチ', w: { def: 0.35, pas: 0.25, iq: 0.2, phy: 0.2 }, g: 0.04, a: 0.07 },
    CM: { n: 'CM', jp: 'セントラルMF', w: { pas: 0.35, iq: 0.25, def: 0.15, phy: 0.15, dri: 0.1 }, g: 0.09, a: 0.15 },
    OM: { n: 'OM', jp: 'トップ下', w: { pas: 0.3, dri: 0.25, iq: 0.25, sht: 0.2 }, g: 0.22, a: 0.25 },
    WG: { n: 'WG', jp: 'ウイング', w: { spd: 0.3, dri: 0.3, sht: 0.2, pas: 0.1, iq: 0.1 }, g: 0.28, a: 0.22 },
    ST: { n: 'ST', jp: 'ストライカー', w: { sht: 0.35, spd: 0.2, dri: 0.15, phy: 0.15, iq: 0.15 }, g: 0.42, a: 0.14 }
  };
  SO.SK = [
    { k: 'spd', n: 'スピード', base: ['ath'] }, { k: 'dri', n: 'ドリブル', base: ['ath', 'art'] },
    { k: 'pas', n: 'パス', base: ['int', 'art'] }, { k: 'sht', n: '決定力', base: ['ath', 'men'] },
    { k: 'phy', n: 'フィジカル', base: ['hp'] }, { k: 'def', n: '守備', base: ['hp', 'men'] },
    { k: 'iq', n: 'サッカーIQ', base: ['int'] }, { k: 'gk', n: 'セービング', base: ['ath', 'men'] }
  ];
  var SKN = {}; SO.SK.forEach(function (s) { SKN[s.k] = s.n; });
  SO.skName = SKN;

  SO.E = function (a) { return Math.min(70, 12 + 3.6 * (a - 5)); };
  SO.MAX_OVR = 92; // OVRの最高値
  SO.ovr = function (so, pos) {
    var w = SO.POS[pos || so.pos].w, v = 0;
    for (var k in w) v += (so.sk[k] || 0) * w[k];
    return Math.min(SO.MAX_OVR, Math.round(v));
  };
  SO.bestPos = function (so) {
    var best = null, bv = -1;
    for (var p in SO.POS) { var v = SO.ovr(so, p); if (v > bv) { bv = v; best = p; } }
    return best;
  };

  // ---------- 開始 ----------
  SO.start = function (S, level, teamName) {
    var st = S.st, exp = S.flags.soccerExp || 0;
    var so = S.soccer = {
      pos: 'ST', level: level, team: teamName, club: null, salary: 0, contract: 0,
      sk: {
        spd: st.ath * 0.6, dri: st.ath * 0.45 + exp * 0.6, pas: st.int * 0.25 + st.ath * 0.25 + exp * 0.3,
        sht: st.ath * 0.45 + exp * 0.4, phy: st.hp * 0.55, def: st.hp * 0.35 + st.men * 0.2, iq: st.int * 0.35 + exp * 0.3, gk: st.ath * 0.35
      },
      cap: {}, capBonus: U.ri(-3, 6), trust: 50, scout: 0, injury: 0,
      seasons: [], cur: null, totalApps: 0, totalGoals: 0, totalAst: 0, caps: 0, ntGoals: 0,
      trophies: [], europe: false, ballon: false, wcWin: false, youthNT: '', proYears: 0, retired: false, clubHist: []
    };
    SO.SK.forEach(function (s) {
      var avg = s.base.reduce(function (t, b) { return t + (S.tal[b] || 3); }, 0) / s.base.length;
      so.cap[s.k] = Math.min(99, Math.round(55 + avg * 9 + so.capBonus));
      so.sk[s.k] = Math.min(so.sk[s.k], so.cap[s.k] - 5);
    });
    so.pos = SO.bestPos(so) === 'GK' && S.st.ath > 30 ? 'ST' : SO.bestPos(so);
    S.track = 'soccer';
    newSeason(S);
    KL.log(S, teamName + 'でサッカーを始めた。', 2);
  };

  function skAge(a) { return a < 13 ? 1.2 : a < 19 ? 1.15 : a < 24 ? 1.0 : a < 28 ? 0.9 : a < 31 ? 0.5 : 0.25; }
  SO.grow = function (S, k, base) {
    var so = S.soccer, cap = so.cap[k], s = so.sk[k];
    var b = SO.SK.filter(function (x) { return x.k === k; })[0].base;
    var avg = b.reduce(function (t, x) { return t + (S.tal[x] || 3); }, 0) / b.length;
    var mult = 0.55 + (avg - 1) * 0.24, a = KL.age(S);
    cap = cap * Math.min(1, 0.45 + 0.033 * (a - 6));
    var g = base * 0.9 * mult * skAge(a) * (1 - S.fat / 230);
    var room = (cap - s) / cap;
    g *= room > 0 ? Math.max(0.12, Math.min(1, room * 3)) : 0.02;
    so.sk[k] = U.clamp(s + g, 0, 99);
    S._sd = S._sd || {}; S._sd[k] = (S._sd[k] || 0) + g;
    return g;
  };
  SO.skAdd = function (S, k, v) { var so = S.soccer; so.sk[k] = U.clamp(so.sk[k] + v, 0, 99); S._sd = S._sd || {}; S._sd[k] = (S._sd[k] || 0) + v; };

  SO.actions = function (S) {
    var so = S.soccer, L = [], pro = S.stage === 'pro';
    function a(id, n, d, fat, fx) { L.push({ id: id, n: n, d: d, fat: fat, fx: fx, soccer: true }); }
    a('s_team', pro ? 'チーム練習に全力' : 'チーム練習', '全能力・監督の信頼', 4, function (S, p) {
      SO.SK.forEach(function (s) { if (s.k !== 'gk' || so.pos === 'GK') SO.grow(S, s.k, 0.55 * p); });
      so.trust = U.clamp(so.trust + 3 * p, 0, 100);
    });
    if (so.pos === 'GK') a('s_gk', 'GK練習', 'セービング', 5, function (S, p) { SO.grow(S, 'gk', 2.8 * p); SO.grow(S, 'iq', 0.5 * p); });
    else {
      a('s_dri', 'ドリブル練習', 'ドリブル・スピード', 5, function (S, p) { SO.grow(S, 'dri', 2.6 * p); SO.grow(S, 'spd', 0.6 * p); });
      a('s_sht', 'シュート練習', '決定力', 5, function (S, p) { SO.grow(S, 'sht', 2.7 * p); });
      a('s_pas', 'パス・ビルドアップ', 'パス・サッカーIQ', 4, function (S, p) { SO.grow(S, 'pas', 2.6 * p); SO.grow(S, 'iq', 0.6 * p); });
      a('s_def', '守備練習', '守備・フィジカル', 5, function (S, p) { SO.grow(S, 'def', 2.6 * p); SO.grow(S, 'phy', 0.5 * p); });
    }
    a('s_phy', 'フィジカル強化', 'フィジカル・スピード・体力', 6, function (S, p) { SO.grow(S, 'phy', 2.3 * p); SO.grow(S, 'spd', 1.1 * p); KL.grow(S, 'hp', 0.8 * p); });
    a('s_iq', '戦術研究・映像分析', 'サッカーIQ', 2, function (S, p) { SO.grow(S, 'iq', 2.6 * p); KL.grow(S, 'int', 0.4 * p); });
    if (pro) a('s_media', 'メディア・SNS対応', '知名度', 2, function (S, p) { KL.repAdd(S, 'nat', 1.5 * p); KL.grow(S, 'com', 0.8 * p); });
    return L;
  };

  // ---------- シーズン管理 ----------
  function newSeason(S) {
    var so = S.soccer;
    so.cur = { label: KL.seasonLabel(S), club: so.club, team: SO.teamName(S), lg: SO.leagueName(S), apps: 0, goals: 0, ast: 0, rs: 0, rn: 0, ntApps: 0, ntGoals: 0, notes: [], ovr: SO.ovr(so) };
  }
  function closeSeason(S) {
    var so = S.soccer, c = so.cur; if (!c) return;
    c.rating = c.rn ? U.r1(c.rs / c.rn) : 0; c.ovrEnd = SO.ovr(so); c.age = KL.age(S);
    so.seasons.push(c);
    c.closed = true;
  }
  SO.club = function (S, id) {
    var so = S.soccer; id = id || (so && so.club); if (!id) return null;
    var c = KL.clubById(id), ov = so && so.lgOv && so.lgOv[id];
    return ov ? { id: c.id, n: c.n, s: c.s + ({ J1: 4, J2: 0, J3: -4 }[ov] - { J1: 4, J2: 0, J3: -4 }[c.l]), l: ov } : c;
  };
  SO.teamName = function (S) { var so = S.soccer; if (so.club) return SO.club(S).n; return so.team || '—'; };
  SO.leagueName = function (S) {
    var so = S.soccer;
    if (so.club) return KL.LEAGUES[SO.club(S).l].name;
    return { shonen: '少年団', jr: 'ジュニア', bukatsu: '中学部活', machi: '街クラブ', jy: 'ジュニアユース', hs: '高校サッカー', hs_power: '高校サッカー', youth: 'ユース', univ: '大学リーグ' }[so.level] || '';
  };
  SO.HOME = { '大阪': ['gosaka', 'cosaka'], '東京': ['ftokyo', 'tokyov', 'machida'], '神奈川': ['yokohamafm', 'kawasaki'], '埼玉': ['urawa'], '千葉': ['chiba', 'kashiwa'], '茨城': ['kashima', 'mito'], '愛知': ['nagoya'], '静岡': ['shimizu'], '京都': ['kyoto'], '兵庫': ['kobe'], '岡山': ['okayama'], '広島': ['hiroshima'], '福岡': ['fukuoka'], '長崎': ['nagasaki'] };
  SO.homeClub = function (S) { var h = SO.HOME[S.pref]; return KL.clubById(h ? U.pick(h) : U.pick(KL.CLUBS.filter(function (c) { return c.l === 'J1'; })).id); };
  SO.levelStr = { shonen: 40, jr: 62, bukatsu: 38, machi: 50, jy: 66, hs: 45, hs_power: 70, youth: 70, univ: 60 };

  // ---------- 実在選手の加齢 ----------
  SO.realNow = function (S, row) {
    var diff = KL.seasonStart(S) - 2026, age = row[4] + diff, o = row[3];
    for (var i = 0; i < diff; i++) {
      var ag = row[4] + i;
      o += ag < 24 ? 1.5 : ag < 30 ? 0 : ag < 33 ? -1.5 : -3;
    }
    var retireAge = 36 + (row[0].length % 3);
    if (row[2] === 'GK') retireAge += 3;
    if (age > retireAge || o < 60) return null;
    return { name: row[0], club: row[1], pos: row[2], ovr: Math.round(Math.min(SO.MAX_OVR, o)), age: age, nat: row[5] };
  };
  SO.realActive = function (S) {
    return KL.REAL_PLAYERS.map(function (r) { return SO.realNow(S, r); }).filter(Boolean);
  };
  // 世代交代用の架空スター
  function seeded(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }
  SO.genStar = function (year, idx) {
    var s1 = seeded(year * 31 + idx * 7), s2 = seeded(year * 17 + idx * 13), s3 = seeded(year * 7 + idx * 3);
    var F = KL.NAMES.fFirst, L = KL.NAMES.fLast;
    var europe = KL.CLUBS.filter(function (c) { return KL.LEAGUES[c.l].europe && c.s >= 84; });
    return {
      name: F[Math.floor(s1 * F.length)] + '・' + L[Math.floor(s2 * L.length)],
      club: europe[Math.floor(s3 * europe.length)].id, pos: ['ST', 'WG', 'OM', 'ST', 'CM'][idx % 5],
      ovr: 87 + Math.floor(s3 * 6) > SO.MAX_OVR ? SO.MAX_OVR : 87 + Math.floor(s3 * 6), age: 21 + Math.floor(s1 * 7), gen: true
    };
  };
  SO.worldStars = function (S) {
    var list = SO.realActive(S).filter(function (p) { return p.ovr >= 84; });
    var y = KL.seasonStart(S), need = Math.max(0, 12 - list.length);
    for (var i = 0; i < need; i++) list.push(SO.genStar(y - (i % 4), i));
    list.sort(function (a, b) { return b.ovr - a.ovr; });
    return list;
  };
  SO.teammates = function (S) {
    var so = S.soccer; if (!so || !so.club) return [];
    return SO.realActive(S).filter(function (p) { return p.club === so.club; }).sort(function (a, b) { return b.ovr - a.ovr; });
  };

  // ---------- 給料 ----------
  SO.wage = function (S, club, ovr) {
    var c = typeof club === 'string' ? KL.clubById(club) : club;
    var base = Math.pow(10, (c.s - 40) / 16) * 1e6; // 年俸（円）
    var w = base * Math.pow(Math.max(0.5, ovr / c.s), 5);
    var min = KL.LEAGUES[c.l].japan ? (c.l === 'J1' ? 4.8e6 : c.l === 'J2' ? 3.6e6 : 2.4e6) : 2e7;
    return Math.round(Math.max(min, w) / 1e5) * 1e5;
  };

  // ---------- 毎ターン ----------
  SO.turn = function (S) {
    var so = S.soccer, a = KL.age(S);
    if (!so || so.retired) return;
    if (so.pending && !KL.isStudent(S)) {
      var pd = so.pending; so.pending = null;
      if (so.cur && !so.cur.closed) closeSeason(S);
      SO.join(S, pd.club, pd.wage, pd.years);
      newSeason(S); so.cur.half = KL.isB(S);
    }
    if (!so.cur || so.cur.closed) newSeason(S);
    // 加齢による衰え
    if (a >= 29) {
      var m = a >= 35 ? 2.6 : a >= 33 ? 2 : a >= 31 ? 1.4 : 1;
      SO.skAdd(S, 'spd', -1.2 * m); SO.skAdd(S, 'phy', -0.7 * m);
      if (a >= 31) { SO.skAdd(S, 'dri', -0.6 * m); SO.skAdd(S, 'sht', -0.5 * m); SO.skAdd(S, 'def', -0.5 * m); SO.skAdd(S, 'gk', -0.4 * m); SO.skAdd(S, 'pas', -0.3 * m); }
    }
    // 怪我
    if (so.injury > 0) so.injury--;
    var injP = 0.05 + S.fat / 350 + (a >= 30 ? 0.04 : 0);
    var hurt = 0;
    if (U.chance(injP)) { hurt = U.ri(1, 3); KL.line(S, '⚠️ 怪我で約' + hurt + 'か月離脱した。'); so.cur.notes.push('負傷離脱'); }
    if (so.club) proHalf(S, hurt); else youthHalf(S, hurt);
    // シーズン終了（2〜7月のターン）
    if (KL.isB(S)) {
      if (so.club) seasonEnd(S);
      closeSeason(S);
    }
  };

  // ---------- ユース年代 ----------
  function youthHalf(S, hurt) {
    var so = S.soccer, a = KL.age(S), ovr = SO.ovr(so), lv = SO.levelStr[so.level] || 45;
    var need = SO.E(a) + (lv - 50) / 4;
    var share = U.sig((ovr - need) / 4) * (1 - hurt / 7);
    var games = 12, apps = Math.round(games * U.clamp(share * U.rf(0.85, 1.1), 0, 1));
    var pw = SO.POS[so.pos], f = Math.min(2, Math.exp((ovr - need) / 10));
    var goals = 0, ast = 0;
    for (var i = 0; i < apps; i++) { if (U.chance(Math.min(0.9, pw.g * f * 1.3))) goals++; if (U.chance(pw.g * f * 0.3)) goals++; if (U.chance(Math.min(0.7, pw.a * f))) ast++; }
    var rating = U.clamp(6.3 + (ovr - need) * 0.04 + (apps ? (goals + ast * 0.6) / apps * 0.6 : 0) + U.gauss() * 0.2, 5.5, 8.6);
    var c = so.cur; c.apps += apps; c.goals += goals; c.ast += ast; if (apps) { c.rs += rating * apps; c.rn += apps; }
    so.totalGoals += goals; so.totalAst += ast; so.totalApps += apps;
    so.scout += Math.max(0, (ovr - SO.E(a)) * 0.6 + goals * 0.3);
    if (apps >= games * 0.7) KL.repAdd(S, 'sch', 2); if (goals >= 8) KL.repAdd(S, 'loc', 3);
    KL.line(S, '⚽ ' + so.team + '：' + apps + '試合 ' + goals + '得点 ' + ast + 'アシスト');
    if (apps < games * 0.3) KL.line(S, '出場機会が少なかった（チーム内の序列：控え）');
  }

  // 大会のシミュレーション
  SO.tournament = function (S, name, teamStr, rounds, base, step) {
    var so = S.soccer, a = KL.age(S), ovr = SO.ovr(so);
    var bonus = (ovr - SO.E(a)) * 0.35;
    var r = 0, goals = 0, pw = SO.POS[so.pos];
    for (; r < rounds.length; r++) {
      if (U.chance(Math.min(0.9, pw.g * Math.exp((ovr - SO.E(a)) / 12) * 1.2))) goals++;
      var opp = base + r * step;
      if (!U.chance(U.sig((teamStr + bonus - opp) / 5))) break;
    }
    so.totalGoals += goals; if (so.cur) so.cur.goals += goals;
    var res = r >= rounds.length ? '優勝' : rounds[r] + '敗退';
    return { res: res, round: r, win: r >= rounds.length, goals: goals };
  };

  // ---------- プロ ----------
  function competitor(S) {
    var so = S.soccer, ovr = SO.ovr(so);
    return SO.teammates(S).filter(function (p) { return p.pos === so.pos && p.ovr >= ovr + 2; })[0];
  }
  SO.clubPower = function (S) {
    var so = S.soccer, c = SO.club(S);
    return c.s + Math.max(0, SO.ovr(so) - c.s) * 0.25;
  };
  function proHalf(S, hurt) {
    var so = S.soccer, c = SO.club(S), lg = KL.LEAGUES[c.l], a = KL.age(S), ovr = SO.ovr(so);
    var games = Math.round(lg.games / 2);
    var need = c.s - 1;
    var share = U.sig((ovr - need) / 4) * (0.7 + so.trust * 0.006) * (1 - hurt / 7);
    var comp = competitor(S);
    if (comp) share *= 0.65;
    var apps = Math.round(games * U.clamp(share * U.rf(0.85, 1.08), 0, 1));
    var pw = SO.POS[so.pos], f = Math.min(1.9, Math.exp((ovr - c.s) / 12));
    var gr = pw.g * f * (0.55 + so.sk.sht / 110), ar = pw.a * f * (0.6 + so.sk.pas / 120);
    var goals = 0, ast = 0;
    for (var i = 0; i < apps; i++) { if (U.chance(Math.min(0.62, gr))) goals++; if (U.chance(Math.min(0.12, gr * 0.15))) goals++; if (U.chance(Math.min(0.42, ar))) ast++; }
    var rating = apps ? U.clamp(6.3 + (ovr - c.s) * 0.04 + (goals + ast * 0.6) / apps * 0.9 + U.gauss() * 0.15, 5.6, 8.6) : 0;
    var cu = so.cur; cu.apps += apps; cu.goals += goals; cu.ast += ast; if (apps) { cu.rs += rating * apps; cu.rn += apps; }
    so.totalApps += apps; so.totalGoals += goals; so.totalAst += ast;
    so.trust = U.clamp(so.trust + (rating ? (rating - 6.6) * 12 : -6), 0, 100);
    KL.repAdd(S, 'nat', (lg.japan ? 1 : 2.5) * (apps / games) * (1 + goals / 5) + (c.s >= 84 ? 2 : 0));
    KL.repAdd(S, 'loc', 2);
    var half = KL.isB(S) ? '後半戦' : '前半戦';
    if (KL.isB(S) && KL.seasonStart(S) === 2025 && lg.japan) half = '百年構想リーグ';
    KL.line(S, '⚽ ' + c.n + '（' + lg.name + ' ' + half + '）：' + apps + '/' + games + '試合 ' + goals + '得点 ' + ast + 'アシスト' + (rating ? ' 評価' + rating.toFixed(2) : ''));
    if (comp && apps < games * 0.5) KL.line(S, '同じポジションの' + comp.name + '（OVR' + comp.ovr + '）にポジションを奪われている。');
    // 欧州・アジアの大会
    euroHalf(S, c);
    // 代表
    ntHalf(S);
    // 給料
    KL.moneyAdd(S, so.salary / 2);
  }

  function euroComp(S, c) {
    var so = S.soccer, lg = KL.LEAGUES[c.l];
    if (so.compSeason === KL.seasonStart(S)) return so.comp;
    so.compSeason = KL.seasonStart(S);
    var ranked = KL.CLUBS.filter(function (x) { return x.l === c.l; }).sort(function (x, y) { return y.s - x.s; });
    var ri = ranked.findIndex(function (x) { return x.id === c.id; });
    if (ri < 0) ri = Math.floor(ranked.length / 2);
    var pos = so.lastPos && so.lastPosClub === c.id ? so.lastPos : ri + 1 + U.ri(-1, 1);
    var comp = null;
    if (lg.europe) { if (pos <= lg.cl) comp = 'CL'; else if (pos <= lg.cl + lg.el) comp = 'EL'; }
    if (lg.acl && pos <= lg.acl) comp = 'ACL';
    so.comp = comp; so.compAlive = !!comp; so.compRound = 0;
    return comp;
  }
  var COMP = {
    CL: { name: 'チャンピオンズリーグ', rounds: ['リーグフェーズ', 'プレーオフ', 'ラウンド16', '準々決勝', '準決勝', '決勝'], opp: [80, 81, 83, 85, 87, 88] },
    EL: { name: 'ヨーロッパリーグ', rounds: ['リーグフェーズ', 'プレーオフ', 'ラウンド16', '準々決勝', '準決勝', '決勝'], opp: [74, 76, 77, 78, 80, 81] },
    ACL: { name: 'ACLエリート', rounds: ['リーグステージ', 'ラウンド16', '準々決勝', '準決勝', '決勝'], opp: [62, 66, 68, 70, 72] }
  };
  SO.COMP = COMP;
  function euroHalf(S, c) {
    var so = S.soccer, comp = euroComp(S, c);
    if (!comp || !so.compAlive) return;
    var cd = COMP[comp], pw = SO.POS[so.pos], ovr = SO.ovr(so);
    var power = SO.clubPower(S);
    var from = KL.isB(S) ? (comp === 'ACL' ? 1 : 2) : 0, to = KL.isB(S) ? cd.rounds.length : (comp === 'ACL' ? 1 : 2);
    if (so.compRound < from) from = so.compRound;
    var goals = 0, apps = 0, r;
    var starter = ovr >= c.s - 2;
    for (r = from; r < to; r++) {
      if (r === 1 && comp !== 'ACL' && power >= cd.opp[0] + 3 && U.chance(0.5)) { so.compRound = 2; continue; } // ストレートイン
      var n = r === 0 ? (comp === 'ACL' ? 8 : 8) : 2;
      if (starter) { apps += n; for (var i = 0; i < n; i++) if (U.chance(pw.g * Math.exp((ovr - cd.opp[r]) / 12))) goals++; }
      if (!U.chance(U.sig((power - cd.opp[r]) / 4.5))) {
        so.compAlive = false;
        KL.line(S, '🏆 ' + cd.name + '：' + cd.rounds[r] + 'で敗退' + (starter ? '（' + goals + '得点）' : ''));
        so.cur.notes.push(cd.name + ' ' + cd.rounds[r] + '敗退');
        addComp(S, apps, goals);
        return;
      }
      so.compRound = r + 1;
    }
    addComp(S, apps, goals);
    if (so.compRound >= cd.rounds.length) {
      so.compAlive = false;
      KL.line(S, '🏆 ' + cd.name + ' 優勝！！');
      trophy(S, cd.name + '優勝');
      KL.repAdd(S, 'nat', comp === 'CL' ? 25 : 12);
      KL.push(S, { title: cd.name + '制覇', icon: '🏆', text: c.n + 'の一員として、' + cd.name + 'のトロフィーを掲げた。' + (starter ? 'この大会で' + goals + '得点。' : ''), choices: [] });
    } else KL.line(S, '🏆 ' + cd.name + '：' + cd.rounds[so.compRound] + 'に進出' + (starter ? '（' + goals + '得点）' : ''));
  }
  function addComp(S, apps, goals) { var so = S.soccer; so.cur.apps += apps; so.cur.goals += goals; so.totalApps += apps; so.totalGoals += goals; so.cur.euroGoals = (so.cur.euroGoals || 0) + goals; }
  function trophy(S, name) { var so = S.soccer; so.trophies.push({ name: name, season: KL.seasonLabel(S) }); so.cur.notes.push(name); KL.title(S, name); KL.log(S, name + '！', 2); }
  SO.trophy = trophy;

  // ---------- 日本代表 ----------
  function ntHalf(S) {
    var so = S.soccer, a = KL.age(S), ovr = SO.ovr(so);
    var thr = 73.5 + U.gauss() * 1.2 - (so.caps > 10 ? 1.5 : 0);
    var called = a >= 19 && ovr >= thr;
    so.ntNow = called;
    if (called) {
      var starter = ovr >= 77.5;
      var apps = starter ? U.ri(2, 3) : U.ri(0, 1), goals = 0;
      for (var i = 0; i < apps; i++) if (U.chance(SO.POS[so.pos].g * Math.exp((ovr - 74) / 12))) goals++;
      if (!so.caps && apps) { KL.push(S, { title: '日本代表デビュー', icon: '🇯🇵', text: 'ついに日本代表としてピッチに立った。' + (goals ? 'しかもデビュー戦でゴール！' : '国歌を聴きながら、胸が熱くなった。'), choices: [] }); KL.log(S, '日本代表デビュー。', 2); KL.repAdd(S, 'nat', 12); }
      so.caps += apps; so.ntGoals += goals; so.cur.ntApps += apps; so.cur.ntGoals += goals;
      if (apps) KL.line(S, '🇯🇵 日本代表：' + apps + '試合 ' + goals + '得点（通算' + so.caps + '試合）');
      KL.repAdd(S, 'nat', 3 + apps);
    }
    var y = KL.year(S);
    // W杯（2030年から4年ごと・6〜7月）
    if (KL.isB(S) && y >= 2030 && (y - 2030) % 4 === 0) SO.worldCup(S, called);
    // アジアカップ（1月：8〜1月ターン）
    if (!KL.isB(S) && ((y + 1) - 2027) % 4 === 0 && called) asianCup(S);
  }
  SO.worldCup = function (S, called) {
    var so = S.soccer, y = KL.year(S);
    var js = 76 + (called ? Math.max(0, SO.ovr(so) - 76) * 0.35 : 0);
    var rounds = ['グループステージ', 'ラウンド32', 'ラウンド16', '準々決勝', '準決勝', '決勝'];
    var opp = [72, 76, 79, 82, 84, 86];
    var r = 0, goals = 0, ovr = SO.ovr(so);
    for (; r < rounds.length; r++) {
      if (called) { var n = r === 0 ? 3 : 1; for (var i = 0; i < n; i++) if (U.chance(SO.POS[so.pos].g * Math.exp((ovr - 76) / 12))) goals++; }
      if (!U.chance(U.sig((js - opp[r]) / 4.2))) break;
    }
    var name = y + '年W杯';
    var res = r >= rounds.length ? '優勝' : r === 0 ? 'グループステージ敗退' : rounds[r] + '敗退（' + ['', 'ベスト32', 'ベスト16', 'ベスト8', 'ベスト4', '準優勝'][r] + '）';
    if (!called) { KL.line(S, '🌍 ' + name + '：日本は' + res + '。自分は招集外だった。'); return; }
    so.caps += r + 3; so.ntGoals += goals; so.cur.ntApps += r + 3; so.cur.ntGoals += goals;
    so.wcs = (so.wcs || 0) + 1;
    KL.repAdd(S, 'nat', 10 + r * 6);
    var txt = '日本代表として' + name + 'に出場。日本は' + res + '。自分は' + goals + '得点を挙げた。';
    if (r >= rounds.length) { so.wcWin = true; trophy(S, 'FIFAワールドカップ優勝'); txt = '信じられない。日本が' + name + 'で優勝した。' + goals + '得点を挙げ、世界の頂点に立った。'; }
    else if (r >= 3) KL.title(S, name + ' ' + ['', '', '', 'ベスト8', 'ベスト4', '準優勝'][r]);
    if (goals >= 6) { trophy(S, name + ' 得点王'); }
    KL.log(S, name + '出場（日本：' + res + '、' + goals + '得点）', 2);
    KL.push(S, { title: name, icon: '🌍', text: txt, choices: [] });
  };
  function asianCup(S) {
    var so = S.soccer, y = KL.year(S) + 1;
    var t = SO.tournament(S, 'アジアカップ', 74, ['グループステージ', 'ラウンド16', '準々決勝', '準決勝', '決勝'], 62, 3);
    so.caps += t.round + 3; so.cur.ntApps += t.round + 3; so.ntGoals += t.goals; so.cur.ntGoals += t.goals;
    if (t.win) trophy(S, y + '年アジアカップ優勝');
    KL.line(S, '🏆 ' + y + '年アジアカップ：' + t.res + '（' + t.goals + '得点）');
  }

  // ---------- シーズン終了 ----------
  function seasonEnd(S) {
    var so = S.soccer, c = SO.club(S), lg = KL.LEAGUES[c.l], cu = so.cur;
    var ovr = SO.ovr(so);
    if (cu.half) { so.contract--; KL.line(S, '（途中加入のため、タイトル・個人賞の対象外）'); return; }
    // 順位
    var power = SO.clubPower(S) * (cu.apps > lg.games * 0.5 ? 1 : 0.995);
    var clubs = KL.CLUBS.filter(function (x) { return x.l === c.l && x.id !== c.id; }).concat([c]);
    var table = clubs.map(function (x) { return { id: x.id, sc: (x.id === c.id ? power : x.s) + U.gauss() * 3.2 }; }).sort(function (x, y) { return y.sc - x.sc; });
    var pos = table.findIndex(function (x) { return x.id === c.id; }) + 1;
    so.lastPos = pos; so.lastPosClub = c.id;
    cu.pos = pos;
    KL.line(S, '📊 ' + lg.name + ' 最終順位：' + pos + '位（' + clubs.length + 'クラブ中）');
    if (pos === 1) { trophy(S, lg.name + '優勝'); KL.repAdd(S, 'nat', lg.japan ? 8 : 12); KL.push(S, { title: 'リーグ優勝', icon: '🏆', text: c.n + 'が' + lg.name + 'を制した！' + (cu.apps > lg.games * 0.5 ? '主力としてタイトルに貢献した。' : ''), choices: [] }); }
    so.lgOv = so.lgOv || {};
    if (lg.japan && c.l !== 'J1' && pos <= 2) { var up = c.l === 'J3' ? 'J2' : 'J1'; so.lgOv[c.id] = up; cu.notes.push(up + '昇格'); KL.line(S, '🎉 ' + c.n + 'は' + up + '昇格を決めた！'); KL.repAdd(S, 'loc', 10); }
    else if (lg.japan && c.l !== 'J3' && pos >= clubs.length - 2) { var dn = c.l === 'J1' ? 'J2' : 'J3'; so.lgOv[c.id] = dn; cu.notes.push(dn + '降格'); KL.line(S, '😢 ' + c.n + 'は' + dn + 'に降格してしまった…'); }
    else if (!lg.japan && pos >= clubs.length - 2) { cu.notes.push('降格圏'); KL.line(S, '😢 ' + c.n + 'は降格圏でシーズンを終えた。（2部リーグは収録外のため、移籍市場で次の道を探そう）'); so.contract = Math.min(so.contract, 1); }
    // 国内カップ
    var cupName = { PL: 'FAカップ', LL: 'コパ・デル・レイ', SA: 'コッパ・イタリア', BL: 'DFBポカール', L1: 'クープ・ドゥ・フランス', J1: '天皇杯', J2: '天皇杯', J3: '天皇杯' }[c.l];
    if (U.chance(U.sig((power - (lg.japan ? 70 : 84)) / 4) * 0.35)) trophy(S, cupName + '優勝');
    // 個人タイトル
    var stars = SO.realActive(S).filter(function (p) { return KL.clubById(p.club) && KL.clubById(p.club).l === c.l; });
    var topST = stars.filter(function (p) { return p.pos === 'ST' || p.pos === 'WG'; }).sort(function (x, y) { return y.ovr - x.ovr; })[0];
    var rivalGoals = Math.round(({ PL: 24, LL: 24, SA: 23, BL: 26, L1: 23, J1: 19, J2: 21, J3: 19 }[c.l]) + U.gauss() * 3);
    var rivalName = topST ? topST.name : SO.genStar(KL.seasonStart(S), 3).name;
    var lgGoals = cu.goals - (cu.euroGoals || 0);
    if (lgGoals >= rivalGoals) { trophy(S, lg.name + '得点王'); KL.push(S, { title: '得点王', icon: '👟', text: lgGoals + 'ゴールで' + lg.name + '得点王に輝いた！（2位は' + rivalName + 'の' + Math.min(rivalGoals, lgGoals - 1) + '点）', choices: [] }); }
    else if (lgGoals >= 8) KL.line(S, '得点ランキング：' + lgGoals + '点（得点王は' + rivalName + 'の' + rivalGoals + '点）');
    var rivalAst = Math.round(12 + U.gauss() * 2);
    if (cu.ast >= rivalAst) trophy(S, lg.name + 'アシスト王');
    var rating = cu.rn ? cu.rs / cu.rn : 0;
    if (rating >= 7.25 && cu.apps >= lg.games * 0.55) trophy(S, lg.name + 'ベストイレブン');
    if (rating >= 7.55 && pos <= 3 && cu.apps >= lg.games * 0.6) trophy(S, lg.name + '年間MVP');
    if (lg.japan && KL.age(S) <= 21 && rating >= 7.0 && cu.apps >= lg.games * 0.5) trophy(S, 'Jリーグ ベストヤングプレーヤー賞');
    // バロンドール候補の計算（次の8〜1月ターンで発表）
    var att = ['ST', 'WG', 'OM'].indexOf(so.pos) >= 0;
    var bScore = (ovr - 80) * 1.5 + (att ? cu.goals * 0.6 + cu.ast * 0.3 : cu.goals * 1.0 + cu.ast * 0.5) + (rating - 6.8) * 8 + (lg.japan ? -20 : 0) + (so.pos === 'GK' ? 10 : so.pos === 'CB' || so.pos === 'DM' ? 6 : 0);
    so.trophies.forEach(function (t) {
      if (t.season !== KL.seasonLabel(S)) return;
      if (/チャンピオンズリーグ優勝/.test(t.name)) bScore += 12;
      else if (/ワールドカップ優勝/.test(t.name)) bScore += 14;
      else if (/ヨーロッパリーグ優勝/.test(t.name)) bScore += 3;
      else if (/リーグ優勝$/.test(t.name)) bScore += 5;
      else if (/得点王/.test(t.name)) bScore += 4;
      else if (/年間MVP/.test(t.name)) bScore += 3;
    });
    so.ballonPending = cu.apps >= lg.games * 0.5 ? { score: bScore, season: KL.seasonLabel(S) } : null;
    so.proYears++;
    // 契約
    so.contract--;
    // 年齢・能力の要約
    KL.repAdd(S, 'nat', 2);
  }

  SO.ballonCheck = function (S) {
    var so = S.soccer, bp = so && so.ballonPending; if (!bp) return null;
    so.ballonPending = null;
    var stars = SO.worldStars(S);
    var best = 52 + U.gauss() * 3;
    var rank;
    if (bp.score >= best) rank = 1;
    else rank = Math.max(2, Math.round(1 + (best - bp.score) * 1.2 + U.rf(0, 1.5)));
    if (rank > 30) return null;
    var winner = rank === 1 ? S.sei + ' ' + S.mei : stars[0].name;
    return { rank: rank, winner: winner, season: bp.season };
  };

  // ---------- オファー ----------
  SO.offers = function (S, mode) {
    var so = S.soccer, ovr = SO.ovr(so), a = KL.age(S), list = [];
    var cur = so.club ? SO.club(S) : null;
    var rating = 0, last = so.seasons[so.seasons.length - 1];
    if (last && last.rating) rating = last.rating;
    var pot = ovr + Math.max(0, (24 - a)) * 0.8; // 若さによる伸びしろ評価
    var share = last && cur ? last.apps / KL.LEAGUES[cur.l].games : 0.6;
    var cands = KL.CLUBS.filter(function (c) {
      if (cur && c.id === cur.id) return false;
      var lg = KL.LEAGUES[c.l];
      var gap = pot - c.s;
      if (mode === 'rookie') return lg.japan ? gap >= -4 : gap >= -3 && c.s <= 78;
      return gap >= -3 && gap <= 12 && (!cur || c.s >= cur.s - 2 || share < 0.4);
    });
    cands = U.shuffle(cands).sort(function (x, y) { return y.s - x.s; });
    var interest = function (c) {
      var lg = KL.LEAGUES[c.l], p = mode === 'rookie' ? 0.35 : 0.1 + (so.contract <= 0 ? 0.1 : 0);
      if (!lg.japan) p *= (S.rep.nat > 25 || rating >= 7.0 || so.caps > 0) ? 1.4 : 0.35;
      if (rating >= 7.2) p += 0.2;
      if (cur && c.s > cur.s + 3) p += 0.15;
      return p;
    };
    for (var i = 0; i < cands.length && list.length < 3; i++) if (U.chance(interest(cands[i]))) list.push(cands[i]);
    return list.map(function (c) { return { club: c.id, name: c.n, lg: KL.LEAGUES[c.l].name, s: c.s, wage: SO.wage(S, c, ovr) * (mode === 'rookie' ? 0.6 : 1) }; });
  };
  SO.join = function (S, clubId, wage, years) {
    var so = S.soccer, c = KL.clubById(clubId);
    if (so.club) so.clubHist.push({ club: so.club, until: KL.seasonLabel(S) });
    if (so.cur && !so.cur.closed && so.cur.club && so.cur.club !== clubId) { so.cur.notes.push('シーズン途中で' + c.n + 'へ移籍'); so.cur.team = c.n; so.cur.lg = KL.LEAGUES[c.l].name; so.cur.club = clubId; }
    so.club = clubId; so.salary = Math.round(wage); so.contract = years || 3; so.trust = 45; so.level = 'pro';
    so.compSeason = null; so.lastPos = null;
    if (KL.LEAGUES[c.l].europe && !so.europe) { so.europe = true; KL.repAdd(S, 'nat', 10); }
    KL.log(S, c.n + '（' + KL.LEAGUES[c.l].name + '）に加入。年俸' + U.yen(wage) + '。', 2);
    var tm = KL.newNPC(S, 'friend', S.sex, { met: c.n, like: 45, job: 'プロサッカー選手（' + c.n + '）', ad: U.ri(-4, 4) }); tm.rel = 'teammate';
  };

  // ---------- 他者評価 ----------
  SO.perception = function (S) {
    var so = S.soccer, a = KL.age(S), ovr = SO.ovr(so), pj = SO.POS[so.pos].jp;
    if (so.retired) return { main: (so.caps ? '元日本代表の' : '元プロ' + (so.proYears ? '' : 'を目指した')) + 'サッカー選手', tags: so.trophies.slice(-2).map(function (t) { return t.name; }) };
    if (so.club) {
      var c = SO.club(S), lg = KL.LEAGUES[c.l];
      var last = so.seasons[so.seasons.length - 1];
      if (so.ballon) return { main: '世界最高の選手', tags: [c.n, '日本代表'] };
      if (so.ballonBest && so.ballonBest <= 3) return { main: '世界トップクラスのフットボーラー', tags: [c.n] };
      if (so.ntNow && ovr >= 78) return { main: '日本代表の主力' + pj, tags: [c.n, lg.name] };
      if (so.ntNow) return { main: '日本代表に呼ばれるくらいの' + pj, tags: [c.n] };
      if (!lg.japan) return { main: '海外で戦う日本人' + pj, tags: [c.n, lg.name] };
      if (last && last.goals >= 12) return { main: c.n + 'のエース', tags: [lg.name] };
      return { main: c.n + 'の' + (so.trust > 60 ? 'レギュラー' : '選手'), tags: [lg.name] };
    }
    var d = ovr - SO.E(a);
    var scope = S.rep.nat >= 35 ? '全国区の' : S.rep.loc >= 40 ? '地元で有名な' : S.rep.sch >= 40 ? '学校中が知ってる' : '隣のクラスの';
    if (so.youthNT) return { main: so.youthNT + '日本代表のサッカー選手', tags: [so.team] };
    if (d >= 12) return { main: scope + '、全国でも注目のサッカー少年', tags: [so.team] };
    if (d >= 5) return { main: scope + '、めちゃくちゃサッカーが上手い人', tags: [so.team] };
    if (d >= -2) return { main: scope + '、サッカーが上手い人', tags: [so.team] };
    return { main: scope + '、サッカー部の人', tags: [so.team] };
  };

  // ======================================================
  //  サッカーの出来事
  // ======================================================
  var E = KL.EVENTS;
  function isSo(S) { return S.track === 'soccer' && S.soccer && !S.soccer.retired; }
  function age(S) { return KL.age(S); }

  // 少年団に入る
  E.push({
    id: 's_join_kid', sched: true, pri: 6,
    cond: function (S) { return !S.track && age(S) >= 6 && age(S) <= 9 && KL.isB(S) && (S.flags.soccerExp || 0) >= 3 && !S.flags.soccerDeclined; },
    title: 'サッカー少年団の勧誘', icon: '⚽',
    text: function (S) { return '近所のサッカー少年団のコーチが声をかけてきた。「' + S.mei + 'くん、ボール扱いがうまいね。うちでやってみない？」'; },
    choices: [
      { t: '入団する', fx: function (S) { SO.start(S, 'shonen', U.pick(KL.PLACE) + 'FC少年団'); KL.push(S, posPickEvent(S)); return '少年団に入団した。ここから、サッカーの道が始まる。'; } },
      { t: '今はやめておく', fx: function (S) { S.flags.soccerDeclined = true; return 'サッカーは遊びで楽しむことにした。'; } }
    ]
  });
  // 遅れて始める（中学の部活）
  E.push({
    id: 's_join_jhs', sched: true, pri: 6,
    cond: function (S) { return !S.track && age(S) === 12 && KL.isB(S) && (S.flags.soccerExp || 0) >= 2; },
    title: '部活選び', icon: '⚽', text: '中学校の部活紹介。サッカー部の先輩たちが楽しそうにボールを蹴っている。',
    choices: [
      { t: 'サッカー部に入る', fx: function (S) { SO.start(S, 'bukatsu', S.school + 'サッカー部'); KL.push(S, posPickEvent(S)); return 'サッカー部に入部した。'; } },
      { t: '別の道を選ぶ', fx: function () { return 'サッカーとは別の青春を選んだ。'; } }
    ]
  });
  function posPickEvent(S) {
    var so = S.soccer;
    var ranked = Object.keys(SO.POS).map(function (p) { return { p: p, v: SO.ovr(so, p) }; }).sort(function (a, b) { return b.v - a.v; });
    return {
      title: 'ポジションを決める', icon: '📋',
      text: 'コーチ「適性を見ると、' + SO.POS[ranked[0].p].jp + 'か' + SO.POS[ranked[1].p].jp + 'が向いてそうだな。どこをやりたい？」',
      choices: ranked.map(function (r, i) {
        return { t: SO.POS[r.p].jp + '（' + r.p + '）' + (i < 2 ? ' ★' : ''), ok: true, fx: function (S) { S.soccer.pos = r.p; return SO.POS[r.p].jp + 'として練習することになった。'; } };
      })
    };
  }
  SO.posPickEvent = posPickEvent;

  // Jクラブのジュニアのセレクション
  E.push({
    id: 's_jr_select', sched: true, pri: 6,
    cond: function (S) { return isSo(S) && S.soccer.level === 'shonen' && age(S) >= 9 && age(S) <= 11 && !KL.isB(S) && SO.ovr(S.soccer) >= SO.E(age(S)) + 2 && !S.flags['jrTry' + age(S)]; },
    title: 'Jクラブのセレクション', icon: '📣',
    text: function (S) { return '少年団での活躍が目に留まり、Jクラブのジュニアチームのセレクション案内が届いた。'; },
    choices: [
      { t: 'セレクションを受ける', fx: function (S) {
        S.flags['jrTry' + age(S)] = true;
        var ok = KL.chk(S, SO.ovr(S.soccer), SO.E(age(S)) + 5, 3);
        if (ok) { var jc = SO.homeClub(S); S.soccer.level = 'jr'; S.soccer.team = jc.n + ' U-12'; S.soccer.homeClub = jc.id; KL.repAdd(S, 'loc', 15); KL.log(S, jc.n + 'のジュニアチームに合格した。', 2); return '合格！ ' + jc.n + ' U-12 の一員になった。'; }
        return '不合格だった。悔しさをバネにもっと練習しよう。';
      } },
      { t: '今のチームで頑張る', fx: function (S) { S.flags['jrTry' + age(S)] = true; return '仲間と一緒に、今のチームで上を目指すことにした。'; } }
    ]
  });
  // 全日本U-12
  E.push({
    id: 's_u12', sched: true, pri: 7, cond: function (S) { return isSo(S) && age(S) === 11 && !KL.isB(S); },
    title: '全日本U-12選手権', icon: '🏆',
    text: function (S) {
      var t = SO.tournament(S, 'U-12', SO.levelStr[S.soccer.level] + 6, ['県大会', '1回戦', '2回戦', '準々決勝', '準決勝', '決勝'], 48, 3);
      if (t.round >= 3) KL.repAdd(S, 'loc', 10 + t.round * 3);
      if (t.win) { KL.title(S, '全日本U-12選手権 優勝'); KL.repAdd(S, 'nat', 10); }
      return S.soccer.team + 'で挑んだ小学生最後の全国大会。結果は' + t.res + '。自分は' + t.goals + '得点。';
    }, choices: []
  });
  // 中学でのサッカー
  E.push({
    id: 's_jhs_choice', sched: true, pri: 3, cond: function (S) { return isSo(S) && age(S) === 12 && KL.isB(S); },
    title: '中学でのサッカー', icon: '⚽',
    text: function (S) { return '中学ではどこでサッカーを続ける？（今の実力：OVR ' + SO.ovr(S.soccer) + '）'; },
    choices: [
      { t: 'Jクラブのジュニアユース（セレクション）', fx: function (S) {
        var ok = KL.chk(S, SO.ovr(S.soccer), SO.E(12) + 4 - (S.soccer.level === 'jr' ? 5 : 0), 3);
        if (ok) { var jc = S.soccer.homeClub ? KL.clubById(S.soccer.homeClub) : SO.homeClub(S); S.soccer.homeClub = jc.id; S.soccer.level = 'jy'; S.soccer.team = jc.n + ' U-15'; KL.log(S, jc.n + ' U-15に加入。', 1); return '合格！ ' + jc.n + ' U-15 に加入した。'; }
        S.soccer.level = 'bukatsu'; S.soccer.team = '中学サッカー部'; return '不合格…。中学のサッカー部でやることになった。';
      } },
      { t: '強い街クラブ', fx: function (S) { S.soccer.level = 'machi'; S.soccer.team = U.pick(KL.PLACE) + 'FC U-15'; return '地元の強豪街クラブに入った。'; } },
      { t: '中学のサッカー部', fx: function (S) { S.soccer.level = 'bukatsu'; S.soccer.team = '中学サッカー部'; return '友達と一緒に部活でサッカーを続ける。'; } },
      { t: 'サッカーをやめる', fx: function (S) { quit(S); return 'サッカーをやめた。これからは別のことに打ち込もう。'; } }
    ]
  });
  // 中学の全国大会
  E.push({
    id: 's_u15', sched: true, pri: 7, cond: function (S) { return isSo(S) && age(S) === 14 && !KL.isB(S); },
    title: function (S) { return S.soccer.level === 'bukatsu' ? '全国中学校サッカー大会' : '高円宮杯 U-15'; }, icon: '🏆',
    text: function (S) {
      var t = SO.tournament(S, 'U-15', SO.levelStr[S.soccer.level] + 4, ['地区予選', '1回戦', '2回戦', '準々決勝', '準決勝', '決勝'], 50, 3);
      if (t.round >= 3) KL.repAdd(S, 'loc', 12 + t.round * 3);
      if (t.win) { KL.title(S, '中学年代 全国制覇'); KL.repAdd(S, 'nat', 12); }
      return '中学最後の全国大会。結果は' + t.res + '。自分は' + t.goals + '得点。' + (t.round >= 4 ? '名前が全国に知られ始めた。' : '');
    }, choices: []
  });
  // 年代別代表
  E.push({
    id: 's_youthnt', sched: true, pri: 6, repeat: true,
    cond: function (S) { return isSo(S) && !S.soccer.club && age(S) >= 14 && age(S) <= 17 && SO.ovr(S.soccer) >= SO.E(age(S)) + 9 && S.soccer.youthNT !== ('U-' + (age(S) <= 15 ? 15 : 17)); },
    title: '年代別日本代表に選出', icon: '🇯🇵',
    text: function (S) { var u = 'U-' + (age(S) <= 15 ? 15 : 17); S.soccer.youthNT = u; KL.repAdd(S, 'nat', 12); KL.repAdd(S, 'sch', 20); S.soccer.scout += 30; KL.log(S, u + '日本代表に選ばれた。', 2); return u + '日本代表に選ばれた！ 学校ではちょっとした有名人だ。'; },
    choices: []
  });
  E.push({
    id: 's_u17wc', sched: true, pri: 7, cond: function (S) { return isSo(S) && age(S) === 16 && !KL.isB(S) && S.soccer.youthNT === 'U-17'; },
    title: 'U-17ワールドカップ', icon: '🌍',
    text: function (S) {
      var t = SO.tournament(S, 'U-17W杯', 66, ['グループステージ', 'ラウンド32', 'ラウンド16', '準々決勝', '準決勝', '決勝'], 60, 3);
      KL.repAdd(S, 'nat', 8 + t.round * 3); S.soccer.scout += 20 + t.round * 5;
      if (t.win) KL.title(S, 'U-17ワールドカップ優勝');
      return 'U-17日本代表として世界と戦った。結果は' + t.res + '、' + t.goals + '得点。海外スカウトの視線を感じた。';
    }, choices: []
  });
  // 高校でのサッカー
  E.push({
    id: 's_hs_choice', sched: true, pri: 2, cond: function (S) { return isSo(S) && age(S) === 15 && KL.isB(S); },
    title: '高校でのサッカー', icon: '⚽',
    text: function (S) { return '高校ではどこでサッカーをする？（OVR ' + SO.ovr(S.soccer) + '）'; },
    choices: [
      { t: 'Jクラブのユースに昇格・加入', req: function (S) { return S.soccer.level === 'jy' || SO.ovr(S.soccer) >= SO.E(15) + 6; }, hint: true, fx: function (S) {
        var ok = KL.chk(S, SO.ovr(S.soccer), SO.E(15) + 3 - (S.soccer.level === 'jy' ? 4 : 0), 3);
        if (ok) { var jc = S.soccer.homeClub ? KL.clubById(S.soccer.homeClub) : SO.homeClub(S); S.soccer.homeClub = jc.id; S.soccer.level = 'youth'; S.soccer.team = jc.n + ' U-18'; KL.log(S, jc.n + ' U-18に昇格・加入。', 1); return jc.n + ' U-18 の一員になった。プロまであと一歩。'; }
        S.soccer.level = 'hs'; S.soccer.team = S.school + 'サッカー部'; return 'ユースには上がれなかった。高校のサッカー部で這い上がる。';
      } },
      { t: 'サッカー強豪校（推薦）', req: function (S) { return SO.ovr(S.soccer) >= SO.E(15) - 2; }, hint: true, fx: function (S) { var n = U.pick(KL.PLACE) + '学園高校'; S.school = n; S.soccer.level = 'hs_power'; S.soccer.team = n + 'サッカー部'; return n + 'にサッカー推薦で入学した。選手権を目指す。'; } },
      { t: '普通の高校のサッカー部', fx: function (S) { S.soccer.level = 'hs'; S.soccer.team = S.school + 'サッカー部'; return '高校のサッカー部で、楽しくも本気で。'; } },
      { t: 'サッカーをやめる', fx: function (S) { quit(S); return '高校ではサッカーをやめることにした。'; } }
    ]
  });
  // 高校選手権
  E.push({
    id: 's_senshuken', sched: true, pri: 7, repeat: true,
    cond: function (S) { return isSo(S) && !S.soccer.club && (S.soccer.level === 'hs' || S.soccer.level === 'hs_power') && age(S) >= 15 && age(S) <= 17 && !KL.isB(S) && !S.flags['sen' + age(S)]; },
    title: '全国高校サッカー選手権', icon: '🏟️',
    text: function (S) {
      S.flags['sen' + age(S)] = true;
      var t = SO.tournament(S, '選手権', SO.levelStr[S.soccer.level] + (age(S) - 15) * 3, ['県予選', '1回戦', '2回戦', '3回戦', '準々決勝', '準決勝', '決勝（国立）'], 50, 3);
      if (t.round >= 1) KL.repAdd(S, 'loc', 10 + t.round * 2);
      if (t.round >= 4) { KL.repAdd(S, 'nat', 6 + t.round * 2); S.soccer.scout += 15; }
      if (t.win) { KL.title(S, '高校サッカー選手権 優勝'); KL.repAdd(S, 'nat', 15); KL.log(S, '高校選手権で日本一。', 2); }
      return '冬の選手権。結果は' + t.res + '。自分は' + t.goals + '得点。' + (t.round >= 5 ? '国立のピッチに立った。' : t.round === 0 ? '県予選で涙をのんだ。' : '');
    }, choices: []
  });
  // ユースの大会
  E.push({
    id: 's_youth_cup', sched: true, pri: 7, repeat: true,
    cond: function (S) { return isSo(S) && S.soccer.level === 'youth' && age(S) >= 16 && age(S) <= 17 && KL.isB(S) && !S.flags['yc' + age(S)]; },
    title: '日本クラブユース選手権', icon: '🏆',
    text: function (S) {
      S.flags['yc' + age(S)] = true;
      var t = SO.tournament(S, 'クラブユース', 72, ['グループステージ', 'ラウンド16', '準々決勝', '準決勝', '決勝'], 64, 3);
      if (t.win) KL.title(S, 'クラブユース選手権 優勝');
      KL.repAdd(S, 'loc', 6 + t.round * 2); S.soccer.scout += 5 + t.round * 3;
      if (age(S) === 17 && SO.ovr(S.soccer) >= SO.E(17) && KL.isB(S)) { S.soccer.scout += 10; }
      return 'ユースの夏の大一番。結果は' + t.res + '、' + t.goals + '得点。';
    }, choices: []
  });
  // 2種登録・トップ昇格
  E.push({
    id: 's_top_debut', sched: true, pri: 6,
    cond: function (S) { return isSo(S) && S.soccer.level === 'youth' && age(S) === 17 && KL.isB(S) && SO.ovr(S.soccer) >= 57; },
    title: '2種登録', icon: '✨',
    text: function (S) { KL.repAdd(S, 'nat', 6); return KL.clubById(S.soccer.homeClub).n + 'のトップチームに2種登録された。高校生ながら、プロの練習に参加する日々。'; }, choices: []
  });
  // 進路（プロ or 大学 or 一般）
  E.push({
    id: 's_pro_offer', sched: true, pri: 2,
    cond: function (S) { return isSo(S) && !S.soccer.club && age(S) === 17 && !KL.isB(S); },
    title: '進路決定：プロへの扉', icon: '📝',
    text: function (S) {
      var so = S.soccer, ovr = SO.ovr(so);
      var offers = SO.offers(S, 'rookie');
      if (so.level === 'youth' && so.homeClub && ovr >= 55 && !offers.some(function (o) { return o.club === so.homeClub; })) { var hc = KL.clubById(so.homeClub); offers.unshift({ club: hc.id, name: hc.n, lg: KL.LEAGUES[hc.l].name, s: hc.s, wage: SO.wage(S, hc, ovr) * 0.6, top: true }); }
      if (ovr < 48) offers = [];
      S._offers = offers.slice(0, 3);
      return offers.length ? 'スカウトから正式オファーが届いた！（OVR ' + ovr + '）' : 'プロからのオファーは届かなかった…（OVR ' + ovr + '）。';
    },
    choices: [0, 1, 2].map(function (i) {
      return { t: function (S) { var o = S._offers && S._offers[i]; return o ? o.name + '（' + o.lg + '）年俸' + U.yen(o.wage) + (o.top ? ' ※トップ昇格' : '') : ''; }, req: function (S) { return S._offers && S._offers[i]; },
        fx: function (S) { var o = S._offers[i]; S.soccer.pending = { club: o.club, wage: o.wage, years: 3 }; S.plan = 'pro'; KL.log(S, o.name + 'への加入が内定。', 2); return o.name + 'への加入が内定！ 卒業後、プロサッカー選手になる。'; } };
    }).concat([
      { t: '大学でサッカーを続ける', fx: function (S) { S.plan = 'univ'; S.flags.soccerUniv = true; var u = S.st.int >= 60 ? '難関私大' : '体育大学'; S.nextSchool = u + '（スポーツ推薦）'; return '大学サッカーで4年間鍛え、改めてプロを目指す。'; } },
      { t: 'サッカーをやめて普通に進学・就職', fx: function (S) { quit(S); return 'サッカーは高校で区切りをつけた。'; } }
    ])
  });
  // 大学サッカー開始
  E.push({
    id: 's_univ_start', sched: true, pri: 6,
    cond: function (S) { return isSo(S) && !S.soccer.club && S.stage === 'univ' && S.soccer.level !== 'univ'; },
    title: '大学サッカー部', icon: '🎓', text: function (S) { S.soccer.level = 'univ'; S.soccer.team = S.school.replace(/（.*）/, '') + 'サッカー部'; return '大学サッカー部に入部した。4年後のプロ入りを目指す。'; }, choices: []
  });
  E.push({
    id: 's_univ_offer', sched: true, pri: 2,
    cond: function (S) { return isSo(S) && !S.soccer.club && !S.soccer.pending && S.stage === 'univ' && age(S) === 21 && !KL.isB(S); },
    title: '大学4年：プロ入りのチャンス', icon: '📝',
    text: function (S) {
      var ovr = SO.ovr(S.soccer), offers = ovr >= 54 ? SO.offers(S, 'rookie') : [];
      S._offers = offers;
      return offers.length ? 'Jクラブからオファーが届いた！（OVR ' + ovr + '）' : 'プロからのオファーはなかった（OVR ' + ovr + '）。';
    },
    choices: [0, 1, 2].map(function (i) {
      return { t: function (S) { var o = S._offers && S._offers[i]; return o ? o.name + '（' + o.lg + '）年俸' + U.yen(o.wage) : ''; }, req: function (S) { return S._offers && S._offers[i]; },
        fx: function (S) { var o = S._offers[i]; S.soccer.pending = { club: o.club, wage: o.wage, years: 3 }; KL.log(S, o.name + 'への加入が内定。', 2); return o.name + 'への加入が内定！ 卒業後、プロの世界へ。'; } };
    }).concat([{ t: 'プロは諦めて就職する', fx: function (S) { quit(S); return 'サッカーは大学で終わり。社会人として生きていく。'; } }])
  });

  // バロンドール発表（10月ごろ）
  E.push({
    id: 's_ballon', sched: true, pri: 4, repeat: true,
    cond: function (S) { return isSo(S) && S.soccer.club && !KL.isB(S) && S.soccer.ballonPending; },
    title: 'バロンドール発表', icon: '🥇',
    text: function (S) {
      var r = SO.ballonCheck(S), so = S.soccer;
      if (!r) return 'バロンドールのノミネート30人に、今年も名前はなかった。受賞は' + SO.worldStars(S)[0].name + '。';
      so.ballonBest = Math.min(so.ballonBest || 99, r.rank);
      KL.repAdd(S, 'nat', Math.max(3, 30 - r.rank));
      if (r.rank === 1) { so.ballon = true; SO.trophy(S, 'バロンドール受賞'); return '史上初の日本人バロンドーラー！ ' + r.season + 'シーズンの世界最高の選手に選ばれた。'; }
      KL.title(S, 'バロンドール' + r.rank + '位');
      return 'バロンドール' + r.rank + '位にランクイン。受賞は' + r.winner + '。' + (r.rank <= 5 ? '世界のトップの背中が見えてきた。' : '');
    }, choices: []
  });

  // 移籍（夏・冬）
  E.push({
    id: 's_transfer', sched: true, pri: 5, repeat: true,
    cond: function (S) {
      if (!isSo(S) || !S.soccer.club || KL.age(S) > 35) return false;
      if (KL.isB(S)) return true; // 夏
      return U.chance(0.2);        // 冬はたまに
    },
    title: function (S) { return KL.isB(S) ? '夏の移籍市場' : '冬の移籍市場'; }, icon: '✈️',
    text: function (S) {
      var so = S.soccer, offers = SO.offers(S, 'normal');
      S._offers = offers;
      var c = SO.club(S);
      var exp = so.contract <= 0 ? '（契約満了）' : '（契約残り' + so.contract + '年）';
      return offers.length ? offers.length + 'つのクラブからオファーが届いた。今の' + c.n + exp + 'に残る？' : (so.contract <= 0 ? c.n + 'から契約更新の話が来た。' : 'オファーは特になかった。' + c.n + 'でシーズンを戦う。');
    },
    choices: [0, 1, 2].map(function (i) {
      return { t: function (S) { var o = S._offers && S._offers[i]; return o ? '移籍：' + o.name + '（' + o.lg + '）年俸' + U.yen(o.wage) : ''; }, req: function (S) { return S._offers && S._offers[i]; },
        fx: function (S) { var o = S._offers[i]; SO.join(S, o.club, o.wage, U.ri(2, 4)); return o.name + 'へ移籍した！ 新天地での挑戦が始まる。'; } };
    }).concat([{ t: function (S) { return S.soccer.contract <= 0 ? '残留（契約更新）' : '残留する'; }, fx: function (S) {
      var so = S.soccer;
      if (so.contract <= 0) { var c = SO.club(S), ovr = SO.ovr(so); if (ovr < c.s - 9 && KL.age(S) >= 30) { so.salary = Math.round(so.salary * 0.6); } else so.salary = Math.max(so.salary, SO.wage(S, c, ovr)); so.contract = U.ri(1, 3); return '契約を更新した（年俸' + U.yen(so.salary) + '）。'; }
      return 'このクラブで勝負を続ける。';
    } }])
  });

  // オフの過ごし方
  E.push({
    id: 's_offseason', sched: true, pri: 8, repeat: true,
    cond: function (S) { return isSo(S) && KL.isB(S) && age(S) >= 13; },
    title: 'オフの過ごし方を選ぼう', icon: '🏋️', text: function (S) { return 'シーズンが終わった。' + (S.soccer.club ? 'オフ' : '長期休み') + 'をどう過ごす？'; },
    choices: [
      { t: '筋トレ漬けの肉体改造（リスクあり）', fx: function (S) {
        if (U.chance(0.22)) { SO.skAdd(S, 'spd', -2); SO.skAdd(S, 'phy', 1); S.soccer.injury = 1; KL.fatAdd(S, 30); return '無理がたたって怪我をしてしまった…。'; }
        SO.skAdd(S, 'phy', U.ri(4, 6)); SO.skAdd(S, 'spd', U.ri(1, 2)); KL.add(S, 'hp', 2); return '一回り大きな体を手に入れた！（フィジカル↑）';
      } },
      { t: function (S) { return '名将の個人指導を受ける（' + U.yen(S.soccer.club ? 5e6 : 2e5) + '）'; }, req: function (S) { return S.money >= (S.soccer.club ? 5e6 : 2e5); }, hint: true, fx: function (S) {
        KL.moneyAdd(S, -(S.soccer.club ? 5e6 : 2e5)); SO.skAdd(S, 'iq', U.ri(3, 5)); SO.skAdd(S, 'pas', U.ri(1, 3)); return '戦術眼が磨かれた。（サッカーIQ・パス↑）';
      } },
      { t: function (S) { return '海外キャンプで武者修行（' + U.yen(S.soccer.club ? 3e6 : 3e5) + '）'; }, req: function (S) { return S.money >= (S.soccer.club ? 3e6 : 3e5); }, hint: true, fx: function (S) {
        KL.moneyAdd(S, -(S.soccer.club ? 3e6 : 3e5)); var ks = U.shuffle(['spd', 'dri', 'sht', 'pas', 'def']).slice(0, 2); ks.forEach(function (k) { SO.skAdd(S, k, U.ri(2, 5)); }); KL.add(S, 'men', 3);
        return '世界のレベルを肌で感じた。（' + ks.map(function (k) { return SKN[k]; }).join('・') + '↑）';
      } },
      { t: 'しっかり休養する', fx: function (S) { KL.fatAdd(S, -40); KL.add(S, 'men', 3); return '心と体をリフレッシュできた。'; } }
    ]
  });

  // コンバート
  E.push({
    id: 's_convert', w: 2, repeat: true,
    cond: function (S) { if (!isSo(S) || age(S) < 13 || age(S) > 30) return false; var so = S.soccer, b = SO.bestPos(so); return b !== so.pos && SO.ovr(so, b) >= SO.ovr(so) + 3; },
    title: 'コンバートの打診', icon: '🔄',
    text: function (S) { var b = SO.bestPos(S.soccer); return '監督「お前、' + SO.POS[b].jp + 'の方が活きるんじゃないか？（OVR ' + SO.ovr(S.soccer) + '→' + SO.ovr(S.soccer, b) + '）」'; },
    choices: [
      { t: 'コンバートを受け入れる', fx: function (S) { var b = SO.bestPos(S.soccer); S.soccer.pos = b; return SO.POS[b].jp + 'にコンバートした。'; } },
      { t: '今のポジションで勝負する', fx: function (S) { KL.add(S, 'men', 2); S.soccer.trust -= 5; return '自分のこだわりを貫く。'; } }
    ]
  });
  // ポジション争い・試合の出来事
  E.push({
    id: 's_bigmatch', w: 3, repeat: true, cond: function (S) { return isSo(S) && S.soccer.club && age(S) <= 34; },
    title: 'ビッグマッチ', icon: '🔥',
    text: function (S) { var c = SO.club(S); var opp = U.pick(KL.CLUBS.filter(function (x) { return x.l === c.l && x.id !== c.id; })); S._opp = opp.n; return opp.n + '戦。スタジアムは満員。後半、1点ビハインドで出番が来た。'; },
    choices: [
      { t: '自分で仕掛ける', fx: function (S) { var so = S.soccer; if (KL.chk(S, (so.sk.dri + so.sk.sht) / 2, SO.club(S).s - 2, 4)) { so.cur.goals++; so.totalGoals++; so.trust += 8; KL.repAdd(S, 'nat', 4); return '値千金の同点ゴール！ スタジアムが揺れた。'; } so.trust -= 3; return 'シュートは枠を外れた。チームは敗れた。'; } },
      { t: '味方を活かす', fx: function (S) { var so = S.soccer; if (KL.chk(S, (so.sk.pas + so.sk.iq) / 2, SO.club(S).s - 4, 4)) { so.cur.ast++; so.totalAst++; so.trust += 6; return '絶妙なスルーパスでアシスト！'; } return 'パスはカットされた。'; } }
    ]
  });
  E.push({
    id: 's_media', w: 2, repeat: true, cond: function (S) { return isSo(S) && S.soccer.club && S.rep.nat >= 30; },
    title: '取材の依頼', icon: '🎤', text: 'スポーツ番組から密着取材の依頼が来た。',
    choices: [
      { t: '受ける', fx: function (S) { KL.repAdd(S, 'nat', 5); KL.grow(S, 'com', 1); KL.fatAdd(S, 8); return '放送後、街で声をかけられることが増えた。'; } },
      { t: 'サッカーに集中したいので断る', fx: function (S) { S.soccer.trust += 3; return '監督は「いい判断だ」と笑った。'; } }
    ]
  });
  E.push({
    id: 's_slump', w: 2, repeat: true, cond: function (S) { return isSo(S) && age(S) >= 15 && S.soccer.trust < 40; },
    title: 'スランプ', icon: '🌧️', text: 'なかなか結果が出ない。練習にも身が入らない日々が続く。',
    choices: [
      { t: '原点に戻って基礎練習', fx: function (S) { SO.skAdd(S, 'iq', 1); S.soccer.trust += 6; KL.add(S, 'men', 2); return '少しずつ感覚が戻ってきた。'; } },
      { t: '友人に相談する', fx: function (S) { KL.add(S, 'men', 4); var f = S.npcs.filter(function (n) { return n.rel === 'friend' || n.rel === 'best'; })[0]; if (f) KL.likeAdd(f, 6); return (f ? f.name : '友人') + 'に話を聞いてもらって、気持ちが軽くなった。'; } }
    ]
  });

  // 引退
  E.push({
    id: 's_retire', sched: true, pri: 3, repeat: true,
    cond: function (S) {
      if (!isSo(S) || !S.soccer.club || !KL.isB(S)) return false;
      var a = age(S), so = S.soccer, c = SO.club(S);
      return (a >= 33 && SO.ovr(so) < c.s - 7) || a >= 37;
    },
    title: '引退の決断', icon: '🌅',
    text: function (S) { var so = S.soccer; return KL.age(S) + '歳。体は正直だ。通算' + so.totalApps + '試合' + so.totalGoals + '得点。現役を続ける？'; },
    choices: [
      { t: '現役続行（下のカテゴリーでも）', req: function (S) { return age(S) < 41; }, fx: function (S) {
        var so = S.soccer, ovr = SO.ovr(so);
        var c = U.pick(KL.CLUBS.filter(function (x) { return x.s <= ovr + 3 && x.s >= ovr - 8; })) || U.pick(KL.CLUBS.filter(function (x) { return x.l === 'J3'; }));
        if (c.id !== so.club) SO.join(S, c.id, SO.wage(S, c, ovr) * 0.7, 1); else so.contract = 1;
        return SO.club(S).n + 'でもう1年戦う。';
      } },
      { t: 'スパイクを脱ぐ', fx: function (S) { SO.retire(S); KL.push(S, secondCareer()); return '現役引退。たくさんの拍手に送られて、ピッチを去った。'; } }
    ]
  });
  SO.retire = function (S) {
    var so = S.soccer;
    if (so.cur && !so.cur.closed) closeSeason(S);
    so.retired = true; so.retireAge = KL.age(S);
    S.track = null;
    KL.log(S, KL.age(S) + '歳で現役を引退（通算' + so.totalApps + '試合' + so.totalGoals + '得点、代表' + so.caps + '試合）。', 2);
  };
  function secondCareer() {
    return {
      title: 'セカンドキャリア', icon: '🧭', text: '引退後はどう生きる？',
      choices: [
        { t: '指導者になる', ok: true, fx: function (S) { S.job = { id: 'coach', name: 'サッカー指導者', title: 0, perf: 40, years: 0 }; S.stage = 'work'; KL.log(S, '指導者としての道を歩み始めた。'); return 'ライセンスを取り、指導者の道へ。'; } },
        { t: '解説者・タレントになる', ok: true, fx: function (S) { S.stage = 'free'; S.talent = 'サッカー解説者'; S.flags.commentator = true; KL.repAdd(S, 'nat', 5); return 'テレビでサッカーを語る仕事を始めた。'; } },
        { t: '一般企業に就職する', ok: true, fx: function (S) { var jd = KL.JOBS.filter(function (j) { return j.id === 'sales'; })[0]; KL.setJob(S, jd); S.stage = 'work'; return '一社会人として、新しいスタートを切った。'; } },
        { t: 'のんびり暮らす', ok: true, fx: function (S) { S.stage = 'retired'; return '貯えで穏やかに暮らすことにした。'; } }
      ]
    };
  }
  SO.secondCareer = secondCareer;

  function quit(S) {
    if (!S.soccer) return;
    if (S.soccer.cur && !S.soccer.cur.closed) closeSeason(S);
    S.soccer.retired = true; S.soccer.retireAge = KL.age(S);
    S.track = null;
    KL.log(S, 'サッカーをやめた。');
  }
  SO.quit = quit;
})();
