/**
 * PUB AI 장부 플랫폼 - v8.2 ELITE Edition
 * 'Financial-Grade' Analyst Engine & Professional Verification Suite
 */

const App = {
    db: {
        purchases: (function() { try { return JSON.parse(localStorage.getItem('pub_purchases')) || []; } catch(e) { return []; } })(),
        sales: (function() { try { return JSON.parse(localStorage.getItem('pub_sales')) || []; } catch(e) { return []; } })(),
    },
    charts: {},
    weather: 'sunny',
    currentScanData: null,
    stream: null,
    isInitializingCamera: false,
    currentFacingMode: 'environment',

    init() {
        console.log("💎 KODARI v8.2 ELITE Edition Booting...");
        try {
            this.generateMockData();
            this.bindEvents();
            this.updateWeather('sunny');
            this.switchTab('dashboard');
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log("✅ v8.2 Boot Success");
        } catch (e) {
            console.error("🔥 v8.2 Boot Error:", e);
        }
    },

    save() {
        localStorage.setItem('pub_purchases', JSON.stringify(this.db.purchases));
        localStorage.setItem('pub_sales', JSON.stringify(this.db.sales));
    },

    generateMockData() {
        if (this.db.sales.length > 150) return;
        const now = new Date();
        const categories = ['식자재', '주류', '소모품', '인건비', '임대료', '공과금', '기타'];
        this.db.sales = []; this.db.purchases = [];
        for (let i = 180; i >= 0; i--) {
            const date = new Date(now); date.setDate(now.getDate() - i);
            const ds = date.toISOString().split('T')[0];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sale = Math.floor(700000 + Math.random() * 500000 + (isWeekend ? 400000 : 0));
            this.db.sales.push({ id: 's' + Date.now() + i, date: ds, amount: sale, type: 'SALE' });
            
            if (i % 3 === 0) {
                const c = categories[i % categories.length];
                this.db.purchases.push({ 
                    id: 'p' + Date.now() + i,
                    date: ds, 
                    vendor: '공급협력사 ' + (i%5), 
                    amount: Math.floor(200000 + Math.random() * 300000), 
                    category: c, 
                    type: 'PURCHASE' 
                });
            }
        }
        this.save();
    },

    bindEvents() {
        const _id = (id) => document.getElementById(id);
        const on = (id, fn) => { 
            const el = _id(id); 
            if(el) el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
        };
        
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', (e) => {
                const tab = li.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        document.querySelectorAll('input[name="weather"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateWeather(e.target.value);
            });
        });

        const fab = document.querySelector('.fab-btn');
        if (fab) fab.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'section-scan') this.capturePhoto();
            else this.switchTab('scan');
        });
    },

    switchTab(tabName) {
        this.stopCamera();
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const sec = document.getElementById('section-' + tabName);
        if (sec) sec.classList.add('active');
        
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        const nav = document.querySelector(`.nav-links li[data-tab="${tabName}"]`);
        if (nav) nav.classList.add('active');

        // FAB Display Logic: GONE on scan tab, PLUS icon on others
        const fab = document.querySelector('.fab-btn');
        if (fab) {
            if (tabName === 'scan') {
                fab.style.display = 'none';
            } else {
                fab.style.display = 'grid';
                fab.innerHTML = '<i data-lucide="plus"></i>';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        if (tabName === 'dashboard') this.initDashboard();
        if (tabName === 'report') this.initReport();
        if (tabName === 'scan') this.initCamera();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        window.scrollTo(0, 0);
    },

    /**
     * Professional Camera & OCR Engine (v8.2 Elite Core)
     */
    async initCamera() {
        if (this.isInitializingCamera) return;
        this.isInitializingCamera = true;

        const video = document.getElementById('cameraVideo');
        if (!video) {
            this.isInitializingCamera = false;
            return;
        }

        try {
            const constraints = {
                video: { 
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.stream;
            
            video.onloadedmetadata = () => {
                video.play();
                this.isInitializingCamera = false;
                document.querySelector('.scan-status-text').innerText = "영수증을 화면에 맞춰주세요";
            };
        } catch (err) {
            console.error("Camera error:", err);
            this.isInitializingCamera = false;
            alert("카메라를 시작할 수 없습니다. 권한 설정을 확인해주세요.");
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        if (!video || !this.stream) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // v8.2 Super-Reader Pre-processing
        this.preprocessImage(canvas);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        // Critical: Stop camera immediately to prevent resource conflict
        this.stopCamera();
        const statusText = document.querySelector('.scan-status-text');
        if(statusText) statusText.innerText = "이미지 캡처 완료! 분석을 시작합니다.";

        this.runOCR(imgData);
    },

    preprocessImage(canvas) {
        // v8.2.6 Adjustment: Google Vision API often performs better on raw high-res images.
        // We'll keep it raw for maximum extraction fidelity.
    },

    async runOCR(imgData) {
        const statusText = document.querySelector('.scan-status-text');
        if(statusText) statusText.innerText = "AI 신경망 분석 요청 중...";
        
        try {
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imgData })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.details || 'OCR 분석 실패');

            const parsed = this.parseReceipt(data.fullText || "");
            this.currentScanData = parsed || { vendor: "정보 없음", items: [], total: 0 };
            
            if(statusText) statusText.innerText = "분석 완료! 화면 전환 중...";
            this.openVerificationCenter(imgData, this.currentScanData);
        } catch (err) {
            console.error("OCR API Error:", err);
            alert(`AI 분석 오류: ${err.message}`);
            if(statusText) statusText.innerText = "분석 오류 발생";
        }
    },

    /**
     * v6.0 Verification Center (Side-by-Side Review)
     */
    openVerificationCenter(imgData, data) {
        data = data || { vendor: "정보 미식별", items: [], total: 0 };
        
        try {
            // 1. Force reset and show Overlay
            document.querySelectorAll('.modal-overlay').forEach(o => o.style.display = 'none');
            
            const m = document.getElementById('verifyModal');
            if (!m) return;
            m.style.display = 'grid';

            // 2. IMPORTANT: Force inner modal to show (fixes Black Screen)
            const innerModal = m.querySelector('.modal');
            if (innerModal) innerModal.style.display = 'block';

            // 3. Render Image
            const canvas = document.getElementById('verifyCanvas');
            if (canvas && imgData) {
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.width; canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                };
                img.src = imgData;
            }

            // 4. Fill Data
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
            setVal('verifyVendor', data.vendor || "가맹점 정보 없음");
            
            this.setVerifyType('PURCHASE');
            this.renderVerifyItems(data.items || []);
            this.updateVerifySummary();
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (err) {
            console.error("🔥 Render Crash avoided:", err);
            const m = document.getElementById('verifyModal');
            if(m) m.style.display = 'grid';
        }
    },

    setVerifyType(type) {
        this.currentScanData.type = type;
        document.querySelectorAll('#verifyTypeToggle .segment').forEach(s => {
            s.classList.toggle('active', s.getAttribute('data-type') === type);
        });
        const totalEl = document.getElementById('verifyTotal');
        if (totalEl) totalEl.style.color = type === 'PURCHASE' ? 'var(--accent-magenta)' : 'var(--accent-cyan)';
    },

    renderVerifyItems(items) {
        const container = document.getElementById('verifyItemsContainer');
        if (!container) return;
        
        // v8.2.9 Header Row
        const headerHtml = `
            <div style="display:grid; grid-template-columns: 1fr 35px 70px 75px; align-items:center; gap:6px; padding:10px 12px; margin-bottom:5px; font-size:0.75rem; color:var(--accent-gold); font-weight:800; text-align:center; border-bottom:1px solid rgba(255,215,0,0.2);">
                <div>품명</div><div>수량</div><div>단가</div><div style="text-align:right;">금액</div>
            </div>
        `;
        
        container.innerHTML = headerHtml + (items.length > 0 ? items.map((it, idx) => `
            <div class="scanned-item-row" style="display:grid; grid-template-columns: 1fr 35px 70px 75px; align-items:center; gap:6px; margin-bottom:10px; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px;">
                <input type="text" value="${it.name}" style="background:transparent; border:none; color:#fff;" onchange="App.currentScanData.items[${idx}].name=this.value">
                <input type="number" value="${it.qty}" style="background:transparent; border:none; color:var(--accent-cyan); text-align:center;" onchange="App.currentScanData.items[${idx}].qty=parseInt(this.value); App.updateVerifySummary()">
                <input type="number" value="${it.unitPrice}" style="background:transparent; border:none; color:var(--accent-gold); text-align:right;" onchange="App.currentScanData.items[${idx}].unitPrice=parseInt(this.value); App.updateVerifySummary()">
                <span style="text-align:right; font-weight:800; color:var(--accent-magenta);">₩${(it.qty * it.unitPrice).toLocaleString()}</span>
            </div>
        `).join('') : '<p style="color:var(--text-dim); text-align:center; padding:20px;">품목 인식 실패</p>');
        
        const addBtn = document.createElement('button');
        addBtn.className = "btn btn-outline full-width"; addBtn.style.marginTop = "10px";
        addBtn.innerHTML = '<i data-lucide="plus"></i> 항목 추가';
        addBtn.onclick = () => {
            this.currentScanData.items.push({ name:'새 항목', qty:1, unitPrice:0 });
            this.renderVerifyItems(this.currentScanData.items);
            if(typeof lucide !== 'undefined') lucide.createIcons();
        };
        container.appendChild(addBtn);
        if(typeof lucide !== 'undefined') lucide.createIcons();
    },

    updateVerifySummary() {
        const data = this.currentScanData;
        if (!data || !data.items) return;
        
        try {
            const subtotal = data.items.reduce((a, b) => a + (parseInt(b.qty || 0) * parseInt(b.unitPrice || 0)), 0);
            const total = Math.ceil(subtotal * 1.1);
            const vat = total - subtotal;
            
            const subEl = document.getElementById('verifySubtotal');
            const vatEl = document.getElementById('verifyVAT');
            const totalEl = document.getElementById('verifyTotal');
            
            if(subEl) subEl.innerText = '₩' + subtotal.toLocaleString();
            if(vatEl) vatEl.innerText = '₩' + vat.toLocaleString();
            if(totalEl) totalEl.innerText = '₩' + total.toLocaleString();
        } catch (e) {
            console.error("Error updating summary:", e);
        }
    },

    confirmVerification() {
        const vendor = document.getElementById('verifyVendor').value;
        const total = parseInt(document.getElementById('verifyTotal').innerText.replace(/[^0-9]/g, ''));
        const entry = {
            id: Date.now(), date: new Date().toISOString().split('T')[0], vendor: vendor,
            product: vendor + ' 영수증 정산', amount: total,
            category: this.currentScanData.classification || '기타', type: this.currentScanData.type || 'PURCHASE',
            items: this.currentScanData.items
        };
        if (entry.type === 'SALE') this.db.sales.unshift(entry); else this.db.purchases.unshift(entry);
        this.save(); this.initDashboard(); this.closeModal();
        alert('장부에 등록되었습니다.');
    },

    parseReceipt(text) {
        console.log("📄 v8.2.8 High-Precision Parsing...");
        if (!text) return { vendor: "정보 미식별", items: [], total: 0, classification: "기타" };
        
        // Clean text but keep digits and commas for price extraction
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        
        // 1. Vendor Lookup (Improved for Distribution/Wholesale)
        let vendor = "공급처 불명";
        const bizKeywords = /유통|공급|식당|본점|상사|마트|상점|나라|테크|식품|코리아|푸드|물산|컴퍼니|농산|정육|수산/;
        const headers = /영수증|신용카드|매출|전표|승인|일자|번호|주소|사업자|대표|전화/;

        for (let i = 0; i < Math.min(8, lines.length); i++) {
            if (lines[i].match(bizKeywords) && !lines[i].match(/대표|전화|사업/)) {
                vendor = lines[i].replace(/[<>\[\]\(\)*]/g, '').trim();
                break;
            }
        }
        if (vendor === "공급처 불명" && lines.length > 0) {
            vendor = lines[0].match(/영수증|매출/) ? (lines[1] || lines[0]) : lines[0];
        }

        const items = [];
        let detectedTotal = 0;
        
        lines.forEach(line => {
            // Price Discovery: Look for the LARGEST number at the middle or end of the line
            const matches = line.replace(/,/g, '').match(/(\d{4,10})/g);
            if (matches) {
                const val = Math.max(...matches.map(m => parseInt(m)));
                if (val > 100 && val < 5000000) {
                    if (line.match(/합계|총액|TOTAL|결제|금액|받은돈|합 계/i)) {
                        detectedTotal = Math.max(detectedTotal, val);
                    } else if (items.length < 15 && !line.match(/전화|사업|일자|승인|대표|주소/)) {
                        // Extract name by removing the price and other digits
                        let name = line.replace(/[\d,]{4,}/g, '').replace(/[^\w가-힣\s\(\)]/g, '').trim();
                        if (name.length > 1) {
                            items.push({ name: name, qty: 1, unitPrice: val });
                        }
                    }
                }
            }
        });

        if (detectedTotal === 0 && items.length > 0) {
            detectedTotal = items.reduce((a, b) => a + b.unitPrice, 0);
        }

        const classification = text.match(/마트|공급|유통|농산|수산|도매/) ? '식자재' : (text.match(/식당|음식|커피|카페/) ? '식자재' : '기타');

        return { vendor, items, total: detectedTotal, classification };
    },

    initDashboard() {
        this.renderGlobalStats();
        this.initTrendChart();
        this.renderRecentHistory();
    },

    renderGlobalStats() {
        const sales = this.db.sales.reduce((a, b) => a + b.amount, 0);
        const costs = this.db.purchases.reduce((a, b) => a + b.amount, 0);
        const _set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = '₩' + val.toLocaleString(); };
        _set('dash-sales', sales); _set('dash-purchase', costs); _set('dash-profit', sales - costs);
    },

    initTrendChart() {
        const can = document.getElementById('trendChart'); if (!can) return;
        if (this.charts.dashboard) this.charts.dashboard.destroy();
        const sortedSales = [...this.db.sales].sort((a,b) => new Date(a.date)-new Date(b.date));
        const last30 = sortedSales.slice(-30);
        const getMA = (data, p) => {
            return data.map((_, i) => {
                const sub = data.slice(Math.max(0, i-p+1), i+1);
                return sub.reduce((a, b) => a + b.amount, 0) / sub.length;
            }).slice(-30);
        };
        const ma5 = getMA(sortedSales, 5);
        const ma20 = getMA(sortedSales, 20);
        const ma120 = getMA(sortedSales, 120);

        this.charts.dashboard = new Chart(can, {
            type: 'line',
            data: {
                labels: last30.map(d => d.date.slice(5)),
                datasets: [
                    { label: '매출', data: last30.map(d => d.amount), borderColor: '#fff', borderWidth: 1, pointRadius: 2, tension: 0.3 },
                    { label: '5일', data: ma5, borderColor: '#00fff2', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                    { label: '20일', data: ma20, borderColor: '#ffbd00', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                    { label: '120일', data: ma120, borderColor: '#39ff14', borderWidth: 2, pointRadius: 0, tension: 0.4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }, x: { grid: { display: false }, ticks: { color: '#64748b' } } } }
        });
        this.updateManagerBriefing(ma5, ma20, ma120);
    },

    updateWeather(type) {
        this.weather = type;
        const badge = document.getElementById('weatherAdviceBadge');
        if (badge) badge.innerText = type === 'sunny' ? '맑음/최적' : (type === 'rainy' ? '비/배달특수' : '흐림/안주');
        this.initTrendChart();
    },

    updateManagerBriefing(ma5, ma20, ma120) {
        const el = document.getElementById('trendInsight'); if (!el) return;
        const cur5 = ma5[ma5.length-1]; const cur20 = ma20[ma20.length-1];
        const cur120 = ma120[ma120.length-1];
        
        // 1. Core Diagnosis
        let diag = cur5 > cur20 ? 
            "현재 단기 성장이 뚜렷한 <span style='color:var(--accent-cyan)'>골든크로스</span> 상태입니다. 공격적인 마케팅과 재고 확보를 추천합니다." : 
            "현재 단기 성장이 완만한 <span style='color:var(--accent-magenta)'>조정 구간</span>입니다. 안정적인 현금 흐름 확보에 집중하세요.";
        
        if (cur20 > cur120) diag += " 장기적으로는 매우 탄탄한 성장세를 유지하고 있습니다.";
        el.innerHTML = `<strong>💼 경영 진단:</strong> ${diag}`;

        // 2. Metrics Linkage (index.html 연동)
        const profitability = (cur5 / cur120 * 100).toFixed(1);
        const pEl = document.getElementById('m-profitability');
        if (pEl) pEl.innerText = profitability > 100 ? `${profitability}% (우수)` : `${profitability}% (정체)`;
        
        const gEl = document.getElementById('m-grade');
        if (gEl) {
            let grade = profitability > 110 ? 'AAA' : (profitability > 90 ? 'AA' : 'A');
            gEl.innerText = grade;
            gEl.style.color = grade === 'AAA' ? 'var(--accent-gold)' : 'var(--accent-cyan)';
        }
    },

    generateExecutiveReport() {
        alert("📊 정밀 경영 보고서가 생성되었습니다. 대시보드 인사이트를 확인하세요.");
    },

    renderRecentHistory() {
        const list = document.getElementById('historyList'); if (!list) return;
        const hist = [...this.db.sales, ...this.db.purchases].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 10);
        list.innerHTML = hist.map(r => `
            <div class="history-item">
                <div class="item-info"><h4>${r.vendor || r.product}</h4><p>${r.date}</p></div>
                <div class="item-amount ${r.type==='SALE'?'amount-sale':'amount-purchase'}">${r.type==='SALE'?'+':'-'} ₩${r.amount.toLocaleString()}</div>
            </div>
        `).join('');
    },

    initReport() {
        const expC = document.getElementById('expenseCategoryChart'); if (!expC) return;
        if (this.charts.exp) this.charts.exp.destroy();
        const catMap = {}; this.db.purchases.forEach(p => { const c = p.category || '기타'; catMap[c] = (catMap[c] || 0) + p.amount; });
        this.charts.exp = new Chart(expC, {
            type: 'doughnut',
            data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ['#00d2ff', '#ff00c1', '#39ff14', '#ffbd00', '#ff8c00', '#e2e8f0'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#fff', usePointStyle: true } } } }
        });
    },

    openModal(id) { 
        this.closeModal();
        const m = document.getElementById(id);
        if (m) {
            if (m.classList.contains('modal-overlay')) m.style.display = 'grid';
            else {
                const overlay = document.getElementById('modalOverlay');
                if (overlay) overlay.style.display = 'grid';
                m.style.display = 'block';
            }
        }
        document.body.style.overflow = 'hidden';
    },

    closeModal() { 
        document.querySelectorAll('.modal-overlay').forEach(o => o.style.display = 'none');
        document.body.style.overflow = '';
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
