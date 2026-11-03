/* MedSpa Reels on-site checkout (2 Nov 2026). Buyers never leave medspareels.com: every link to
   https://whop.com/checkout/plan_... opens this popup instead.
   Step 1: the plan plus the add-ons as checkboxes, with the total. Step 2: Whop Elements checkout for
   the whole cart (core plan + ticked add-ons, one charge, one membership per product), so deliver.py
   sees each add-on as its own Whop membership.
   On a month page or the welcome page (data-msr-mode="addons") the popup sells add-ons only, hiding any already
   bought (?add=ads,reviews on the URL). ?buy=1 on the URL opens the popup on load: DM and email buy links land here,
   so every buyer sees the add-ons before paying.
   If Elements fails to load or draw within 12 s, the buyer goes to Whop's hosted checkout for the core
   plan (nothing is lost). Purchase fires in the browser with eventID = the Whop payment id. */
(function(){
  var CORE='plan_9EmYqBPJpd9gK', PROMO='FIRSTMONTH79', FIRST=79, MONTHLY=149;
  var ADDONS=[ /* plan ids from pipeline/addons.json */
    {k:'ads',why:'Run Meta ads without hiring an editor or writing copy.',plan:'plan_jRnpX8EaTBfwq',name:'Ad-ready cuts',price:49,line:'3 reels a month re-cut for Meta ads, with ad copy'},
    {k:'reviews',why:'Your happiest clients already wrote your best marketing. Put it on Instagram.',plan:'plan_X9i1lK3vRJBk2',name:'Review reels',price:39,line:'Up to 4 reels a month from your Google reviews'},
    {k:'stories',why:'Show up in your followers\u2019 Stories every time you post, with no extra work.',plan:'plan_Etp3F4AOFRtqd',name:'Matching Stories',price:29,line:'A Story image for every reel'}];
  /* ?test=<code> on the page: owner's end-to-end test with a 100%-off Whop code. No pixel events, welcome page marked test. */
  var TEST=new URLSearchParams(location.search).get('test')||'';
  var me=document.currentScript, ADDON_ONLY=!!(me&&me.getAttribute('data-msr-mode')==='addons');
  var OWNED=(new URLSearchParams(location.search).get('add')||'').split(',').filter(Boolean);
  /* add-ons bought from this browser on an add-ons page are remembered, so a static month page doesn't offer them again */
  try{OWNED=OWNED.concat(JSON.parse(localStorage.getItem('msr_owned')||'[]'))}catch(e){}
  var RX=/whop\.com\/checkout\/(plan_[A-Za-z0-9]{6,30})/;
  var css='.msco{position:fixed;inset:0;z-index:300;background:rgba(44,34,32,.62);display:grid;place-items:center;padding:16px}'+
    '.msco[hidden]{display:none}.msco-box{box-sizing:border-box;width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:20px;padding:20px;display:grid;gap:14px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif;color:#2c2220}'+
    '.msco-top{display:flex;justify-content:space-between;align-items:center;gap:12px}.msco-top b{font-family:"Cormorant Garamond",Georgia,serif;font-size:26px;font-weight:600}'+
    '.msco-x{background:none;border:1px solid #ead9cf;border-radius:999px;width:36px;height:36px;font-size:18px;cursor:pointer;color:#2c2220;flex:none}'+
    '.msco-plan{background:#faf4ee;border:1px solid #ead9cf;border-radius:14px;padding:14px 16px}.msco-plan h4{font-size:16px;margin:0 0 2px}.msco-plan p{font-size:13px;color:#6f625e;margin:0}'+
    '.msco-h{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#a8675f;margin:2px 0 -4px}'+
    '.msco-add{display:flex;gap:12px;align-items:flex-start;border:1px solid #ead9cf;border-radius:14px;padding:12px 14px;cursor:pointer;transition:border-color .15s,background .15s}'+
    '.msco-add:has(input:checked){border-color:#a8675f;background:#fdf8f5}.msco-add input{margin-top:3px;width:18px;height:18px;accent-color:#a8675f;flex:none}'+
    '.msco-add span{display:grid;gap:2px;font-size:14px}.msco-add small{color:#6f625e;font-size:13px}.msco-add em{font-style:normal;color:#a8675f;font-weight:600;margin-left:auto;white-space:nowrap;font-size:14px}'+
    '.msco-bar{position:sticky;bottom:-20px;margin:0 -20px -20px;padding:0 20px 20px;background:#fff;display:grid;gap:12px;box-shadow:0 -14px 18px -12px rgba(0,0,0,.12);z-index:1}.msco-why{display:block;font-style:normal;font-size:14px;line-height:1.4;color:#2c2220;margin:2px 0}.msco-tot{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #ead9cf;padding-top:12px;font-size:14px}.msco-tot b{font-size:20px}.msco-tot small{display:block;color:#6f625e;font-size:12px;text-align:right}'+
    '.msco-go{background:#2c2220;color:#fff;border:0;border-radius:999px;padding:15px 18px;font:600 16px Inter,system-ui,sans-serif;cursor:pointer;width:100%}.msco-go:disabled{opacity:.45;cursor:default}'+
    '.msco-back{background:none;border:0;color:#a8675f;font:500 14px Inter,system-ui,sans-serif;cursor:pointer;justify-self:start;padding:0}'+
    '.msco-wait{color:#6f625e;font-size:14px;text-align:center;padding:40px 0}.msco-wait[hidden],.msco-step[hidden]{display:none}#msco-mount{min-height:380px}'+
    '.msco-foot{font-size:12px;color:#6f625e;text-align:center;margin:0}html.msco-open,html.msco-open body{overflow:hidden}'+
    '.msco-step{display:grid;gap:12px}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var adds=ADDONS.map(function(a){return '<label class="msco-add"><input type="checkbox" value="'+a.k+'"><span><b>'+a.name+'</b>'+(a.why?'<i class="msco-why">'+a.why+'</i>':'')+'<small>'+a.line+'</small></span><em>+$'+a.price+'/mo</em></label>'}).join('');
  var co=document.createElement('div');co.className='msco';co.hidden=true;co.setAttribute('role','dialog');co.setAttribute('aria-modal','true');co.setAttribute('aria-label','Checkout');
  co.innerHTML='<div class="msco-box"><div class="msco-top"><b id="msco-t">Your plan</b><button class="msco-x" type="button" aria-label="Close checkout">×</button></div>'+
    '<div class="msco-step" id="msco-s1">'+
      (ADDON_ONLY?'':'<div class="msco-plan"><h4>MedSpa Reels: 12 finished reels a month</h4><p>$'+FIRST+' your first month, then $'+MONTHLY+'/month. Cancel anytime.</p></div>')+
      '<p class="msco-h">'+(ADDON_ONLY?'Add to your plan':'Add more, if you want it')+'</p>'+adds+
      '<div class="msco-bar"><div class="msco-tot"><span>Today</span><span><b id="msco-today"></b><small id="msco-then"></small></span></div>'+
      '<button class="msco-go" id="msco-go" type="button">Continue to payment</button>'+
      '<p class="msco-foot">Secure checkout by Whop · Add-ons arrive with your monthly reels</p></div></div>'+
    '<div class="msco-step" id="msco-s2" hidden><button class="msco-back" id="msco-back" type="button">← Change add-ons</button>'+
      '<p class="msco-wait" id="msco-wait">Loading secure checkout…</p><div id="msco-mount"></div>'+
      '<p class="msco-foot">Secure checkout by Whop · Cancel anytime</p></div></div>';
  document.body.appendChild(co);
  function $(id){return co.querySelector('#'+id)}
  var s1=$('msco-s1'),s2=$('msco-s2'),mountEl=$('msco-mount'),wait=$('msco-wait'),title=$('msco-t'),go=$('msco-go');
  if(ADDON_ONLY)OWNED.forEach(function(k){[].slice.call(document.querySelectorAll('[data-msr-addon="'+k+'"]')).forEach(function(el){el.remove()})});
  var boxes=[].slice.call(co.querySelectorAll('.msco-add input'));
  /* add-ons-only pages offer just the add-ons linked on the page (deliver.py lists only ones not yet bought;
     welcome.html drops owned ones before this runs), so a customer can never buy one twice */
  if(ADDON_ONLY){var onPage=[].slice.call(document.querySelectorAll('a[href*="whop.com/checkout/"]')).map(function(a){var m=a.href.match(RX);return m&&m[1]});
    boxes=boxes.filter(function(b){var a=ADDONS.filter(function(x){return x.k===b.value})[0];
      if(OWNED.indexOf(b.value)<0&&onPage.indexOf(a.plan)>=0)return true;b.closest('label').remove();return false})}
  var sdk=null,sdkWait=[],handle=null,timer=0,lastFocus=null;
  function fb(){if(TEST)return;try{if(window.fbq&&typeof PIXEL_ID!=='undefined'&&PIXEL_ID!=='PIXEL_ID')fbq.apply(null,arguments)}catch(e){}}
  function picked(){return ADDONS.filter(function(a){return boxes.some(function(b){return b.checked&&b.value===a.k})})}
  function totals(){var add=picked().reduce(function(s,a){return s+a.price},0);
    return ADDON_ONLY?{today:add,then:add}:{today:FIRST+add,then:MONTHLY+add}}
  function paint(){var t=totals();$('msco-today').textContent='$'+t.today;
    $('msco-then').textContent=ADDON_ONLY?(t.then?'then $'+t.then+'/month':''):'then $'+t.then+'/month';
    go.disabled=ADDON_ONLY&&!t.today}
  boxes.forEach(function(b){b.addEventListener('change',paint)});
  function bail(){location.href='https://whop.com/checkout/'+CORE+'/?promoCode='+PROMO}
  function loadSdk(cb){if(sdk){cb(sdk);return}sdkWait.push(cb);if(sdkWait.length>1)return;
    var s=document.createElement('script');s.src='https://cdn.whop.com/elements/amber/elements.js';s.async=true;s.setAttribute('data-whop-elements','');
    s.onload=function(){try{sdk=window.WhopElements({locale:'en'})}catch(e){sdk=null}if(!sdk){bail();return}var w=sdkWait;sdkWait=[];w.forEach(function(f){f(sdk)})};
    s.onerror=bail;document.head.appendChild(s)}
  function unmount(){clearTimeout(timer);if(handle){try{handle.destroy()}catch(e){}}handle=null;mountEl.innerHTML=''}
  function cart(){var items=(ADDON_ONLY?[]:[{plan:CORE}]).concat(picked().map(function(a){return {plan:a.plan}}));return items}
  function done(r){var t=totals(),p=picked(),id=(r&&r.paymentId)||'';
    fb('track','Purchase',{value:t.today,currency:'USD',content_name:'MedSpa Reels'+(p.length?' + '+p.map(function(a){return a.name}).join(' + '):''),
      content_ids:cart().map(function(i){return i.plan}),content_type:'product',num_items:cart().length},id?{eventID:id}:undefined);
    setTimeout(function(){
      if(!ADDON_ONLY){var qs=[];if(p.length)qs.push('add='+p.map(function(a){return a.k}).join(','));if(TEST)qs.push('test=1');if(r&&r.paymentId)qs.push('pay='+encodeURIComponent(r.paymentId));location.href='/welcome.html'+(qs.length?'?'+qs.join('&'):'');return}
      if(!TEST)try{localStorage.setItem('msr_owned',JSON.stringify(OWNED.concat(p.map(function(a){return a.k}))))}catch(e){}
      unmount();wait.hidden=true;title.textContent="Added";
      mountEl.innerHTML='<div style="text-align:center;padding:16px 4px"><p style="font-size:16px;margin:0 0 6px"><b>'+p.map(function(a){return a.name}).join(', ')+'</b> '+(p.length>1?'are':'is')+' now part of your plan.</p>'+
        '<p style="color:#6f625e;margin:0 0 16px">'+(p.some(function(a){return a.k==='reviews'})?'Send us your Google reviews on the next page. ':'')+'They arrive with your next monthly reels.</p>'+
        '<a class="msco-go" id="msco-done" style="display:inline-block;width:auto;text-decoration:none;padding:12px 22px" href="'+(p.some(function(a){return a.k==='reviews'})?'/reviews.html':'#')+'">'+(p.some(function(a){return a.k==='reviews'})?'Send reviews':'Done')+'</a></div>';
      var dn=$('msco-done');if(dn&&dn.getAttribute('href')==='#')dn.addEventListener('click',function(e){e.preventDefault();close();
        p.forEach(function(a){var el=document.querySelector('[data-msr-addon="'+a.k+'"]');if(el)el.remove()});
        var b=document.getElementById('msr-more');if(b&&!b.querySelector('[data-msr-addon]'))b.remove()});
      p.forEach(function(a){boxes=boxes.filter(function(x){if(x.value!==a.k)return true;x.closest('label').remove();return false})});},450)}
  function pay(){var t=totals();s1.hidden=true;s2.hidden=false;title.textContent='Checkout';unmount();wait.hidden=false;
    fb('track','InitiateCheckout',{value:t.today,currency:'USD',content_name:'MedSpa Reels',content_ids:cart().map(function(i){return i.plan}),num_items:cart().length});
    loadSdk(function(w){
      try{var opt={items:cart(),returnUrl:location.origin+location.pathname+'?'+(TEST?'test='+encodeURIComponent(TEST)+'&':'')+'checkout=done&add='+picked().map(function(a){return a.k}).join(','),
          appearance:{theme:{appearance:'light',accentColor:'tomato',grayColor:'auto'}},onComplete:done};
        if(TEST)opt.promoCode=TEST;else if(!ADDON_ONLY)opt.promoCode=PROMO;
        handle=w.checkout.create(opt);
        handle.create('checkout',{onReady:function(){clearTimeout(timer);wait.hidden=true},onError:bail}).mount(mountEl);}catch(e){bail();return}
      timer=setTimeout(function(){if(!wait.hidden)bail()},12000);});}
  go.addEventListener('click',pay);
  $('msco-back').addEventListener('click',function(){unmount();s2.hidden=true;s1.hidden=false;title.textContent=ADDON_ONLY?'Add to your plan':'Your plan'});
  function open(pre){lastFocus=document.activeElement;
    boxes.forEach(function(b){b.checked=pre.indexOf(b.value)>=0});paint();
    s1.hidden=false;s2.hidden=true;title.textContent=ADDON_ONLY?'Add to your plan':'Your plan';
    co.hidden=false;document.documentElement.classList.add('msco-open');co.querySelector('.msco-x').focus()}
  function close(){unmount();co.hidden=true;document.documentElement.classList.remove('msco-open');if(lastFocus)lastFocus.focus()}
  window.msrCheckout=open;
  co.querySelector('.msco-x').addEventListener('click',close);
  co.addEventListener('click',function(e){if(e.target===co)close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!co.hidden)close()});
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||e.metaKey||e.ctrlKey||e.shiftKey)return;
    var m=a.href.match(RX);if(!m)return;e.preventDefault();
    var hit=ADDONS.filter(function(x){return x.plan===m[1]})[0];open(hit?[hit.k]:[])});
  /* back from a 3DS / bank page: Elements returns here with status=succeeded */
  var q=new URLSearchParams(location.search);
  if(q.get('checkout')==='done'){var ok=/succeeded|success/.test(q.get('status')||'');
    boxes.forEach(function(b){b.checked=(q.get('add')||'').split(',').indexOf(b.value)>=0});
    history.replaceState(null,'',location.pathname);
    if(ok){co.hidden=false;document.documentElement.classList.add('msco-open');s1.hidden=true;s2.hidden=false;done({paymentId:q.get('payment')||''})}}
  else if(q.get('buy')&&!ADDON_ONLY){q.delete('buy');history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''));open([])}
})();
