const euro = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const euro2 = n => new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2}).format(n);
const COLORS = {Argia:'#B49A72',Basoa:'#5F6E52',Itsaso:'#3C5A7A',Lasai:'#8A6E4B',Izar:'#545B86',Haize:'#6FA3A0',Ibai:'#3E7C8C',Aritz:'#7A5C3A',Lorategia:'#2B3A2E',Lur:'#9A7B53'};
const rooms = PANEL.rooms;
function activeRooms(){return rooms.filter(r=>r.active);}
const today = new Date(PANEL.today + 'T00:00:00');
let calY = today.getFullYear(), calM = today.getMonth();
const d = (y,m,day)=>new Date(y,m,day);
const ymd = dt => dt.toISOString().slice(0,10);
const nights = (a,b)=>Math.round((new Date(b)-new Date(a))/86400000);

// sample bookings
let bookings = PANEL.bookings;
// sample monthly revenue (incl. demo history)
const monthRev = PANEL.monthRev;
let invoices = PANEL.invoices;
let expenses = PANEL.expenses;
function absRand(x){return x}

/* ---------- NAV ---------- */
const titles={reservas:['Reservas','Calendario de ocupación por habitación'],ingresos:['Ingresos','Evolución y desglose de ingresos'],facturas:['Facturas','Emisión y seguimiento de facturas'],contabilidad:['Contabilidad','Ingresos, gastos y resultado'],habitaciones:['Habitaciones','Tarifas y configuración'],clientes:['Clientes','Base de datos y email marketing']};
document.querySelectorAll('.nav-it').forEach(it=>it.onclick=()=>{
  document.querySelectorAll('.nav-it').forEach(x=>x.classList.remove('on'));it.classList.add('on');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.getElementById('v-'+it.dataset.v).classList.add('on');
  document.getElementById('vtitle').textContent=titles[it.dataset.v][0];
  document.getElementById('vsub').textContent=titles[it.dataset.v][1];
});

/* ---------- CALENDAR ---------- */
const MES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function renderCal(){
  const dim=new Date(calY,calM+1,0).getDate();
  document.getElementById('calMonth').textContent=MES[calM]+' '+calY;
  let h='<tr><th class="rh">Habitación</th>';
  for(let i=1;i<=dim;i++){const wd=new Date(calY,calM,i).getDay();h+=`<th class="dh${(wd===0||wd===6)?' we':''}">${i}</th>`;}
  h+='</tr>';
  activeRooms().forEach(r=>{
    h+=`<tr><td class="rh"><span class="dot" style="background:${COLORS[r.id]}"></span>${r.id} <span class="muted" style="font-size:11px">·${r.cap}p</span></td>`;
    for(let i=1;i<=dim;i++){const wd=new Date(calY,calM,i).getDay();h+=`<td class="cell${(wd===0||wd===6)?' we':''}" data-r="${r.id}" data-d="${i}"></td>`;}
    h+='</tr>';
  });
  const t=document.getElementById('calTable');t.innerHTML=h;
  // place bookings
  bookings.forEach(b=>{
    const ci=new Date(b.in), co=new Date(b.out);
    if(co<=new Date(calY,calM,1)||ci>=new Date(calY,calM+1,1))return;
    const s=Math.max(1, (ci.getFullYear()===calY&&ci.getMonth()===calM)?ci.getDate():1);
    const e=Math.min(dim, (co.getFullYear()===calY&&co.getMonth()===calM)?co.getDate()-1:dim);
    if(e<s)return;
    const startCell=t.querySelector(`td[data-r="${b.room}"][data-d="${s}"]`);
    if(!startCell)return;
    const span=e-s+1;
    const el=document.createElement('div');el.className='bk';
    el.style.background=COLORS[b.room];el.style.right='auto';
    el.style.width=`calc(${span*100}% + ${(span-1)*1}px)`;
    el.title=`${b.name} · ${b.room} · ${b.in}→${b.out}`;
    el.textContent=b.name.split(' ')[0];
    el.onclick=()=>openInvoiceFor(b);
    startCell.appendChild(el);
  });
  // legend
  document.getElementById('calLegend').innerHTML = activeRooms().map(r=>`<span><span class="dot" style="background:${COLORS[r.id]}"></span>${r.id}</span>`).join('');
  // KPIs
  const dimNights=dim*Math.max(1,activeRooms().length);
  let occ=0; bookings.forEach(b=>{for(let day=1;day<=dim;day++){const dd=new Date(calY,calM,day);if(dd>=new Date(b.in)&&dd<new Date(b.out))occ++;}});
  document.getElementById('k-occ').textContent=Math.round(occ/dimNights*100)+'%';
  const th=ymd(today);
  document.getElementById('k-res').textContent=bookings.filter(b=>b.out>=th).length;
  document.getElementById('k-in').textContent=bookings.filter(b=>b.in===th).length;
  document.getElementById('k-out').textContent=bookings.filter(b=>b.out===th).length;
}
document.getElementById('prevM').onclick=()=>{calM--;if(calM<0){calM=11;calY--}renderCal()};
document.getElementById('nextM').onclick=()=>{calM++;if(calM>11){calM=0;calY++}renderCal()};

