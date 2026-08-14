const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n||0);
const day=()=>{
 const d=new Date();
 const y=d.getFullYear();
 const m=String(d.getMonth()+1).padStart(2,'0');
 const da=String(d.getDate()).padStart(2,'0');
 return `${y}-${m}-${da}`;
};
// RESET PRODUK LAMA SEKALI SAJA UNTUK V3.2
if(!localStorage.getItem('v32_product_reset_done')){
  localStorage.removeItem('v2_products');
  localStorage.removeItem('v3_products_clean');
  localStorage.removeItem('v32_products');
  localStorage.setItem('v32_product_reset_done','1');
}

let products=JSON.parse(localStorage.getItem('v32_products')||'null')||[];
let tx=JSON.parse(localStorage.getItem('v2_tx')||'[]');
let stockLogs=JSON.parse(localStorage.getItem('v2_stocklogs')||'[]');
let cart=[];
const USERS=[
 {username:'icha',password:'030303',display:'Icha',role:'kasir'},
 {username:'cenos',password:'070707',display:'Cenos',role:'kasir'}
];
let currentUser=JSON.parse(sessionStorage.getItem('v3_user')||'null');

function save(){localStorage.setItem('v32_products',JSON.stringify(products));localStorage.setItem('v2_tx',JSON.stringify(tx));localStorage.setItem('v2_stocklogs',JSON.stringify(stockLogs))}
function renderProducts(){
 let q=$('search').value.toLowerCase().trim();
 let list=products.filter(p=>p.name.toLowerCase().includes(q)||p.code.toLowerCase().includes(q));
 $('products').innerHTML=list.length?list.map(p=>`<div class="product"><div><b>${p.name}</b><div class="meta">Kode ${p.code} • Stok <span class="${p.stock===0?'out':p.stock<=5?'stocklow':''}">${p.stock}</span></div></div><b>${money(p.sell)}</b><button onclick="addCart(${p.id})" ${p.stock<=0?'disabled':''}>Tambah</button></div>`).join(''):'<div class="empty">Barang tidak ditemukan</div>';
}
function addCart(id){
 let p=products.find(x=>x.id===id); if(!p||p.stock<=0)return;
 let c=cart.find(x=>x.id===id);
 if(c){if(c.qty>=p.stock)return alert('Stok tidak cukup'); c.qty++} else cart.push({id:p.id,name:p.name,sell:p.sell,buy:p.buy,qty:1});
 renderCart();
}
function qty(id,d){
 let c=cart.find(x=>x.id===id),p=products.find(x=>x.id===id); if(!c||!p)return;
 if(d>0&&c.qty>=p.stock)return alert('Stok tidak cukup');
 c.qty+=d;if(c.qty<=0)cart=cart.filter(x=>x.id!==id);renderCart()
}
function total(){return cart.reduce((s,c)=>s+c.sell*c.qty,0)}
function renderCart(){
 $('cart').innerHTML=cart.length?cart.map(c=>`<div class="cartrow"><div><b>${c.name}</b><div class="meta">${money(c.sell)} × ${c.qty}</div></div><div class="qty"><button onclick="qty(${c.id},-1)">−</button> <b>${c.qty}</b> <button onclick="qty(${c.id},1)">+</button></div><b>${money(c.sell*c.qty)}</b></div>`).join(''):'<div class="empty">Keranjang kosong</div>';
 $('total').textContent=money(total());calcChange()
}
function calcChange(){let p=Number($('pay').value||0);$('change').textContent=money(Math.max(0,p-total()))}
function dashboard(){
 let todays=tx.filter(t=>t.date===day()),rev=todays.reduce((s,t)=>s+t.total,0),profit=todays.reduce((s,t)=>s+t.profit,0);
 $('rev').textContent=money(rev);$('profit').textContent=money(profit);$('trxCount').textContent=todays.length;$('stockCount').textContent=products.reduce((s,p)=>s+p.stock,0);
 $('history').innerHTML=todays.length?[...todays].reverse().map(t=>`<div class="txrow"><div><b>${t.code}</b><div class="meta">${t.time} • Kasir: ${t.cashier||'-'} • ${t.items.map(i=>i.name+' x'+i.qty).join(', ')}</div></div><b>${money(t.total)}</b><div class="tx-actions"><button onclick="printReceipt('${t.code}')">Struk</button>${currentUser?`<button class="danger" onclick="deleteTransaction('${t.code}')">Hapus</button>`:''}</div></div>`).join(''):'<div class="empty">Belum ada transaksi hari ini</div>';
}
function checkout(){
 if(!cart.length)return alert('Keranjang kosong');
 let tot=total(),pay=Number($('pay').value||0);if(pay<tot)return alert('Uang bayar kurang');
 for(let c of cart){let p=products.find(x=>x.id===c.id);if(!p||p.stock<c.qty)return alert('Stok '+c.name+' tidak cukup')}
 cart.forEach(c=>products.find(x=>x.id===c.id).stock-=c.qty);
 let now=new Date(),profit=cart.reduce((s,c)=>s+(c.sell-c.buy)*c.qty,0);
 tx.push({code:'TRX-'+Date.now().toString().slice(-6),date:day(),time:now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),cashier:currentUser?currentUser.display:'-',items:cart.map(x=>({...x})),total:tot,profit,pay,change:pay-tot});
 save();cart=[];$('pay').value='';renderAll();alert('Transaksi berhasil');
}
function fillStockSelect(filter=''){
 let q=filter.toLowerCase(); let arr=products.filter(p=>p.name.toLowerCase().includes(q)||p.code.toLowerCase().includes(q));
 $('stockProduct').innerHTML=arr.map(p=>`<option value="${p.id}">${p.code} - ${p.name} (stok ${p.stock})</option>`).join('');
}
function addStock(){
 let id=Number($('stockProduct').value),q=Number($('stockQty').value);if(!id||q<=0)return alert('Pilih barang dan isi jumlah');
 let p=products.find(x=>x.id===id);p.stock+=q;stockLogs.push({date:day(),time:new Date().toLocaleTimeString('id-ID'),productId:id,name:p.name,qty:q});
 save();closeAll();renderAll();$('stockQty').value='';alert('Stok '+p.name+' bertambah '+q);
}
function addProduct(){
 let code=$('pCode').value.trim(),name=$('pName').value.trim(),buy=Number($('pBuy').value),sell=Number($('pSell').value),stock=Number($('pStock').value);
 if(!code||!name||sell<=0||buy<0||stock<0)return alert('Isi data dengan benar');
 if(products.some(p=>p.code===code))return alert('Kode barang sudah dipakai');
 products.push({id:Date.now(),code,name,buy,sell,stock});save();closeAll();renderAll();
}
function reportFor(date){
 let arr=tx.filter(t=>t.date===date),rev=arr.reduce((s,t)=>s+t.total,0),profit=arr.reduce((s,t)=>s+t.profit,0);
 $('reportContent').innerHTML=`<p><b>Tanggal:</b> ${date}</p><p><b>Omzet:</b> ${money(rev)} &nbsp; <b>Keuntungan:</b> ${money(profit)} &nbsp; <b>Transaksi:</b> ${arr.length}</p>`+(arr.length?`<table class="reporttable"><tr><th>Kode</th><th>Jam</th><th>Total</th><th>Keuntungan</th></tr>${arr.map(t=>`<tr><td>${t.code}</td><td>${t.time}</td><td>${money(t.total)}</td><td>${money(t.profit)}</td></tr>`).join('')}</table>`:'<div class="empty">Tidak ada transaksi</div>');
}
function monthReport(){
 let m=day().slice(0,7),arr=tx.filter(t=>t.date.startsWith(m)),rev=arr.reduce((s,t)=>s+t.total,0),profit=arr.reduce((s,t)=>s+t.profit,0);
 $('reportContent').innerHTML=`<p><b>Bulan:</b> ${m}</p><p><b>Omzet:</b> ${money(rev)} &nbsp; <b>Keuntungan:</b> ${money(profit)} &nbsp; <b>Transaksi:</b> ${arr.length}</p>`;
}

