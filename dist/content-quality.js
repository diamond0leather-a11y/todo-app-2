// Future local drafts only. Saved, manually edited, published and imported plans are not migrated.
(function () {
  const previousConcept = createConcept;
  const previousStories = makeStories;
  const previousShoot = specificShootDirections;
  const details = {
    CARE: ['素材と仕上げを先に確かめる', '目立たない端で少量を試し、色や艶の変化を見てから全体へ進む', '迷ったら塗り足さず、革の種類と今の状態を伝えて相談する'],
    LEATHER: ['表面のシボだけでなく、厚みと曲げたときの戻り方を確かめる', '同じ自然光で平らな状態と曲げた状態を並べて見る', '写真だけで決めず、触れる機会には手に当たる部分も確かめる'],
    CRAFT: ['完成品の形から、どの線を型紙で決めるかを逆にたどる', '裁断前の革、切り出した部品、組み立て途中を同じ向きで比べる', '使うときに開閉や持ちやすさに関わる箇所を見つける'],
    CUSTOMER: ['まず持ち歩く物と使う場面を一つ決める', '出し入れする順番で収納部や開口部を確認する', '購入前に寸法と使い方の疑問を整理する'],
    ANIMAL: ['動物名だけで触感を決めつけず部位と仕上げを確認する', '素材名を添えた革見本を同じ光で曲げて比べる', '自分が使う場所で必要な厚みやしなやかさを確かめる'],
    AGING: ['使い始めの写真と現在の状態を同じ条件で比べる', 'よく触れる角と光の当たる面を分けて見る', '変化を良し悪しと決めず使った時間の記録として楽しむ'],
    INDUSTRY: ['資料の発行元と日付を確認する', '出典の記述と工房で実際に確認できる範囲を分けて示す', '情報が今の選び方にどう関わるかを考える'],
    FASHION: ['手持ちの服や小物の色を一つ選ぶ', '同じ背景で革の色と大きさを替えて比べる', '流行の断定より自分の暮らしになじむ組み合わせを探す']
  };
  function points(p) { return details[p.topicGroup] || ['実物の素材・構造を確認する', '同じ光と角度で違いを比べる', '自分の使い方に合う条件を整理する']; }
  function caption(p) {
    const [a,b,c] = points(p), topic = OFFICIAL_TOPICS.find(t => t.id === p.parentId)?.title || p.theme;
    const product = p.skuIds.map(skuLabel).join('、');
    const material = p.skuIds.map(id => sku(id)?.material).filter(Boolean).join('、');
    const lead = p.topicGroup === 'CARE' ? `「${topic}」。手入れを始める前に、いま触ろうとしている革の素材と仕上げを知っていますか。` : p.topicGroup === 'LEATHER' ? `革を選ぶとき、色の次にどこを見ていますか。今日のテーマは「${topic}」です。` : p.topicGroup === 'CUSTOMER' ? `「${topic}」を考えるなら、使う人の一日から始めたいと思います。` : `完成した形だけでは見えにくい「${topic}」。手元の工程から見てみましょう。`;
    const example = product ? `今回は${product}${material ? `（登録素材：${material}）` : ''}を例にします。商品の名前だけで決めず、今日のテーマに関係する部分を実物で確かめます。` : '商品を主役にせず、革や道具の実物を使って確かめます。';
    const parts = p.topicGroup === 'CARE' ? [lead, `最初に${a}ことから。元タンナーとして素材を見てきた立場でも、仕上げが分からないままケア用品を決めることは勧めません。似た色の革でも表面の状態が違えば、同じ手順が合うとは限らないからです。`, `手を動かすなら、${b}順番を撮影で示します。量を増やす前に一度止まり、布に残るものや表面の変化を観察してください。${example}`, `今日からできるのは、すぐに塗ることではなく、${c}こと。水分や汚れが気になる場合も、強くこする前に素材と仕上げを確認しましょう。分からなければ状態が分かる写真を添えて相談してください。`, `作り手として、手入れは「たくさん塗るほど良い」とは考えません。必要な作業を見極めて、使い続けるための判断材料をお届けします。`] : p.topicGroup === 'LEATHER' ? [lead, `元タンナーとして素材を比べるとき、${a}ことを大切にします。表面だけの一枚の写真では、手にしたときの印象まで決められません。`, `今回は${b}比較をします。光の条件を揃えないと、色や艶の差を革そのものの違いと取り違えやすいからです。寄りの画と全体の画を行き来しながら見てください。`, example, `使う人にとって大事なのは、好みの表情だけでなく、持つとき・曲がるとき・しまうときの感触です。${c}ことを、選ぶ前の小さな確認にしてみてください。`, `作り手の目で見た特徴と、使う人が感じる良さは同じとは限りません。気になった革のどこに惹かれたのかを言葉にすると、自分に合う選び方が見えてきます。`] : [lead, `まず${a}ことを考えます。元タンナーとして素材を見る視点と、作り手として使う形を決める視点は、完成品の中でつながっています。`, example, `撮影では${b}流れを追います。商品を見せるためだけではなく、使うときに手がどこを通るか、持ち物がどう収まるかを確かめるためです。`, `購入前なら${c}ことができます。机の上の寸法だけでなく、いつ使うか、何を一緒に持つかまで考えてみてください。必要なら今使っているものと比べると、迷っている点を具体的にできます。`, `販売の案内だけで終わらず、使い始めてから困らないための見方もお伝えします。分からない仕様は実物と登録情報を確認してからお答えします。`];
    return parts.join('\n\n');
  }
  function stories(p) {
    const list = previousStories(p), [a,b,c] = points(p);
    if (!list[0].text && list[0].researchRequired) {
      const history=storyHistory(p.date), fallback=STORY_IDEAS.filter(k=>k.text && !k.researchRequired && topicGroup(k.number)!==p.topicGroup).sort((x,y)=>history.filter(s=>s.parentId===`official-${String(x.number).padStart(2,'0')}`).length-history.filter(s=>s.parentId===`official-${String(y.number).padStart(2,'0')}`).length)[0];
      if (fallback) Object.assign(list[0],{theme:fallback.theme,text:fallback.text,asset:fallback.asset,parentId:`official-${String(fallback.number).padStart(2,'0')}`,topicGroup:topicGroup(fallback.number),researchRequired:false,researchBrief:null});
    }
    if (list[1].reactionId === 'reaction-1' && demo.reactions.find(r => r.id === 'reaction-1')?.savedAt === '2026-09-10T09:00:00Z') {
      list[1] = {slot:2,purpose:'参加・対話',theme:'今日知りたい革のこと',text:'革を選ぶとき、いま一番確かめたいことは何ですか？ 使う場面と一緒に教えてください。',kind:'質問スタンプ',options:[],asset:'写真：素材名を確認した革見本',action:'質問スタンプに自由回答する',skuIds:[],participatory:true,materialMode:'過去素材使用可',storySpecVersion:4};
    }
    // A response is used only when it is actually present in stored reactions.
    if (list[1].participatory) {
      const options = list[1].options || [];
      list[1].kind = options.length >= 2 && options.length <= 4 ? (list[1].kind === 'クイズ' ? 'クイズ' : 'アンケート') : '質問スタンプ';
      list[1].action = list[1].kind === '質問スタンプ' ? '質問スタンプに自由回答する' : `${list[1].kind}の選択肢から選ぶ`;
    }
    const s3 = list[2], product=p.skuIds.map(skuLabel).join('・');
    const discovery = {
      CARE:['仕立ての端を見る','縫い目とコバを同じ光で近くから。ケア用品ではなく、毎日触れる場所の作りに注目してください。','写真：縫い目とコバを同じ距離で接写'],
      LEATHER:['革が形になる前後','平らな革と、裁断後の部品を並べます。表情の違いとは別に、どの部分が形を支えるのか見てください。','写真：裁断前の革と切り出した部品'],
      CRAFT:['工程で選ぶ革の位置','型紙を置く前の革一枚を広く見ます。道具ではなく、どの表情を部品に残すかに注目してください。','写真：素材名を添えた裁断前の革'],
      CUSTOMER:['使う形を支える仕立て',`${product||'今日の革小物'}の開口部と縫い目を近くから。収納量の話とは別に、手が触れる箇所の仕立てを見てください。`,'写真：開口部と縫い目を接写'],
      ANIMAL:['切り出す位置を見る','動物名や触感の話とは別に、型紙を革のどこに置くかを見ます。部品になる前の配置を確かめてください。','写真：型紙を置いた革全体'],
      AGING:['変化を支える縫製','革の色の変化から少し離れ、長く触れる角の縫い目と端の仕上げを見てください。','写真：角の縫い目とコバの接写'],
      INDUSTRY:['工房で確かめる実物','資料の数字とは別に、工房の革見本と道具を並べます。出典の情報と目の前の実物を混同せずに見てください。','写真：革見本と作業道具を真上から'],
      FASHION:['装いの前に見る仕立て','色合わせの話から少し離れ、革小物の持ち手や縫い目を近くで見ます。使う動作を支える箇所に注目してください。','写真：持ち手と縫い目の接写']
    }[p.topicGroup] || ['革と道具の別の表情','作業台に革と道具を並べます。今日の知識とは別に、形になる前の素材を見てください。','写真：素材名を添えた革と道具'];
    Object.assign(s3,{theme:discovery[0],text:discovery[1],asset:discovery[2],skuIds:p.topicGroup==='CUSTOMER'?[...p.skuIds]:[],action:'別の角度から素材と仕立てを発見する',overlapReason:p.topicGroup==='CUSTOMER'&&p.skuIds.length?'メインの使用場面とは別に仕立てを見る':''});
    if (storyKeywords(s3).some(word => storyKeywords(list[0]).includes(word))) {
      Object.assign(s3, {theme:'仕立ての別角度', text:`今日は${p.skuIds.length ? p.skuIds.map(skuLabel).join('、') + 'の' : '革小物の'}縫い目や端の仕上げを近くから。素材の知識とは別に、毎日触れる場所の作りを見てください。`, asset:'写真：縫い目と端の仕上げを同じ光で接写', skuIds:[...p.skuIds], action:'仕立てで気になる箇所を見つける'});
    }
    list[3].text = p.format === 'Reel' ? `今日のReelでは、${b}様子を手元の動きで確かめられます。${c}ために、どの場面を見ればよいかにも注目してください。` : `今日のFeedでは、${b}ところを写真と本文でたどれます。${c}ときに見返せる視点です。`;
    list[3].asset = p.format === 'Reel' ? '動画：今日のReelから比較が分かる一場面' : '写真：今日のFeedで違いが分かる一枚';
    return list;
  }
  function shots(p) {
    const [a,b,c] = points(p), product=p.skuIds.map(skuLabel).join('・') || ({CARE:'対象の革とケア道具',LEATHER:'種類の異なる革見本',CRAFT:'型紙と裁断前の革'}[p.topicGroup] || '革見本と製作道具'), media=p.format === 'Reel' ? '動画' : '写真';
    const cuts = [
      [`${product}を自然光の作業台に置く`, '真上から全体と素材名が分かる距離で撮る', `${a}出発点を示す`],
      [p.topicGroup === 'CARE' ? '革の端と使う予定のケア道具' : p.topicGroup === 'CRAFT' ? '型紙と裁断前後の革' : `${product}の手で触れる部分`, p.format === 'Reel' ? '手元を止めずに近づき、前後の状態を続けて撮る' : '同じ光で前後を並べ、差が読める寄りの写真を撮る', b],
      [p.topicGroup==='CARE'?'手を止めて表面を確認する場面':p.topicGroup==='LEATHER'?'革見本を手に取り曲げる場面':`${product}を使う場面`, p.format === 'Reel' ? '手に取る動きから元の位置へ戻すまでを横から撮る' : '手に持った状態と置いた状態を同じ高さから撮る', c]
    ];
    return cuts.map(([what,how,why], i) => ({id:`${p.id}-quality-${i}`,signature:`quality|${p.id}|${i}`,media,what:`CUT${i+1}｜${what}。${how}。伝えること：${why}。`,skuIds:[...p.skuIds],count:1}));
  }
  function qualityIssues(p) {
    const texts=p.stories.map(s=>s.text||'');
    const issues=[];
    if ([...p.caption].length<300) issues.push('本文が300文字未満');
    if (!p.takeaway) issues.push('顧客価値が未設定');
    if (/最近のアンケートでは|回答が多く|お客様から.+という声/.test(p.caption) && !p.voiceIds?.length) issues.push('根拠のない顧客反応');
    if (p.stories.length!==4 || p.stories.some(s=>!s.text)) issues.push('Story不足');
    if (p.stories[1]?.participatory && (p.stories[1].options||[]).length>=2 && p.stories[1].kind==='質問スタンプ') issues.push('選択肢と回答形式の不一致');
    if (p.shots.some(s=>s.media!==(p.format==='Reel'?'動画':'写真')||!s.what.includes('伝えること：'))) issues.push('撮影形式または意図が不足');
    for (const [i,j] of [[0,2],[2,3]]) if (texts[i]===texts[j] || (p.stories[i].asset===p.stories[j].asset && p.stories[i].action===p.stories[j].action)) issues.push(`Story${i+1}と${j+1}の重複`);
    if (p.sequence.some(s=>!p.shots.some(c=>c.id===s.shotId))) issues.push('構成と撮影カットの不一致');
    return issues;
  }
  createConcept = function (...args) {
    const p=previousConcept(...args);
    if (args[2]) return p;
    p.caption=caption(p);
    p.stories=stories(p);
    p.shots=shots(p);
    p.sequence=p.shots.map((shot,i)=>({order:i+1,visual:shot.what,words:i===0?p.theme:i===1?p.takeaway:p.cta||p.takeaway,shotId:shot.id}));
    for(const story of p.stories) if(story.shotId) story.shotId=p.shots[0].id;
    p.contentQualityVersion=1;
    const issues=qualityIssues(p);
    if (issues.length) throw Error('新規投稿の品質確認が必要です：'+issues.join('、'));
    return p;
  };
  specificShootDirections = function (p) { return p.contentQualityVersion===1 ? p.shots : previousShoot(p); };
})();