/* ---------- BOOKINGS TABLE ---------- */
function chTag(ch){const c={'Directa':'#3C7A57','Booking':'#1A4FA0','Expedia/Vrbo':'#B4894A','Teléfono/WhatsApp':'#2B7A6B'}[ch]||'#6C7065';
  return `<span class="chtag" style="background:${c}1F;color:${c}">${ch}</span>`;}
function renderBk(){
  const rowsH=bookings.slice().sort((a,b)=>a.in.localeCompare(b.in)).map(b=>{
    const n=nights(b.in,b.out);const tot=n*b.rate+(b.mp?n*b.guests*25:0);
    const st = b.in> ymd(today)?'<span class="pill in">Confirmada</span>':(b.out>=ymd(today)?'<span class="pill ok">En casa</span>':'<span class="pill">Pasada</span>');
    return `<tr><td><b>${b.name}</b>${(b.email||b.phone)?`<br><span class="muted" style="font-size:11px">${[b.email,b.phone].filter(Boolean).join(" · ")}</span>`:""}</td><td><span class="dot" style="background:${COLORS[b.room]}"></span>${b.room}</td><td>${fmt(b.in)} → ${fmt(b.out)}</td><td>${n} noches</td><td>${b.guests}</td><td>${chTag(b.ch)}</td><td>${st}</td><td class="right"><b>${euro(tot)}</b></td></tr>`;
  }).join('');
  document.getElementById('bkTable').innerHTML=`<thead><tr><th>Huésped</th><th>Habitación</th><th>Fechas</th><th>Noches</th><th>Pax</th><th>Canal</th><th>Estado</th><th class="right">Total</th></tr></thead><tbody>${rowsH}</tbody>`;
}
const fmt = s => {const [y,m,dd]=s.split('-');return `${dd}/${m}`};

/* ---------- INGRESOS ---------- */
function renderIngresos(){
  const vals=Object.values(monthRev);const max=Math.max(...vals);
  document.getElementById('barMonth').innerHTML=Object.entries(monthRev).map(([m,v])=>
    `<div class="bar"><b>${v?euro(v):''}</b><div class="b" style="height:${max?Math.round(v/max*130):0}px;${m==='Jun'?'background:linear-gradient(180deg,#B49A72,#8A6E4B)':''}"></div><small>${m}</small></div>`).join('');
  const perRoom={};rooms.forEach(r=>perRoom[r.id]=0);
  bookings.forEach(b=>{perRoom[b.room]+=nights(b.in,b.out)*b.rate});
  const rmax=Math.max(...Object.values(perRoom),1);
  document.getElementById('barRoom').innerHTML=Object.entries(perRoom).map(([r,v])=>
    `<div class="bar"><b>${euro(v)}</b><div class="b" style="height:${Math.round(v/rmax*130)}px;background:${COLORS[r]}"></div><small>${r}</small></div>`).join('');
  document.getElementById('i-mes').textContent=euro(monthRev.Jun);
  document.getElementById('i-mesd').textContent='+15% vs mayo';
  document.getElementById('i-anio').textContent=euro(vals.reduce((a,b)=>a+b,0));
  const totN=bookings.reduce((a,b)=>a+nights(b.in,b.out),0);
  const totRev=bookings.reduce((a,b)=>a+nights(b.in,b.out)*b.rate,0);
  document.getElementById('i-adr').textContent=euro(Math.round(totRev/totN));
  document.getElementById('i-los').textContent=(totN/bookings.length).toFixed(1);
  // canal
  const ch={};bookings.forEach(b=>{const v=nights(b.in,b.out)*b.rate;ch[b.ch]=(ch[b.ch]||0)+v});
  const comm={'Booking':.15,'Expedia/Vrbo':.15,'Directa':0,'Teléfono/WhatsApp':0};
  const chRows=Object.entries(ch).sort((a,b)=>b[1]-a[1]).map(([c,v])=>{
    const co=Math.round(v*(comm[c]||0));
    return `<tr><td><b>${c}</b></td><td>${euro(v)}</td><td>${(comm[c]*100||0)}%</td><td class="right" style="color:${co?'var(--bad)':'var(--ok)'}">${co?('−'+euro(co)):'sin comisión'}</td></tr>`;
  }).join('');
  document.getElementById('chTable').innerHTML=`<thead><tr><th>Canal</th><th>Ingreso bruto</th><th>Comisión</th><th class="right">Coste comisión</th></tr></thead><tbody>${chRows}</tbody>`;
}