function deleteTransaction(code){
 if(!requireAdmin())return;
 let t=tx.find(x=>x.code===code);
 if(!t)return alert('Transaksi tidak ditemukan');
 let ok=confirm(`Hapus transaksi ${code}?\n\nStok barang dari transaksi ini akan dikembalikan dan omzet/keuntungan akan dikoreksi.`);
 if(!ok)return;

 t.items.forEach(i=>{
   let p=products.find(x=>x.id===i.id);
   if(p) p.stock += i.qty;
 });

 tx=tx.filter(x=>x.code!==code);
 save();
 renderAll();
 alert(`Transaksi ${code} berhasil dihapus.\nStok barang sudah dikembalikan.`);
}

function printReceipt(code){
 let t=tx.find(x=>x.code===code);if(!t)return;let w=window.open('','_blank','width=400,height=600');
 w.document.write(`<pre style="font-family:monospace">KASIR TOKO V3\n${t.code}\n${t.date} ${t.time}\nKASIR: ${t.cashier||'-'}\n--------------------------\n${t.items.map(i=>i.name+' x'+i.qty+'  '+money(i.sell*i.qty)).join('\n')}\n--------------------------\nTOTAL: ${money(t.total)}\nBAYAR: ${money(t.pay)}\nKEMBALI: ${money(t.change)}\n\nTerima kasih</pre><script>window.print()<\/script>`);
}
function open(id){$(id).classList.remove('hidden')}function closeAll(){document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'))}
function renderAll(){renderProducts();renderCart();dashboard();fillStockSelect()}
$('search').oninput=renderProducts;$('barcode').onkeydown=e=>{if(e.key==='Enter'){let p=products.find(x=>x.code===$('barcode').value.trim());if(p){addCart(p.id);$('barcode').value=''}else alert('Kode tidak ditemukan')}};$('pay').oninput=calcChange;
$('checkout').onclick=checkout;$('clearCart').onclick=()=>{cart=[];renderCart()};
$('btnAdd').classList.add('admin-only');$('btnStockIn').classList.add('admin-only');$('btnReport').classList.add('admin-only');
$('btnAdd').onclick=()=>{if(!requireAdmin())return;open('modalAdd')};
$('btnStockIn').onclick=()=>{if(!requireAdmin())return;fillStockSelect();open('modalStock')};
$('btnReport').onclick=()=>{if(!requireAdmin())return;$('reportDate').value=day();reportFor(day());open('modalReport')};
$('stockSearch').oninput=e=>fillStockSelect(e.target.value);$('saveStock').onclick=addStock;$('saveProduct').onclick=addProduct;
$('showDateReport').onclick=()=>reportFor($('reportDate').value||day());$('showMonthReport').onclick=monthReport;
document.querySelectorAll('.close').forEach(b=>b.onclick=closeAll);document.querySelectorAll('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)closeAll()});

function requireAdmin(){
 if(!currentUser){
   alert('Silakan login terlebih dahulu.');
   return false;
 }
 return true;
}
function applyRole(){
 if(!currentUser)return;
 $('activeCashier').textContent=currentUser.display;
 $('activeRole').textContent=currentUser.role==='admin'?'ADMIN':'KASIR';
 document.querySelectorAll('.admin-only').forEach(x=>x.classList.remove('role-hidden'));
 dashboard();
}
function showApp(){
 $('loginScreen').classList.add('hidden-login');
 $('appShell').classList.remove('hidden-app');
 applyRole();
}
function showLogin(){
 $('appShell').classList.add('hidden-app');
 $('loginScreen').classList.remove('hidden-login');
 $('loginPassword').value='';
 $('loginError').textContent='';
 setTimeout(()=>$('loginName').focus(),50);
}
function doLogin(){
 let name=$('loginName').value.trim().toLowerCase();
 let pass=$('loginPassword').value;
 let u=USERS.find(x=>x.username===name&&x.password===pass);
 if(!u){
   $('loginError').textContent='Nama kasir atau kata sandi salah.';
   return;
 }
 currentUser={username:u.username,display:u.display,role:u.role};
 sessionStorage.setItem('v3_user',JSON.stringify(currentUser));
 showApp();
}
function logout(){
 if(!confirm('Keluar dari akun kasir sekarang?'))return;
 currentUser=null;
 sessionStorage.removeItem('v3_user');
 showLogin();
}
$('loginBtn').onclick=doLogin;
$('loginPassword').onkeydown=e=>{if(e.key==='Enter')doLogin()};
$('loginName').onkeydown=e=>{if(e.key==='Enter')$('loginPassword').focus()};
$('togglePassword').onclick=()=>{
 let i=$('loginPassword');
 let show=i.type==='password';
 i.type=show?'text':'password';
 $('togglePassword').textContent=show?'Sembunyi':'Lihat';
};
$('logoutBtn').onclick=logout;

renderAll();
if(currentUser)showApp();else showLogin();