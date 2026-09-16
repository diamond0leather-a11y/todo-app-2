// 10日プランの表示期間を販売周期から導出する。保存済み投稿と planStart は変更しない。
function salesCycleBlock(date = TODAY) {
  const sales = [...new Set(Object.values(demo.months).map(month => month.date).filter(Boolean))].sort();
  const lastSale = sales.filter(sale => sale < date).at(-1);
  if (!lastSale) return null;

  const day = dayDiff(date, lastSale);
  const blockIndex = Math.floor((day - 1) / 10);
  const from = dayAdd(lastSale, 1 + blockIndex * 10);
  const naturalTo = dayAdd(from, 9);
  const nextSale = sales.find(sale => sale >= date);
  const to = nextSale && nextSale <= naturalTo ? nextSale : naturalTo;
  const dayFrom = dayDiff(from, lastSale);
  const dayTo = dayDiff(to, lastSale);

  const nextFrom = to === nextSale ? dayAdd(nextSale, 1) : dayAdd(to, 1);
  const saleAfterNext = sales.find(sale => sale >= nextFrom);
  const nextNaturalTo = dayAdd(nextFrom, 9);
  const nextTo = saleAfterNext && saleAfterNext <= nextNaturalTo ? saleAfterNext : nextNaturalTo;
  const nextBaseSale = sales.filter(sale => sale < nextFrom).at(-1);

  return {
    from,
    to,
    dayFrom,
    dayTo,
    nextFrom,
    nextTo,
    nextDayFrom: dayDiff(nextFrom, nextBaseSale),
    nextDayTo: dayDiff(nextTo, nextBaseSale)
  };
}

function planPeriodLabel(from, to, dayFrom, dayTo) {
  return `${short(from)}〜${short(to)} · Day${dayFrom}〜${dayTo}`;
}

rangePosts = function () {
  const period = salesCycleBlock();
  if (!period) return [];
  return demo.posts
    .filter(post => !post.deleted && post.date >= period.from && post.date <= period.to)
    .sort((a, b) => a.date.localeCompare(b.date));
};

renderPlan = function () {
  const period = salesCycleBlock();
  if (!period) {
    dx('#view-plan').innerHTML = '<div class="section-head"><div class="section-kicker">10 DAY PLAN</div><h2>10日プラン</h2></div><article class="card"><h3>販売日を登録してください</h3><p>月間画面でオンライン販売日を登録すると、現在の10日ブロックを自動表示します。</p></article><div id="planList"></div>';
    return;
  }

  dx('#view-plan').innerHTML = `<div class="section-head"><div class="section-kicker">10 DAY PLAN</div><h2>10日プラン</h2></div><article class="card" id="planPeriodCard"><span class="badge">販売周期から自動表示</span><h3 id="planDateWork">${planPeriodLabel(period.from, period.to, period.dayFrom, period.dayTo)}</h3><p>今日 ${short(TODAY)} は ${cycleDay(TODAY)}</p><div class="next-plan-period"><small>次の期間</small><strong>${planPeriodLabel(period.nextFrom, period.nextTo, period.nextDayFrom, period.nextDayTo)}</strong></div><details><summary>引き継ぐ販売情報</summary><div id="planSales"></div></details><div class="actions"><button class="secondary" id="suggestPlanWork">未作成の日だけ提案</button><button class="ghost" id="addPostWork">投稿を追加</button></div></article><article class="card" id="planAxisSummary"></article><div id="planList"></div>`;

  const months = [...new Set([period.from.slice(0, 7), period.to.slice(0, 7), period.nextTo.slice(0, 7)])];
  dx('#planSales').innerHTML = months
    .filter(month => demo.months[month]?.date)
    .map(month => `<p>${short(demo.months[month].date)} ${demo.months[month].time}販売 · ${demo.months[month].lineup.length}SKU</p>`)
    .join('');

  dx('#planList').innerHTML = rangePosts().map(post => `<article class="card"><div class="row between"><span class="badge">${planDay(post.date)}</span><span class="badge">${formats[post.format]}</span></div><p class="tiny muted">${html(topicLabel(post))}</p><h3>${html(post.derivedTheme || post.theme)}</h3><p>${html(post.takeaway || '伝えることは未確認')}</p><p class="exact muted">${html(post.skuIds.length ? postLabel(post) : post.subjects || '革・工程・道具')}</p><div class="row"><span class="badge">${html(axisShort[post.primaryAxis] || '主目的未確認')}</span><span class="tiny">${post.stories.length} Story · ${post.shots.reduce((count, shot) => count + shot.count, 0)}カット</span></div>${post.researchRequired ? '<p class="notice">要リサーチ</p>' : ''}<p class="tiny">${post.actualAt ? '投稿済み' : post.paused ? '投稿休止' : blocked(post.date) ? '投稿不可日' : '予定'}${post.manual ? ' / 編集済み' : ''}</p><button class="secondary full" data-work-post="${post.id}">投稿内容を見る・編集</button></article>`).join('') || '<article class="card">この期間の投稿はまだありません。</article>';

  dx('#planAxisSummary').innerHTML = '<h3>この10日間の役割</h3>' + balanceHTML(rangePosts());
};

document.head.insertAdjacentHTML('beforeend', '<style>.next-plan-period{display:grid;gap:4px;margin:16px 0;padding:12px;background:#f0f2ef;border-radius:10px}.next-plan-period strong{font-size:16px}#planPeriodCard h3{margin-bottom:4px}</style>');
refreshWork();
