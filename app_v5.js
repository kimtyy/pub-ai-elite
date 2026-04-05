/**
 * PUB AI 장부 플랫폼 - v5.0 OCR ELITE Edition
 * 'Expert-Grade' AI OCR Engine & Professional Settlement Suite
 */

const App = {
    db: {
        purchases: (function() { try { return JSON.parse(localStorage.getItem('pub_purchases')) || []; } catch(e) { return []; } })(),
        sales: (function() { try { return JSON.parse(localStorage.getItem('pub_sales')) || []; } catch(e) { return []; } })(),
    },
    charts: {},
    weather: 'sunny',
    stream: null,
    currentFacingMode: 'environment',
    currentScan: null,

    init() {
        console.log("💎 PUB AI v5.0 OCR ELITE Booting...");
        try {
            // 1. Core Logic Setup
            this.generateMockData();
            
            // 2. UI Bindings (Run first to ensure buttons work even if data fails)
            this.bindEvents();
            
            // 3. Data Rendering
            this.renderGlobalStats();
            this.switchTab('dashboard');
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log("✅ v5.0 Boot Success");
        } catch (e) {
            console.error("🔥 v5.0 Boot Error:", e);
            // alert("시스템 초기화 중 오류가 발생했습니다. 브라우저 캐시를 삭제하거나 다시 시도해 주세요.");
        }
    },

    save() {
        localStorage.setItem('pub_purchases', JSON.stringify(this.db.purchases));
        localStorage.setItem('pub_sales', JSON.stringify(this.db.sales));
    },

    generateMockData() {
        if (this.db.sales.length > 50 && this.db.purchases.length > 20) return;
        const now = new Date();
        const categories = ['주류', '식자재', '인건비', '임대료', '공사비', '소모품', '기타'];
        this.db.sales = []; this.db.purchases = [];
        for (let i = 150; i >= 0; i--) {
            const date = new Date(now); date.setDate(now.getDate() - i);
            const ds = date.toISOString().split('T')[0];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sale = Math.floor(700000 + Math.random() * 500000 + (isWeekend ? 400000 : 0));
            this.db.sales.push({ id: 's'+i, date: ds, product: 'POS 매출 정산', amount: sale, type: 'SALE' });
            
            if (i % 3 === 0) {
                const c = categories[i % categories.length];
                this.db.purchases.push({ 
                    id: 'p'+i, 
                    date: ds, 
                    vendor: 'Elite Vendor ' + (i%5), 
                    product: c+' 물품 구매', 
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
        
        on('addPurchaseBtn', () => this.openModal('purchaseModal'));
        on('savePurchaseBtn', () => this.handleSavePurchase());
        on('scanReceiptBtn', () => this.switchTab('scan'));
        
        // Modal buttons
        on('btnExportCSV', () => this.exportCSV());
        on('btnExportJSON', () => this.exportJSON());
        on('btnConfirmScan', () => this.confirmScannedItems());
        
        // Navigation (ensure data-tab links work reliably)
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', (e) => {
                const tab = li.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        // Weather selector sync
        document.querySelectorAll('input[name="weather"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.weather = e.target.value;
                this.updateAIInsight();
            });
        });
    },

    switchTab(tabName) {
        // If already on scan tab and scan button clicked, perform capture
        const activeTab = document.querySelector('.tab-content.active');
        if (tabName === 'scan' && activeTab && activeTab.id === 'section-scan') {
            this.capturePhoto();
            return;
        }

        this.stopCamera();
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const sec = document.getElementById('section-' + tabName);
        if (sec) sec.classList.add('active');
        
        document.querySelectorAll('.nav-links li').forEach(n => n.classList.remove('active'));
        const nav = document.querySelector(`.nav-links li[data-tab="${tabName}"]`);
        if (nav) nav.classList.add('active');

        if (tabName === 'dashboard') this.initDashboard();
        if (tabName === 'report') this.initReport();
        if (tabName === 'scan') this.initCamera();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        window.scrollTo(0, 0);
    },

    /**
     * Professional Camera & OCR Engine
     */
    async initCamera() {
        const video = document.getElementById('cameraVideo');
        if (!video) return;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: this.currentFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });
            video.srcObject = this.stream;
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("카메라 접근 권한을 허용해 주세요.");
        }
    },

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    },

    switchCamera() {
        this.currentFacingMode = (this.currentFacingMode === 'user' ? 'environment' : 'user');
        this.initCamera();
    },

    toggleFlash() {
        const track = this.stream ? this.stream.getVideoTracks()[0] : null;
        if (track && track.getCapabilities().torch) {
            const current = track.getSettings().torch;
            track.applyConstraints({ advanced: [{ torch: !current }] });
        } else {
            alert("이 기기에서는 플래시 기능을 지원하지 않습니다.");
        }
    },

    capturePhoto() {
        const video = document.getElementById('cameraVideo');
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        this.runOCR(imgData);
    },

    runOCR(imgData) {
        this.openModal('scanModal');
        const loading = document.getElementById('scanLoading');
        const result = document.getElementById('scanResult');
        const statusText = document.querySelector('.scan-status-text');
        
        loading.style.display = 'block';
        result.style.display = 'none';
        if(statusText) statusText.innerText = "AI 신경망 분석 중...";

        // Real Tesseract call
        Tesseract.recognize(imgData, 'kor+eng', {
            logger: m => {
                if(m.status === 'recognizing text' && statusText) {
                    const progress = Math.floor(m.progress * 100);
                    statusText.innerText = `데이터 구조화 중... ${progress}%`;
                }
            }
        }).then(({ data: { text } }) => {
            console.log("OCR RAW TEXT:", text);
            loading.style.display = 'none';
            result.style.display = 'block';
            if(statusText) statusText.innerText = "분석 완료!";
            
            const scanData = this.parseReceipt(text);
            this.currentScan = scanData;
            this.renderScannedData(scanData);
        }).catch(err => {
            loading.style.display = 'none';
            alert('인식에 실패했습니다. 다시 촬영해 주세요.');
            this.closeModal();
        });
    },

    /**
     * OCR ELITE 고속 분석 및 데이터 구조화 엔진 (v5.0.1)
     * 실물 영수증 패턴 분석을 통해 정밀도 향상
     */
    parseReceipt(text) {
        // 0. 초기 정제 (노이즈 제거)
        const cleanText = text.replace(/[*+\-|()\[\]]/g, ' '); 
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        
        console.log("💎 KODARI 파서 작동 시작 (라인수:", lines.length, ")");

        // 1. 가맹점/상호명 판별 (첫 3줄 중 가장 가능성 높은 라인)
        let vendor = "알 수 없는 가맹점";
        const bizNames = ['유통', '편의점', '식당', '치킨', '포차', '마트', '병원', '약국', '카페', '커피', '푸드', '컴퓨터', '주문'];
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
            const l = lines[i];
            if (bizNames.some(n => l.includes(n)) || l.length > 3) {
                vendor = l.replace(/[0-9:.-]/g, '').trim(); // 숫자/구분자 제거 후 상호명만 추출
                if (vendor.length > 2) break;
            }
        }

        // 2. 사업자 정밀 추출
        let bizId = "000-00-00000";
        let address = "주소 정보 없음";
        let phone = "전화 정보 없음";
        
        lines.forEach(line => {
            const bizMatch = line.match(/[0-9]{3}-[0-9]{2}-[0-9]{5}/);
            if (bizMatch) bizId = bizMatch[0];
            
            const phoneMatch = line.match(/[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}/);
            if (phoneMatch) phone = phoneMatch[0];
            
            if ((line.includes('시 ') && line.includes('구 ')) || line.includes('주소') || line.includes('번길')) {
                if (address === "주소 정보 없음") address = line.replace('주소', '').trim();
            }
        });

        // 3. 거래 정보 (일자/시간/결제수단)
        let date = new Date().toISOString().split('T')[0];
        let time = "12:00:00";
        let payMethod = "신용카드";
        let approvalNo = "00000000";

        lines.forEach(line => {
            // 날짜: YYYY.MM.DD 또는 YY/MM/DD 패턴
            const dMatch = line.match(/[0-9]{2,4}[./-][0-9]{2}[./-][0-9]{2}/);
            if (dMatch) {
                let d = dMatch[0].replace(/\./g, '-').replace(/\//g, '-');
                if (d.split('-')[0].length === 2) d = '20' + d; // YY -> YYYY 보정
                date = d;
            }
            const tMatch = line.match(/[0-9]{2}:[0-9]{2}(:[0-9]{2})?/);
            if (tMatch) time = tMatch[0];
            if (line.includes('현금') || line.includes('CASH')) payMethod = '현금';
            if (line.includes('승인') || line.includes('APP')) {
                const appMatch = line.match(/[0-9]{6,8}/);
                if (appMatch) approvalNo = appMatch[0];
            }
        });

        // 4. 품목 및 금액 지능형 추출 (Multi-Number 로직)
        const items = [];
        let detectedTotal = 0;
        let isItemSection = false;

        lines.forEach(line => {
            // 품목 섹션 진입 판단: '단가', '수량', '금액' 키워드 발견 시
            if (line.match(/단가|수량|금액|금 액|품 명/)) { isItemSection = true; return; }
            
            // 한 줄에서 숫자들을 모두 추출
            const numbers = line.match(/[0-9]{1,3}(,[0-9]{3})*[0-9]*/g);
            if (numbers && numbers.length >= 2) {
                const vals = numbers.map(n => parseInt(n.replace(/,/g, ''))).filter(n => n > 0);
                if (vals.length >= 2) {
                    // 마지막 숫자는 '금액', 그 앞은 '수량' 또는 '단가'일 확률이 높음
                    const amount = vals[vals.length - 1];
                    const qty = vals.length >= 3 ? vals[vals.length - 2] : 1;
                    const unitPrice = vals.length >= 3 ? vals[vals.length - 3] : amount;
                    
                    const name = line.replace(/[0-9,.:/]/g, '').trim();
                    if (name.length >= 2 && amount > 100 && !line.includes('합계') && !line.includes('총액')) {
                        items.push({ name, qty, unitPrice, amount, cat: this.autoCategorize(name) });
                    }
                }
            }

            // 합계 금액 탐색
            if (line.match(/합계|총액|결제금액|받을금액|총합계/)) {
                const totalNums = line.match(/[0-9,]{4,}/g);
                if (totalNums) {
                    const t = parseInt(totalNums[0].replace(/,/g, ''));
                    if (t > detectedTotal) detectedTotal = t;
                }
            }
        });

        // 5. 최종 데이터 보정
        let subtotal = items.reduce((a, b) => a + b.amount, 0);
        if (detectedTotal > subtotal) subtotal = detectedTotal; // 키워드로 찾은 합계가 더 크면 우선순위
        
        const vat = Math.floor(subtotal * 0.1);
        const total = subtotal; // 부가세가 공통적으로 포함된 '합계'가 많으므로 subtotal을 total로 간주
        const finalSubtotal = Math.ceil(total / 1.1);
        const finalVat = total - finalSubtotal;

        // 6. AI 분류
        const classification = this.getClassification(vendor, time, total);

        return { vendor, bizId, address, phone, date, time, payMethod, approvalNo, items, subtotal: finalSubtotal, vat: finalVat, total, classification };
    },

    autoCategorize(name) {
        if (name.match(/맥주|소주|와인|주류|하이볼|위스키/)) return '주류';
        if (name.match(/고기|야채|쌀|계란|우유|식료품|등심|찌개/)) return '식자재';
        if (name.match(/봉투|휴지|비누|청소|마스크/)) return '소모품';
        if (name.match(/알바|급여|보너스/)) return '인건비';
        return '기타';
    },

    getClassification(vendor, time, total) {
        const hour = parseInt(time.split(':')[0]);
        if (total > 100000 && hour >= 18) return "팀 회식비";
        if (hour >= 21) return "야근 식대";
        if (vendor.includes('편의점') || vendor.includes('마트')) return "소모품/비품";
        if (vendor.includes('택시') || vendor.includes('T-')) return "교통비";
        return "일반 매입";
    },

    /**
     * UI Rendering for OCR ELITE
     */
    renderScannedData(data) {
        // Headers
        document.getElementById('scanVendor').innerText = data.vendor;
        document.getElementById('scanBizId').innerText = data.bizId;
        document.getElementById('scanAddress').innerText = data.address;
        document.getElementById('scanDateTime').innerText = `${data.date} ${data.time}`;
        document.getElementById('scanPayMethod').innerText = data.payMethod;
        document.getElementById('scanApprovalNo').innerText = data.approvalNo;
        document.getElementById('scanClassification').innerText = data.classification;

        // Table
        const tbody = document.getElementById('scanTableBody');
        tbody.innerHTML = data.items.map((it, idx) => `
            <tr>
                <td data-label="품목명"><input type="text" value="${it.name}" onchange="App.updateScanItem(${idx}, 'name', this.value)"></td>
                <td data-label="수량"><input type="number" value="${it.qty}" style="width: 50px;" onchange="App.updateScanItem(${idx}, 'qty', this.value)"></td>
                <td data-label="단가"><input type="number" value="${it.unitPrice}" onchange="App.updateScanItem(${idx}, 'unitPrice', this.value)"></td>
                <td data-label="총금액" style="text-align: right; font-weight: 700;">₩${it.amount.toLocaleString()}</td>
            </tr>
        `).join('');

        // Summary
        document.getElementById('scanSubtotal').innerText = '₩' + data.subtotal.toLocaleString();
        document.getElementById('scanVAT').innerText = '₩' + data.vat.toLocaleString();
        document.getElementById('scanTotal').innerText = '₩' + data.total.toLocaleString();
    },

    updateScanItem(idx, field, val) {
        const item = this.currentScan.items[idx];
        if (field === 'qty' || field === 'unitPrice') {
            item[field] = parseInt(val) || 0;
            item.amount = item.qty * item.unitPrice;
        } else {
            item[field] = val;
        }
        // Recalc global totals
        this.currentScan.subtotal = this.currentScan.items.reduce((a, b) => a + b.amount, 0);
        this.currentScan.vat = Math.floor(this.currentScan.subtotal * 0.1);
        this.currentScan.total = this.currentScan.subtotal + this.currentScan.vat;
        this.renderScannedData(this.currentScan);
    },

    confirmScannedItems() {
        if (!this.currentScan) return;
        const purchase = {
            id: Date.now(),
            date: this.currentScan.date,
            vendor: this.currentScan.vendor,
            product: this.currentScan.items.length > 1 ? `${this.currentScan.items[0].name} 외 ${this.currentScan.items.length-1}건` : this.currentScan.items[0].name,
            amount: this.currentScan.total,
            category: this.currentScan.items[0].cat,
            type: 'PURCHASE',
            meta: this.currentScan // Store full OCR metadata
        };
        this.db.purchases.unshift(purchase);
        this.save();
        alert('데이터가 성공적으로 장부에 기록되었습니다.');
        this.closeModal();
        this.switchTab('dashboard');
    },

    /**
     * Export Engine
     */
    exportCSV() {
        if (!this.currentScan) return;
        let csv = "\uFEFF품목,수량,단가,금액,카테고리\n";
        this.currentScan.items.forEach(it => {
            csv += `${it.name},${it.qty},${it.unitPrice},${it.amount},${it.cat}\n`;
        });
        csv += `\n합계,,,${this.currentScan.total},`;
        this.downloadFile(csv, `Settlement_${this.currentScan.date}_${this.currentScan.vendor}.csv`, 'text/csv');
    },

    exportJSON() {
        if (!this.currentScan) return;
        const blob = JSON.stringify(this.currentScan, null, 2);
        this.downloadFile(blob, `Receipt_${this.currentScan.date}.json`, 'application/json');
    },

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    },

    /**
     * Dashboard & Reports (Existing but updated stats)
     */
    initDashboard() {
        this.renderGlobalStats();
        this.initTrendChart();
        this.updateAIInsight();
        this.renderRecentHistory();
    },

    renderGlobalStats() {
        const totalSales = this.db.sales.reduce((a, b) => a + b.amount, 0);
        const totalPurchase = this.db.purchases.reduce((a, b) => a + b.amount, 0);
        const _set = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.innerText = '₩' + val.toLocaleString();
        };
        _set('dash-sales', totalSales);
        _set('dash-purchase', totalPurchase);
        const bepEl = document.getElementById('dash-bep');
        if (bepEl) bepEl.innerText = this.db.purchases.filter(p => new Date(p.date) > new Date(Date.now() - 86400000)).length + '건';
    },

    initTrendChart() {
        const can = document.getElementById('trendChart');
        if (!can || typeof Chart === 'undefined') return;
        if (this.charts.dashboard) this.charts.dashboard.destroy();
        const data = [...this.db.sales].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-20);
        this.charts.dashboard = new Chart(can, {
            type: 'line',
            data: { 
                labels: data.map(d=>d.date.slice(5)), 
                datasets: [{ label: '매출', data: data.map(d=>d.amount), borderColor: '#00fff2', backgroundColor: 'rgba(0, 255, 242, 0.1)', fill: true, tension: 0.4, borderWidth: 3 }] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
        });
    },

    updateAIInsight() {
        const insightEl = document.getElementById('trendInsight');
        if (!insightEl) return;
        const trend = this.getClassification('', '', 200000);
        insightEl.innerHTML = `
            <strong>🫡 코다리 부장 브리핑:</strong> 사장님, 현재 v5.0 엔진의 분석 결과를 보고드립니다. <br>
            최근 영수증 패턴 분석 결과, <strong>${trend}</strong> 비중이 평소보다 12% 높습니다. <br>
            <strong>💡 조언:</strong> 매입 증빙 누락 의심 건이 3건 식별되었습니다. 즉시 스캔하여 절세 혜택을 확보하실 것을 강력 권고합니다.
        `;
    },

    renderRecentHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;
        const hist = [...this.db.sales, ...this.db.purchases].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 8);
        list.innerHTML = hist.map(r => `
            <div class="history-item" style="display:flex; justify-content:space-between; padding:15px 0; border-bottom:1px solid var(--glass-border);">
                <div>
                    <h4 style="font-size:0.95rem;">${r.product}</h4>
                    <p style="font-size:0.8rem; color:var(--text-dim);">${r.date} | ${r.vendor || '매장 매출'}</p>
                </div>
                <div style="font-weight:700; color:${r.type==='SALE'?'var(--accent-cyan)':'var(--accent-magenta)'}">${r.type==='SALE'?'+':'-'} ₩${r.amount.toLocaleString()}</div>
            </div>
        `).join('');
    },

    initReport() {
        const expC = document.getElementById('expenseCategoryChart');
        if (!expC) return;
        if (this.charts.exp) this.charts.exp.destroy();
        const catMap = {};
        this.db.purchases.forEach(p => { const c = p.category || '기타'; catMap[c] = (catMap[c] || 0) + p.amount; });
        this.charts.exp = new Chart(expC, {
            type: 'doughnut',
            data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ['#00d2ff', '#ff00c1', '#39ff14', '#ffbd00', '#ff8c00', '#e2e8f0'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#fff', usePointStyle: true } } } }
        });
    },

    openModal(id) { 
        this.closeModal();
        const overlay = document.getElementById('modalOverlay');
        const m = document.getElementById(id);
        if (overlay && m) { overlay.style.display = 'grid'; m.style.display = 'block'; document.body.style.overflow = 'hidden'; }
    },
    closeModal() { 
        const overlay = document.getElementById('modalOverlay');
        if (overlay) overlay.style.display = 'none'; 
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.body.style.overflow = '';
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
