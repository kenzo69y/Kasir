// Fitur hapus transaksi online + pengembalian stok
async function deleteTransactionOnline(id){
  await loadData(true);
  const t=transactions.find(x=>x.id===id);
  if(!t)return alert('Transaksi tidak ditemukan atau sudah dihapus.');
  const detail=(t.items||[]).map(i=>`${i.name} x${i.qty}`).join(', ');
  if(!confirm(`Hapus transaksi ${t.code}?\n\n${detail}\n\nStok barang akan dikembalikan dan omzet/keuntungan akan dikoreksi.`))return;

  try{
    // Kembalikan stok setiap barang terlebih dahulu.
    for(const item of (t.items||[])){
      if(!item.id)continue;
      const p=products.find(x=>x.id===item.id);
      if(!p)continue;
      const newStock=Number(p.stock||0)+Number(item.qty||0);
      let r=await db.from('products').update({stock:newStock}).eq('id',item.id);
      if(r.error)throw r.error;
      r=await db.from('stock_movements').insert({
        product_id:item.id,
        movement_type:'transaction_deleted',
        qty:Number(item.qty||0),
        note:`Pengembalian stok dari ${t.code}`,
        cashier:currentUser?.display||'-'
      });
      if(r.error)throw r.error;
    }

    // Hapus detail lalu transaksi utama.
    let r=await db.from('transaction_items').delete().eq('transaction_id',id);
    if(r.error)throw r.error;
    r=await db.from('transactions').delete().eq('id',id);
    if(r.error)throw r.error;

    await loadData();
    alert(`Transaksi ${t.code} berhasil dihapus. Stok sudah dikembalikan.`);
  }catch(e){
    console.error(e);
    alert(e?.message||'Gagal menghapus transaksi.');
    await loadData(true);
  }
}

// Ganti tampilan dashboard supaya transaksi terbaru memiliki tombol Hapus.
window.renderDashboard=function(){
  let d=localDate(),arr=transactions.filter(t=>t.date===d),rev=arr.reduce((s,t)=>s+t.total,0),profit=arr.reduce((s,t)=>s+t.profit,0),f=financeTotals(d);
  $('dRevenue').textContent=money(rev);
  $('dProfit').textContent=money(profit);
  $('dExpense').textContent=money(f.out);
  $('dBalance').textContent=money(f.balance);
  $('dTransactions').textContent=arr.length;
  $('dStock').textContent=products.reduce((s,p)=>s+p.stock,0);
  $('recentTx').innerHTML=arr.length?arr.slice(0,10).map(t=>`<div class="listrow"><div><b>${t.code}</b><small>${t.time} • ${t.cashier} • ${t.method}</small></div><b>${money(t.total)}</b><button class="danger small" onclick="deleteTransactionOnline(${t.id})">Hapus</button></div>`).join(''):'<div class="empty">Belum ada transaksi hari ini</div>';
  let low=products.filter(p=>p.stock<=p.minStock);
  $('lowStock').innerHTML=low.length?low.map(p=>`<div class="listrow"><div><b>${p.name}</b><small>${p.code}</small></div><b class="out">${p.stock}</b></div>`).join(''):'<div class="empty">Stok aman</div>';
};

// Ganti laporan supaya setiap transaksi juga dapat dihapus.
window.renderReport=function(){
  let date=$('reportDate').value||localDate(),arr=transactions.filter(t=>t.date===date),rev=arr.reduce((s,t)=>s+t.total,0),profit=arr.reduce((s,t)=>s+t.profit,0),f=financeTotals(date);
  $('reportSummary').innerHTML=`<article><span>Omzet</span><b>${money(rev)}</b></article><article><span>Keuntungan</span><b>${money(profit)}</b></article><article><span>Pengeluaran</span><b>${money(f.out)}</b></article><article><span>Saldo Kas</span><b>${money(f.balance)}</b></article>`;
  $('reportTransactions').innerHTML=arr.length?`<div class="tablewrap"><table><thead><tr><th>Kode</th><th>Jam</th><th>Kasir</th><th>Metode</th><th>Total</th><th>Keuntungan</th><th>Aksi</th></tr></thead><tbody>${arr.map(t=>`<tr><td>${t.code}</td><td>${t.time}</td><td>${t.cashier}</td><td>${t.method}</td><td>${money(t.total)}</td><td>${money(t.profit)}</td><td><button class="danger small" onclick="deleteTransactionOnline(${t.id})">Hapus</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Tidak ada transaksi</div>';
};

// Render ulang agar tombol langsung terlihat setelah file ini dimuat.
if(currentUser){renderDashboard();renderReport();}
