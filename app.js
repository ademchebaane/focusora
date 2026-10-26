/* Focusora — offline-first demo + optional Supabase cloud sync. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const STORAGE_KEY = 'focusora_demo_v1';
  const TIMER_KEY = 'focusora_timer_v1';
  const THEME_KEY = 'focusora_theme_v1';
  const CONFIG_URL_KEY = 'focusora_supabase_url';
  const CONFIG_ANON_KEY = 'focusora_supabase_anon';
  const SUBJECTS = ['Mathematics', 'Physics', 'Computer science', 'Chemistry', 'Languages', 'Biology', 'History', 'Reading', 'Homework', 'Other'];
  const THEMES = [
    {id:'warm',name:'Warm lilac',colors:['#f7f4ef','#7654a8','#e9856e']},
    {id:'sage',name:'Sage garden',colors:['#f2f5ed','#657c53','#d88c72']},
    {id:'peach',name:'Peach studio',colors:['#fbf2ed','#b76d59','#e9856e']},
    {id:'night',name:'Night focus',colors:['#242229','#c3a3ed','#f19a83']}
  ];
  const starterDemo = () => ({
    profile:{id:'local-user',username:'you',display_name:'Your profile',avatar_color:'purple'},
    groups:[
      {id:'demo-group-1',name:'Bac 2028 crew',description:'Small steps, big Bac energy.',icon:'✦',color:'purple',invite_code:'BAC28X',owner_id:'local-user',memberNames:['You','Meriem','Yassine','Ahmed'],doneMinutes:3780,targetMinutes:6000,created_at:new Date(Date.now()-5*86400000).toISOString()},
      {id:'demo-group-2',name:'Math sprint',description:'A little maths every day.',icon:'◈',color:'coral',invite_code:'MATH7K',owner_id:'local-user',memberNames:['You','Meriem','Ali'],doneMinutes:1340,targetMinutes:2400,created_at:new Date(Date.now()-3*86400000).toISOString()}
    ],
    groupGoals:[
      {id:'demo-gg-1',group_id:'demo-group-1',title:'100-hour team challenge',target_minutes:6000,deadline:null,created_at:new Date(Date.now()-5*86400000).toISOString()},
      {id:'demo-gg-2',group_id:'demo-group-2',title:'40-hour math challenge',target_minutes:2400,deadline:null,created_at:new Date(Date.now()-3*86400000).toISOString()}
    ],
    friends:[
      {id:'demo-f-1',username:'meriem.study',display_name:'Meriem',avatar_color:'coral',status:'accepted',todayMinutes:82,weekMinutes:650,isStudying:true,subject:'Mathematics'},
      {id:'demo-f-2',username:'yassine.codes',display_name:'Yassine',avatar_color:'green',status:'accepted',todayMinutes:55,weekMinutes:570,isStudying:true,subject:'Computer science'},
      {id:'demo-f-3',username:'ahmed.focus',display_name:'Ahmed',avatar_color:'gold',status:'accepted',todayMinutes:0,weekMinutes:490,isStudying:false},
      {id:'demo-f-4',username:'ali.learns',display_name:'Ali',avatar_color:'purple',status:'accepted',todayMinutes:24,weekMinutes:355,isStudying:false}
    ],
    requests:[], personalGoals:[
      {id:'demo-pg-1',title:'Revise functions',target_minutes:600,doneMinutes:240,due_date:null,created_at:new Date(Date.now()-4*86400000).toISOString()},
      {id:'demo-pg-2',title:'Finish physics chapter',target_minutes:300,doneMinutes:110,due_date:null,created_at:new Date(Date.now()-2*86400000).toISOString()}
    ],
    tasks:[
      {id:'demo-task-1',title:'Solve 5 limit exercises',done:false,due_date:null},
      {id:'demo-task-2',title:'Review the physics summary',done:true,due_date:null},
      {id:'demo-task-3',title:'Practise one algorithm problem',done:false,due_date:null}
    ],
    sessions:[
      {id:'demo-s1',user_id:'local-user',group_id:'demo-group-1',personal_goal_id:null,subject:'Mathematics',started_at:new Date(Date.now()-86400000).toISOString(),ended_at:new Date(Date.now()-86040000).toISOString(),duration_minutes:60},
      {id:'demo-s2',user_id:'local-user',group_id:null,personal_goal_id:'demo-pg-1',subject:'Physics',started_at:new Date(Date.now()-2*86400000).toISOString(),ended_at:new Date(Date.now()-2*86400000+2700000).toISOString(),duration_minutes:45},
      {id:'demo-s3',user_id:'local-user',group_id:'demo-group-2',personal_goal_id:null,subject:'Mathematics',started_at:new Date(Date.now()-3*86400000).toISOString(),ended_at:new Date(Date.now()-3*86400000+5400000).toISOString(),duration_minutes:90}
    ]
  });
  function readDemo() {
    try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (parsed && parsed.groups && parsed.sessions) return parsed; } catch (_) {}
    const fresh = starterDemo(); localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); return fresh;
  }
  const state = {
    view:'home', demo:readDemo(), online:false, supabase:null, user:null, profile:null,
    groups:[], groupGoals:[], personalGoals:[], friends:[], requests:[], sessions:[], tasks:[], groupMembers:{}, profilesById:{},
    timer:readTimer(), focusMode:'pomodoro', focusSubject:'Mathematics', focusGroupId:'', focusGoalId:'', authMode:'signin', theme:localStorage.getItem(THEME_KEY)||'warm', reduceMotion:false, soundOn:false, autoBreak:false,
    loading:false, lastError:'', toastTimeout:null, realtimeChannel:null
  };
  function readTimer() { try { return JSON.parse(localStorage.getItem(TIMER_KEY)||'null') || {running:false,startedAt:null,elapsedSeconds:0,targetSeconds:1500,mode:'pomodoro',subject:'Mathematics',groupId:'',remoteId:null}; } catch (_) { return {running:false,startedAt:null,elapsedSeconds:0,targetSeconds:1500,mode:'pomodoro',subject:'Mathematics',groupId:'',remoteId:null}; } }
  function persistTimer() { localStorage.setItem(TIMER_KEY, JSON.stringify(state.timer)); }
  function persistDemo() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.demo)); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function initials(value) { return String(value || '?').trim().split(/[\s._-]+/).filter(Boolean).slice(0,2).map(x=>x[0].toUpperCase()).join('') || '?'; }
  function compactHours(minutes) { const h=Math.floor(Math.max(0,minutes||0)/60), m=Math.max(0,minutes||0)%60; return h ? `${h}h${m ? ` ${m}m`:''}` : `${m}m`; }
  function fullHours(minutes) { const h=Math.floor(Math.max(0,minutes||0)/60), m=Math.max(0,minutes||0)%60; return `${h}h ${String(m).padStart(2,'0')}m`; }
  function percent(done,target) { return Math.max(0,Math.min(100,target>0?Math.round(done/target*100):0)); }
  function escAttr(value) { return escapeHtml(value); }
  function fmtDate(value) { if(!value) return 'No deadline'; const d=new Date(value); if(Number.isNaN(d.getTime())) return 'No deadline'; return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }
  function todayKey(date=new Date()) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
  function isToday(date) { return !!date && todayKey(new Date(date))===todayKey(); }
  function isThisWeek(date) { if(!date) return false; const d=new Date(date), now=new Date(); const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate() - ((now.getDay()+6)%7)); return d>=monday && d<=now; }
  function localMode() { return !(state.supabase && state.user && state.online); }
  function allGroups() { return localMode()?state.demo.groups:state.groups; }
  function allGroupGoals() { return localMode()?state.demo.groupGoals:state.groupGoals; }
  function allPersonalGoals() { return localMode()?state.demo.personalGoals:state.personalGoals; }
  function allFriends() { return localMode()?state.demo.friends:state.friends; }
  function allRequests() { return localMode()?state.demo.requests:state.requests; }
  function allSessions() { return localMode()?state.demo.sessions:state.sessions; }
  function allTasks() { return localMode()?state.demo.tasks:state.tasks; }
  function currentProfile() { return localMode()?state.demo.profile:(state.profile||{display_name:state.user?.email?.split('@')[0]||'Student',username:'student'}); }
  function getGroupGoal(groupId) { const goals=allGroupGoals().filter(g=>g.group_id===groupId).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)); return goals[0]||null; }
  function groupGoalTarget(group) { const goal=getGroupGoal(group.id); return goal?.target_minutes ?? group.targetMinutes ?? 6000; }
  function groupProgress(group) {
    if(localMode()) return Math.max(0,group.doneMinutes||0);
    const goal=getGroupGoal(group.id), since=goal?.created_at ? new Date(goal.created_at).getTime() : 0;
    return allSessions().filter(s=>s.group_id===group.id && s.ended_at && new Date(s.started_at).getTime()>=since).reduce((n,s)=>n+(s.duration_minutes||0),0);
  }
  function personalProgress(goal) {
    if(localMode()) return Math.max(0,goal.doneMinutes||0);
    return allSessions().filter(s=>!s.group_id && s.personal_goal_id===goal.id && s.ended_at).reduce((n,s)=>n+(s.duration_minutes||0),0);
  }
  function completedSessions() { return allSessions().filter(s=>s.ended_at); }
  function weekMinutes() { return completedSessions().filter(s=>isThisWeek(s.started_at)).reduce((n,s)=>n+(s.duration_minutes||0),0); }
  function todayMinutes() { return completedSessions().filter(s=>isToday(s.started_at)).reduce((n,s)=>n+(s.duration_minutes||0),0); }
  function streakDays() {
    const dates=new Set(completedSessions().map(s=>todayKey(new Date(s.started_at)))); let count=0, d=new Date(); d.setHours(0,0,0,0);
    if(!dates.has(todayKey(d))) d.setDate(d.getDate()-1);
    while(dates.has(todayKey(d))&&count<365){count++;d.setDate(d.getDate()-1);} return count;
  }
  function groupMemberNames(group) {
    if(localMode()) return group.memberNames || ['You'];
    const members=state.groupMembers[group.id]||[];
    return members.map(m=>state.profilesById[m.user_id]?.display_name || state.profilesById[m.user_id]?.username || (m.user_id===state.user?.id?'You':'Student'));
  }
  function avatar(name,color='purple',small=false) { return `<span class="avatar ${escapeHtml(color||'purple')} ${small?'small':''}" aria-hidden="true">${escapeHtml(initials(name))}</span>`; }
  function groupIcon(group) { const color=group.color||(['purple','coral','green','gold'][Math.abs(String(group.id||'x').length)%4]); return `<div class="group-avatar ${escapeHtml(color)}">${escapeHtml(group.icon||'✦')}</div>`; }
  function modeName(mode) { return ({pomodoro:'Pomodoro',deep:'Deep work',long:'Long focus',stopwatch:'Open timer',break:'Break time',custom:'Custom timer'})[mode]||'Focus'; }
  function timerElapsed() { const t=state.timer; return Math.max(0,Math.floor((t.elapsedSeconds||0)+(t.running&&t.startedAt?(Date.now()-t.startedAt)/1000:0))); }
  function timerRemaining() { const t=state.timer; return t.mode==='stopwatch'?timerElapsed():Math.max(0,(t.targetSeconds||1500)-timerElapsed()); }
  function clock(seconds) { seconds=Math.max(0,Math.floor(seconds||0)); return `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor((seconds%3600)/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
  function smallClock(seconds) { seconds=Math.max(0,Math.floor(seconds||0)); return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
  function hapticToast(message) { const box=$('#toast'); if(!box)return; box.textContent=message; box.classList.add('show'); clearTimeout(state.toastTimeout); state.toastTimeout=setTimeout(()=>box.classList.remove('show'),2700); }
  function applyTheme() { document.documentElement.dataset.theme = state.theme==='warm'?'':state.theme; if(state.theme==='warm') delete document.documentElement.dataset.theme; localStorage.setItem(THEME_KEY,state.theme); document.body.classList.toggle('reduce-motion',state.reduceMotion); }
  function go(view) { state.view=view; render(); window.scrollTo({top:0,behavior:state.reduceMotion?'auto':'smooth'}); }
  function renderShell() {
    $$('.nav-item[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===state.view));
    $$('.mobile-nav[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===state.view));
    const crumb=$('#breadcrumb'); if(crumb) crumb.innerHTML=`<span>YOUR SPACE</span><b>/</b><strong>${escapeHtml(({home:'Overview',focus:'Focus room',groups:'Study groups',friends:'Friends',goals:'Goals & tasks',insights:'Insights',settings:'Settings & cloud'})[state.view]||'Overview')}</strong>`;
    const profile=currentProfile(), name=profile.display_name||profile.username||'Student';
    $('#sidebarProfile').innerHTML=`${avatar(name,profile.avatar_color||'purple')}<div class="sidebar-user"><strong>${escapeHtml(name)}</strong><small>${localMode()?'Local profile':escapeHtml(profile.username?'@'+profile.username:'Cloud account')}</small></div>`;
    $('#topProfile').textContent=initials(name);
    const chip=$('#modeChip'); chip.classList.toggle('online',!localMode()); chip.innerHTML=`<i></i><span>${localMode()?'Local demo': 'Cloud synced'}</span>`;
  }
  function render() { applyTheme(); renderShell(); const node=$('#mainView'); if(!node)return; const views={home:renderHome,focus:renderFocus,groups:renderGroups,friends:renderFriends,goals:renderGoals,insights:renderInsights,settings:renderSettings}; node.innerHTML=(views[state.view]||renderHome)(); }
  function heading(eyebrow,title,desc,buttons='') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></div>${buttons?`<div class="heading-actions">${buttons}</div>`:''}</div>`; }
  function statCard(icon,label,value,caption,color='') { return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon" ${color?`style="background:${color}"`:''}>${icon}</span></div><div class="stat-value">${value}</div><div class="stat-caption">${caption}</div></article>`; }
  function renderGroupProgress(group, compact=false) {
    const done=groupProgress(group), target=groupGoalTarget(group), pct=percent(done,target), goal=getGroupGoal(group.id);
    const names=groupMemberNames(group), avs=names.slice(0,4).map((n,i)=>avatar(n,['purple','coral','green','gold'][i%4],true)).join('');
    return `<div class="${compact?'group-row':'group-card'}">${compact?`${groupIcon(group)}<div class="row-main"><strong>${escapeHtml(group.name)}</strong><small>${names.length} members · ${compactHours(done)} collected</small><div class="progress-line"><span>${escapeHtml(goal?.title||'Shared group goal')}</span><b>${pct}%</b></div><div class="progress"><span style="width:${pct}%"></span></div></div><button class="text-link" data-action="open-group" data-id="${escAttr(group.id)}">View</button>`:`<div class="group-card-top"><div>${groupIcon(group)}</div><span class="chip purple">PRIVATE GROUP</span></div><h3>${escapeHtml(group.name)}</h3><p>${escapeHtml(group.description||'A small team with big goals.')}</p><div class="group-meta"><span class="avatar-stack">${avs}</span><span>${names.length} members</span><span>·</span><span>${compactHours(done)} studied</span></div><div class="progress-line"><span>${escapeHtml(goal?.title||'Team study goal')}</span><b>${pct}%</b></div><div class="progress"><span style="width:${pct}%"></span></div><div class="progress-line"><span>${compactHours(done)} completed</span><span>${compactHours(target)} goal</span></div><div class="invite-strip"><span>Invite code</span><code>${escapeHtml(group.invite_code||'—')}</code><button class="text-link" data-action="show-invite" data-id="${escAttr(group.id)}">Share ↗</button></div><div class="group-card-actions"><button class="btn btn-primary btn-small" data-action="study-with-group" data-id="${escAttr(group.id)}">◷ Study with group</button><button class="btn btn-plain btn-small" data-action="open-group" data-id="${escAttr(group.id)}">Group details</button></div>`}</div>`;
  }
  function renderHome() {
    const groups=allGroups(), goals=allPersonalGoals(), tasks=allTasks(), friends=allFriends().filter(f=>!f.status||f.status==='accepted'), mins=weekMinutes(), today=todayMinutes(), openTasks=tasks.filter(t=>!t.done);
    const nextGoal=goals[0], done=nextGoal?personalProgress(nextGoal):0, timerActive=state.timer.running||timerElapsed()>0;
    const mainGoal=groups[0];
    return `${heading(greeting(),'Your focus, your pace ✨','One good session at a time. Let’s make today count.',`<button class="btn btn-primary" data-nav="focus">◷ Start focusing</button>`)}
      <section class="grid overview-stats">${statCard('◷','This week',compactHours(mins),`<span class="up">${completedSessions().filter(s=>isThisWeek(s.started_at)).length} sessions</span> logged`)}${statCard('✳','Today',compactHours(today),'Every minute counts','var(--coral-soft)')}${statCard('♧','Study teams',groups.length,groups.length?'Growing together':'Create your first team','var(--lime-soft)')}${statCard('♨','Current streak',`${streakDays()} ${streakDays()===1?'day':'days'}`,'Keep your rhythm','var(--accent-soft)')}</section>
      <section class="grid home-layout"><div class="grid" style="align-content:start;gap:17px"><article class="panel hero-focus"><div class="hero-focus-content"><p class="eyebrow">A LITTLE GOES A LONG WAY</p><h2>${timerActive?'You’re on a roll.':'Make room for focus.'}</h2><p>${timerActive?`Your ${escapeHtml(state.timer.subject||'study')} session is ${state.timer.running?'in progress':'paused'}. Keep going at your own pace.`:'Choose one subject, set a timer, and let the small wins add up.'}</p><button class="btn btn-dark" data-nav="focus">${timerActive?'Return to your timer':'Start a focus session'} <span>↗</span></button></div><div class="focus-illustration" aria-hidden="true"><span class="star s1">✦</span><span class="star s2">✧</span><div class="plant-pot"><i class="leaf"></i><i class="leaf l2"></i><i class="leaf l3"></i></div></div></article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your study circles</h2><p class="panel-sub">Small circles, serious progress.</p></div><button class="text-link" data-nav="groups">See all ↗</button></div>${groups.length?`<div class="group-list">${groups.slice(0,2).map(g=>renderGroupProgress(g,true)).join('')}</div>`:`<div class="empty-state"><div class="empty-emoji">♧</div><strong>Your people, your progress.</strong><p>Create a private group and invite your friends.</p><button class="btn btn-primary btn-small" data-action="create-group">Create a group</button></div>`}</article></div>
      <div class="grid" style="align-content:start;gap:17px"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Today’s little wins</h2><p class="panel-sub">Check things off, feel good.</p></div><button class="text-link" data-nav="goals">All tasks ↗</button></div>${tasks.length?`<div class="task-list">${tasks.slice(0,4).map(t=>`<label class="task-row ${t.done?'task-done':''}"><input class="task-check" type="checkbox" data-action="toggle-task" data-id="${escAttr(t.id)}" ${t.done?'checked':''}><span class="row-main"><strong>${escapeHtml(t.title)}</strong><small>${t.due_date?`Due ${fmtDate(t.due_date)}`:'A task for your future self'}</small></span></label>`).join('')}</div><div class="task-input-row"><input id="quickTaskInput" placeholder="Add one small task…" maxlength="100" aria-label="New task"><button class="btn btn-plain btn-small" data-action="quick-add-task">+ Add</button></div>`:`<div class="empty-state"><div class="empty-emoji">✦</div><strong>Start with one small task</strong><p>Write down the next thing you want to finish.</p><button class="btn btn-soft btn-small" data-action="create-task">Add a task</button></div>`}</article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your study buddies</h2><p class="panel-sub">A little company helps.</p></div><button class="text-link" data-nav="friends">Friends ↗</button></div>${friends.length?`<div class="friend-list">${friends.slice(0,3).map(f=>`<div class="friend-row">${avatar(f.display_name||f.username,f.avatar_color||'purple',true)}<div class="row-main"><strong>${escapeHtml(f.display_name||f.username)}</strong><small>${f.isStudying?`Studying ${escapeHtml(f.subject||'right now')}`:`${compactHours(f.weekMinutes||0)} this week`}</small></div>${f.isStudying?'<span class="chip live">Live</span>':'<span class="status-dot off"></span>'}</div>`).join('')}</div>`:`<div class="empty-state"><div class="empty-emoji">♙</div><strong>Invite a study buddy</strong><p>Make study time feel a little less solo.</p><button class="btn btn-soft btn-small" data-nav="friends">Find friends</button></div>`}</article></div></section>
      <section class="grid home-secondary"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Personal goals</h2><p class="panel-sub">Keep promises to yourself.</p></div><button class="text-link" data-nav="goals">View all ↗</button></div>${goals.slice(0,2).map(g=>{const d=personalProgress(g),p=percent(d,g.target_minutes);return `<div style="margin:0 0 16px"><div class="progress-line"><strong style="color:var(--text);font-size:11px">${escapeHtml(g.title)}</strong><span>${p}%</span></div><div class="progress coral"><span style="width:${p}%"></span></div><div class="progress-line"><span>${compactHours(d)} studied</span><span>${compactHours(g.target_minutes)} target</span></div></div>`}).join('')||`<div class="empty-state"><strong>No goals yet</strong><p>Create a goal for a subject or chapter.</p><button class="btn btn-primary btn-small" data-action="create-goal">Create goal</button></div>`}</article><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Recent sessions</h2><p class="panel-sub">Effort you can feel good about.</p></div><button class="text-link" data-nav="insights">Insights ↗</button></div>${completedSessions().slice().sort((a,b)=>new Date(b.started_at)-new Date(a.started_at)).slice(0,3).map(s=>`<div class="session-row"> <span class="group-avatar ${s.group_id?'':'green'}">${s.group_id?'♧':'◷'}</span><div class="row-main"><strong>${escapeHtml(s.subject||'Focus session')}</strong><small>${fmtDate(s.started_at)} · ${s.group_id?'Group session':'Personal session'}</small></div><div class="row-end"><strong>${compactHours(s.duration_minutes||0)}</strong></div></div>`).join('')||`<div class="empty-state"><strong>Your first session is waiting.</strong><p>Start a timer and your completed sessions will appear here.</p></div>`}</article></section>`;
  }
  function greeting() { const h=new Date().getHours(); return h<12?'GOOD MORNING':h<18?'GOOD AFTERNOON':'GOOD EVENING'; }
  function renderFocus() {
    const t=state.timer, elapsed=timerElapsed(), countdown=t.mode==='stopwatch'?elapsed:timerRemaining(), running=t.running;
    const selectedGroup=allGroups().find(g=>g.id===(state.focusGroupId||t.groupId));
    const mode=t.mode||state.focusMode;
    return `${heading('YOUR PERSONAL STUDY SPACE','Find your focus.','Pick your subject, choose a team (optional), and settle into a good session.')}
      <section class="grid focus-layout"><div class="panel timer-panel"><div class="timer-label">${running?'YOU’RE IN YOUR FOCUS ZONE':elapsed?'SESSION IN PROGRESS':'READY WHEN YOU ARE'}</div><div class="timer-display" id="timerDisplay">${mode==='stopwatch'?clock(countdown):smallClock(countdown)}</div><span class="timer-subject" id="timerSubjectChip">${escapeHtml(t.subject||state.focusSubject||'Mathematics')} ${selectedGroup?`· ${escapeHtml(selectedGroup.name)}`:'· Solo focus'}</span><div class="timer-controls"><button class="btn ${running?'btn-plain':'btn-primary'}" data-action="timer-toggle">${running?'Ⅱ Pause':elapsed?'▶ Resume':'▶ Start focus'}</button><button class="btn btn-dark" data-action="timer-stop" ${elapsed<=0&&!running?'disabled':''}>■ Finish</button></div><div class="timer-presets">${[['pomodoro','25 min'],['deep','50 min'],['long','90 min'],['stopwatch','Open timer'],['break','Break']].map(([id,label])=>`<button class="preset ${mode===id?'active':''}" data-action="timer-mode" data-mode="${id}">${label}</button>`).join('')}</div><p class="inline-note" style="position:relative;z-index:1;margin:18px 0 0">${running?'Focus on one thing. You’re doing enough by showing up.':'Your timer is saved on this device while you study.'}</p></div>
      <div class="grid" style="align-content:start;gap:17px"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Set your session</h2><p class="panel-sub">Make it fit the work in front of you.</p></div><span class="chip purple">CUSTOM</span></div><div class="timer-settings"><div class="field"><label for="focusSubject">What are you studying?</label><select id="focusSubject">${SUBJECTS.map(s=>`<option ${s===(t.subject||state.focusSubject)?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label for="focusGroup">Contribute time to a group goal</label><select id="focusGroup"><option value="">Solo focus — no group contribution</option>${allGroups().map(g=>`<option value="${escAttr(g.id)}" ${(t.groupId||state.focusGroupId)===g.id?'selected':''}>${escapeHtml(g.name)}</option>`).join('')}</select><small class="field-hint">If you select a group, this session counts toward its shared goal.</small></div><div class="field"><label for="focusGoal">Personal goal (optional)</label><select id="focusGoal"><option value="">No personal goal</option>${allPersonalGoals().map(g=>`<option value="${escAttr(g.id)}" ${(t.personalGoalId||state.focusGoalId)===g.id?'selected':''}>${escapeHtml(g.title)}</option>`).join('')}</select><small class="field-hint">Personal goals count solo sessions only.</small></div><div class="field-row"><div class="field"><label for="focusCustomMinutes">Custom timer (minutes)</label><input id="focusCustomMinutes" type="number" min="1" max="240" value="${Math.round((t.targetSeconds||1500)/60)}"></div><div class="field"><label>Session type</label><div class="chip" style="min-height:42px;justify-content:center;border-radius:11px">${escapeHtml(modeName(mode))}</div></div></div><button class="btn btn-plain btn-wide" data-action="apply-custom-timer">Apply custom timer</button></div></article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your focus ritual</h2><p class="panel-sub">Optional little helpers.</p></div></div><div class="option-row"><div><strong>Auto break suggestion</strong><small>Suggest a short reset after a focus block.</small></div><button class="toggle ${state.autoBreak?'on':''}" data-action="toggle-auto-break" aria-label="Toggle auto break"></button></div><div class="option-row"><div><strong>Gentle sound</strong><small>Browser-generated quiet tone when a timer ends.</small></div><button class="toggle ${state.soundOn?'on':''}" data-action="toggle-sound" aria-label="Toggle timer sound"></button></div><div class="option-row"><div><strong>Reduce animations</strong><small>Use calmer transitions and motion.</small></div><button class="toggle ${state.reduceMotion?'on':''}" data-action="toggle-motion" aria-label="Toggle reduced motion"></button></div></article></div></section>`;
  }
  function renderGroups() {
    const groups=allGroups();
    return `${heading('BETTER TOGETHER','Your study groups','Private spaces for shared goals, weekly challenges, and friendly competition.',`<button class="btn btn-plain" data-action="join-group">↗ Join with code</button><button class="btn btn-primary" data-action="create-group">＋ New group</button>`)}
      ${groups.length?`<div class="grid cards-grid">${groups.map(g=>renderGroupProgress(g,false)).join('')}<button class="add-card" data-action="create-group"><div><span class="plus">＋</span><strong>Create your own circle</strong><p>Invite friends and build a shared goal together.</p><span class="chip purple">MAKE A GROUP</span></div></button></div>`:`<div class="panel"><div class="empty-state"><div class="empty-emoji">♧</div><strong>Your people, your progress.</strong><p>Create a private space or join a group using an invite code from a friend.</p><div class="heading-actions" style="justify-content:center"><button class="btn btn-primary" data-action="create-group">Create a group</button><button class="btn btn-plain" data-action="join-group">Join with code</button></div></div></div>`}
      <div class="panel section-gap"><div class="panel-head"><div><h2 class="panel-title">How shared goals work</h2><p class="panel-sub">One team target, every person's focus time.</p></div><span class="chip green">TEAM MODE</span></div><div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"><div class="stat-card"><div class="stat-icon">♙</div><strong style="display:block;margin-top:10px;font-size:12px">Invite friends</strong><p class="muted" style="font-size:10px;margin:5px 0 0">Share your private code with the people you study with.</p></div><div class="stat-card"><div class="stat-icon">◷</div><strong style="display:block;margin-top:10px;font-size:12px">Study your way</strong><p class="muted" style="font-size:10px;margin:5px 0 0">Everyone tracks their own sessions separately.</p></div><div class="stat-card"><div class="stat-icon">◎</div><strong style="display:block;margin-top:10px;font-size:12px">Reach one goal</strong><p class="muted" style="font-size:10px;margin:5px 0 0">Each group's completed sessions raise the shared total.</p></div></div></div>`;
  }
  function renderFriends() {
    const friends=allFriends().filter(f=>!f.status||f.status==='accepted');
    const incoming=allRequests().filter(r=>r.status==='pending' && (localMode()?r.direction==='incoming':r.addressee_id===state.user?.id));
    const outgoing=allRequests().filter(r=>r.status==='pending' && (localMode()?r.direction==='outgoing':r.requester_id===state.user?.id));
    return `${heading('YOUR STUDY PEOPLE','Good company counts.','Add your friends, see their weekly progress, and cheer each other on.',`<button class="btn btn-primary" data-action="add-friend">＋ Add a friend</button>`)}
      <div class="grid overview-stats">${statCard('♙','Your friends',friends.length,'People in your circle')}${statCard('●','Studying now',friends.filter(f=>f.isStudying).length,'In demo, sample status is shown','var(--lime-soft)')}${statCard('✳','Your week',compactHours(weekMinutes()),'Your own completed sessions','var(--coral-soft)')}${statCard('↗','Open invites',incoming.length,'Friend requests to review','var(--accent-soft)')}</div>
      <div class="grid split-section"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your people</h2><p class="panel-sub">The gentle accountability crew.</p></div><span class="chip">${friends.length} FRIENDS</span></div>${friends.length?`<div class="list-table">${friends.slice().sort((a,b)=>(b.weekMinutes||0)-(a.weekMinutes||0)).map((f,i)=>`<div class="list-item">${avatar(f.display_name||f.username,f.avatar_color||['purple','coral','green','gold'][i%4])}<div class="row-main"><strong>${escapeHtml(f.display_name||f.username)}</strong><small>@${escapeHtml(f.username||'student')} · ${compactHours(f.weekMinutes||0)} this week</small></div><div class="row-end"><strong>${f.isStudying?`<span class="chip live">Studying</span>`:`<span class="chip">Away</span>`}</strong><small>${f.isStudying?escapeHtml(f.subject||'In a session'):'Keep going!'}</small></div></div>`).join('')}</div>`:`<div class="empty-state"><div class="empty-emoji">♙</div><strong>A study buddy can make a difference.</strong><p>Add a friend by their username to create your circle.</p><button class="btn btn-primary btn-small" data-action="add-friend">Add a friend</button></div>`}</article>
      <div class="grid" style="align-content:start;gap:17px"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Friend requests</h2><p class="panel-sub">New faces for your study circle.</p></div></div>${incoming.length?incoming.map(r=>{const name=localMode()?r.display_name||'New friend':state.profilesById[r.requester_id]?.display_name||state.profilesById[r.requester_id]?.username||'Student';return `<div class="friend-row" style="padding:10px 0">${avatar(name,'coral',true)}<div class="row-main"><strong>${escapeHtml(name)}</strong><small>Wants to connect</small></div><button class="btn btn-primary btn-small" data-action="accept-friend" data-id="${escAttr(r.id)}">Accept</button></div>`}).join(''):`<div class="empty-state"><div class="empty-emoji">✉</div><strong>All caught up</strong><p>New friend requests will show up here.</p></div>`}${outgoing.length?`<div class="divider"></div><p class="eyebrow" style="margin-bottom:7px">SENT REQUESTS</p>${outgoing.map(r=>{const name=localMode()?r.display_name||r.username:state.profilesById[r.addressee_id]?.display_name||state.profilesById[r.addressee_id]?.username||'Student';return `<div class="friend-row" style="padding:8px 0">${avatar(name,'gold',true)}<div class="row-main"><strong>${escapeHtml(name)}</strong><small>Waiting for them to accept</small></div><span class="chip">Pending</span></div>`}).join('')}`:''}</article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your friend code</h2><p class="panel-sub">Share your username to connect.</p></div></div><div class="modal-code" style="font-size:17px;letter-spacing:1px">@${escapeHtml(currentProfile().username||'student')}</div><button class="btn btn-plain btn-wide" data-action="share-profile">Copy invite message</button><p class="form-note" style="margin:12px 0 0">Your cloud friends connect by username. In local demo mode, friend changes stay on this device until cloud is configured.</p></article></div></div>`;
  }
  function renderGoals() {
    const personal=allPersonalGoals(), groups=allGroups(), tasks=allTasks(), doneTasks=tasks.filter(t=>t.done).length;
    return `${heading('MAKE SPACE FOR WHAT MATTERS','Goals & little tasks','Big goals, broken into doable steps.',`<button class="btn btn-plain" data-action="create-task">＋ Add a task</button><button class="btn btn-primary" data-action="create-goal">＋ New goal</button>`)}
      <div class="grid split-section"><div class="panel"><div class="panel-head"><div><h2 class="panel-title">Your personal goals</h2><p class="panel-sub">A target you set for yourself.</p></div><span class="chip coral">${personal.length} GOALS</span></div>${personal.length?personal.map(g=>{const p=personalProgress(g),pct=percent(p,g.target_minutes);return `<div class="goal-card"><div class="goal-top"><div><h3>${escapeHtml(g.title)}</h3><p>${g.due_date?`Finish by ${fmtDate(g.due_date)}`:'Make progress at your own pace'}</p></div><div class="goal-big">${pct}%</div></div><div class="progress coral" style="margin-top:14px"><span style="width:${pct}%"></span></div><div class="goal-desc"><span>◷ ${compactHours(p)} completed</span><span>·</span><span>${compactHours(g.target_minutes)} target</span><span>·</span><button class="text-link" data-action="focus-goal" data-id="${escAttr(g.id)}">Focus on this ↗</button></div></div>`}).join(''):`<div class="empty-state"><div class="empty-emoji">◎</div><strong>Pick something to work toward.</strong><p>Set a study-hour goal and connect your focus sessions to it.</p><button class="btn btn-primary btn-small" data-action="create-goal">Create a goal</button></div>`}
      ${groups.length?`<div class="divider"></div><div class="panel-head"><div><h2 class="panel-title">Shared group goals</h2><p class="panel-sub">Your hours help everyone reach the finish line.</p></div><button class="text-link" data-nav="groups">Groups ↗</button></div>${groups.map(g=>{const d=groupProgress(g),tar=groupGoalTarget(g),p=percent(d,tar),goal=getGroupGoal(g.id);return `<div class="goal-card"><div class="goal-top"><div><h3>${escapeHtml(goal?.title||g.name+' shared goal')}</h3><p>${escapeHtml(g.name)} · ${groupMemberNames(g).length} members</p></div><div class="goal-big">${p}%</div></div><div class="progress" style="margin-top:14px"><span style="width:${p}%"></span></div><div class="goal-desc"><span>♧ ${compactHours(d)} contributed</span><span>·</span><span>${compactHours(tar)} team target</span><span>·</span><button class="text-link" data-action="study-with-group" data-id="${escAttr(g.id)}">Contribute ↗</button></div></div>`}).join('')}`:''}</div>
      <div class="panel"><div class="panel-head"><div><h2 class="panel-title">Task garden</h2><p class="panel-sub">${doneTasks} of ${tasks.length} tasks are done.</p></div><span class="chip green">DAILY STEPS</span></div>${tasks.length?`<div class="task-list">${tasks.map(t=>`<div class="task-row ${t.done?'task-done':''}"><input type="checkbox" class="task-check" data-action="toggle-task" data-id="${escAttr(t.id)}" ${t.done?'checked':''}><span class="row-main"><strong>${escapeHtml(t.title)}</strong><small>${t.due_date?`Due ${fmtDate(t.due_date)}`:'A small, useful step'}</small></span><button class="text-link" data-action="delete-task" data-id="${escAttr(t.id)}" aria-label="Delete task">×</button></div>`).join('')}</div>`:`<div class="empty-state"><div class="empty-emoji">✦</div><strong>No tasks yet</strong><p>Add one small, specific action.</p></div>`}<button class="btn btn-plain btn-wide" style="margin-top:12px" data-action="create-task">＋ Add another task</button></div></div>`;
  }
  function renderInsights() {
    const sessions=completedSessions(), weekly=[]; const now=new Date();
    for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);const mins=sessions.filter(s=>todayKey(new Date(s.started_at))===todayKey(d)).reduce((sum,s)=>sum+(s.duration_minutes||0),0);weekly.push({day:d.toLocaleDateString(undefined,{weekday:'short'}),mins,date:d});}
    const max=Math.max(60,...weekly.map(x=>x.mins));
    const subjectMap={}; sessions.forEach(s=>{subjectMap[s.subject||'Other']=(subjectMap[s.subject||'Other']||0)+(s.duration_minutes||0);});
    const subjects=Object.entries(subjectMap).sort((a,b)=>b[1]-a[1]).slice(0,6), total=subjects.reduce((a,x)=>a+x[1],0);
    return `${heading('NOTICE YOUR PROGRESS','Look how far you’ve come.','No pressure to be perfect. These are just little reminders of your effort.',`<button class="btn btn-primary" data-nav="focus">◷ Start a session</button>`)}
      <section class="grid overview-stats">${statCard('◷','Total study time',compactHours(sessions.reduce((n,s)=>n+(s.duration_minutes||0),0)),'Across completed sessions')}${statCard('✳','This week',compactHours(weekMinutes()),'Since Monday','var(--coral-soft)')}${statCard('◎','Sessions',sessions.length,'Every start matters','var(--lime-soft)')}${statCard('♨','Streak',`${streakDays()} ${streakDays()===1?'day':'days'}`,'Celebrate consistency','var(--accent-soft)')}</section>
      <section class="grid insights-grid"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Your last 7 days</h2><p class="panel-sub">Minutes focused per day.</p></div><span class="chip purple">LAST WEEK</span></div><div class="chart-wrap">${weekly.map(d=>`<div class="chart-col"><span class="chart-value">${d.mins?Math.round(d.mins):'—'}</span><div class="chart-bar-track"><div class="chart-bar ${todayKey(d.date)===todayKey()?'highlight':''}" style="height:${Math.max(d.mins?4:1,d.mins/max*100)}%" title="${d.mins} minutes"></div></div><span class="chart-label">${d.day}</span></div>`).join('')}</div><p class="inline-note" style="margin-top:14px">The best study plan is one you can repeat. Rest days count as part of a good rhythm, too.</p></article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">By subject</h2><p class="panel-sub">Where your minutes went.</p></div></div>${subjects.length?subjects.map(([name,mins],i)=>`<div class="subject-stat"><span class="subject-dot" style="background:${['var(--accent)','var(--coral)','var(--lime)','var(--gold)','#92b8aa','#b6a0d4'][i%6]}"></span><div class="row-main"><strong>${escapeHtml(name)}</strong><div class="progress" style="margin-top:7px"><span style="width:${percent(mins,total)}%;background:${['var(--accent)','var(--coral)','var(--lime)','var(--gold)','#92b8aa','#b6a0d4'][i%6]}"></span></div></div><div class="row-end"><strong>${compactHours(mins)}</strong><small>${percent(mins,total)}%</small></div></div>`).join(''):`<div class="empty-state"><div class="empty-emoji">▥</div><strong>Your stats are waiting.</strong><p>Complete a focus session to see your first insight.</p><button class="btn btn-primary btn-small" data-nav="focus">Start studying</button></div>`}</article></section>
      <article class="panel section-gap"><div class="panel-head"><div><h2 class="panel-title">Recent sessions</h2><p class="panel-sub">Your study history.</p></div><span class="chip">${sessions.length} SESSIONS</span></div>${sessions.slice().sort((a,b)=>new Date(b.started_at)-new Date(a.started_at)).slice(0,8).map(s=>`<div class="session-row"><span class="group-avatar ${s.group_id?'':'green'}">${s.group_id?'♧':'◷'}</span><div class="row-main"><strong>${escapeHtml(s.subject||'Focus session')}</strong><small>${fmtDate(s.started_at)} · ${s.group_id?'Group session':'Personal session'}</small></div><div class="row-end"><strong>${compactHours(s.duration_minutes||0)}</strong></div></div>`).join('')||`<div class="empty-state"><strong>No sessions yet</strong><p>Completed timer sessions will show here.</p></div>`}</article>`;
  }
  function renderSettings() {
    const profile=currentProfile(), configured=!!(localStorage.getItem(CONFIG_URL_KEY)&&localStorage.getItem(CONFIG_ANON_KEY));
    return `${heading('MAKE IT YOURS','Settings & cloud','Personalize your space, manage your account, and connect online storage.')}
      <section class="grid settings-layout"><div class="panel"><div class="panel-head"><div><h2 class="panel-title">Your profile</h2><p class="panel-sub">The name your study friends will see.</p></div></div><div class="auth-user-box">${avatar(profile.display_name||profile.username,profile.avatar_color||'purple')}<div class="row-main"><strong>${escapeHtml(profile.display_name||'Student')}</strong><small>${localMode()?'Local demo profile':escapeHtml(profile.username?'@'+profile.username:state.user?.email||'Cloud account')}</small></div>${!localMode()?'<span class="chip green">SIGNED IN</span>':'<span class="chip">DEMO</span>'}</div><div class="settings-section"><h3>Personal details</h3><p>Give your profile a name and username.</p><form id="profileForm"><div class="field"><label for="displayName">Display name</label><input id="displayName" name="displayName" maxlength="40" value="${escAttr(profile.display_name||'')}" required></div><div class="field"><label for="username">Username</label><input id="username" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_.]+" value="${escAttr(profile.username||'')}" required><small class="field-hint">Letters, numbers, underscores, and dots only.</small></div><button class="btn btn-primary" type="submit">Save profile</button></form></div><div class="settings-section"><h3>Appearance</h3><p>Pick a palette that feels nice to study in.</p><div class="theme-options">${THEMES.map(t=>`<button class="theme-pick ${state.theme===t.id?'active':''}" data-action="theme" data-theme="${t.id}"><span class="theme-swatch">${t.colors.map(c=>`<i style="background:${c}"></i>`).join('')}</span>${t.name}</button>`).join('')}</div></div><div class="settings-section"><h3>Focus preferences</h3><p>Shape your study routine.</p><div class="option-row"><div><strong>Auto break suggestion</strong><small>Offer a gentle break after a focus session.</small></div><button class="toggle ${state.autoBreak?'on':''}" data-action="toggle-auto-break" aria-label="Toggle auto break"></button></div><div class="option-row"><div><strong>Timer sound</strong><small>Play a quiet tone when the timer finishes.</small></div><button class="toggle ${state.soundOn?'on':''}" data-action="toggle-sound" aria-label="Toggle timer sound"></button></div><div class="option-row"><div><strong>Reduce animations</strong><small>Use less movement throughout the app.</small></div><button class="toggle ${state.reduceMotion?'on':''}" data-action="toggle-motion" aria-label="Toggle reduced motion"></button></div></div></div>
      <div class="grid" style="align-content:start;gap:17px"><article class="panel"><div class="panel-head"><div><h2 class="panel-title">Online data & account</h2><p class="panel-sub">Share goals with friends on different devices.</p></div></div><div class="cloud-status"><div class="cloud-status-icon">${localMode()?'☁':'✓'}</div><div><strong>${localMode()?'This device only':'Connected to Supabase'}</strong><p>${localMode()?'Demo data stays in this browser. Connect a cloud project to use real accounts and shared groups.':'Your account is signed in. Groups and sessions sync through your configured database.'}</p></div></div>${!state.user?`<div class="auth-actions"><button class="btn btn-primary" data-action="auth" data-auth-mode="signup">Create account</button><button class="btn btn-plain" data-action="auth" data-auth-mode="signin">Sign in</button></div>`:`<div class="auth-user-box">${avatar(profile.display_name||profile.username,'green')}<div class="row-main"><strong>${escapeHtml(state.user.email||profile.username)}</strong><small>Cloud account connected</small></div></div><button class="btn btn-plain" data-action="signout">Sign out</button>`}<div class="divider"></div><div class="settings-section"><h3>Connect your Supabase project</h3><p>Use your project's Project URL and publishable/anon key. Never use a service_role key in the app.</p><form id="cloudForm"><div class="field"><label for="supabaseUrl">Supabase Project URL</label><input id="supabaseUrl" type="url" placeholder="https://your-project.supabase.co" value="${escAttr(localStorage.getItem(CONFIG_URL_KEY)||'')}" required></div><div class="field"><label for="supabaseAnon">Publishable key / anon key</label><textarea id="supabaseAnon" rows="3" placeholder="Paste your public anon/publishable key" required>${escapeHtml(localStorage.getItem(CONFIG_ANON_KEY)||'')}</textarea></div><button class="btn btn-primary btn-wide" type="submit">Save & connect</button></form><p class="form-note" style="margin-top:10px">Setup guide: open the README in your GitHub repository and follow “Set up online storage”. Then paste the URL/key here.</p></div><div class="divider"></div><div class="auth-actions"><button class="btn btn-plain btn-small" data-action="refresh-cloud" ${!state.supabase?'disabled':''}>↻ Refresh cloud data</button><button class="btn btn-plain btn-small" data-action="export-data">↓ Export my data</button><button class="btn btn-plain btn-small" data-action="reset-demo">Reset demo data</button></div></article>
      <article class="panel"><div class="panel-head"><div><h2 class="panel-title">A few helpful notes</h2><p class="panel-sub">Keeping your study space safe.</p></div><span class="chip green">GOOD TO KNOW</span></div><div class="option-row"><div><strong>Local demo mode</strong><small>You can explore the app without an account. Demo data is saved only on this device.</small></div><span class="chip">LOCAL</span></div><div class="option-row"><div><strong>Cloud mode</strong><small>Real account data is stored in your Supabase project, protected by database policies.</small></div><span class="chip purple">ONLINE</span></div><div class="option-row"><div><strong>Privacy</strong><small>Never put passwords, service-role keys, or private credentials in source files.</small></div><span class="chip coral">SAFE</span></div><p class="inline-note" style="margin-top:13px">Focusora is a study companion, not a social network substitute. Only share invite codes with people you want to join your groups.</p></article></div></section>`;
  }

  function showModal(content) { $('#modalContent').innerHTML=content; $('#modalBackdrop').hidden=false; document.body.style.overflow='hidden'; const focusable=$('#modalContent input, #modalContent button, #modalContent select, #modalContent textarea'); if(focusable) setTimeout(()=>focusable.focus(),25); }
  function closeModal() { $('#modalBackdrop').hidden=true; $('#modalContent').innerHTML=''; document.body.style.overflow=''; }
  function modalHeader(title,intro) { return `<p class="eyebrow">FOCUSORA TOOLKIT</p><h2 id="modalTitle" class="modal-title">${title}</h2><p class="modal-intro">${intro}</p>`; }
  function modalGroup() { showModal(`${modalHeader('Create your circle.','Make a private group and invite friends to reach a shared study target.')}
    <form id="createGroupForm"><div class="field"><label for="newGroupName">Group name</label><input id="newGroupName" name="name" placeholder="e.g. Bac 2028 crew" maxlength="50" required></div><div class="field"><label for="newGroupDescription">A little description</label><textarea id="newGroupDescription" name="description" maxlength="180" placeholder="Math practice, exam prep, daily check-ins..."></textarea></div><div class="field-row"><div class="field"><label for="newGroupTarget">Shared target (hours)</label><input id="newGroupTarget" name="target" type="number" min="1" max="5000" value="50" required></div><div class="field"><label for="newGroupDeadline">Optional deadline</label><input id="newGroupDeadline" name="deadline" type="date" min="${new Date().toISOString().slice(0,10)}"></div></div><div class="field"><label for="newGroupIcon">Group vibe</label><select id="newGroupIcon" name="icon"><option value="✦">✦ Little stars</option><option value="◈">◈ Math club</option><option value="☘">☘ Green energy</option><option value="☀">☀ Morning crew</option><option value="☾">☾ Night owls</option><option value="♡">♡ Study buddies</option></select></div><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Create group ↗</button></div></form>`); }
  function modalJoinGroup() { showModal(`${modalHeader('Join a study group.','Paste the invite code your friend shared with you.')}
    <form id="joinGroupForm"><div class="field"><label for="joinCode">Invite code</label><input id="joinCode" name="code" maxlength="16" placeholder="e.g. BAC28X" style="text-transform:uppercase;letter-spacing:2px" required></div><p class="form-note">In local demo mode, use BAC28X or MATH7K to try joining a sample group. Cloud mode uses the real invite code.</p><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Not now</button><button class="btn btn-primary" type="submit">Join group</button></div></form>`); }
  function modalGoal() { showModal(`${modalHeader('Set a personal goal.','Choose a target that feels challenging but doable.')}
    <form id="createGoalForm"><div class="field"><label for="goalTitle">Goal name</label><input name="title" id="goalTitle" maxlength="70" placeholder="e.g. Revise functions" required></div><div class="field-row"><div class="field"><label for="goalHours">Study target (hours)</label><input name="hours" id="goalHours" type="number" min="1" max="5000" value="10" required></div><div class="field"><label for="goalDue">Optional deadline</label><input name="due" id="goalDue" type="date" min="${new Date().toISOString().slice(0,10)}"></div></div><p class="form-note">Completed solo sessions count toward this goal from the time you create it.</p><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Save goal</button></div></form>`); }
  function modalTask() { showModal(`${modalHeader('Add a little task.','Make it specific enough that Future You knows what to do.')}
    <form id="createTaskForm"><div class="field"><label for="taskTitle">Task</label><input name="title" id="taskTitle" maxlength="100" placeholder="e.g. Solve 5 limit exercises" required></div><div class="field"><label for="taskDue">Optional due date</label><input name="due" id="taskDue" type="date" min="${new Date().toISOString().slice(0,10)}"></div><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Add task</button></div></form>`); }
  function modalFriend() { showModal(`${modalHeader('Find a study buddy.','Enter your friend’s exact username to send a connection request.')}
    <form id="addFriendForm"><div class="field"><label for="friendUsername">Friend username</label><input id="friendUsername" name="username" minlength="3" maxlength="24" placeholder="e.g. meriem.study" required></div><p class="form-note">Both of you need a Focusora cloud account for real cross-device friend requests. Demo mode lets you try with sample names.</p><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">Send request ↗</button></div></form>`); }
  function modalAuth(mode='signin') { state.authMode=mode; const signup=mode==='signup'; showModal(`${modalHeader(signup?'Make your study account.':'Welcome back.','Cloud accounts let you see shared groups and goals across devices.')}
    <form id="authForm"><div class="field" ${signup?'':'hidden'}><label for="authDisplayName">Display name</label><input id="authDisplayName" name="displayName" maxlength="40" placeholder="e.g. Adem"></div><div class="field" ${signup?'':'hidden'}><label for="authUsername">Username</label><input id="authUsername" name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_.]+" placeholder="e.g. adem.study"></div><div class="field"><label for="authEmail">Email</label><input id="authEmail" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div><div class="field"><label for="authPassword">Password</label><input id="authPassword" name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="6" placeholder="At least 6 characters" required></div><p class="form-note">Your password is handled by Supabase Auth and is not saved in Focusora's local demo data.</p><div class="modal-footer" style="justify-content:space-between;align-items:center"><button class="switch-link" type="button" data-action="auth" data-auth-mode="${signup?'signin':'signup'}">${signup?'Already have an account? Sign in':'New here? Create account'}</button><button class="btn btn-primary" type="submit">${signup?'Create account':'Sign in'}</button></div></form>`); }
  function modalInvite(group) { showModal(`${modalHeader('Bring your study people.','Share this code with friends you want in this private group.')}
    <div class="modal-code">${escapeHtml(group.invite_code||'—')}</div><p class="form-note" style="text-align:center">Group: <strong>${escapeHtml(group.name)}</strong><br>Target: ${compactHours(groupGoalTarget(group))}. Everyone’s completed group sessions add to the shared total.</p><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Close</button><button class="btn btn-primary" data-action="copy-invite" data-id="${escAttr(group.id)}">Copy invite message</button></div>`); }
  function modalGroupDetail(group) { const goal=getGroupGoal(group.id), d=groupProgress(group),target=groupGoalTarget(group),pct=percent(d,target),names=groupMemberNames(group); showModal(`${modalHeader(escapeHtml(group.name),escapeHtml(group.description||'Your private study circle.'))}
    <div class="cloud-status"><div class="cloud-status-icon">${escapeHtml(group.icon||'✦')}</div><div><strong>${compactHours(d)} of ${compactHours(target)} completed</strong><p>${pct}% of your shared target is done.</p></div></div><div class="progress"><span style="width:${pct}%"></span></div><div class="invite-strip" style="margin:16px 0"><span>INVITE CODE</span><code>${escapeHtml(group.invite_code||'—')}</code><button class="text-link" data-action="copy-invite" data-id="${escAttr(group.id)}">Copy</button></div><div class="panel-head" style="margin:22px 0 8px"><div><h2 class="panel-title">Group members</h2><p class="panel-sub">${names.length} people in this circle</p></div></div><div class="list-table">${names.map((n,i)=>`<div class="list-item">${avatar(n,['purple','coral','green','gold'][i%4])}<div class="row-main"><strong>${escapeHtml(n)}</strong><small>${i===0?'Group member':'Part of the crew'}</small></div>${i===0?'<span class="chip purple">YOU</span>':''}</div>`).join('')}</div><div class="modal-footer"><button class="btn btn-plain" type="button" data-action="close-modal">Close</button><button class="btn btn-primary" data-action="study-with-group" data-id="${escAttr(group.id)}">◷ Contribute study time</button></div>`); }


  function setupRealtime() {
    if(!state.supabase || !state.user) return;
    try {
      if(state.realtimeChannel) state.supabase.removeChannel(state.realtimeChannel).catch(()=>{});
      state.realtimeChannel = state.supabase.channel(`focusora-live-${state.user.id}`)
        .on('postgres_changes',{event:'*',schema:'public',table:'study_sessions'},()=>{ if(state.user) refreshCloudData().then(()=>{ if(['home','groups','friends','goals','insights'].includes(state.view)) render(); }).catch(()=>{}); })
        .on('postgres_changes',{event:'*',schema:'public',table:'group_goals'},()=>{ if(state.user) refreshCloudData().then(render).catch(()=>{}); })
        .subscribe();
    } catch(err) { console.warn('Realtime unavailable:',err.message); }
  }

  async function connectCloud(url,key,showMessage=true) {
    url=String(url||'').trim().replace(/\/$/,''); key=String(key||'').trim();
    if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) && !/^https:\/\/.+/.test(url)) { hapticToast('Enter a valid HTTPS Supabase project URL.'); return false; }
    if(!key || key.length<12) { hapticToast('Paste your Supabase publishable/anon key.'); return false; }
    if(!window.supabase?.createClient) { hapticToast('Cloud library did not load. Check your internet and retry.'); return false; }
    localStorage.setItem(CONFIG_URL_KEY,url); localStorage.setItem(CONFIG_ANON_KEY,key);
    try {
      state.supabase=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await state.supabase.auth.getSession(); if(error) throw error;
      state.user=data.session?.user||null; state.online=!!state.user;
      if(state.user){ await ensureProfile(); await refreshCloudData(); setupRealtime(); }
      render(); if(showMessage) hapticToast(state.user?'Cloud connected and synced.':'Cloud configured! Sign in or create an account.'); return true;
    } catch(err) { state.supabase=null; state.online=false; state.user=null; render(); hapticToast('Could not connect: '+(err.message||'check URL and key')); return false; }
  }
  async function ensureProfile() {
    if(!state.supabase||!state.user)return;
    const user=state.user, meta=user.user_metadata||{};
    const username=meta.username||`student_${user.id.slice(0,8)}`;
    const display_name=meta.display_name||meta.username||user.email?.split('@')[0]||'Student';
    const {data,error}=await state.supabase.from('profiles').upsert({id:user.id,username,display_name,avatar_color:meta.avatar_color||'purple'},{onConflict:'id'}).select().maybeSingle();
    if(data) state.profile=data; else if(error) { const result=await state.supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(); state.profile=result.data||{id:user.id,username,display_name}; }
  }
  async function refreshCloudData() {
    if(!state.supabase||!state.user)return;
    const db=state.supabase, uid=state.user.id;
    const result=await db.from('profiles').select('*').eq('id',uid).maybeSingle(); if(result.data) state.profile=result.data;
    const me=state.profile?.username;
    const {data:members,error:mErr}=await db.from('group_members').select('*').eq('user_id',uid);
    if(mErr) console.warn('group_members',mErr.message);
    const groupIds=(members||[]).map(m=>m.group_id); state.groupMembers={};
    for(const m of (members||[])) (state.groupMembers[m.group_id] ||= []).push(m);
    const [gRes, goalRes, personalRes, ownSessionsRes, friendsRes, tasksRes]=await Promise.all([
      groupIds.length?db.from('study_groups').select('*').in('id',groupIds):Promise.resolve({data:[],error:null}),
      groupIds.length?db.from('group_goals').select('*').in('group_id',groupIds):Promise.resolve({data:[],error:null}),
      db.from('personal_goals').select('*').eq('user_id',uid).order('created_at',{ascending:false}),
      db.from('study_sessions').select('*').eq('user_id',uid).order('started_at',{ascending:false}).limit(500),
      db.from('friendships').select('*').or(`requester_id.eq.${uid},addressee_id.eq.${uid}`).order('created_at',{ascending:false}),
      db.from('study_tasks').select('*').eq('user_id',uid).order('created_at',{ascending:false})
    ]);
    for(const [label,res] of [['groups',gRes],['goals',goalRes],['personal goals',personalRes],['sessions',ownSessionsRes],['friends',friendsRes],['tasks',tasksRes]]) if(res.error) console.warn(label,res.error.message);
    state.groups=gRes.data||[]; state.groupGoals=goalRes.data||[]; state.personalGoals=personalRes.data||[]; state.sessions=ownSessionsRes.data||[]; state.requests=friendsRes.data||[]; state.tasks=tasksRes.data||[];
    if(groupIds.length) {
      const [groupSessions,groupMembers]=await Promise.all([
        db.from('study_sessions').select('*').in('group_id',groupIds).order('started_at',{ascending:false}).limit(1000),
        db.from('group_members').select('*').in('group_id',groupIds)
      ]);
      if(!groupSessions.error) state.sessions=mergeById(state.sessions,groupSessions.data||[]);
      if(!groupMembers.error){state.groupMembers={}; for(const m of groupMembers.data||[]) (state.groupMembers[m.group_id] ||= []).push(m);}
    }
    const friendIds=[...new Set(state.requests.flatMap(r=>[r.requester_id,r.addressee_id]).filter(id=>id&&id!==uid))];
    const memberIds=[...new Set(Object.values(state.groupMembers).flat().map(m=>m.user_id).filter(id=>id!==uid))];
    const profileIds=[...new Set([...friendIds,...memberIds])];
    state.profilesById={}; state.profilesById[uid]=state.profile;
    if(profileIds.length){const p=await db.from('profiles').select('id,username,display_name,avatar_color').in('id',profileIds); if(!p.error) for(const row of p.data||[]) state.profilesById[row.id]=row;}
    state.friends=state.requests.filter(r=>r.status==='accepted').map(r=>{const id=r.requester_id===uid?r.addressee_id:r.requester_id;return {...(state.profilesById[id]||{}),id,friendship_id:r.id,status:'accepted',weekMinutes:state.sessions.filter(s=>s.user_id===id&&s.ended_at&&isThisWeek(s.started_at)).reduce((n,s)=>n+(s.duration_minutes||0),0),isStudying:state.sessions.some(s=>s.user_id===id&&!s.ended_at&&!s.is_paused),subject:state.sessions.find(s=>s.user_id===id&&!s.ended_at)?.subject};});
  }
  function mergeById(a,b) { const map=new Map(); [...a,...b].forEach(v=>map.set(v.id,v)); return [...map.values()]; }
  async function authSubmit(form) {
    if(!state.supabase){hapticToast('First connect Supabase in Settings & cloud.'); closeModal(); go('settings'); return;}
    const fd=new FormData(form), email=String(fd.get('email')||'').trim(), password=String(fd.get('password')||'');
    try {
      if(state.authMode==='signup'){
        const username=String(fd.get('username')||'').trim().toLowerCase().replace(/[^a-z0-9_.]/g,'');
        const display=String(fd.get('displayName')||username).trim();
        if(username.length<3){hapticToast('Username needs at least 3 characters.');return;}
        const {data,error}=await state.supabase.auth.signUp({email,password,options:{data:{username,display_name:display,avatar_color:'purple'}}}); if(error)throw error;
        if(data.session){state.user=data.user;state.online=true;await ensureProfile();await refreshCloudData();setupRealtime();closeModal();render();hapticToast('Account created. Welcome to Focusora!');}
        else {closeModal();hapticToast('Check your email to confirm your account, then sign in.');}
      } else {
        const {data,error}=await state.supabase.auth.signInWithPassword({email,password});if(error)throw error;
        state.user=data.user;state.online=true;await ensureProfile();await refreshCloudData();setupRealtime();closeModal();render();hapticToast('Welcome back! Your data is synced.');
      }
    } catch(err){hapticToast(authError(err.message||'Could not authenticate.'));}
  }
  function authError(msg){ if(/Invalid login credentials/i.test(msg))return 'Email or password is incorrect.'; if(/already registered/i.test(msg))return 'That email already has an account. Try signing in.'; if(/username/i.test(msg))return 'Username could not be saved. Try another one.'; return msg; }
  async function signOut() { if(state.supabase) { try{await state.supabase.auth.signOut();}catch(e){console.warn(e);} } state.user=null;state.online=false;state.profile=null;state.groups=[];state.groupGoals=[];state.personalGoals=[];state.friends=[];state.requests=[];state.sessions=[];state.tasks=[];state.groupMembers={};state.profilesById={};render();hapticToast('Signed out. Demo mode is ready to use.'); }
  function makeCode() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code='';const bytes=new Uint8Array(6); if(window.crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<6;i++)bytes[i]=Math.floor(Math.random()*256);for(let i=0;i<6;i++)code+=chars[bytes[i]%chars.length];return code; }
  async function createGroup(form) {
    const fd=new FormData(form), name=String(fd.get('name')||'').trim(), description=String(fd.get('description')||'').trim(), target=Math.max(1,Math.min(5000,Number(fd.get('target')||50)))*60, deadline=String(fd.get('deadline')||'')||null, icon=String(fd.get('icon')||'✦');
    if(!name){hapticToast('Give your group a name first.');return;}
    if(localMode()) {
      const code=makeCode(), g={id:'demo-g-'+Date.now(),name,description,icon,color:['purple','coral','green','gold'][allGroups().length%4],invite_code:code,owner_id:'local-user',memberNames:[currentProfile().display_name||'You'],doneMinutes:0,targetMinutes:target,created_at:new Date().toISOString()};
      state.demo.groups.unshift(g);state.demo.groupGoals.unshift({id:'demo-gg-'+Date.now(),group_id:g.id,title:`${compactHours(target)} team study goal`,target_minutes:target,deadline,created_at:new Date().toISOString()});persistDemo();closeModal();render();hapticToast('Group created! Share its invite code.');modalInvite(g);return;
    }
    try {
      const {data:g,error}=await state.supabase.from('study_groups').insert({name,description,icon,owner_id:state.user.id,invite_code:makeCode()}).select().single();if(error)throw error;
      const mr=await state.supabase.from('group_members').insert({group_id:g.id,user_id:state.user.id,role:'owner'});if(mr.error)throw mr.error;
      const gr=await state.supabase.from('group_goals').insert({group_id:g.id,title:`${compactHours(target)} team study goal`,target_minutes:target,deadline,created_by:state.user.id});if(gr.error)throw gr.error;
      await refreshCloudData();closeModal();render();const created=state.groups.find(x=>x.id===g.id)||g;hapticToast('Group created and saved online!');modalInvite(created);
    }catch(err){hapticToast('Could not create group: '+err.message);}
  }
  async function joinGroup(form) {
    const code=String(new FormData(form).get('code')||'').trim().toUpperCase();if(!code){hapticToast('Enter an invite code.');return;}
    if(localMode()){
      const found=state.demo.groups.find(g=>g.invite_code.toUpperCase()===code);
      if(found){if(!found.memberNames.includes(state.demo.profile.display_name))found.memberNames.push(state.demo.profile.display_name||'You');persistDemo();closeModal();render();hapticToast(`You joined ${found.name}!`);return;}
      const g={id:'demo-join-'+Date.now(),name:'Joined study circle',description:'A group you joined with an invite code.',icon:'☘',color:'green',invite_code:code,owner_id:'friend',memberNames:[state.demo.profile.display_name||'You','Your friend'],doneMinutes:0,targetMinutes:1200,created_at:new Date().toISOString()};state.demo.groups.unshift(g);state.demo.groupGoals.unshift({id:'demo-jg-'+Date.now(),group_id:g.id,title:'Shared study target',target_minutes:1200,created_at:new Date().toISOString()});persistDemo();closeModal();render();hapticToast('Demo group joined. In cloud mode the code is verified online.');return;
    }
    try {const {data,error}=await state.supabase.rpc('join_group_by_code',{invite_code_input:code});if(error)throw error;if(!data)throw new Error('Invite code not found. Check with your friend.');await refreshCloudData();closeModal();render();hapticToast('You joined the study group!');}
    catch(err){hapticToast(err.message||'Could not join this group.');}
  }
  async function createGoal(form) {
    const fd=new FormData(form), title=String(fd.get('title')||'').trim(), target=Math.max(1,Math.min(5000,Number(fd.get('hours')||10)))*60,due_date=String(fd.get('due')||'')||null;
    if(!title){hapticToast('Give your goal a name first.');return;}
    if(localMode()){state.demo.personalGoals.unshift({id:'demo-pg-'+Date.now(),title,target_minutes:target,doneMinutes:0,due_date,created_at:new Date().toISOString()});persistDemo();closeModal();render();hapticToast('Goal saved. Every focused minute can count.');return;}
    try{const {error}=await state.supabase.from('personal_goals').insert({user_id:state.user.id,title,target_minutes:target,due_date});if(error)throw error;await refreshCloudData();closeModal();render();hapticToast('Personal goal saved online.');}catch(err){hapticToast('Could not save goal: '+err.message);}
  }
  async function createTask(form) {
    const fd=new FormData(form), title=String(fd.get('title')||'').trim(), due_date=String(fd.get('due')||'')||null;if(!title)return;
    if(localMode()){state.demo.tasks.unshift({id:'demo-task-'+Date.now(),title,done:false,due_date});persistDemo();closeModal();render();hapticToast('Task added. One small step!');return;}
    try{const {error}=await state.supabase.from('study_tasks').insert({user_id:state.user.id,title,due_date,done:false});if(error)throw error;await refreshCloudData();closeModal();render();hapticToast('Task saved online.');}catch(err){hapticToast('Could not add task: '+err.message);}
  }
  async function addFriend(form) {
    const username=String(new FormData(form).get('username')||'').trim().replace(/^@/,'').toLowerCase();if(username.length<3){hapticToast('Enter a username with at least 3 characters.');return;}
    if(localMode()){
      const found=state.demo.friends.find(f=>f.username.toLowerCase()===username);
      if(found){closeModal();hapticToast(`${found.display_name} is already in your demo circle.`);return;}
      state.demo.requests.unshift({id:'demo-r-'+Date.now(),username,display_name:username.split(/[._]/)[0],direction:'outgoing',status:'pending'});persistDemo();closeModal();render();hapticToast('Demo friend request created.');return;
    }
    try{const {data:friend,error:qErr}=await state.supabase.from('profiles').select('id,username').ilike('username',username).maybeSingle();if(qErr)throw qErr;if(!friend)throw new Error('No account found with that username. Ask your friend to check their exact username.');if(friend.id===state.user.id)throw new Error('That is your own username.');const {error}=await state.supabase.from('friendships').insert({requester_id:state.user.id,addressee_id:friend.id,status:'pending'});if(error){if(/duplicate/i.test(error.message))throw new Error('A request already exists.');throw error;}await refreshCloudData();closeModal();render();hapticToast('Friend request sent!');}catch(err){hapticToast(err.message);}
  }
  async function acceptFriend(id) {
    if(localMode()){const r=state.demo.requests.find(x=>x.id===id);if(r){r.status='accepted';r.direction='accepted';state.demo.friends.push({id:'demo-f-'+Date.now(),username:r.username||'new.friend',display_name:r.display_name||'New friend',status:'accepted',weekMinutes:0,todayMinutes:0,isStudying:false});state.demo.requests=state.demo.requests.filter(x=>x.id!==id);persistDemo();render();hapticToast('Friend added to your circle.');}return;}
    try{const {error}=await state.supabase.from('friendships').update({status:'accepted'}).eq('id',id).eq('addressee_id',state.user.id);if(error)throw error;await refreshCloudData();render();hapticToast('Friend request accepted.');}catch(err){hapticToast(err.message);}
  }
  async function toggleTask(id,done) {
    if(localMode()){const task=state.demo.tasks.find(t=>t.id===id);if(task){task.done=done;persistDemo();render();}return;}
    try{const {error}=await state.supabase.from('study_tasks').update({done}).eq('id',id).eq('user_id',state.user.id);if(error)throw error;await refreshCloudData();render();}catch(err){hapticToast(err.message);}
  }
  async function deleteTask(id) {
    if(localMode()){state.demo.tasks=state.demo.tasks.filter(t=>t.id!==id);persistDemo();render();return;}
    try{const {error}=await state.supabase.from('study_tasks').delete().eq('id',id).eq('user_id',state.user.id);if(error)throw error;await refreshCloudData();render();}catch(err){hapticToast(err.message);}
  }
  function startTimer() {
    if(state.timer.running)return;
    if(!state.timer.elapsedSeconds) {
      state.timer.mode=state.focusMode||'pomodoro';
      state.timer.subject=state.focusSubject||'Mathematics';
      state.timer.groupId=state.focusGroupId||'';
      state.timer.personalGoalId=state.focusGroupId?'':(state.focusGoalId||'');
      if(state.timer.mode!=='custom') state.timer.targetSeconds=({pomodoro:1500,deep:3000,long:5400,break:300,stopwatch:0})[state.timer.mode]??1500;
      state.timer.elapsedSeconds=0;
    }
    state.timer.startedAt=Date.now();state.timer.running=true;persistTimer();
    if(!localMode()) { if(state.timer.remoteId) updateRemoteTimer(false).catch(err=>console.warn(err)); else createRemoteActiveSession().catch(err=>{console.warn(err);hapticToast('Timer running, but cloud session could not start.');}); }
    render();hapticToast(`${state.timer.mode==='break'?'Break':'Focus'} session started. You’ve got this!`);
  }
  async function createRemoteActiveSession() {
    if(localMode()||state.timer.remoteId)return;
    const {data,error}=await state.supabase.from('study_sessions').insert({user_id:state.user.id,group_id:state.timer.groupId||null,personal_goal_id:state.timer.groupId?null:(state.timer.personalGoalId||null),subject:state.timer.subject||'Other',started_at:new Date(state.timer.startedAt).toISOString(),ended_at:null,duration_minutes:0,is_paused:false}).select('id').single();
    if(error)throw error;state.timer.remoteId=data.id;persistTimer();
  }
  async function updateRemoteTimer(isPaused,finishMinutes=null) {
    if(localMode()||!state.timer.remoteId||!state.supabase)return;
    const update=isPaused?{is_paused:true}:{is_paused:false};
    if(finishMinutes!==null){update.is_paused=false;update.ended_at=new Date().toISOString();update.duration_minutes=Math.max(0,Math.floor(finishMinutes));}
    const {error}=await state.supabase.from('study_sessions').update(update).eq('id',state.timer.remoteId).eq('user_id',state.user.id);if(error)throw error;
  }
  async function pauseTimer() {
    const t=state.timer;if(!t.running)return;
    t.elapsedSeconds=timerElapsed();t.running=false;t.startedAt=null;persistTimer();
    if(t.remoteId&&!localMode())try{await updateRemoteTimer(true);}catch(e){hapticToast('Paused locally. Cloud update will retry when you finish.');}
    render();hapticToast('Timer paused. Take a breath.');
  }
  function playEndTone() { if(!state.soundOn)return;try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;const ctx=new AudioCtx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=660;gain.gain.value=.07;osc.connect(gain);gain.connect(ctx.destination);osc.start();setTimeout(()=>{osc.stop();ctx.close();},180);}catch(_){} }
  async function finishTimer(auto=false) {
    const t=state.timer, mins=Math.max(0,Math.floor(timerElapsed()/60));
    if(!mins){const remoteId=t.remoteId; if(remoteId&&!localMode()&&state.supabase){try{await state.supabase.from('study_sessions').update({ended_at:new Date().toISOString(),duration_minutes:0,is_paused:false}).eq('id',remoteId).eq('user_id',state.user.id);}catch(_){}}state.timer={running:false,startedAt:null,elapsedSeconds:0,targetSeconds:1500,mode:'pomodoro',subject:t.subject||'Mathematics',groupId:'',personalGoalId:'',remoteId:null};persistTimer();render();if(!auto)hapticToast('Session under a minute ended; no study minutes were added.');return;}
    t.elapsedSeconds=timerElapsed();t.running=false;t.startedAt=null;
    const session={id:'demo-session-'+Date.now(),user_id:localMode()?'local-user':state.user.id,group_id:t.groupId||null,personal_goal_id:t.groupId?null:(t.personalGoalId||null),subject:t.subject||'Other',started_at:new Date(Date.now()-t.elapsedSeconds*1000).toISOString(),ended_at:new Date().toISOString(),duration_minutes:mins};
    if(localMode()) {
      state.demo.sessions.unshift(session);
      if(t.groupId){const g=state.demo.groups.find(x=>x.id===t.groupId);if(g)g.doneMinutes=(g.doneMinutes||0)+mins;}
      else { const g=state.demo.personalGoals.find(x=>x.id===t.personalGoalId); if(g)g.doneMinutes=(g.doneMinutes||0)+mins; }
      persistDemo();
    } else {
      try {
        if(t.remoteId) { const {error}=await state.supabase.from('study_sessions').update({ended_at:new Date().toISOString(),duration_minutes:mins,is_paused:false}).eq('id',t.remoteId).eq('user_id',state.user.id); if(error)throw error; }
        else { const {error}=await state.supabase.from('study_sessions').insert({...session,id:undefined,user_id:state.user.id}); if(error)throw error; }
        await refreshCloudData();
      } catch(err) { hapticToast('Could not save to cloud: '+err.message); }
    }
    state.timer={running:false,startedAt:null,elapsedSeconds:0,targetSeconds:1500,mode:'pomodoro',subject:t.subject||'Mathematics',groupId:'',personalGoalId:'',remoteId:null};state.focusMode='pomodoro';state.focusGroupId='';state.focusGoalId='';persistTimer();playEndTone();render();
    if(autoBreak&&t.mode!=='break'&&t.mode!=='stopwatch') hapticToast(`Nice work — ${compactHours(mins)} focused. Take a short break!`); else hapticToast(`Session saved · ${compactHours(mins)} focused. Nice work!`);
  }
  function setTimerMode(mode) {
    if(state.timer.running||timerElapsed()>0||state.timer.remoteId){hapticToast('Finish your current session before changing timer mode.');return;}
    const cfg={pomodoro:1500,deep:3000,long:5400,stopwatch:0,break:300};
    state.focusMode=mode;state.timer.mode=mode;state.timer.targetSeconds=cfg[mode]??1500;state.timer.elapsedSeconds=0;state.timer.startedAt=null;state.timer.subject=state.focusSubject;state.timer.groupId=state.focusGroupId;persistTimer();render();
  }
  function showInvite(id) { const g=allGroups().find(x=>x.id===id);if(g)modalInvite(g); }
  async function copyText(text) {
    try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);hapticToast('Copied to clipboard!');return;}}catch(_){}
    const box=document.createElement('textarea');box.value=text;box.style.position='fixed';box.style.opacity='0';document.body.appendChild(box);box.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}box.remove();hapticToast(ok?'Copied to clipboard!':'Copy unavailable here — select and copy the code.');
  }
  function exportData() { const data={exportedAt:new Date().toISOString(),mode:localMode()?'demo':'cloud',profile:currentProfile(),groups:allGroups(),groupGoals:allGroupGoals(),personalGoals:allPersonalGoals(),friends:allFriends(),sessions:allSessions(),tasks:allTasks()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='focusora-study-data.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);hapticToast('Export started.'); }
  async function saveProfile(form) {
    const fd=new FormData(form),display_name=String(fd.get('displayName')||'').trim(),username=String(fd.get('username')||'').trim().toLowerCase();
    if(!/^[a-z0-9_.]{3,24}$/.test(username)){hapticToast('Use 3–24 letters, numbers, dots, or underscores.');return;}
    if(localMode()){state.demo.profile.display_name=display_name;state.demo.profile.username=username;persistDemo();render();hapticToast('Your local profile is updated.');return;}
    try{const {data,error}=await state.supabase.from('profiles').update({display_name,username}).eq('id',state.user.id).select().single();if(error)throw error;state.profile=data;await refreshCloudData();render();hapticToast('Profile saved online.');}catch(err){hapticToast('Could not save profile: '+err.message);}
  }
  function addQuickTask() { const input=$('#quickTaskInput'),title=input?.value.trim();if(!title){hapticToast('Write a task first.');return;}if(localMode()){state.demo.tasks.unshift({id:'demo-task-'+Date.now(),title,done:false,due_date:null});persistDemo();render();hapticToast('Task added.');}else{state.supabase.from('study_tasks').insert({user_id:state.user.id,title,done:false}).then(async r=>{if(r.error)hapticToast(r.error.message);else{await refreshCloudData();render();hapticToast('Task saved online.');}});} }

  document.addEventListener('click', async event => {
    const nav=event.target.closest('[data-nav]'); if(nav){go(nav.dataset.nav);return;}
    const el=event.target.closest('[data-action]'); if(!el)return;
    const a=el.dataset.action;
    if(a==='close-modal'){closeModal();return;}
    if(a==='create-group'){modalGroup();return;}
    if(a==='join-group'){modalJoinGroup();return;}
    if(a==='create-goal'){modalGoal();return;}
    if(a==='create-task'){modalTask();return;}
    if(a==='add-friend'){modalFriend();return;}
    if(a==='auth'){if(!state.supabase){closeModal();go('settings');hapticToast('Connect your Supabase project first.');return;}modalAuth(el.dataset.authMode||'signin');return;}
    if(a==='signout'){await signOut();return;}
    if(a==='timer-toggle'){if(state.timer.running)await pauseTimer();else startTimer();return;}
    if(a==='timer-stop'){await finishTimer();return;}
    if(a==='timer-mode'){setTimerMode(el.dataset.mode);return;}
    if(a==='apply-custom-timer'){const field=$('#focusCustomMinutes');const n=Number(field?.value);if(!Number.isFinite(n)||n<1||n>240){hapticToast('Choose 1–240 minutes.');return;}if(state.timer.running||timerElapsed()>0||state.timer.remoteId){hapticToast('Finish your current session before changing the timer.');return;}state.timer.mode='custom';state.timer.targetSeconds=Math.round(n)*60;state.timer.elapsedSeconds=0;state.timer.startedAt=null;state.focusMode='custom';persistTimer();render();hapticToast(`Custom timer set to ${n} minutes.`);return;}
    if(a==='start-quick'){state.focusMode='pomodoro';state.timer.mode='pomodoro';state.timer.targetSeconds=1500;go('focus');if(!state.timer.elapsedSeconds)startTimer();return;}
    if(a==='study-with-group'){const group=allGroups().find(g=>g.id===el.dataset.id);if(!group)return;if(state.timer.running||timerElapsed()>0){hapticToast('Finish your current session before switching groups.');closeModal();go('focus');return;}closeModal();state.focusGroupId=group.id;state.focusGoalId='';state.timer.groupId=group.id;state.timer.personalGoalId='';state.focusSubject=state.timer.subject||'Mathematics';state.timer.mode='pomodoro';state.timer.targetSeconds=1500;state.timer.elapsedSeconds=0;persistTimer();go('focus');return;}
    if(a==='open-group'){const g=allGroups().find(x=>x.id===el.dataset.id);if(g)modalGroupDetail(g);return;}
    if(a==='show-invite'){showInvite(el.dataset.id);return;}
    if(a==='copy-invite'){const g=allGroups().find(x=>x.id===el.dataset.id);if(g)await copyText(`Join my Focusora study group: ${g.name}\nInvite code: ${g.invite_code}\nShared goal: ${compactHours(groupGoalTarget(g))}. Let's study together!`);return;}
    if(a==='share-profile'){await copyText(`Let's study together on Focusora! Find me as @${currentProfile().username||'student'}.`);return;}
    if(a==='accept-friend'){await acceptFriend(el.dataset.id);return;}
    if(a==='focus-goal'){state.focusGoalId=el.dataset.id;state.timer.personalGoalId=el.dataset.id;state.focusGroupId='';state.timer.groupId='';persistTimer();go('focus');hapticToast('Focus sessions will count toward this goal.');return;}
    if(a==='toggle-task'){return;}
    if(a==='delete-task'){await deleteTask(el.dataset.id);return;}
    if(a==='quick-add-task'){addQuickTask();return;}
    if(a==='toggle-auto-break'){state.autoBreak=!state.autoBreak;render();return;}
    if(a==='toggle-sound'){state.soundOn=!state.soundOn;render();hapticToast(state.soundOn?'Timer sound enabled.':'Timer sound disabled.');return;}
    if(a==='toggle-motion'){state.reduceMotion=!state.reduceMotion;render();return;}
    if(a==='theme'){state.theme=el.dataset.theme||'warm';render();hapticToast('Appearance updated.');return;}
    if(a==='refresh-cloud'){if(state.user){await refreshCloudData();render();hapticToast('Cloud data refreshed.');}else hapticToast('Sign in to refresh cloud data.');return;}
    if(a==='export-data'){exportData();return;}
    if(a==='reset-demo'){if(!confirm('Reset local demo data on this device? This will remove your demo groups, tasks, and sessions.'))return;state.demo=starterDemo();persistDemo();render();hapticToast('Demo data reset.');return;}
  });
  document.addEventListener('change', async event => {
    const t=event.target;
    if(t.matches('[data-action="toggle-task"]')){event.stopPropagation();await toggleTask(t.dataset.id,t.checked);return;}
    if(t.id==='focusSubject'){if(state.timer.running||timerElapsed()>0){hapticToast('Finish your current session before changing the subject.');render();return;}state.focusSubject=t.value;state.timer.subject=t.value;persistTimer();const chip=$('#timerSubjectChip');if(chip){const g=allGroups().find(x=>x.id===state.focusGroupId);chip.textContent=`${t.value} · ${g?g.name:'Solo focus'}`;}return;}
    if(t.id==='focusGroup'){if(state.timer.running||timerElapsed()>0){hapticToast('Finish your current session before changing groups.');render();return;}state.focusGroupId=t.value;state.timer.groupId=t.value;if(t.value){state.focusGoalId='';state.timer.personalGoalId='';if($('#focusGoal'))$('#focusGoal').value='';}persistTimer();const chip=$('#timerSubjectChip');if(chip){const g=allGroups().find(x=>x.id===t.value);chip.textContent=`${state.focusSubject} · ${g?g.name:'Solo focus'}`;}return;}
    if(t.id==='focusGoal'){if(state.timer.running||timerElapsed()>0){hapticToast('Finish your current session before changing goals.');render();return;}state.focusGoalId=t.value;state.timer.personalGoalId=t.value;if(t.value){state.focusGroupId='';state.timer.groupId='';if($('#focusGroup'))$('#focusGroup').value='';}persistTimer();return;}
  });
  document.addEventListener('submit', async event => {
    const form=event.target;event.preventDefault();
    if(form.id==='createGroupForm'){await createGroup(form);return;}
    if(form.id==='joinGroupForm'){await joinGroup(form);return;}
    if(form.id==='createGoalForm'){await createGoal(form);return;}
    if(form.id==='createTaskForm'){await createTask(form);return;}
    if(form.id==='addFriendForm'){await addFriend(form);return;}
    if(form.id==='authForm'){await authSubmit(form);return;}
    if(form.id==='profileForm'){await saveProfile(form);return;}
    if(form.id==='cloudForm'){const url=$('#supabaseUrl').value,key=$('#supabaseAnon').value;const ok=await connectCloud(url,key);if(ok&&state.user)go('settings');return;}
  });
  $('#modalBackdrop').addEventListener('click',e=>{if(e.target===$('#modalBackdrop'))closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modalBackdrop').hidden)closeModal();});

  async function bootstrap() {
    applyTheme();
    const url=localStorage.getItem(CONFIG_URL_KEY),key=localStorage.getItem(CONFIG_ANON_KEY);
    if(url&&key&&window.supabase?.createClient){
      try{
        state.supabase=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
        const {data,error}=await state.supabase.auth.getSession();if(error)throw error;state.user=data.session?.user||null;state.online=!!state.user;
        state.supabase.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;state.online=!!state.user;setTimeout(async()=>{if(state.user){await ensureProfile();await refreshCloudData();setupRealtime();}render();},0);});
        if(state.user){await ensureProfile();await refreshCloudData();setupRealtime();}
      }catch(err){console.warn('Cloud connection:',err.message);state.supabase=null;state.online=false;state.user=null;}
    }
    render();
    setInterval(()=>{
      if(state.timer.running && state.timer.mode!=='stopwatch' && timerRemaining()<=0){finishTimer(true);return;}
      const display=$('#timerDisplay');if(display){const value=state.timer.mode==='stopwatch'?clock(timerElapsed()):smallClock(timerRemaining());display.textContent=value;}
      const homeMini=$('#homeTimerValue');if(homeMini)homeMini.textContent=state.timer.mode==='stopwatch'?clock(timerElapsed()):smallClock(timerRemaining());
    },1000);
    window.addEventListener('online',()=>{if(state.user)refreshCloudData().then(render).catch(()=>{});});
  }
  bootstrap();
})();