/* ---------- FACTURAS ---------- */
function renderFacturas(){
  const tot=invoices.reduce((a,i)=>a+i.base+i.iva,0);
  document.getElementById('f-tot').textContent=euro(tot);
  document.getElementById('f-num').textContent=invoices.length;
  document.getElementById('f-pend').textContent=euro(invoices.filter(i=>i.status==='Pendiente').reduce((a,i)=>a+i.base+i.iva,0));
  document.getElementById('f-iva').textContent=euro(invoices.reduce((a,i)=>a+i.iva,0));
  const rowsH=invoices.slice().reverse().map(i=>`<tr>
     <td><b>${i.n}</b></td><td>${fmt(i.date)}</td><td>${i.client}</td><td class="muted">${i.concept}</td>
     <td>${euro2(i.base+i.iva)}</td><td><span class="pill ${i.status==='Cobrada'?'ok':'pend'}">${i.status}</span></td>
     <td class="right"><button class="btn ghost sm" onclick='showInvoice(${JSON.stringify(i)})'>Ver</button></td></tr>`).join('');
  document.getElementById('invTable').innerHTML=`<thead><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>${rowsH}</tbody>`;
}
function showInvoice(i){
  const total=i.base+i.iva;
  document.getElementById('invBody').innerHTML=`
   <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--pine);padding-bottom:14px;margin-bottom:16px">
     <div><div style="font-family:var(--serif);font-size:26px;color:var(--pine)">kirana</div><div class="muted" style="font-size:12px">Alojamiento rural</div></div>
     <div class="right" style="font-size:12px;line-height:1.7"><b>FACTURA ${i.n}</b><br>Fecha: ${fmt(i.date)}/2026</div>
   </div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12.5px;margin-bottom:16px">
     <div><div class="muted" style="text-transform:uppercase;font-size:10px;letter-spacing:.1em">Emite</div>
       [Razón social] · NIF [—]<br>Barrio San Miguel 27<br>48370 Bermeo (Bizkaia)<br>+34 689 352 391</div>
     <div><div class="muted" style="text-transform:uppercase;font-size:10px;letter-spacing:.1em">Cliente</div>
       ${i.client}<br>${i.nif?("NIF/CIF: "+i.nif):"NIF/DNI [—]"}<br>Canal: ${i.ch}</div>
   </div>
   <table style="margin-bottom:14px"><thead><tr><th>Concepto</th><th class="right">Base</th></tr></thead>
     <tbody><tr><td>${i.concept}</td><td class="right">${euro2(i.base)}</td></tr></tbody></table>
   <div style="margin-left:auto;width:240px;font-size:13px">
     <div style="display:flex;justify-content:space-between;padding:4px 0"><span class="muted">Base imponible</span><span>${euro2(i.base)}</span></div>
     <div style="display:flex;justify-content:space-between;padding:4px 0"><span class="muted">IVA (10%)</span><span>${euro2(i.iva)}</span></div>
     <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid var(--line);font-weight:700;font-size:16px"><span>Total</span><span>${euro2(total)}</span></div>
   </div>
   <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:18px;border-top:1px solid var(--line);padding-top:12px">
     <div style="font-size:10.5px;line-height:1.7;color:var(--mist)">
       <div><b style="color:var(--pine)">TicketBAI</b> · factura emitida con software garante (Batuz · Bizkaia)</div>
       <div>Identificativo TBAI: <span style="font-family:monospace">TBAI-B99999999-${(i.date||'').replaceAll('-','').slice(2)}-${String(i.n).replace(/\D/g,'')||'XXX'}…</span></div>
       <div>Estado: <span style="color:var(--ok);font-weight:600">✓ Enviada a la Hacienda Foral de Bizkaia · Bizkaibai / LROE</span></div>
     </div>
     <div style="text-align:center"><div class="qr"></div><div style="font-size:9px;color:var(--mist);margin-top:3px">QR TBAI</div></div>
   </div>
   <p class="muted" style="font-size:11px;margin-top:18px;border-top:1px solid var(--line2);padding-top:10px">Alojamiento turístico · IVA 10%. Documento de ejemplo — los campos entre [corchetes] se completan con los datos fiscales reales. Conserve esta factura.</p>`;
  document.getElementById('mInvoice').classList.add('on');
}
function openInvoiceFor(b){
  const n=nights(b.in,b.out);const base=+(n*b.rate/1.1).toFixed(2);
  showInvoice({n:'(borrador)',date:b.in,client:b.name,ch:b.ch,base:base,iva:+(n*b.rate-base).toFixed(2),concept:`Estancia ${n} noches · hab. ${b.room}${b.mp?' · media pensión':''}`});
}

