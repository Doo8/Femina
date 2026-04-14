// femina Academy — онбординг (Ступень 1). Логика экранов, тест, postMessage для iframe
const AIRTABLE_TOKEN='patRbKl3Q5r93Mxfg.82123cd91d8963b767c5c1bd3f9ff7f2f0a6061e8e2cc5a2ab2906f8c4041d2e';
const AIRTABLE_BASE='appuIsTKUOxZCqmzX';
const AIRTABLE_TABLE='tblY7BZvvdFK7Oor2';
const miniResults={};
function saveMiniResult(qId,chosen,correct){miniResults[qId]={answer:chosen,correct:chosen===correct};}
function sendToSheets(){
  const name=localStorage.getItem('femina_name')||'—';
  const track=localStorage.getItem('femina_track')==='1'?'Новая в femina':'Участница femina';
  const score=localStorage.getItem('femina_test_score')||'—';
  const date=new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});
  const open=localStorage.getItem('femina_open_answer')||'—';
  const refData=JSON.parse(localStorage.getItem('femina_refls')||'{}');
  // Читаем количество попыток (инкремент происходит в showResult)
  const attempts=parseInt(localStorage.getItem('femina_test_attempts')||'1');
  const fields={'Имя и фамилия':name,'Трек':track,'Дата прохождения':date,
    'Мини-тест 1':miniResults['q1-fb']?(miniResults['q1-fb'].correct?'✓':'✗'):'—',
    'Мини-тест 2':miniResults['q2-fb']?(miniResults['q2-fb'].correct?'✓':'✗'):'—',
    'Мини-тест 3':miniResults['q3-fb']?(miniResults['q3-fb'].correct?'✓':'✗'):'—',
    'Итоговый тест':score,'Попыток теста':attempts,'Ошибки в тесте':testWrong.length?testWrong.join(', '):'нет','Открытый вопрос':open,
    'Рефлексия 1':refData[1]||'—','Рефлексия 2':refData[2]||'—',
    'Рефлексия 3':refData[3]||'—','Рефлексия 4':refData[4]||'—',
    'Рефлексия 5':refData[5]||'—'};
  fetch('https://api.airtable.com/v0/'+AIRTABLE_BASE+'/'+AIRTABLE_TABLE,{
    method:'POST',headers:{'Authorization':'Bearer '+AIRTABLE_TOKEN,'Content-Type':'application/json'},
    body:JSON.stringify({fields})
  }).catch(function(){});
}
function showFinish(){var m=document.getElementById('finish-msg');if(m)m.style.display='block';}
function restoreResult(){
  const n=localStorage.getItem('femina_name')||userName||'подруга';
  const score=localStorage.getItem('femina_test_score')||'—';
  const open=localStorage.getItem('femina_open_answer')||'—';
  const rc=document.getElementById('result-content');
  if(!rc||rc.innerHTML.trim()!=='')return;
  const passed=score.indexOf('/')>-1&&parseInt(score.split('/')[0])>=8;
  if(passed){
    rc.innerHTML='<div style="text-align:center;padding:24px 0;"><div class="display mb8">Отлично, '+n+'!</div><div class="card-teal" style="display:inline-block;padding:16px 32px;margin:16px 0;"><div class="eyebrow mb4" style="color:var(--sage);">Результат</div><div style="font-size:36px;font-weight:500;color:var(--sage);">'+score+'</div></div></div>'+
    '<div class="card-cream"><div class="eyebrow mb8">Ответ на открытый вопрос</div><div class="body-text" style="font-size:14px;font-style:italic;word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;">'+open+'</div></div>';
  }else{
    rc.innerHTML='<div style="text-align:center;padding:24px 0;"><div style="font-size:40px;margin-bottom:14px;">○</div><div class="display mb8">Результат: '+score+'</div><div class="body-text">Нужно 8 из 9. Перейди к тесту через прогресс-бар и попробуй снова.</div></div>';
  }
}


let userName='',userTrack=0,aptIdx=0,aptMaxSeen=0,maxReachedStage=-1;

