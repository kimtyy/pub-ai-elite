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
            console.error("🔥 v7.0 Boot Error:", e);
        }
    },

    save() {
        localStorage.setItem('pub_purchases', JSON.stringify(this.db.purchases));
        localStorage.setItem('pub_sales', JSON.stringify(this.db.sales));
    },

    generateMockData() {
        if (this.db.sales.length > 150) return;
        const now = new Date();
        const categories = ['주류', '식자재', '인건비', '임대료', '공사비', '소모품', '기타'];
        this.db.sales = []; this.db.purchases = [];
        // Generate 180 days of data for high-fidelity 120-day Moving Average analysis
        for (let i = 180; i >= 0; i--) {
            const date = new Date(now); date.setDate(now.getDate() - i);
            const ds = date.toISOString().split('T')[0];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sale = Math.floor(700000 + Math.random() * 500000 + (isWeekend ? 400000 : 0));
            this.db.sales.push({ date: ds, amount: sale, type: 'SALE' });
            
            if (i % 3 === 0) {
                const c = categories[i % categories.length];
                this.db.purchases.push({ 
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
        
        // Navigation (ensure data-tab links work reliably)
        document.querySelectorAll('.nav-links li').forEach(li => {
            li.addEventListener('click', (e) => {
                const tab = li.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
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

        const fab = document.querySelector('.fab-btn');
        if (fab) fab.style.display = tabName === 'scan' ? 'none' : 'grid';

        if (tabName === 'dashboard') this.initDashboard();
        if (tabName === 'report') this.initReport();
        if (tabName === 'scan') this.initCamera();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
        window.scrollTo(0, 0);
    },

    /**
     * Professional Camera & OCR Engine (v7.0 Elite Core)
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
            // Relaxed constraints for better mobile compatibility
            const constraints = {
                video: { 
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = this.stream;
            
            // Wait for video to be ready before showing
            video.onloadedmetadata = () => {
                video.play();
                this.isInitializingCamera = false;
            };
        } catch (err) {
            console.error("Camera access denied or error:", err);
            this.isInitializingCamera = false;
            
            let msg = "카메라 접근 권한이 필요합니다.";
            if (err.name === 'NotAllowedError') {
                msg = "브라우저에서 카메라 권한을 '차단'했습니다. 주소창 왼쪽 자물쇠를 눌러 '허용'으로 바꿔주세요.";
            } else if (err.name === 'NotFoundError') {
                msg = "사용 가능한 카메라를 찾을 수 없습니다.";
            }
            alert(msg + "\n\n(카카오톡 내 브라우저라면 '크롬'으로 열면 해결됩니다!)");
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
        if (!video || !this.stream) {
            alert("카메라가 준비되지 않았습니다. (Permission or Loading)");
            return;
        }
        
        console.log("📸 Capture Triggered");
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (canvas.width === 0 || canvas.height === 0) {
            alert("카메라 데이터를 읽을 수 없습니다. 브라우저를 새로고침해 주세요.");
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        // this.preprocessImage(canvas); // REMOVED: Google Vision works best with raw, un-thresholded color images.
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        this.runOCR(imgData);
    },

    preprocessImage(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.1)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imgData.data;
        let total = 0;
        for (let i = 0; i < pixels.length; i += 4) total += pixels[i];
        const threshold = (total / (pixels.length / 4)) * 0.95;

        for (let i = 0; i < pixels.length; i += 4) {
            const v = (pixels[i] > threshold) ? 255 : 0;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
    },

    async runOCR(imgData) {
        const statusText = document.querySelector('.scan-status-text');
        if(statusText) statusText.innerText = "Google Cloud AI 분석 요청 중...";
        
        try {
            console.log("🚀 Sending to /api/ocr...");
            const response = await fetch('/api/ocr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imgData })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.details || 'OCR 분석 실패');

            console.log("💎 OCR Success:", data.fullText);
            const parsed = this.parseReceipt(data.fullText);
            this.currentScanData = parsed;
            
            if(statusText) statusText.innerText = "분석 완료!";
            setTimeout(() => this.openVerificationCenter(imgData, parsed), 500);

        } catch (err) {
            console.error("OCR API Error Details:", err);
            alert(`AI 분석 오류: ${err.message}\n(구글 클라우드 계정 혹은 API 설정을 점검해 주세요.)`);
            if(statusText) statusText.innerText = "분석 오류 발생";
        }
    },

    /**
     * v6.0 Verification Center (Side-by-Side Review)
     */
    openVerificationCenter(imgData, data) {
        this.closeModal();
        this.openModal('verifyModal');
        
        const canvas = document.getElementById('verifyCanvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = imgData;

        document.getElementById('verifyVendor').value = data.vendor || "공급처 불명";
        data.type = data.type || 'PURCHASE'; // Default
        this.setVerifyType(data.type);
        this.renderVerifyItems(data.items);
        this.updateVerifySummary();
    },

    setVerifyType(type) {
        this.currentScanData.type = type;
        document.querySelectorAll('#verifyTypeToggle .segment').forEach(s => {
            s.classList.toggle('active', s.getAttribute('data-type') === type);
        });
        // Optional: change total text color based on type
        const totalEl = document.getElementById('verifyTotal');
        if (totalEl) totalEl.style.color = type === 'PURCHASE' ? 'var(--accent-magenta)' : 'var(--accent-cyan)';
    },

    renderVerifyItems(items) {
        const container = document.getElementById('verifyItemsContainer');
        container.innerHTML = items.length > 0 ? items.map((it, idx) => `
            <div class="scanned-item-row" style="display:grid; grid-template-columns: 1fr 35px 70px 75px; align-items:center; gap:6px; margin-bottom:12px; padding:15px 10px; background:rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius:12px;">
                <input type="text" value="${it.name}" style="background:transparent; border:none; color:#fff; font-size:1rem; min-width:0; padding:0;" onchange="App.currentScanData.items[${idx}].name=this.value">
                <input type="number" value="${it.qty}" style="background:transparent; border:none; color:var(--accent-cyan); text-align:center; font-size:1rem; font-weight:700; min-width:0; padding:0;" onchange="App.currentScanData.items[${idx}].qty=parseInt(this.value); App.updateVerifySummary()">
                <input type="number" value="${it.unitPrice}" style="background:transparent; border:none; color:var(--accent-gold); text-align:right; font-size:1rem; font-weight:700; min-width:0; padding:0;" onchange="App.currentScanData.items[${idx}].unitPrice=parseInt(this.value); App.updateVerifySummary()">
                <span style="text-align:right; font-weight:800; font-size:1rem; color:var(--accent-magenta); white-space:nowrap;">₩${(it.qty * it.unitPrice).toLocaleString()}</span>
            </div>
        `).join('') : '<p style="color:var(--text-dim); text-align:center; padding:20px;">품목 인식 실패. 직접 입력해 주세요.</p>';
        
        const addBtn = document.createElement('button');
        addBtn.className = "btn btn-secondary full-width";
        addBtn.style.marginTop = "10px";
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
        const subtotal = data.items.reduce((a, b) => a + (b.qty * b.unitPrice), 0);
        const total = Math.ceil(subtotal * 1.1);
        const vat = total - subtotal;
        
        document.getElementById('verifySubtotal').innerText = '₩' + subtotal.toLocaleString();
        document.getElementById('verifyVAT').innerText = '₩' + vat.toLocaleString();
        document.getElementById('verifyTotal').innerText = '₩' + total.toLocaleString();
    },

    confirmVerification() {
        const vendor = document.getElementById('verifyVendor').value;
        const totalText = document.getElementById('verifyTotal').innerText.replace(/[^0-9]/g, '');
        const total = parseInt(totalText);
        const type = this.currentScanData.type || 'PURCHASE';
        
        const entry = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            vendor: vendor,
            product: vendor + (ty    parseReceipt(text) {
        console.log("📄 Raw OCR Text:", text);
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // 1. Intelligent Vendor Extraction
        let vendor = "가맹점 정보 없음";
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const clean = lines[i].replace(/\s/g, '');
            if (clean.match(/유통|마트|식당|본점|상사|상점|나라|테크|식품|코리아|푸드|물산/) && !lines[i].match(/사업자|주소|대표|영수증|번호|pos|전표/i)) {
                vendor = lines[i].replace(/[<>\[\]\(\)*]/g, '').trim();
                break; 
            }
        }

        // 2. Section-Bounded Item Extraction
        const items = [];
        let detectedTotal = 0;
        
        let startIdx = 0;
        let endIdx = lines.length;

        // Find Start Bound (Table Header)
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/품\s*명|단\s*가|수\s*량|금\s*액/)) {
                startIdx = i + 1;
                break;
            }
        }

        // Find End Bound (Total Footer)
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].match(/합\s*계|과\s*세|부\s*가\s*세|면\s*세|받\s*은\s*돈|카\s*드/)) {
                endIdx = i;
                const am = lines[i].match(/([0-9,]{4,10})/);
                if (am) detectedTotal = Math.max(detectedTotal, parseInt(am[1].replace(/,/g, '')));
                break;
            }
        }

        // Process only lines within the item bounds
        const itemLines = lines.slice(startIdx, endIdx);

        itemLines.forEach(line => {
            const cleanLine = line.trim();
            // Final trash guard for metadata within bounds
            if (cleanLine.match(/사업자|주소|대표|pos|전화|가맹|일자|시간|번호/i)) return;
            if (cleanLine.length < 5) return;

            const tokens = cleanLine.split(/\s+/).filter(t => t.length > 0);
            let nums = [];
            let nameParts = [];
            
            tokens.forEach(t => {
                const nStr = t.replace(/[,.]/g, '');
                // Handle complex cases like (2) or (2k) being merged with name
                if (/^\d+$/.test(nStr) && nStr.length < 9) nums.push(parseInt(nStr));
                else nameParts.push(t);
            });

            if (nums.length >= 1) {
                const lineTotal = nums[nums.length - 1];
                let name = nameParts.join(' ').replace(/^\d{8,}\s*/, '').trim();
                if (name.length < 2 || name.match(/^[0-9\s,\.\-\(\)]+$/)) return;

                let qty = 1;
                let price = lineTotal;

                if (nums.length >= 2) {
                    // Optimized Algebra for UnitPrice calculation
                    const candidateQty = nums[nums.length - 2];
                    const candidatePrice = nums[nums.length - 3] || -1;

                    if (candidatePrice !== -1 && Math.abs(candidatePrice * candidateQty - lineTotal) < 10) {
                        price = candidatePrice;
                        qty = candidateQty;
                    } else if (candidateQty < 100 && candidateQty > 0) {
                        qty = candidateQty;
                        price = Math.round(lineTotal / qty);
                    }
                }
                items.push({ name, qty, unitPrice: price });
            }
        });

        // 3. Finalization
        if (detectedTotal === 0 && items.length > 0) {
            detectedTotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        }

        return { 
            vendor, 
            items: items.slice(0, 50),
            total: detectedTotal,
            classification: text.toLowerCase().match(/마트|편의점|슈퍼/) ? '소모품' : 
                            text.toLowerCase().match(/식당|음식|커피|카페/) ? '식자재' :
                            text.toLowerCase().match(/주점|포차|비어|술/) ? '주류' : '기타'
        };
    },�|총\s*액|TOTAL/i)) {
                const am = cleanLine.match(/([0-9,]{4,10})/);
                if (am) detectedTotal = Math.max(detectedTotal, parseInt(am[1].replace(/,/g, '')));
            }
        });

        // 3. Finalization
        if (detectedTotal === 0 && items.length > 0) {
            detectedTotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
        }

        return { 
            vendor, 
            items: items.slice(0, 50),
            total: detectedTotal,
            classification: text.toLowerCase().match(/마트|편의점|슈퍼/) ? '소모품' : 
                            text.toLowerCase().match(/식당|음식|커피|카페/) ? '식자재' :
                            text.toLowerCase().match(/주점|포차|비어|술/) ? '주류' : '기타'
        };
    },

    /**
     * v6.0 Analyst Engine: Multi-Period Moving Averages & Weather Strategy
     */
    initTrendChart() {
        const can = document.getElementById('trendChart');
        if (!can) return;
        if (this.charts.dashboard) this.charts.dashboard.destroy();

        const sortedSales = [...this.db.sales].sort((a,b) => new Date(a.date) - new Date(b.date));
        const last30 = sortedSales.slice(-30);

        const getMA = (data, period) => {
            const ma = [];
            for (let i = 0; i < data.length; i++) {
                const start = Math.max(0, i - period + 1);
                const subset = data.slice(start, i + 1);
                const avg = subset.reduce((a, b) => a + b.amount, 0) / subset.length;
                ma.push(avg);
            }
            return ma;
        };

        const ma5 = getMA(sortedSales, 5).slice(-30);
        const ma20 = getMA(sortedSales, 20).slice(-30);
        const ma60 = getMA(sortedSales, 60).slice(-30);
        const ma120 = getMA(sortedSales, 120).slice(-30);

        this.charts.dashboard = new Chart(can, {
            type: 'line',
            data: {
                labels: last30.map(d => d.date.slice(5)),
                datasets: [
                    { label: '매출', data: last30.map(d => d.amount), borderColor: '#f0f0ff', borderWidth: 1, pointRadius: 2, tension: 0.3 },
                    { label: '5일', data: ma5, borderColor: '#00fff2', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                    { label: '20일', data: ma20, borderColor: '#ffbd00', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                    { label: '60일', data: ma60, borderColor: '#ff00c1', borderWidth: 2, pointRadius: 0, tension: 0.4 },
                    { label: '120일', data: ma120, borderColor: '#39ff14', borderWidth: 2, pointRadius: 0, tension: 0.4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font:{size:10} } },
                    x: { grid: { display: false }, ticks: { color: '#64748b', font:{size:10} } }
                }
            }
        });

        this.updateManagerBriefing(ma5, ma20, ma120);
    },

    updateWeather(type) {
        this.weather = type;
        const badge = document.getElementById('weatherAdviceBadge');
        const text = document.getElementById('weatherText');
        if (badge) badge.innerText = type === 'sunny' ? '맑음/최적' : (type === 'rainy' ? '비/배달특수' : '흐림/안주');
        if (text) text.innerText = `오늘의 날씨: ${type === 'sunny' ? '맑음' : '비'} (실시간 옵션)`;
        this.initTrendChart();
    },

    updateManagerBriefing(ma5, ma20, ma120) {
        const el = document.getElementById('trendInsight');
        const profEl = document.getElementById('m-profitability');
        const gradeEl = document.getElementById('m-grade');
        if (!el) return;

        const totalSales = this.db.sales.reduce((a, b) => a + b.amount, 0);
        const totalPurchase = this.db.purchases.reduce((a, b) => a + b.amount, 0);
        const profitMargin = totalSales > 0 ? ((totalSales - totalPurchase) / totalSales * 100).toFixed(1) : 0;

        // Update Strategy Metrics
        if (profEl) profEl.innerText = profitMargin + '%';
        
        let grade = "B";
        let gradeColor = "var(--text-dim)";
        if (profitMargin > 15) { grade = "A"; gradeColor = "var(--accent-green)"; }
        if (profitMargin > 30) { grade = "AA"; gradeColor = "var(--accent-cyan)"; }
        if (profitMargin > 50) { grade = "AAA"; gradeColor = "var(--accent-gold)"; }
        if (gradeEl) { gradeEl.innerText = grade; gradeEl.style.color = gradeColor; }

        const cur5 = ma5[ma5.length-1];
        const cur20 = ma20[ma20.length-1];

        let diagnosis = "";
        if (cur5 > cur20) diagnosis = "현재 <span style='color:var(--accent-cyan)'>골든크로스</span> 구간입니다. 공격적인 마케팅이 유효할 것으로 판단됩니다.";
        else diagnosis = "매출 흐름이 정체된 <span style='color:var(--accent-magenta)'>데드크로스</span> 상태입니다. 비용 최적화가 시급합니다.";
        
        const weatherAdvice = {
            'sunny': '고객 방문이 늘어나는 화창한 날씨입니다. 테라스 좌석 및 시원한 주류 메뉴를 메인으로 노출하세요.',
            'rainy': '강수 예보가 있습니다. 배달 메뉴의 옵션을 다양화하고 가전류 청결 상태를 점검할 시기입니다.',
            'cloudy': '흐린 기조입니다. 퇴근길 가벼운 안주와 따뜻한 국물 요리의 프로모션을 추천합니다.'
        };
        const adv = weatherAdvice[this.weather] || weatherAdvice['sunny'];

        el.innerHTML = `<strong>💼 경영 진단:</strong> ${diagnosis} <br><br> <strong>🌤️ 날씨 전략:</strong> ${adv}`;
    },

    generateExecutiveReport() {
        alert("📊 정밀 경영 보고서 분석 중...\n\n- 현재 수익률: " + document.getElementById('m-profitability').innerText + "\n- 전략 등급: " + document.getElementById('m-grade').innerText + "\n- 다음 목표: 고정비 5% 절감 및 재방문율 12% 상승");
    },

    /**
     * Dashboard & UI Controls
     */
    initDashboard() {
        this.renderGlobalStats();
        this.initTrendChart();
        this.renderRecentHistory();
    },

    renderGlobalStats() {
        const totalSales = this.db.sales.reduce((a, b) => a + b.amount, 0);
        const totalPurchase = this.db.purchases.reduce((a, b) => a + b.amount, 0);
        const _set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = '₩' + val.toLocaleString(); };
        _set('dash-sales', totalSales);
        _set('dash-purchase', totalPurchase);
        _set('dash-profit', totalSales - totalPurchase);
    },

    renderRecentHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;
        const hist = [...this.db.sales, ...this.db.purchases].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 8);
        list.innerHTML = hist.map(r => `
            <div class="history-item">
                <div class="item-info"><h4>${r.vendor || r.product}</h4><p>${r.date} / ${r.category || '정산'}</p></div>
                <div class="item-amount ${r.type==='SALE'?'amount-sale':'amount-purchase'}">${r.type==='SALE'?'+':'-'} ₩${r.amount.toLocaleString()}</div>
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

    handleSavePurchase() {
        const n = document.getElementById('itemName').value;
        const p = parseInt(document.getElementById('unitPrice').value) || 0;
        const q = parseFloat(document.getElementById('qty').value) || 0;
        const c = document.getElementById('category').value;
        if (!n || p*q <= 0) return alert('정보를 정확히 입력해 주세요.');
        this.db.purchases.unshift({ id: Date.now(), date: new Date().toISOString().split('T')[0], vendor: '직접 입력', product: n, amount: p*q, type: 'PURCHASE', category: c });
        this.save(); this.initDashboard(); this.closeModal();
    },

    openModal(id) { 
        this.closeModal();
        const m = document.getElementById(id);
        if (!m) return;
        
        // If the element itself is an overlay (like verifyModal)
        if (m.classList.contains('modal-overlay')) {
            m.style.display = 'grid';
            const innerModal = m.querySelector('.modal');
            if (innerModal) innerModal.style.display = 'block';
        } else {
            // Traditional modal inside modalOverlay
            const overlay = document.getElementById('modalOverlay');
            if (overlay) overlay.style.display = 'grid';
            m.style.display = 'block';
        }
        document.body.style.overflow = 'hidden';
    },

    closeModal() { 
        document.querySelectorAll('.modal-overlay').forEach(o => o.style.display = 'none');
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.body.style.overflow = '';
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