/* ---------- CONTABILIDAD ---------- */
const CATCOL={'Suministros':'#5F6E52','Limpieza y lavandería':'#3C5A7A','Desayuno/alimentación':'#B49A72','Mantenimiento':'#8A6E4B','Marketing/web':'#7A6BA0','Comisiones OTA':'#A6543E','Impuestos/seguros':'#536B4A','Otros':'#9AA08F'};
let contaYear = today.getFullYear();
let contaPeriod = 'full';
function inContaPeriod(ds){
  if(!ds)return false;
  const y=ds.slice(0,4),mo=+ds.slice(5,7);
  if(y!==String(contaYear))return false;
  if(contaPeriod==='full')return true;
  if(contaPeriod[0]==='T'){const q=+contaPeriod[1];return mo>=(q-1)*3+1&&mo<=q*3;}
  if(contaPeriod[0]==='M')return mo===+contaPeriod.slice(1);
  return true;
}
function periodLabel(){
  if(contaPeriod==='full')return 'Año '+contaYear;
  if(contaPeriod[0]==='T')return 'Trimestre '+contaPeriod[1]+' · '+contaYear;
  const MM=['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return MM[+contaPeriod.slice(1)]+' '+contaYear;
}
function populateContaYears(){
  var sel=document.getElementById('contaYear'); if(!sel)return;
  var ys={};
  (invoices||[]).forEach(function(i){if(i.date)ys[i.date.slice(0,4)]=1;});
  (expenses||[]).forEach(function(e){if(e.date)ys[e.date.slice(0,4)]=1;});
  var now=today.getFullYear(); ys[now]=1; ys[now+1]=1; // disponible también el año próximo
  var arr=Object.keys(ys).map(Number).sort(function(a,b){return b-a;});
  if(arr.indexOf(contaYear)<0)contaYear=arr[0];
  sel.innerHTML=arr.map(function(y){return '<option value="'+y+'"'+(y===contaYear?' selected':'')+'>'+y+'</option>';}).join('');
}
function renderConta(){
  const inv=invoices.filter(i=>inContaPeriod(i.date));
  const exp=expenses.filter(e=>inContaPeriod(e.date));
  const ing=inv.reduce((a,i)=>a+i.base+i.iva,0);
  const gas=exp.reduce((a,e)=>a+(e.amt||0),0);
  const res=ing-gas;
  document.getElementById('c-ing').textContent=euro(ing);
  document.getElementById('c-gas').textContent=euro(gas);
  document.getElementById('c-res').textContent=euro(res);
  document.getElementById('c-mar').textContent=(ing?Math.round(res/ing*100):0)+'%';
  const pl=document.getElementById('contaPeriodLabel');if(pl)pl.textContent=periodLabel();
  const movs=[...exp.map(e=>({date:e.date,desc:e.desc,cat:e.cat,amt:e.amt,iva:e.iva||0,type:'g'})),...inv.map(i=>({date:i.date,desc:'Factura '+i.n+' · '+i.client,cat:'Ingreso alojamiento',amt:i.base+i.iva,iva:i.iva,type:'i'}))].sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('movTable').innerHTML=`<thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="right">IVA</th><th class="right">Importe</th></tr></thead><tbody>`+
    (movs.length?movs.map(m=>`<tr><td>${fmt(m.date)}</td><td>${m.desc}</td><td><span class="muted">${m.cat}</span></td><td class="right muted">${m.iva?euro2(m.iva):'—'}</td><td class="right" style="color:${m.type==='i'?'var(--ok)':'var(--bad)'};font-weight:600">${m.type==='i'?'+':'−'}${euro2(m.amt)}</td></tr>`).join(''):'<tr><td colspan="5" class="muted" style="padding:16px">Sin movimientos en este periodo.</td></tr>')+`</tbody>`;
  const cats={};exp.forEach(e=>cats[e.cat]=(cats[e.cat]||0)+e.amt);
  const ctot=Object.values(cats).reduce((a,b)=>a+b,0)||1;
  document.getElementById('catBox').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${c}</span><b>${euro(v)}</b></div><div style="height:7px;background:var(--line2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${Math.round(v/ctot*100)}%;background:${CATCOL[c]||'#888'}"></div></div></div>`).join('')||'<p class="muted">Sin gastos en este periodo.</p>';
  const ivaRep=inv.reduce((a,i)=>a+i.iva,0);
  const ivaSop=exp.reduce((a,e)=>a+(e.deducible!==false?(e.iva||0):0),0);
  document.getElementById('taxBox').innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px">
     <div><div class="muted" style="font-size:11px;text-transform:uppercase">IVA repercutido (10%)</div><div style="font-family:var(--serif);font-size:22px">${euro(ivaRep)}</div></div>
     <div><div class="muted" style="font-size:11px;text-transform:uppercase">IVA soportado (deducible)</div><div style="font-family:var(--serif);font-size:22px">${euro(ivaSop)}</div></div>
     <div><div class="muted" style="font-size:11px;text-transform:uppercase">A liquidar</div><div style="font-family:var(--serif);font-size:22px">${euro(Math.max(0,ivaRep-ivaSop))}</div></div>
   </div>
   <p class="muted" style="font-size:11px;margin-top:12px">${periodLabel()} · Cifras orientativas. La liquidación oficial (modelos 303 trimestral de IVA, 130…) la prepara la gestoría; este panel organiza los datos.</p>`;
}
/* ---------- HABITACIONES ---------- */
function roomCard(r){const info=r;
  const kindLabel=r.kind==='apartamento'?'Apartamento · 4 pers.':(r.kind==='accesible'?'Accesible':'Doble');
  const bathLabel=r.kind==='apartamento'?'Baño propio':(r.kind==='accesible'?'Baño adaptado':'Baño privado');
  return `<div class="rcard${r.active?'':' blocked'}">
    <div class="rthumb" style="background-image:url('${info.thumb}')">
      <span class="rtag" style="background:${COLORS[r.id]}">${kindLabel}</span>
      ${r.kind==='accesible'?'<span class="acc-badge" title="Movilidad reducida">♿</span>':''}
      ${r.active?'':'<span class="blocked-ribbon">Bloqueada</span>'}
    </div>
    <div class="rbody">
      <div class="rname"><span class="dot" style="background:${COLORS[r.id]}"></span><b>${r.id}</b> <span class="rmean">· ${info.mean}</span></div>
      <p class="rstory">${info.story}</p>
      <div class="rmeta"><span>${r.cap} pers.</span><span>≈${r.m2} m²</span></div>
      <div class="rprice"><span class="rpl">Precio normal</span><input type="number" min="0" id="price-${r.rid}" value="${r.rate}"><span>€/noche</span><button class="btn sm" onclick="savePrice('${r.rid}')">Guardar</button><span class="rweb">Web (−10%): ${Math.round(r.rate*0.9)}€</span></div>
      <div class="ramen muted">${bathLabel} · TV · A/C · WiFi${r.kind==='apartamento'?' · cocina':''}${r.kind==='accesible'?' · sin escalones':''}</div>
      <div class="rtoggle">
        <span class="rstate ${r.active?'on':'off'}">${r.active?'● En uso · en la web':'● Bloqueada · oculta'}</span>
        <button class="btn ${r.active?'ghost':''} sm" onclick="toggleRoom('${r.id}')">${r.active?'Bloquear':'Activar'}</button>
      </div>
    </div></div>`;
}
function renderRooms(){
  const n=activeRooms().length;
  document.getElementById('roomSummary').innerHTML=`<b style="color:var(--ink)">${n} de ${rooms.length}</b> habitaciones en uso. Las bloqueadas no aparecen en la web ni se pueden reservar hasta que las actives.`;
  const floors=[['sup','Planta superior · habitaciones con baño privado'],['baja','Planta baja · apartamento y habitación accesible']];
  document.getElementById('roomGrid').innerHTML=floors.map(([fl,label])=>{
    const list=rooms.filter(r=>r.floor===fl);if(!list.length)return '';
    return `<div class="floor-h">${label}</div>`+list.map(roomCard).join('');
  }).join('');
}
function toggleRoom(id){
  var r=rooms.find(function(x){return x.id===id;});if(!r)return;
  r.active=!r.active;renderRooms();renderCal();
  if(document.getElementById('mBooking').classList.contains('on')){refreshRoomOptions();calcTotal();}
  // Mandar el estado COMPLETO de todas las habitaciones (foto entera) en una
  // sola operación: la última orden gana y nunca se pierden cambios.
  var states={};rooms.forEach(function(x){states[x.rid]=!!x.active;});
  window.__roomQ=(window.__roomQ||Promise.resolve()).then(function(){
    return fetch('/api/panel/rooms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({states:states})})
      .then(function(res){return res.json().catch(function(){return {};}).then(function(d){
        if(!res.ok)throw new Error(d.error||('HTTP '+res.status));});})
      .catch(function(e){alert('No se pudo guardar el cambio: '+(e&&e.message?e.message:'error de red')+'. Recarga e int\u00e9ntalo de nuevo.');});
  });
}

/* ---------- MODAL nueva reserva ---------- */
const mB=document.getElementById('mBooking');
function overlap(aIn,aOut,bIn,bOut){return aIn<bOut&&aOut>bIn;}
function roomFree(id,inD,outD){return !bookings.some(b=>b.room===id&&overlap(inD,outD,b.in,b.out));}
function roomStatus(r,inD,outD,pax){if(!r.active)return{free:false,msg:'bloqueada'};if(pax>r.cap)return{free:false,msg:'máx. '+r.cap+'p'};if(inD&&outD&&!roomFree(r.id,inD,outD))return{free:false,msg:'ocupada'};return{free:true,msg:'libre'};}
function refreshRoomOptions(){
  const i=document.getElementById('b-in').value,o=document.getElementById('b-out').value,g=+document.getElementById('b-guests').value;
  const cur=document.getElementById('b-room').value,selEl=document.getElementById('b-room');
  selEl.innerHTML=rooms.filter(r=>r.active).map(r=>{const st=roomStatus(r,i,o,g);
    return `<option value="${r.id}" data-rate="${r.rate}" ${st.free?'':'disabled'}>${r.id} (${r.cap}p · ${euro(r.rate)})${st.free?'':' — '+st.msg}</option>`;}).join('');
  const curR=rooms.find(r=>r.id===cur);
  if(curR&&roomStatus(curR,i,o,g).free){selEl.value=cur;}
  else{const f=rooms.find(r=>roomStatus(r,i,o,g).free);if(f)selEl.value=f.id;}
}
document.getElementById('newBtn').onclick=()=>{
  document.getElementById('b-in').value=ymd(today);document.getElementById('b-out').value=ymd(new Date(2026,5,25));
  refreshRoomOptions();calcTotal();mB.classList.add('on');
};
function calcTotal(){
  const roomId=document.getElementById('b-room').value,r=rooms.find(x=>x.id===roomId);
  const rate=r?r.rate:0;
  const i=document.getElementById('b-in').value,o=document.getElementById('b-out').value;
  const g=+document.getElementById('b-guests').value,mp=document.getElementById('b-mp').value.startsWith('Sí');
  const n=i&&o?Math.max(0,nights(i,o)):0;
  const av=document.getElementById('b-avail'),save=document.getElementById('b-save'),tot=document.getElementById('b-total');
  if(!r||!i||!o||n<1){tot.textContent='—';av.className='avail neutral';av.textContent='Indica habitación y fechas válidas.';save.disabled=true;return;}
  const st=roomStatus(r,i,o,g);
  if(st.free){
    tot.textContent=euro(n*rate+(mp?n*g*25:0))+' · '+n+' noches';
    av.className='avail ok';av.textContent='✓ '+roomId+' disponible en esas fechas.';save.disabled=false;
  }else{
    tot.textContent='—';const free=rooms.filter(x=>roomStatus(x,i,o,g).free);
    av.className='avail bad';
    av.innerHTML=free.length?('✕ '+roomId+' no disponible. Libres: <b>'+free.map(x=>x.id).join(', ')+'</b>'):'✕ Sin habitaciones libres en esas fechas.';
    save.disabled=true;
  }
}
['b-in','b-out','b-guests'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{refreshRoomOptions();calcTotal();}));
['b-room','b-mp'].forEach(id=>document.getElementById(id).addEventListener('change',calcTotal));
document.getElementById('b-save').onclick=()=>{
  const roomId=document.getElementById('b-room').value,r=rooms.find(x=>x.id===roomId);
  const i=document.getElementById('b-in').value,o=document.getElementById('b-out').value,g=+document.getElementById('b-guests').value;
  if(!r||!i||!o||nights(i,o)<1){alert('Indica habitación y fechas válidas.');return;}
  if(!roomStatus(r,i,o,g).free){alert(roomId+' no está disponible en esas fechas.');return;}
  const name=document.getElementById('b-name').value||'Reserva sin nombre';
  const ch=document.getElementById('b-ch').value,mp=document.getElementById('b-mp').value.startsWith('Sí');
  const save=document.getElementById('b-save');save.disabled=true;save.textContent='Guardando…';
  fetch('/api/panel/booking',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({room:roomId,in:i,out:o,guests:g,name,ch})})
    .then(res=>res.json()).then(d=>{
      if(d&&d.ok){bookings.push({room:roomId,name,in:i,out:o,guests:g,ch,mp,rate:r.rate});mB.classList.remove('on');renderCal();renderBk();renderIngresos();}
      else alert(d&&d.error?d.error:'No se pudo guardar la reserva.');
    }).catch(()=>alert('No se pudo guardar la reserva.'))
    .finally(()=>{save.disabled=false;save.textContent='Guardar reserva';});
};