// Stage order for navigation: -1=none, 0=onboarding, 1-6=stages, 7=test, 8=result, 9=meeting, 10=cert
const STAGE_ORDER=['s-onboarding','s-1','s-2','s-3','s-4','s-5','s-test','s-result'];
const STAGE_NUM={'s-onboarding':0,'s-1':1,'s-2':2,'s-3':3,'s-4':4,'s-5':5,'s-test':6,'s-result':7};

// Navigation targets for each dot index (0-6)
const DOT_TARGETS=['s-onboarding','s-1','s-2','s-3','s-4','s-5','s-test','s-result'];
const DOT_LABELS=['Ценности','femina — это…','Слушание','Фасилитация','Безопасность','Забота','Итоговый тест','Результат'];

function updateProgressBar(currentScreenId){
  // Find the prog-steps div on the current active screen
  const screen=document.getElementById(currentScreenId);
  if(!screen) return;
  const progSteps=screen.querySelector('.prog-steps');
  if(!progSteps) return;

  const curStageNum=STAGE_NUM[currentScreenId]??-1;

  // Rebuild dots
  let html='';
  for(let i=0;i<DOT_TARGETS.length;i++){
    const target=DOT_TARGETS[i];
    const targetNum=STAGE_NUM[target]??i;
    const tp=!!localStorage.getItem('femina_test_score');
  const isReached=targetNum<=maxReachedStage||(tp&&currentScreenId==='s-result');
    const isCur=target===currentScreenId || (curStageNum===-1 && i===0);

    let cls='p-step';
    if(isCur) cls+=' cur';
    else if(isReached) cls+=' done';

    const clickable=isReached && !isCur;
    const onclick=clickable?` onclick="go('${target}')" title="Вернуться к этому этапу" style="cursor:pointer;"`:' style="cursor:default;"';

    html+=`<div class="${cls}"${onclick}><div class="p-dot">${i}</div><div class="p-label">${DOT_LABELS[i]}</div></div>`;
  }
  progSteps.innerHTML=html;
}
const APT_TOTAL=12;
const refls={};
let testIdx=0,testScore=0,testAnswered=false;
const TQ=[
  {q:"Главная роль ведущей femina — это…",o:["Давать советы из личного опыта","Создавать безопасное пространство и следить за таймингом","Быть психологом для участниц","Решать проблемы участниц"],c:1,ok:"Верно! Ты здесь фасилитатор — создаёшь пространство, держишь тайминг.",no:"Правильный ответ: создавать безопасное пространство и следить за таймингом."},
  {q:"Ситуация на встрече: «Участница только открылась, начала плакать. Ты чувствуешь желание сказать ей — не плачь, всё будет хорошо». Твои действия?",o:["Говорю «не плачь, всё будет хорошо» — чтобы успокоить","Останавливаюсь, смотрю с теплом, говорю: «Мы с тобой. Дыши. Твои чувства важны»","Переключаю внимание на следующую участницу","Предлагаю записаться к психологу прямо сейчас"],c:1,ok:"Верно! Слёзы в femina — признак того, что процесс идёт. Присутствуй, не чини.",no:"Правильный ответ: Останавливаюсь, смотрю с теплом, говорю: «Мы с тобой. Дыши. Твои чувства важны»."},
  {q:"Ситуация на встрече: «Участница начала давать советы — Ой, а ты попробуй вот это…». Твои действия?",o:["Жду, пока сама остановится — неудобно перебивать","Говорю: «Девочки, напомню правило: мы не даём советов. [Имя], как эта история отозвалась ТЕБЕ?»","Соглашаюсь с её советом — вдруг он правда хороший","Завершаю встречу досрочно"],c:1,ok:"Верно! Мягко, но сразу — это твоя обязанность как ведущей.",no:"Правильный ответ: Говорю: «Девочки, напомню правило: мы не даём советов. [Имя], как эта история отозвалась ТЕБЕ?»"},
  {q:"Ситуация на встрече: «В группе 8 человек. Одна участница говорит уже 9 минут и не останавливается. Остальные начинают скучать». Твои действия?",o:["Жду — вдруг сама закончит","Говорю: «[Имя], очень ценно, но у нас осталось 30 секунд. Давай подведём итог одной фразой?»","Отключаю её микрофон без предупреждения","Даю ещё 5 минут — история важная"],c:1,ok:"Верно! Ты хранительница времени для всех — это твоя ответственность.",no:"Правильный ответ: Говорю: «[Имя], очень ценно, но у нас осталось 30 секунд. Давай подведём итог одной фразой?»"},
  {q:"Ситуация на встрече: «Участница рассказывает о тяжёлой истории (насилие), и ты сама поплыла — чувствуешь ком в горле». Твои действия?",o:["Делаю вид, что всё хорошо, и продолжаю как ни в чём не бывало","Прерываю встречу — слишком тяжело","Делаю вдох, ставлю ноги на пол, говорю: «Спасибо тебе за эту честность. Твоя история очень отозвалась мне, у меня даже ком в горле»","Прошу другую участницу взять слово, чтобы выиграть время"],c:2,ok:"Верно! Честность возвращает тебя в тело. Ты человек — и это расслабляет группу.",no:"Правильный ответ: Делаю вдох, ставлю ноги на пол, говорю: «Спасибо тебе за эту честность. Твоя история очень отозвалась мне, у меня даже ком в горле»."},
  {q:"Ситуация на встрече: «Во время вводной речи ты потеряла мысль и забыла, что говорить дальше». Твои действия?",o:["Замолкаю и жду, пока кто-нибудь заговорит","Говорю: «Девочки, я немного волнуюсь и потеряла мысль. Дайте мне секунду подсмотреть в шпаргалку»","Делаю вид, что так и было задумано","Передаю ведение другой участнице"],c:1,ok:"Верно! Это расслабляет группу — им тоже становится можно быть неидеальными.",no:"Правильный ответ: Говорю: «Девочки, я немного волнуюсь и потеряла мысль. Дайте мне секунду подсмотреть в шпаргалку»."},
  {q:"Ситуация на встрече: «Одна из участниц начала обесценивать историю другой: «Ну это вообще не проблема, у людей хуже бывает». Остальные молчат». Твои действия?",o:["Жду, пока сама успокоится — не хочу создавать конфликт","Соглашаюсь, чтобы разрядить обстановку","Предупреждаю один раз. Если продолжает — удаляю из встречи или предлагаю всем перейти на новую ссылку","Завершаю встречу и ничего не объясняю"],c:2,ok:"Верно! Безопасность круга — твоя ответственность. Одно предупреждение, затем действие.",no:"Правильный ответ: Предупредить один раз. Если продолжает — удалить из встречи или предложить всем перейти на новую ссылку."},
  {q:"Какое из этих утверждений отражает ценности сообщества femina?",o:["Мы даём советы, если нас попросили","Мы делимся личным опытом и не учим жить","Ведущая отвечает за эмоциональное состояние участниц","Встречи открыты для всех желающих без ограничений"],c:1,ok:"Верно! femina — пространство личного опыта, а не советов и экспертизы.",no:"Правильный ответ: Мы делимся личным опытом и не учим жить."},
  {q:"Ситуация на встрече: «Участница молчит после вопроса-крючка. Пауза уже 8 секунд. Остальные тоже молчат». Твои действия?",o:["Сразу перехожу к другой участнице","Повторяю вопрос громче и чётче","Досчитываю до 10, и если молчат — говорю «Я могу начать с себя» и рассказываю свою историю","Завершаю эту тему и предлагаю новый вопрос"],c:2,ok:"Верно! Тишина пугает только ведущую. Для участниц — это момент осмысления.",no:"Правильный ответ: Досчитываю до 10, и если молчат — говорю «Я могу начать с себя» и рассказываю свою историю."}
,
  {q:"Открытый вопрос: Опиши своими словами — что значит для тебя быть ведущей femina? Что ты берёшь с собой из этого курса?",o:null,c:null,ok:"",no:"",open:true},
];

