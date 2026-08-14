// Fitur hapus transaksi online + pengembalian stok
async function deleteTransactionOnline(id){
  await loadData(true);
  const t=transactions.find(x=>x.id===id);
  if(!t)return alert('Transaksi tidak ditemukan atau sudah dihapus.');
  const detail=(t.items||[]).map(i=>`${i.name} x${i.qty}`).join(', ');
  if(!confirm(`Hapus transaksi ${t.code}?\n\n${detail}\n\nStok barang akan dikembalikan dan omzet/keuntungan akan dikoreksi.`))return;

  try{
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

function addDeleteButtons(){
  if(typeof transactions==='undefined'||!Array.isArray(transactions))return;

  // Dashboard -> Transaksi Terbaru
  const recent=$('recentTx');
  if(recent){
    recent.querySelectorAll('.listrow').forEach(row=>{
      if(row.querySelector('.trx-delete-btn'))return;
      const t=transactions.find(x=>row.textContent.includes(x.code));
      if(!t)return;
      const btn=document.createElement('button');
      btn.className='danger small trx-delete-btn';
      btn.textContent='Hapus';
      btn.onclick=()=>deleteTransactionOnline(t.id);
      row.appendChild(btn);
    });
  }

  // Laporan -> tabel transaksi
  const report=$('reportTransactions');
  if(report){
    const table=report.querySelector('table');
    if(table){
      const header=table.querySelector('thead tr');
      if(header && !header.querySelector('.trx-action-head')){
        const th=document.createElement('th');
        th.className='trx-action-head';
        th.textContent='Aksi';
        header.appendChild(th);
      }
      table.querySelectorAll('tbody tr').forEach(row=>{
        if(row.querySelector('.trx-delete-btn'))return;
        const t=transactions.find(x=>row.textContent.includes(x.code));
        if(!t)return;
        const td=document.createElement('td');
        const btn=document.createElement('button');
        btn.className='danger small trx-delete-btn';
        btn.textContent='Hapus';
        btn.onclick=()=>deleteTransactionOnline(t.id);
        td.appendChild(btn);
        row.appendChild(td);
      });
    }
  }
}

// Daftar transaksi di-render ulang oleh online.js setiap beberapa detik.
// Observer ini memastikan tombol Hapus selalu dipasang kembali.
const trxObserver=new MutationObserver(()=>addDeleteButtons());
const watchTargets=[$('recentTx'),$('reportTransactions')].filter(Boolean);
watchTargets.forEach(el=>trxObserver.observe(el,{childList:true,subtree:true}));

setInterval(addDeleteButtons,1000);
setTimeout(addDeleteButtons,300);