/* ---------- MODAL gasto ---------- */
document.getElementById('addMov').onclick=()=>{document.getElementById('e-date').value=ymd(today);document.getElementById('mExpense').classList.add('on');};
document.getElementById('e-save').onclick=()=>{
  const total=+document.getElementById('e-amt').value||0;
  const ivaPct=+document.getElementById('e-iva').value;
  const date=document.getElementById('e-date').value||ymd(today);
  const desc=document.getElementById('e-desc').value||'Gasto';
  const cat=document.getElementById('e-cat').value;
  const deducible=ivaPct>0;
  const iva=deducible?Math.round((total-total/(1+ivaPct/100))*100)/100:0;
  if(!total){alert('Indica el importe del gasto.');return;}
  const bt=document.getElementById('e-save');bt.disabled=true;bt.textContent='Guardando…';
  fetch('/api/panel/expense',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({date,desc,cat,total,ivaPct,deducible})})
    .then(r=>r.json()).then(d=>{
      if(d&&d.ok){expenses.push({date,desc,cat,amt:total,iva,deducible});document.getElementById('mExpense').classList.remove('on');renderConta();}
      else alert(d&&d.error?d.error:'No se pudo guardar el gasto.');
    }).catch(()=>alert('No se pudo guardar el gasto.'))
    .finally(()=>{bt.disabled=false;bt.textContent='Guardar gasto';});
};
document.getElementById('newInv').onclick=()=>showInvoice(invoices[invoices.length-1]);

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('on'));
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('on')}));

