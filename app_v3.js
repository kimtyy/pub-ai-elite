/**
 * PUB AI 장부 플랫폼 - 금융 분석 엔진 (app_v3.js) v3.7
 * '궁극의 데이터 렌더링' 및 '수동 복구' 탑재
 */

const App = {
    db: {
        purchases: JSON.parse(localStorage.getItem('pub_purchases')) || [],
        sales: JSON.parse(localStorage.getItem('pub_sales')) || [],
    },
    charts: {},

    init() {
        console.log("🚀 App v3.7 Stable Booting...");
        try {
            this.generateMockData();
            this.bindEvents();
            this.render();
            this.switchTab('dashboard');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (e) {
            console.error("🔥 App Init Error:", e);
        }
    },

    save() {
        localStorage.setItem('pub_purchases', JSON.stringify(this.db.purchases));
        localStorage.setItem('pub_sales', JSON.stringify(this.db.sales));
    },

    generateMockData() {
        if (this.db.sales.length > 50 && this.db.purchases.length > 20) return;
        const now = new Date();
        const categories = ['주류', '식자재', '인건비', '임대료', '공과금', '소모품'];
        this.db.sales = []; this.db.purchases = [];
        for (let i = 120; i >= 0; i--) {
            const date = new Date(now); date.setDate(now.getDate() - i);
            const ds = date.toISOString().split('T')[0];
            const sale = Math.floor(650000 + Math.random() * 450000 + (date.getDay() % 6 === 0 ? 300000 : 0));
            this.db.sales.push({ id: 's'+i, date: ds, product: 'POS 매출 정산', amount: sale, type: 'SALE' });
            if (i % 2 === 0) {
                const c = categories[i % categories.length];
                this.db.purchases.push({ id: 'p'+i, date: ds, vendor: '도매처', product: c+' 정산', amount: Math.floor(180000 + Math.random() * 200000), category: c, type: 'PURCHASE' });
            }
        }
        this.save();
    },

    bindEvents() {
        const _id = (id) => document.getElementById(id);
        const on = (id, fn) => { const el = _id(id); if(el) el.onclick = fn; };
        
        on('addPurchaseBtn', () => this.openModal());
        on('savePurchaseBtn', () => this.handleSavePurchase());
        on('closePurchaseBtn', () => this.closeModal());
        on('scanReceiptBtn', () => _id('cameraInput').click());
        
        const ci = _id('cameraInput'); if(ci) ci.onchange = () => this.startScan();
    },

    switchTab(tabName) {
        console.log("🛸 Toggling ->", tabName);
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const sec = document.getElementById('section-' + tabName);
        if (sec) sec.classList.add('active');
        
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        const nav = document.querySelector(`.nav-links li[data-tab="${tabName}"]`);
        if (nav) nav.classList.add('active');

        if (tabName === 'dashboard') setTimeout(() => this.initDashboard(), 150);
        if (tabName === 'report') setTimeout(() => this.initReport(), 400);
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    initDashboard() {
        const can = document.getElementById('trendChart');
        if (!can) return;
        if (this.charts.dashboard) this.charts.dashboard.destroy();
        const data = [...this.db.sales].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-30);
        this.charts.dashboard = new Chart(can, {
            type: 'line',
            data: { 
                labels: data.map(d=>d.date.slice(5)), 
                datasets: [{ label: '일일 매출', data: data.map(d=>d.amount), borderColor: '#00fff2', tension: 0.4 }] 
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    initReport() {
        console.log("📊 REPORT ENGINE v3.7 FIRING...");
        try {
            const expC = document.getElementById('expenseCategoryChart');
            const trendC = document.getElementById('monthlyTrendChart');
            if (!expC || !trendC) throw new Error("Canvas elements missing");

            if (this.charts.exp) this.charts.exp.destroy();
            if (this.charts.trend) this.charts.trend.destroy();

            const catMap = {};
            this.db.purchases.forEach(p => { const c = p.category || '기타'; catMap[c] = (catMap[c] || 0) + p.amount; });

            this.charts.exp = new Chart(expC, {
                type: 'doughnut',
                data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ['#00d2ff', '#ff00c1', '#39ff14', '#ffbd00', '#00fff2'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

            const months = {}; const now = new Date();
            for(let i=5; i>=0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
                const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2, '0');
                months[k] = { s: 0, p: 0 };
            }
            this.db.sales.forEach(s => { const k = s.date.slice(0, 7); if(months[k]) months[k].s += s.amount; });
            this.db.purchases.forEach(p => { const k = p.date.slice(0, 7); if(months[k]) months[k].p += p.amount; });

            this.charts.trend = new Chart(trendC, {
                type: 'bar',
                data: {
                    labels: Object.keys(months).map(k => k.split('-')[1] + '월'),
                    datasets: [{ label: '매출', data: Object.values(months).map(m=>m.s), backgroundColor: '#00fff2' }, { label: '매입', data: Object.values(months).map(m=>m.p), backgroundColor: '#ff00c1' }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            const best = [...this.db.sales].sort((a,b)=>b.amount-a.amount)[0];
            document.getElementById('kpi-best-day').innerText = best ? best.date : '-';
            document.getElementById('kpi-top-category').innerText = Object.keys(catMap).sort((a,b)=>catMap[b]-catMap[a])[0] || '기타';
            const net = Object.values(months).reduce((a, b) => a + (b.s - b.p), 0);
            document.getElementById('kpi-avg-profit').innerText = '₩' + Math.floor(net/6).toLocaleString();
            
            console.log("✅ Report Rendered Successfully");
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (e) {
            console.error("❌ Report Failure:", e);
        }
    },

    render() {
        const s = this.db.sales.reduce((a, b) => a + b.amount, 0);
        const p = this.db.purchases.reduce((a, b) => a + b.amount, 0);
        document.getElementById('dash-sales').innerText = '₩' + s.toLocaleString();
        document.getElementById('dash-purchase').innerText = '₩' + p.toLocaleString();
        document.getElementById('dash-profit').innerText = '₩' + (s - p).toLocaleString();

        const hist = [...this.db.sales, ...this.db.purchases].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 5);
        document.getElementById('historyList').innerHTML = hist.map(r => `
            <div class="history-item">
                <div class="item-info"><h4>${r.product}</h4><p>${r.date}</p></div>
                <div class="item-amount ${r.type==='SALE'?'amount-sale':'amount-purchase'}">${r.amount.toLocaleString()}</div>
            </div>
        `).join('');
    },

    openModal() { document.getElementById('modalOverlay').style.display = 'flex'; },
    closeModal() { document.getElementById('modalOverlay').style.display = 'none'; },

    handleSavePurchase() {
        const n = document.getElementById('itemName').value;
        const p = parseInt(document.getElementById('unitPrice').value) || 0;
        const q = parseFloat(document.getElementById('qty').value) || 0;
        if (!n || p*q <= 0) return alert('Input error');
        this.db.purchases.unshift({ id: Date.now(), date: new Date().toISOString().split('T')[0], vendor: '수동', product: n, amount: p*q, type: 'PURCHASE', status: 'APPROVED', category: '식자재' });
        this.save(); this.render(); this.closeModal();
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