function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if(id==='s-test')initTest();
  if(id==='s-result'&&localStorage.getItem('femina_test_score')){restoreResult();}

  // Track maximum reached stage
  const stageIdx=STAGE_ORDER.indexOf(id);
  if(stageIdx>maxReachedStage) maxReachedStage=stageIdx;

  // Update progress bar on current screen
  updateProgressBar(id);

  // Restore reflection button states when returning to a stage
  const stageMap={'s-1':1,'s-2':2,'s-3':3,'s-4':4,'s-5':5};
  if(stageMap[id]){
    const n=stageMap[id];
    const ta=document.getElementById('r'+n);
    if(ta&&refls[n]){ta.value=refls[n];checkR(n);}
  }
}

function selectTrack(n){
  userTrack=n;
  document.getElementById('t1').classList.toggle('sel',n===1);
  document.getElementById('t2').classList.toggle('sel',n===2);
  checkStart();
}

function checkStart(){
  const v=document.getElementById('name-input').value.trim();
  const hasTwoWords=v.length>0&&v.split(/\s+/).filter(w=>w.length>0).length>=2;
  document.getElementById('start-btn').disabled=!(hasTwoWords&&userTrack>0);
  document.getElementById('name-hint').style.display=v.length>0&&!hasTwoWords?'block':'none';
}