(function(){var ys=document.getElementById('contaYear');if(ys){populateContaYears();ys.onchange=function(){contaYear=+this.value;renderConta();};}var ps=document.getElementById('contaPeriod');if(ps)ps.onchange=function(){contaPeriod=this.value;renderConta();};})();
(function(){
  var impb=document.getElementById('importBtn'),impf=document.getElementById('importFile');
  if(!impb||!impf)return;
  impb.onclick=function(){impf.click();};
  impf.onchange=function(){
    var file=impf.files&&impf.files[0]; if(!file)return;
    var rd=new FileReader();
    rd.onload=function(){
      var t=impb.textContent; impb.disabled=true; impb.textContent='Importando…';
      fetch('/api/panel/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({csv:String(rd.result)})})
        .then(function(r){return r.json();})
        .then(function(d){
          impb.disabled=false; impb.textContent=t;
          if(d&&d.ok){alert('Importadas '+d.imported+' reservas de '+d.total+'.'+(d.skipped?(' Omitidas '+d.skipped+' (solapadas o sin fechas válidas).'):''));location.reload();}
          else alert(d&&d.error?d.error:'No se pudo importar el CSV.');
        })
        .catch(function(){impb.disabled=false;impb.textContent=t;alert('No se pudo importar el CSV.');});
    };
    rd.readAsText(file,'utf-8'); impf.value='';
  };
})();
var __clc=document.getElementById('cl-csv');if(__clc)__clc.onclick=exportClientesCSV;var __cls=document.getElementById('cl-search');if(__cls)__cls.oninput=renderClientes;
/* init */
renderCal();renderBk();renderIngresos();renderFacturas();renderConta();renderRooms();renderClientes();

/* ---------- CLIENTES (CRM ligero) ---------- */
function langName(c){var M={es:'Español',eu:'Euskera',fr:'Francés',en:'Inglés',de:'Alemán',it:'Italiano',nl:'Neerlandés',da:'Danés',no:'Noruego'};return M[(c||'').toLowerCase()]||(c?c.toUpperCase():'—');}
function buildClientes(){
  var by={};
  bookings.forEach(function(b){
    var key=((b.email||'')||(b.name||'')).toLowerCase(); if(!key)return;
    var c=by[key]; if(!c){c=by[key]={name:b.name||'',email:b.email||'',phone:b.phone||'',nif:b.nif||'',lang:b.lang||'',consent:!!b.consent,stays:0,nights:0,total:0,last:''};}
    var nN=nights(b.in,b.out); c.stays++; c.nights+=nN; c.total+=nN*(b.rate||0);
    if((b.out||'')>c.last)c.last=b.out||'';
    if(b.consent)c.consent=true;
    if(!c.phone&&b.phone)c.phone=b.phone; if(!c.nif&&b.nif)c.nif=b.nif; if(!c.lang&&b.lang)c.lang=b.lang;
    if(b.name&&b.name.length>(c.name||'').length)c.name=b.name;
  });
  return Object.values(by).sort(function(a,b){return (b.last||'').localeCompare(a.last||'');});
}
function renderClientes(){
  var list=buildClientes(); window.__clientes=list;
  var T=function(id){return document.getElementById(id);};
  if(T('cl-total'))T('cl-total').textContent=list.length;
  if(T('cl-optin'))T('cl-optin').textContent=list.filter(function(c){return c.consent;}).length;
  if(T('cl-stays'))T('cl-stays').textContent=list.reduce(function(a,c){return a+c.stays;},0);
  var q=((T('cl-search')&&T('cl-search').value)||'').toLowerCase();
  var rows=list.filter(function(c){return !q||((c.name+' '+c.email+' '+c.phone).toLowerCase().indexOf(q)>=0);}).map(function(c){
    return '<tr><td><b>'+(c.name||'—')+'</b></td><td>'+(c.email||'—')+'</td><td>'+(c.phone||'—')+'</td><td>'+langName(c.lang)+'</td><td>'+c.stays+'</td><td>'+(c.last?fmt(c.last):'—')+'</td><td class="right">'+euro(Math.round(c.total))+'</td><td>'+(c.consent?'<span class="pill ok">Sí</span>':'<span class="pill">No</span>')+'</td></tr>';
  }).join('');
  if(T('clTable'))T('clTable').innerHTML='<thead><tr><th>Cliente</th><th>Email</th><th>Teléfono</th><th>Idioma</th><th>Estancias</th><th>Última</th><th class="right">Gasto</th><th>Ofertas</th></tr></thead><tbody>'+(rows||'<tr><td colspan="8" class="muted" style="padding:16px">Aún no hay clientes registrados.</td></tr>')+'</tbody>';
}
function exportClientesCSV(){
  var list=window.__clientes||buildClientes();
  var head=['Nombre','Email','Telefono','NIF','Idioma','Estancias','Noches','Ultima estancia','Gasto EUR','Acepta ofertas'];
  var rows=[head].concat(list.map(function(c){return [c.name,c.email,c.phone,c.nif,c.lang,c.stays,c.nights,c.last,Math.round(c.total),c.consent?'si':'no'];}));
  var csv=rows.map(function(r){return r.map(function(x){var s=(x==null?'':String(x)).replace(/"/g,'""');return /[",;\n]/.test(s)?'"'+s+'"':s;}).join(',');}).join('\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clientes-kirana.csv';document.body.appendChild(a);a.click();a.remove();
}

function savePrice(rid){
  var el=document.getElementById('price-'+rid); if(!el)return;
  var v=Math.max(0,Math.round(+el.value||0)); if(!v){alert('Indica un precio válido.');return;}
  var bt=document.querySelector('[onclick="savePrice(\''+rid+'\')"]'); if(bt){bt.disabled=true;bt.textContent='…';}
  fetch('/api/panel/room-price',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:rid,precio:v})})
    .then(function(res){return res.json().then(function(d){
      if(!res.ok)throw new Error(d.error||('HTTP '+res.status));
      var r=rooms.find(function(x){return x.rid===rid;}); if(r)r.rate=v;
      renderRooms();
    });})
    .catch(function(e){if(bt){bt.disabled=false;bt.textContent='Guardar';}alert('No se pudo guardar el precio: '+(e&&e.message?e.message:'error')+'.');});
}
