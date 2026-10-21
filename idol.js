/* Kani Life - アイドルの道 */
(function () {
  'use strict';
  var KL = window.KL, U = KL.U;
  var ID = KL.Idol = {};
  KL.EVENTS = KL.EVENTS || [];

  ID.SK = [
    { k: 'sing', n: '歌唱力', base: ['art'] }, { k: 'dance', n: 'ダンス', base: ['ath', 'art'] },
    { k: 'vis', n: 'ビジュアル', base: ['look'] }, { k: 'talk', n: 'トーク', base: ['com'] }, { k: 'expr', n: '表現力', base: ['art', 'men'] }
  ];
  var SKN = {}; ID.SK.forEach(function (s) { SKN[s.k] = s.n; });
  ID.skName = SKN;
  ID.STATUS = { trainee: '研究生', member: 'メンバー', senbatsu: '選抜メンバー', center: 'センター', grad: '卒業' };

  ID.MAX_POW = 92; // 総合力の最高値
  ID.power = function (id) { var s = id.sk; return Math.min(ID.MAX_POW, Math.round(s.sing * 0.25 + s.dance * 0.25 + s.vis * 0.25 + s.talk * 0.1 + s.expr * 0.15)); };
  ID.TOP = { 3: 90, 2: 82, 1: 66 }; // グループのエース格の人気（tier別）
  ID.group = function (S) { var g = (KL.IDOL_GROUPS[S.sex] || []).filter(function (x) { return x.id === S.idol.group; })[0]; return g; };

  ID.start = function (S, g, trainee) {
    var st = S.st, exp = S.flags.idolExp || 0;
    var id = S.idol = {
      active: true, group: g.id, groupName: g.name, agency: g.agency, gpop: g.pop, status: trainee ? 'trainee' : 'member',
      sk: { sing: st.art * 0.5 + exp * 0.8, dance: (st.ath + st.art) * 0.3 + exp * 0.8, vis: st.look * 0.85, talk: st.com * 0.6, expr: (st.art + st.men) * 0.3 },
      cap: {}, fans: trainee ? 200 : 1500, peakFans: 0, rank: 0, size: S.sex === 'f' ? 22 : 6, debuted: !trainee, centerCount: 0, senbatsuCount: 0,
      singles: 0, hist: [], joinAge: KL.age(S), trainTurns: 0, members: []
    };
    ID.SK.forEach(function (s) {
      var avg = s.base.reduce(function (t, b) { return t + (S.tal[b] || 3); }, 0) / s.base.length;
      id.cap[s.k] = Math.min(99, Math.round(55 + avg * 9 + U.ri(-2, 4)));
      id.sk[s.k] = Math.min(id.sk[s.k], id.cap[s.k] - 4);
    });
    id.tier = g.tier;
    for (var i = 0; i < id.size - 1; i++) id.members.push(ID.newMember(g.tier, i));
    S.track = 'idol';
    KL.log(S, g.name + '（' + g.agency + '）に' + (trainee ? '研究生として' : '') + '加入した。', 2);
  };

  ID.newMember = function (tier, i) {
    var top = ID.TOP[tier] || 70;
    if (i === 0) return Math.round(top + U.gauss() * 2.5);
    if (i === 1) return Math.round(top - 4 + U.gauss() * 2.5);
    return Math.round(top - 10 - Math.min(i, 10) * 1.2 + U.gauss() * 4);
  };
  // 1年ごとのメンバーの入れ替わり（卒業・台頭）
  ID.yearMembers = function (S) {
    var id = S.idol, top = ID.TOP[id.tier || 3] || 70, notes = [];
    id.members = id.members.map(function (m) {
      if (U.chance(0.12)) return Math.round(top - 16 + U.gauss() * 5); // 卒業→新メンバー
      if (U.chance(0.12)) return Math.min(top + 5, m + U.ri(3, 7));    // ブレイク
      return U.clamp(m + U.gauss() * 1.8, 30, top + 6);
    });
    // いつの時代もエース格が1人はいる
    var mx = Math.max.apply(null, id.members);
    if (mx < top - 1) { var j = id.members.indexOf(mx); id.members[j] = Math.round(top + U.gauss() * 2); notes.push('新エースが台頭'); }
    return notes;
  };

  ID.grow = function (S, k, base) {
    var id = S.idol, cap = id.cap[k], s = id.sk[k];
    var b = ID.SK.filter(function (x) { return x.k === k; })[0].base;
    var avg = b.reduce(function (t, x) { return t + (S.tal[x] || 3); }, 0) / b.length;
    var g = base * (0.55 + (avg - 1) * 0.24) * KL.ageF(S, 'art') * (1 - S.fat / 230);
    var room = (cap - s) / cap;
    g *= room > 0 ? Math.max(0.12, Math.min(1, room * 3)) : 0.02;
    id.sk[k] = U.clamp(s + g, 0, 99);
    S._sd = S._sd || {}; S._sd[k] = (S._sd[k] || 0) + g;
  };
  ID.skAdd = function (S, k, v) { var id = S.idol; id.sk[k] = U.clamp(id.sk[k] + v, 0, 99); S._sd = S._sd || {}; S._sd[k] = (S._sd[k] || 0) + v; };

  ID.actions = function (S) {
    var L = [];
    function a(id, n, d, fat, fx) { L.push({ id: id, n: n, d: d, fat: fat, fx: fx, idol: true }); }
    a('i_vocal', 'ボイストレーニング', '歌唱力', 4, function (S, p) { ID.grow(S, 'sing', 2.6 * p); KL.grow(S, 'art', 0.5 * p); });
    a('i_dance', 'ダンスレッスン', 'ダンス・体力', 5, function (S, p) { ID.grow(S, 'dance', 2.6 * p); KL.grow(S, 'hp', 0.5 * p); });
    a('i_vis', '美容・ビジュアル磨き', 'ビジュアル・見た目', 2, function (S, p) { ID.grow(S, 'vis', 2.2 * p); KL.grow(S, 'look', 0.8 * p); });
    a('i_talk', 'バラエティ・トーク練習', 'トーク・コミュ力', 3, function (S, p) { ID.grow(S, 'talk', 2.4 * p); KL.grow(S, 'com', 0.6 * p); });
    a('i_expr', '演技・表現レッスン', '表現力', 3, function (S, p) { ID.grow(S, 'expr', 2.4 * p); });
    a('i_sns', 'SNS発信', 'ファン数', 2, function (S, p) { var id = S.idol; id.fans += Math.round(p * (200 + id.fans * 0.015) * (0.5 + (id.sk.vis + id.sk.talk) / 160)); KL.grow(S, 'com', 0.3 * p); });
    a('i_live', 'ライブ・握手会', 'ファン数・表現力', 6, function (S, p) { var id = S.idol; id.fans += Math.round(p * (300 + id.fans * 0.03) * (0.5 + ID.power(id) / 120)); ID.grow(S, 'expr', 0.6 * p); });
    return L;
  };

  ID.myPop = function (id) { return ID.power(id) * 0.55 + Math.log10(id.fans + 10) * 7; };
  ID.calcRank = function (id) { var me = ID.myPop(id); return 1 + id.members.filter(function (m) { return m > me; }).length; };

  ID.turn = function (S) {
    var id = S.idol; if (!id || !id.active) return;
    var mult = { trainee: 0.15, member: 0.5, senbatsu: 1, center: 2 }[id.status] || 0.3;
    var gain = Math.round(Math.pow(id.gpop, 1.5) * 22 * mult * Math.pow(ID.power(id) / 60, 2) * U.rf(0.8, 1.2));
    id.fans = Math.max(0, Math.round(id.fans * 0.95) + gain);
    id.peakFans = Math.max(id.peakFans, id.fans);
    if (id.status === 'trainee') id.trainTurns++;
    else { id.singles++; }
    // グループ人気の変動
    var base = { 3: 82, 2: 66, 1: 30 }[id.tier || 3];
    id.gpop = U.clamp(id.gpop + (base - id.gpop) * 0.15 + U.gauss() * 2.5 + (id.status === 'center' ? (ID.power(id) - 80) * 0.25 : 0), 10, 98);
    // メンバーの人気も少しずつ変わる
    // 知名度：ファン10万人=35、100万人=60、1000万人=85
    var tgt = U.clamp((Math.log10(id.fans + 1) - 3.6) * 25, 0, 100);
    S.rep.nat = Math.max(Math.min(S.rep.nat, tgt + 10), tgt);
    KL.repAdd(S, 'sch', 3);
    // 収入
    var inc = id.status === 'trainee' ? 50000 : 300000 + id.fans * 12 + (id.status === 'center' ? 2000000 : 0);
    KL.moneyAdd(S, inc);
    id.rank = ID.calcRank(id);
    var txt = '🎤 ' + id.groupName + '（' + ID.STATUS[id.status] + '）：ファン ' + id.fans.toLocaleString() + '人（+' + gain.toLocaleString() + '）・メンバー内人気 ' + id.rank + '位/' + id.size + '人';
    KL.line(S, txt);
    if (id.status !== 'trainee') {
      var oricon = Math.max(1, Math.round(30 - id.gpop * 0.3 + U.gauss() * 2));
      KL.line(S, '💿 ' + id.singles + 'thシングル：オリコン週間' + oricon + '位' + (oricon === 1 ? '🥇' : ''));
      if (oricon === 1 && !S.flags.oricon1) { S.flags.oricon1 = true; KL.title(S, 'オリコン週間1位'); }
    }
  };

  ID.perception = function (S) {
    var id = S.idol;
    if (!id) return null;
    if (!id.active) return { main: '元' + id.groupName + (S.talent ? 'の' + S.talent : 'のメンバー'), tags: [] };
    if (id.annualTop && id.status === 'center' && S.rep.nat >= 70) return { main: '日本一のアイドル', tags: [id.groupName + 'のセンター', '年間人気ランキング1位'] };
    if (id.status === 'center' && S.rep.nat >= 68) return { main: '国民的アイドル', tags: [id.groupName + 'のセンター'] };
    if (id.status === 'center') return { main: id.groupName + 'のセンター', tags: ['ファン' + Math.round(id.fans / 1000) + 'k'] };
    if (id.status === 'senbatsu') return { main: 'テレビでよく見る' + id.groupName + 'の選抜メンバー', tags: [] };
    if (id.status === 'member') return { main: (S.rep.nat > 40 ? '全国区の' : KL.isStudent(S) ? '学校で噂の' : '') + id.groupName + 'のメンバー', tags: [] };
    return { main: KL.isStudent(S) ? '隣のクラスの、アイドルの卵' : 'アイドルの卵（' + id.groupName + '研究生）', tags: [] };
  };

  // ======================================================
  //  アイドルの出来事
  // ======================================================
  var E = KL.EVENTS;
  function isId(S) { return S.track === 'idol' && S.idol && S.idol.active; }
  function age(S) { return KL.age(S); }
  function audScore(S) { var st = S.st; return st.look * 0.4 + st.art * 0.3 + st.com * 0.15 + st.ath * 0.15 + Math.min(15, (S.flags.idolExp || 0) * 0.8); }

  E.push({
    id: 'i_audition', sched: true, pri: 6, repeat: true,
    cond: function (S) { var a = age(S); return !S.track && a >= 11 && a <= 21 && ((S.flags.idolExp || 0) >= 4 || S.st.look >= 70) && (S.flags.audCool || -9) <= S.t - 3; },
    title: 'オーディションのお知らせ', icon: '🎤',
    text: function (S) { S.flags.audCool = S.t; return 'アイドルグループの新メンバーオーディションの告知を見つけた。（あなたの評価目安：' + Math.round(audScore(S)) + '）'; },
    choices: [0, 1, 2, 3].map(function (i) {
      return {
        t: function (S) { var g = KL.IDOL_GROUPS[S.sex][i]; return g.name + '（' + g.agency + '）難易度' + ['', '★', '★★', '★★★'][g.tier]; },
        fx: function (S) {
          var g = KL.IDOL_GROUPS[S.sex][i], need = { 1: 34, 2: 50, 3: 60 }[g.tier];
          if (KL.chk(S, audScore(S), need, 4)) { ID.start(S, g, g.tier >= 2); KL.repAdd(S, 'sch', 20); return '合格！ ' + g.name + 'の' + (g.tier >= 2 ? '研究生' : 'メンバー') + 'になった。'; }
          return g.name + 'のオーディションは不合格だった…。';
        }
      };
    }).concat([{ t: '今回は見送る', fx: function () { return 'また次の機会に。'; } }])
  });
  E.push({
    id: 'i_scout', w: function (S) { return S.st.look >= 78 ? 3 : 0.5; }, repeat: true,
    cond: function (S) { var a = age(S); return !S.track && a >= 13 && a <= 22 && S.st.look >= 72; },
    title: '街でスカウトされた', icon: '✨',
    text: function (S) { var g = KL.IDOL_GROUPS[S.sex][U.ri(0, 2)]; S._scoutG = g.id; return '原宿を歩いていたら名刺を渡された。「' + g.agency + 'です。' + g.name + 'の研究生、興味ありませんか？」'; },
    choices: [
      { t: '話を聞いてみる', fx: function (S) { var g = KL.IDOL_GROUPS[S.sex].filter(function (x) { return x.id === S._scoutG; })[0]; ID.start(S, g, true); return g.name + 'の研究生になった！'; } },
      { t: '興味ないので断る', fx: function (S) { KL.add(S, 'men', 1); return '丁寧に断った。でも、ちょっと嬉しかった。'; } }
    ]
  });
  // 研究生→デビュー
  E.push({
    id: 'i_debut', sched: true, pri: 4, repeat: true,
    cond: function (S) { return isId(S) && S.idol.status === 'trainee' && (ID.power(S.idol) >= 52 || S.idol.trainTurns >= 4); },
    title: '正規メンバー昇格', icon: '🌟',
    text: function (S) { var id = S.idol; id.status = 'member'; id.debuted = true; id.fans += 5000; KL.repAdd(S, 'nat', 8); KL.log(S, id.groupName + 'の正規メンバーとしてデビュー。', 2); return 'ついに' + id.groupName + 'の正規メンバーに昇格！ デビューシングルのMVに映る自分を見て、涙が出た。'; },
    choices: []
  });
  // 人気投票（毎年）
  E.push({
    id: 'i_vote', sched: true, pri: 4, repeat: true,
    cond: function (S) { return isId(S) && S.idol.status !== 'trainee' && KL.isB(S); },
    title: function (S) { return S.sex === 'f' ? '選抜総選挙' : 'メンバー人気投票'; }, icon: '🗳️',
    text: function (S) {
      var id = S.idol, mn = ID.yearMembers(S), r = ID.calcRank(id), sb = S.sex === 'f' ? 16 : 3;
      id.rank = r;
      var prev = id.status;
      if (r === 1) { id.status = 'center'; id.centerCount++; if (id.centerCount === 1) KL.title(S, id.groupName + ' センター'); KL.repAdd(S, 'nat', 15); }
      else if (r <= sb) { id.status = 'senbatsu'; id.senbatsuCount++; }
      else id.status = 'member';
      id.hist.push({ year: KL.year(S), rank: r, fans: id.fans });
      if (r === 1) return '第1位！ 次のシングルでセンターを務めることになった。ステージで泣きながら「ありがとう」と叫んだ。';
      if (r <= sb) return r + '位。' + (prev === 'member' ? '初の選抜入り！' : '選抜メンバーとして活動を続ける。');
      return r + '位。選抜には届かなかった。悔しさを次につなげたい。';
    }, choices: []
  });
  // 紅白
  ID.ANNUAL_LINE = 100.5; // 年間ランキング1位のライン（上げるほど難しい）
  E.push({
    id: 'i_annual', sched: true, pri: 7, repeat: true,
    cond: function (S) { return isId(S) && S.idol.status !== 'trainee' && !KL.isB(S); },
    title: '年間アイドル人気ランキング', icon: '👑',
    text: function (S) {
      var id = S.idol;
      var sc = ID.myPop(id) + (id.status === 'center' ? 5 : id.status === 'senbatsu' ? 1 : -3) + (id.tier - 3) * 4 + (id.gpop - 80) * 0.15 + (S.flags.actor ? 1.5 : 0);
      var best = ID.ANNUAL_LINE + U.gauss() * 2.5;
      var rank = sc >= best ? 1 : Math.max(2, Math.round(1 + (best - sc) * 1.3 + U.rf(0, 1.5)));
      if (rank > 50) return '年末恒例の「年間アイドル人気ランキング」が発表された。今年はランク外だった。';
      id.annualBest = Math.min(id.annualBest || 99, rank);
      KL.repAdd(S, 'nat', Math.max(1, 12 - rank / 3));
      if (rank === 1) { id.annualTop = (id.annualTop || 0) + 1; id.fans += 30000; KL.title(S, '年間アイドル人気ランキング1位'); KL.log(S, KL.year(S) + '年の年間アイドル人気ランキングで1位に。', 2); return '発表の瞬間、スタジオが揺れた。' + KL.year(S) + '年、日本で一番愛されたアイドルに選ばれた！'; }
      if (rank <= 3) { KL.title(S, '年間アイドル人気ランキング' + rank + '位'); return rank + '位にランクイン！ 頂点はすぐそこだ。'; }
      return '年間アイドル人気ランキングで' + rank + '位。' + (rank <= 10 ? 'トップ10入りを果たした。' : '');
    }, choices: []
  });
  E.push({
    id: 'i_kouhaku', sched: true, pri: 6, repeat: true,
    cond: function (S) { return isId(S) && S.idol.status !== 'trainee' && !KL.isB(S) && U.chance(U.sig((S.idol.gpop - 80) / 4) * 0.9); },
    title: '紅白歌合戦 出場', icon: '🎶',
    text: function (S) { var id = S.idol; id.fans += 20000; KL.repAdd(S, 'nat', 6); S.flags.kouhaku = (S.flags.kouhaku || 0) + 1; id.kouhakuYear = KL.year(S); if (S.flags.kouhaku === 1) KL.title(S, '紅白歌合戦 初出場'); return id.groupName + 'として大晦日の紅白歌合戦に出場した。' + (id.status === 'center' ? 'センターとして、日本中の視線を浴びた。' : ''); },
    choices: []
  });
  E.push({
    id: 'i_dome', w: 3, cond: function (S) { return isId(S) && S.idol.gpop >= 84 && S.idol.status !== 'trainee'; },
    title: '東京ドーム公演', icon: '🏟️', text: function (S) { S.idol.fans += 30000; KL.title(S, '東京ドーム公演'); KL.repAdd(S, 'nat', 8); return '夢だった東京ドーム公演が決定し、5万人の前で歌った。'; }, choices: []
  });
  E.push({
    id: 'i_drama', w: 3, repeat: true, cond: function (S) { return isId(S) && S.idol.status !== 'trainee' && S.idol.sk.expr >= 55 && S.idol.fans >= 30000; },
    title: 'ドラマ出演のオファー', icon: '🎬', text: '連続ドラマのヒロイン（ヒーロー）役のオファーが来た。',
    choices: [
      { t: '挑戦する', fx: function (S) { var id = S.idol; if (KL.chk(S, id.sk.expr, 62, 6)) { id.fans += 40000; KL.repAdd(S, 'nat', 10); S.flags.actor = true; return '演技が話題になり、ドラマは大ヒット！'; } id.fans += 5000; return '演技は「まだまだ」と言われたが、良い経験になった。'; } },
      { t: 'グループ活動に集中する', fx: function (S) { S.idol.fans += 3000; return 'ファンは「グループ優先、えらい」と喜んだ。'; } }
    ]
  });
  E.push({
    id: 'i_variety', w: 3, repeat: true, cond: function (S) { return isId(S) && S.idol.status !== 'trainee' && S.idol.sk.talk >= 50; },
    title: 'バラエティ番組', icon: '📺',
    text: '人気バラエティ番組にゲスト出演することになった。',
    choices: [
      { t: '全力でボケる', fx: function (S) { var id = S.idol; if (KL.chk(S, id.sk.talk, 60, 6)) { id.fans += 15000; KL.repAdd(S, 'nat', 5); return 'スタジオは大爆笑。SNSでトレンド入りした。'; } id.fans -= 2000; return '盛大にスベった…。'; } },
      { t: '無難にこなす', fx: function (S) { S.idol.fans += 3000; return 'そつなくこなした。'; } }
    ]
  });
  E.push({
    id: 'i_rival', w: 2, repeat: true, cond: function (S) { return isId(S); },
    title: 'メンバーとの関係', icon: '💬', text: '同期のメンバーが、最近人気を伸ばしている。ちょっとモヤモヤする。',
    choices: [
      { t: '素直に応援する', fx: function (S) { KL.add(S, 'men', 3); KL.add(S, 'com', 1); return '「一緒に上に行こう」と言えた。少し大人になった気がする。'; } },
      { t: '負けじとレッスンを増やす', fx: function (S) { ID.skAdd(S, 'dance', 2); ID.skAdd(S, 'sing', 2); KL.fatAdd(S, 15); return '悔しさを練習にぶつけた。'; } }
    ]
  });
  E.push({
    id: 'i_scandal', w: function (S) { return KL.partner(S) ? 4 : 0; }, repeat: true,
    cond: function (S) { return isId(S) && !!KL.partner(S) && S.idol.status !== 'trainee'; },
    title: '熱愛報道', icon: '📰',
    text: function (S) { return '週刊誌に' + KL.partner(S).name + 'とのデート写真が載った。事務所から呼び出しが…。'; },
    choices: [
      { t: '交際を正直に認める', fx: function (S) { var id = S.idol; id.fans = Math.round(id.fans * 0.7); KL.add(S, 'men', 3); KL.likeAdd(KL.partner(S), 15); return 'ファンは離れたが、「正直でいい」という声もあった。'; } },
      { t: '否定する', fx: function (S) { var id = S.idol; id.fans = Math.round(id.fans * 0.88); KL.add(S, 'men', -4); KL.likeAdd(KL.partner(S), -15); return '騒動はなんとか収まった。でも、心が少し痛む。'; } },
      { t: '別れを選ぶ', fx: function (S) { var p = KL.partner(S); p.rel = 'ex'; S.partnerId = null; S.exCount++; S.idol.fans = Math.round(S.idol.fans * 0.95); KL.add(S, 'men', -6); return p.name + 'と別れた。アイドルとして生きると決めた。'; } }
    ]
  });
  // 卒業
  E.push({
    id: 'i_grad', sched: true, pri: 3, repeat: true,
    cond: function (S) { if (!isId(S) || !KL.isB(S)) return false; var a = age(S); return a >= (S.sex === 'f' ? 24 : 28) && U.chance(0.5) || a >= 33; },
    title: '卒業を考える', icon: '🌸',
    text: function (S) { var id = S.idol; return KL.age(S) + '歳。' + id.groupName + 'に入って' + (KL.age(S) - id.joinAge) + '年。これからのことを考える時期が来た。'; },
    choices: [
      { t: '続ける', req: function (S) { return age(S) < 35; }, fx: function (S) { KL.add(S, 'men', 2); return 'まだやれる。もう少しだけ、このグループで。'; } },
      { t: '卒業して俳優・タレントに', fx: function (S) { return grad(S, S.flags.actor ? '俳優' : 'タレント'); } },
      { t: '卒業してソロ歌手に', fx: function (S) { return grad(S, 'ソロ歌手'); } },
      { t: '芸能界を引退して一般人に', fx: function (S) { var r = grad(S, null); S.stage = 'free'; return r + ' 普通の生活に戻る。'; } }
    ]
  });
  function grad(S, next) {
    var id = S.idol;
    id.active = false; id.status = 'grad'; id.gradAge = KL.age(S);
    S.track = null;
    KL.log(S, id.groupName + 'を卒業した（最高' + Math.min.apply(null, id.hist.map(function (h) { return h.rank; }).concat([id.rank || 99])) + '位・ファン' + id.peakFans.toLocaleString() + '人）。', 2);
    if (next) { S.talent = next; if (S.stage === 'idol' || S.stage === 'free') S.stage = 'free'; }
    else S.talent = null;
    return '卒業コンサートで、ファンの前で最後の歌を歌った。';
  }
  ID.grad = grad;
})();