function togglePracticeVideo(){
  var el=document.getElementById('practice-video-embed');
  var btn=document.getElementById('practice-video-btn');
  if(el.style.display==='none'){el.style.display='block';btn.textContent='✕ Закрыть видео';}
  else{el.style.display='none';btn.textContent='▶ Узнать о практическом блоке';}
}

function playVideo(id){
  var poster=document.getElementById(id+'-poster');
  if(poster) poster.style.display='none';
}

function toggleWelcomeVideo(){
  var el=document.getElementById('welcome-video-embed');
  var btn=document.getElementById('welcome-video-btn');
  if(el.style.display==='none'){el.style.display='block';btn.textContent='✕ Закрыть видео';}
  else{el.style.display='none';btn.innerHTML='▶ Посмотреть приветственное видео';btn.style.background='#C4694A';}
}

function startCourse(){
  userName=document.getElementById('name-input').value.trim();
  if(!userName||!userTrack)return;
  localStorage.setItem('femina_name',userName);
  localStorage.setItem('femina_track',String(userTrack));
  go('s-onboarding');
}

function checkR(n){
  const v=document.getElementById('r'+n).value.trim();
  refls[n]=v;
  const reflOk=v.length>=10;
  // For etap 3 (n=3): also require all apteyka cards seen
  const ok = reflOk;
  const b=document.getElementById('btn-'+n);
  const h=document.getElementById('r'+n+'-hint');
  if(b) b.disabled=!ok;
  if(h) h.style.display=reflOk?'none':'block';
  localStorage.setItem('femina_refls',JSON.stringify(refls));
}

// Пояснения для мини-квизов при неправильном ответе
const MINIQ_EXPLAIN={
  'q1-fb':{
    correct:'Создавать безопасное пространство и следить за таймингом',
    explain:'Ведущая femina — фасилитатор, а не эксперт. Её задача не лечить и не учить, а держать безопасное пространство и следить, чтобы у каждой участницы было время высказаться. Вернись к блоку «Кто такая ведущая femina» и перечитай раздел про суперсилу.',
    screen:'s-1'
  },
  'q2-fb':{
    correct:'Мягко останавливаю: «Напомню правило — мы не даём советов. [Имя], как эта история отозвалась тебе?»',
    explain:'Ведущая обязана сразу и мягко остановить советы — это её прямая ответственность. Ждать или соглашаться разрушает безопасность круга. Правильно: назвать правило и сразу перевести фокус на чувства через «Я». Вернись к блоку «Что надо делать» на Этапе 2.',
    screen:'s-2'
  },
  'q3-fb':{
    correct:'Аккуратно напомнить про тайминг и предложить завершить мысль одним-двумя предложениями',
    explain:'Ты хранительница времени для всех участниц. Помахать рукой — слишком мягко и легко игнорировать. Передать слово другой — значит оборвать без объяснения. Правильно: назвать имя, мягко остановить и попросить сформулировать главную мысль. Вернись к ситуации 9 в аптечке.',
    screen:'s-4'
  }
};

function miniq(optId,chosen,correct,fbId,nextId){
  saveMiniResult(fbId,chosen,correct);
  const opts=document.querySelectorAll('#'+optId+' .q-opt');
  opts.forEach(o=>{o.classList.add('answered');o.onclick=null;});
  opts[chosen].classList.add(chosen===correct?'correct':'wrong');
  if(chosen!==correct)opts[correct].classList.add('correct');
  const fb=document.getElementById(fbId);
  const nb=document.getElementById(nextId);
  if(chosen===correct){
    fb.className='q-fb show ok';
    fb.textContent='✓ Верно!';
    if(nb)nb.disabled=false;
  } else {
    fb.className='q-fb show no';
    const ex=MINIQ_EXPLAIN[fbId];
    const screenLink=ex?` <button onclick="go('${ex.screen}')" style="background:none;border:none;color:var(--terra);font-family:'Rubik',sans-serif;font-size:13px;font-weight:500;cursor:pointer;text-decoration:underline;padding:0;">Вернуться и изучить →</button>`:'';
    fb.innerHTML=`<strong>Не совсем.</strong> Правильный ответ: <em>${ex?ex.correct:''}</em>.<br><br>${ex?ex.explain:''}${screenLink}`;
    if(nb)nb.disabled=false;
  }
}

function aptPrev(){
  document.getElementById('apt-'+aptIdx).classList.remove('active');
  aptIdx=(aptIdx-1+APT_TOTAL)%APT_TOTAL;
  document.getElementById('apt-'+aptIdx).classList.add('active');
  document.getElementById('apt-count').textContent='Ситуация '+(aptIdx+1)+' из '+APT_TOTAL;
}
function aptNext(){
  document.getElementById('apt-'+aptIdx).classList.remove('active');
  aptIdx=(aptIdx+1)%APT_TOTAL;
  document.getElementById('apt-'+aptIdx).classList.add('active');
  document.getElementById('apt-count').textContent='Ситуация '+(aptIdx+1)+' из '+APT_TOTAL;
  if(aptIdx>aptMaxSeen) aptMaxSeen=aptIdx;
  if(aptMaxSeen===APT_TOTAL-1){
    const hint=document.getElementById('apt-seen-hint');
    if(hint) hint.style.display='none';
    const b4=document.getElementById('btn-4');
    if(b4) b4.disabled=false;
  }
}

function chk(el){
  const box=el.querySelector('.chk-box');
  const on=box.dataset.on==='1';
  if(!on){box.dataset.on='1';box.style.background='var(--sage)';box.style.borderColor='var(--sage)';box.innerHTML='<svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
  else{box.dataset.on='0';box.style.background='';box.style.borderColor='var(--sand)';box.innerHTML='';}
}

function cpText(btn,text){
  if(navigator.clipboard)navigator.clipboard.writeText(text).catch(()=>{});
  const o=btn.textContent;btn.textContent='✓ Скопировано';
  setTimeout(()=>{btn.textContent=o;},1800);
}

function showPath(){
  const t=parseInt(localStorage.getItem('femina_track'))||userTrack;
  document.getElementById('track-path-1').style.display=t===1?'block':'none';
  document.getElementById('track-path-2').style.display=t===2?'block':'none';
}

let openAnswer='',testWrong=[]; // stores open question answer

function startTest(){
  document.getElementById('test-intro').style.display='none';
  document.getElementById('test-main').style.display='';
  initTest();
}

function initTest(){
  testIdx=0;testScore=0;testAnswered=false;testWrong=[];openAnswer='';
  // Build dots dynamically
  const dots=document.getElementById('test-dots');
  dots.innerHTML=TQ.map((_,i)=>'<div class="t-dot'+(i===0?' cur':'')+'"></div>').join('');
  renderTQ();
}

function renderTQ(){
  const q=TQ[testIdx];
  document.querySelectorAll('#test-dots .t-dot').forEach((d,i)=>{d.className='t-dot'+(i<testIdx?' done':i===testIdx?' cur':'');});
  const closedCount=TQ.filter(x=>!x.open).length;
  const nb=document.getElementById('test-next');
  nb.textContent=testIdx<TQ.length-1?'Следующий вопрос →':'Посмотреть результат →';
  const fb=document.getElementById('test-fb');fb.className='q-fb';fb.textContent='';
  testAnswered=false;

  if(q.open){
    // Open question
    nb.disabled=false; // always enabled after typing
    document.getElementById('test-q-wrap').innerHTML=
      '<div class="eyebrow mb8" style="margin-top:4px;">Вопрос '+(testIdx+1)+' из '+TQ.length+' · Открытый</div>'+
      '<div class="quiz-q">'+q.q+'</div>'+
      '<textarea id="open-answer" placeholder="Напиши своими словами…" style="width:100%;min-height:120px;border:1.5px solid var(--beige);border-radius:8px;background:var(--white);color:var(--text-dk);font-family:\'Rubik\',sans-serif;font-size:14px;font-weight:300;line-height:1.6;padding:11px 13px;resize:vertical;outline:none;margin-top:4px;" oninput="openAnswer=this.value;document.getElementById(\'test-next\').disabled=this.value.trim().length<10;"></textarea>'+
      '<div style="font-size:12px;color:var(--text-lt);margin-top:4px;">Минимум 10 символов</div>';
    nb.disabled=true;
    testAnswered=true; // open question always "answered" once typed
  } else {
    nb.disabled=true;
    document.getElementById('test-q-wrap').innerHTML=
      '<div class="eyebrow mb8" style="margin-top:4px;">Вопрос '+(testIdx+1)+' из '+TQ.length+'</div>'+
      '<div class="quiz-q">'+q.q+'</div>'+
      '<div id="final-opts">'+q.o.map((o,i)=>'<div class="q-opt" onclick="answerFinal('+i+')">'+o+'</div>').join('')+'</div>';
  }
}

function answerFinal(chosen){
  if(testAnswered)return;testAnswered=true;
  const q=TQ[testIdx];
  const opts=document.querySelectorAll('#final-opts .q-opt');
  opts.forEach(o=>{o.classList.add('answered');o.onclick=null;});
  opts[chosen].classList.add(chosen===q.c?'correct':'wrong');
  if(chosen!==q.c)opts[q.c].classList.add('correct');
  if(chosen===q.c){testScore++;}else{testWrong.push(testIdx+1);}
  const fb=document.getElementById('test-fb');
  fb.className='q-fb show '+(chosen===q.c?'ok':'no');
  fb.textContent=chosen===q.c?'✓ '+q.ok:q.no;
  document.getElementById('test-next').disabled=false;
}

function testNext(){
  if(!testAnswered)return;
  if(testIdx<TQ.length-1){
    testIdx++;renderTQ();
  }else{
    // Последний вопрос пройден — засчитываем одну попытку
    const _att=(parseInt(localStorage.getItem('femina_test_attempts')||'0')+1);
    localStorage.setItem('femina_test_attempts',_att);
    showResult();
  }
}

function showResult(){
  go('s-result');
  updateProgressBar('s-test');
  const closedTotal=TQ.filter(x=>!x.open).length;
  const pass=testScore>=8;
  const n=localStorage.getItem('femina_name')||userName||'подруга';
  const rc=document.getElementById('result-content');
  // Save open answer to localStorage for curator report
  localStorage.setItem('femina_open_answer', openAnswer);
  localStorage.setItem('femina_test_score', testScore+'/'+closedTotal);
  if(pass)sendToSheets();
  localStorage.setItem('femina_completed', new Date().toLocaleDateString('ru-RU'));

  if(pass){
    rc.innerHTML='<div style="text-align:center;padding:8px 0 24px;"><div class="display mb8">Отлично, '+n+'!</div><div class="body-text mb20">Поздравляем с прохождением теоретической части! Ты ответила верно на '+testScore+' из '+closedTotal+' вопросов.</div><div class="card-teal" style="display:inline-block;padding:16px 32px;text-align:center;"><div class="eyebrow mb4" style="color:var(--sage);">Результат теста</div><div style="font-family:\'Rubik\',sans-serif;font-size:40px;font-weight:500;color:var(--sage);">'+testScore+'/'+closedTotal+'</div></div></div>'+
    '<div class="card-cream" style="margin-top:16px;"><div class="eyebrow mb8">Твой ответ на открытый вопрос</div><div class="body-text" style="font-size:14px;font-style:italic;word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;">'+openAnswer+'</div></div>'+
    '<div class="nav-row center"><button class="btn btn-ghost" onclick="go(\'s-test\')">← К тесту</button><button class="btn btn-primary" onclick="go(\'s-next\')">Перейти на следующий этап →</button></div>';
  }else{
    const need=8;
    rc.innerHTML='<div style="text-align:center;padding:8px 0 20px;"><div style="font-size:40px;margin-bottom:14px;">○</div><div class="display mb8">Почти готова!</div><div class="body-text mb16">Ты ответила верно на '+testScore+' из '+closedTotal+'. Нужно '+need+'. Попробуй снова.</div><div class="card-coral" style="display:inline-block;padding:16px 32px;text-align:center;"><div class="eyebrow mb4" style="color:var(--terra);">Результат</div><div style="font-family:\'Rubik\',sans-serif;font-size:40px;font-weight:500;color:var(--terra);">'+testScore+'/'+closedTotal+'</div></div></div>'+
    '<div class="nav-row center"><button class="btn btn-ghost" onclick="go(\'s-5\')">← К этапу 5</button><button class="btn btn-primary" onclick="go(\'s-test\')">Пройти тест заново</button></div>';
  }
}

// ── CURATOR REPORT ────────────────────────────────────────

// ── CURATOR CODE ──────────────────────────────────────────
// Replace demo codes with real curator codes before publishing






function startVideo(id){
  var poster = document.getElementById(id+'-poster');
  var iframe = document.getElementById(id+'-iframe');
  if(poster) poster.style.display='none';
  if(iframe){
    iframe.src = iframe.getAttribute('data-src');
    iframe.style.display='block';
  }
}
window.addEventListener('DOMContentLoaded',()=>{
  // Restore saved state
  const sn=localStorage.getItem('femina_name');
  const st=localStorage.getItem('femina_track');
  if(sn){document.getElementById('name-input').value=sn;userName=sn;}
  if(st)selectTrack(parseInt(st));

  // Bind name input
  document.getElementById('name-input').addEventListener('input', checkStart);

  // Bind reflection textareas
  for(let n=1;n<=5;n++){
    (function(num){
      const el=document.getElementById('r'+num);
      if(el){
        el.addEventListener('input',function(){checkR(num);});
        el.addEventListener('keyup',function(){checkR(num);});
      }
    })(n);
  }

  // Bind curator code input — Enter submits
  const codeEl=document.getElementById('curator-code');
  if(codeEl){
    codeEl.addEventListener('input',checkCode);
    codeEl.addEventListener('keyup',checkCode);
    codeEl.addEventListener('keydown',function(e){
      if(e.key==='Enter'&&!document.getElementById('code-btn').disabled)submitCode();
    });
  }

  checkStart();
});
function reportHeight(){
  var active = document.querySelector('.screen.active');
  if(!active) return;
  // Временно показываем, меряем, прячем обратно не нужно —
  // active уже display:block, просто берём его реальную высоту
  var h = active.getBoundingClientRect().height || active.offsetHeight;
  // Если высота меньше viewport — берём viewport (чтобы не прыгало)
  h = Math.max(h, 500);
  window.parent.postMessage({type:'femina-height', height: h}, '*');
}

// Перехватываем go() — каждый переход между экранами
var _origGo = window.go;
window.go = function(id){
  _origGo(id);
  // Частые замеры сразу после перехода
  var times = [0, 50, 150, 300, 500, 800, 1200, 2000];
  times.forEach(function(t){
    setTimeout(reportHeight, t);
  });
};

// Следим за ростом textarea и другими изменениями
if(window.MutationObserver){
  var obs = new MutationObserver(reportHeight);
  window.addEventListener('DOMContentLoaded', function(){
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style','class']
    });
  });
}

window.addEventListener('load', reportHeight);
window.addEventListener('resize', reportHeight);
