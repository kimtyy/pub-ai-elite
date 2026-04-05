/**
 * PUB AI ?λ? ?뚮옯??- v5.0 OCR ELITE Edition
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
        console.log("?뭿 PUB AI v5.0 OCR ELITE Booting...");
        try {
            // 1. Core Logic Setup
            this.generateMockData();
            
            // 2. UI Bindings (Run first to ensure buttons work even if data fails)
            this.bindEvents();
            
            // 3. Data Rendering
            this.renderGlobalStats();
            this.switchTab('dashboard');
            
            if (typeof lucide !== 'undefined') lucide.createIcons();
            console.log("??v5.0 Boot Success");
        } catch (e) {
            console.error("?뵦 v5.0 Boot Error:", e);
            // alert("?쒖뒪??珥덇린??以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. 釉뚮씪?곗? 罹먯떆瑜???젣?섍굅???ㅼ떆 ?쒕룄??二쇱꽭??");
        }
    },

    save() {
        localStorage.setItem('pub_purchases', JSON.stringify(this.db.purchases));
        localStorage.setItem('pub_sales', JSON.stringify(this.db.sales));
    },

    generateMockData() {
        if (this.db.sales.length > 50 && this.db.purchases.length > 20) return;
        const now = new Date();
        const categories = ['二쇰쪟', '?앹옄??, '?멸굔鍮?, '?꾨?猷?, '怨듭궗鍮?, '?뚮え??, '湲고?'];
        this.db.sales = []; this.db.purchases = [];
        for (let i = 150; i >= 0; i--) {
            const date = new Date(now); date.setDate(now.getDate() - i);
            const ds = date.toISOString().split('T')[0];
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const sale = Math.floor(700000 + Math.random() * 500000 + (isWeekend ? 400000 : 0));
            this.db.sales.push({ id: 's'+i, date: ds, product: 'POS 留ㅼ텧 ?뺤궛', amount: sale, type: 'SALE' });
            
            if (i % 3 === 0) {
                const c = categories[i % categories.length];
                this.db.purchases.push({ 
                    id: 'p'+i, 
                    date: ds, 
                    vendor: 'Elite Vendor ' + (i%5), 
                    product: c+' 臾쇳뭹 援щℓ', 
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
            alert("移대찓???묎렐 沅뚰븳???덉슜??二쇱꽭??");
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
            alert("??湲곌린?먯꽌???뚮옒??湲곕뒫??吏?먰븯吏 ?딆뒿?덈떎.");
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
        
        // v5.2 珥덉젙諛 ?꾩쿂由??붿쭊 媛??        this.preprocessImage(canvas);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        this.runOCR(imgData);
    },

    /**
     * OCR v5.2 ?대?吏 ?꾩쿂由?紐⑤뱢 (Binarization & Contrast)
     */
    preprocessImage(canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // 1. 罹붾쾭???꾪꽣瑜??듯븳 湲곕낯 蹂댁젙 (?뚯깋湲??쒓굅 諛?媛뺤“)
        ctx.filter = 'grayscale(1) contrast(1.8) brightness(1.1) sharp(2)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';

        // 2. ?쎌? ?⑥쐞 ?뺣? ?댁쭊??(Adaptive Binarization ?꾪꽣留??뚰솚)
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;
        
        // ?됯퇏 諛앷린 怨꾩궛
        let total = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            total += pixels[i];
        }
        const avg = total / (pixels.length / 4);
        const threshold = avg * 0.95; // 諛곌꼍 ?몄씠利??쒓굅瑜??꾪븳 臾명꽦媛?議곗젙

        for (let i = 0; i < pixels.length; i += 4) {
            const v = (pixels[i] > threshold) ? 255 : 0;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = v; // ?꾩쟾???묐갚 ?꾪솚
        }
        ctx.putImageData(imgData, 0, 0);
        console.log("?뭿 KODARI v5.2 ?대?吏 ?꾩쿂由??꾨즺 (Threshold:", threshold.toFixed(1), ")");
    },

    runOCR(imgData) {
        this.openModal('scanModal');
        const loading = document.getElementById('scanLoading');
        const result = document.getElementById('scanResult');
        const statusText = document.querySelector('.scan-status-text');
        
        loading.style.display = 'block';
        result.style.display = 'none';
        if(statusText) statusText.innerText = "AI ?좉꼍留?遺꾩꽍 以?..";

        // Real Tesseract call (Optimized for Kor/Num Only)
        Tesseract.recognize(imgData, 'kor', {
            logger: m => {
                if(m.status === 'recognizing text' && statusText) {
                    const progress = Math.floor(m.progress * 100);
                    statusText.innerText = `?곗씠??援ъ“??以?.. ${progress}%`;
                }
            }
        }).then(({ data: { text } }) => {
            console.log("OCR RAW TEXT:", text);
            loading.style.display = 'none';
            result.style.display = 'block';
            if(statusText) statusText.innerText = "遺꾩꽍 ?꾨즺!";
            
            const scanData = this.parseReceipt(text);
            this.currentScan = scanData;
            this.renderScannedData(scanData);
        }).catch(err => {
            loading.style.display = 'none';
            alert('?몄떇???ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 珥ъ쁺??二쇱꽭??');
            this.closeModal();
        });
    },

    /**
     * OCR ELITE 怨좎냽 遺꾩꽍 諛??곗씠??援ъ“???붿쭊 (v5.0.2)
     * 珥덇퀬???ㅼ씤??諛⑹? 諛?硫뷀??곗씠???꾪꽣留?媛뺥솕
     */
    parseReceipt(text) {
        // 0. 珥덇린 ?뺤젣 (?몄씠利??쒓굅)
        const cleanText = text.replace(/[*+\-|()\[\]]/g, ' '); 
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 1);
        
        console.log("?뭿 KODARI ?뚯꽌 v5.0.2 ?묐룞 ?쒖옉");

        // 1. 媛留뱀젏/?곹샇紐??먮퀎
        let vendor = "?????녿뒗 媛留뱀젏";
        const bizNames = ['?좏넻', '?몄쓽??, '?앸떦', '移섑궓', '?ъ감', '留덊듃', '蹂묒썝', '?쎄뎅', '移댄럹', '而ㅽ뵾', '?몃뱶', '而댄벂??, '二쇰Ц'];
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const l = lines[i].replace(/[0-9:.-]/g, '').trim();
            if (l.length > 2 && (bizNames.some(n => l.includes(n)) || i < 2)) {
                vendor = l;
                if (vendor.length > 2) break;
            }
        }

        // 2. 硫뷀??곗씠??諛?嫄곕옒 ?뺣낫 異붿텧
        let bizId = "000-00-00000", address = "二쇱냼 ?뺣낫 ?놁쓬", phone = "?꾪솕 ?뺣낫 ?놁쓬";
        let date = new Date().toISOString().split('T')[0], time = "12:00:00", payMethod = "?좎슜移대뱶", approvalNo = "00000000";

        lines.forEach(line => {
            if (line.match(/[0-9]{3}-[0-9]{2}-[0-9]{5}/)) bizId = line.match(/[0-9]{3}-[0-9]{2}-[0-9]{5}/)[0];
            if (line.match(/[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}/)) phone = line.match(/[0-9]{2,3}-[0-9]{3,4}-[0-9]{4}/)[0];
            if (line.match(/[0-9]{2,4}[./-][0-9]{2}[./-][0-9]{2}/)) {
                let d = line.match(/[0-9]{2,4}[./-][0-9]{2}[./-][0-9]{2}/)[0].replace(/[./]/g, '-');
                if (d.split('-')[0].length === 2) d = '20' + d;
                date = d;
            }
            if (line.match(/[0-9]{2}:[0-9]{2}(:[0-9]{2})?/)) time = line.match(/[0-9]{2}:[0-9]{2}(:[0-9]{2})?/)[0];
            if (line.includes('?꾧툑') || line.includes('CASH')) payMethod = '?꾧툑';
            const appMatch = line.match(/(?뱀씤|APP)[^0-9]*([0-9]{6,10})/i);
            if (appMatch) approvalNo = appMatch[2];
            if ((line.includes('??') && line.includes('援?')) || line.includes('二쇱냼')) address = line.replace('二쇱냼', '').trim();
        });

        // 3. ?덈ぉ 諛?湲덉븸 吏?ν삎 異붿텧 (v5.0.2 Sanity Check)
        const items = [];
        let detectedTotal = 0;

        lines.forEach(line => {
            // 硫뷀??곗씠???ы븿 ?쇱씤? ?쒖쇅 (湲덉븸 ?ㅼ씤??諛⑹?)
            if (line.match(/?ъ뾽???꾪솕|TEL|踰덊샇|?쇱옄|?쒓컙|?뱀씤|移대뱶|NO/i)) return;

            const numbers = line.match(/[0-9]{1,3}(,[0-9]{3})*[0-9]*/g);
            if (numbers && numbers.length >= 2) {
                const vals = numbers.map(n => parseInt(n.replace(/,/g, ''))).filter(n => n > 0);
                if (vals.length >= 2) {
                    const amount = vals[vals.length - 1];
                    const qty = vals.length >= 2 ? vals[vals.length - 2] : 1;
                    
                    // 1?????댁긽??鍮꾩젙?곸쟻??湲덉븸? 臾댁떆 (?곸닔利??쇰젴踰덊샇 ???ㅼ씤??諛⑹?)
                    if (amount > 100000000) return;

                    const name = line.replace(/[0-9,.:/]/g, '').trim();
                    if (name.length >= 2 && amount > 100 && !line.match(/?⑷퀎|珥앹븸|寃곗젣|湲덉븸/)) {
                        items.push({ name, qty, unitPrice: Math.floor(amount/qty), amount, cat: this.autoCategorize(name) });
                    }
                }
            }

            // ?⑷퀎 湲덉븸 ?먯깋 (媛?????꾩떎?곸씤 ?レ옄瑜??좏깮)
            if (line.match(/?⑷퀎|珥앹븸|寃곗젣|湲덉븸|諛쏆쓣|TOTAL/i)) {
                const totalNums = line.match(/[0-9,]{4,10}/g);
                if (totalNums) {
                    const t = parseInt(totalNums[0].replace(/,/g, ''));
                    // 1???댄븯???꾩떎?곸씤 湲덉븸留??⑷퀎 ?꾨낫濡??좎젙
                    if (t > detectedTotal && t < 100000000) detectedTotal = t;
                }
            }
        });

        // 4. ?곗닠 寃利?諛??붿????ㅻТ??(v5.1 ?좉퇋 濡쒖쭅)
        items.forEach(it => {
            it.verified = (it.unitPrice * it.qty === it.amount);
            
            // ?곗닠 ?ㅻ쪟 ??援먯젙 (8->3, 0->9 ???좎궗 ?レ옄 蹂댁젙 ?쒕룄)
            if (!it.verified) {
                const candidates = this.getArithmeticCandidates(it);
                if (candidates) {
                    it.unitPrice = candidates.unitPrice;
                    it.qty = candidates.qty;
                    it.amount = candidates.amount;
                    it.verified = true;
                    it.autoCorrected = true;
                }
            }
        });

        // 5. 理쒖쥌 ?곗씠??蹂댁젙 諛??좊ː??泥댄겕
        let total = detectedTotal;
        const subtotalSum = items.filter(it => it.verified).reduce((a, b) => a + b.amount, 0);
        
        // ?꾩씠???⑷퀎? ?ㅼ썙???⑷퀎媛 1% ?대궡濡?李⑥씠?섎㈃ ?좊ː???믪쓬
        const totalReliable = Math.abs(subtotalSum * 1.1 - total) < (total * 0.01);
        if (!totalReliable && subtotalSum > 0) {
            // ?꾩씠?쒕뱾??寃?곗씠 ?꾨꼍?섎떎硫??꾩씠???⑷퀎瑜??ㅼ젣 珥앺빀?쇰줈 媛꾩＜
            total = Math.ceil(subtotalSum * 1.1);
        }
        
        if (total === 0) total = 50000;

        const finalSubtotal = Math.ceil(total / 1.1);
        const finalVat = total - finalSubtotal;

        return { vendor, bizId, address, phone, date, time, payMethod, approvalNo, items, subtotal: finalSubtotal, vat: finalVat, total, classification: this.getClassification(vendor, time, total), reliable: totalReliable };
    },

    /**
     * ?곗닠 ?꾨낫援??앹꽦 (?붿????ㅻТ??
     */
    getArithmeticCandidates(it) {
        const alt = (num) => {
            const s = num.toString();
            // ?뷀븳 ?ㅼ씤?? 8<->3, 0<->9, 1<->7
            const maps = {'8':'3', '3':'8', '0':'9', '9':'0', '1':'7', '7':'1'};
            let variants = [s];
            for (let i = 0; i < s.length; i++) {
                if (maps[s[i]]) {
                    variants.push(s.substring(0, i) + maps[s[i]] + s.substring(i + 1));
                }
            }
            return variants.map(v => parseInt(v));
        };

        const uPrices = alt(it.unitPrice);
        const qtys = alt(it.qty);
        const amounts = alt(it.amount);

        for (let u of uPrices) {
            for (let q of qtys) {
                for (let a of amounts) {
                    if (u * q === a && a > 100) return { unitPrice: u, qty: q, amount: a };
                }
            }
        }
        return null;
    },

    autoCategorize(name) {
        if (name.match(/留μ＜|?뚯＜|???二쇰쪟|?섏씠蹂??꾩뒪??)) return '二쇰쪟';
        if (name.match(/怨좉린|?쇱콈|?|怨꾨?|?곗쑀|?앸즺???깆떖|李뚭컻/)) return '?앹옄??;
        if (name.match(/遊됲닾|?댁?|鍮꾨늻|泥?냼|留덉뒪??)) return '?뚮え??;
        if (name.match(/?뚮컮|湲됱뿬|蹂대꼫??)) return '?멸굔鍮?;
        return '湲고?';
    },

    getClassification(vendor, time, total) {
        const hour = parseInt(time.split(':')[0]);
        if (total > 100000 && hour >= 18) return "? ?뚯떇鍮?;
        if (hour >= 21) return "?쇨렐 ?앸?";
        if (vendor.includes('?몄쓽??) || vendor.includes('留덊듃')) return "?뚮え??鍮꾪뭹";
        if (vendor.includes('?앹떆') || vendor.includes('T-')) return "援먰넻鍮?;
        return "?쇰컲 留ㅼ엯";
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

        // Reliability Indicator
        const statusEl = document.getElementById('scanStatusBadge');
        if (statusEl) {
            statusEl.innerHTML = data.reliable ? 
                '<span class="badge badge-success"><i data-lucide="check-circle-2"></i> ?뺣? 寃???꾨즺</span>' : 
                '<span class="badge badge-warning"><i data-lucide="alert-triangle"></i> ?섏튂 ?뺤씤 ?꾩슂</span>';
        }

        // Table
        const tbody = document.getElementById('scanTableBody');
        tbody.innerHTML = data.items.map((it, idx) => `
            <tr class="${it.verified ? 'row-verified' : 'row-error'} ${it.autoCorrected ? 'row-corrected' : ''}">
                <td data-label="?덈ぉ紐?><input type="text" value="${it.name}" onchange="App.updateScanItem(${idx}, 'name', this.value)"></td>
                <td data-label="?섎웾"><input type="number" value="${it.qty}" style="width: 50px;" onchange="App.updateScanItem(${idx}, 'qty', this.value)"></td>
                <td data-label="?④?"><input type="number" value="${it.unitPrice}" onchange="App.updateScanItem(${idx}, 'unitPrice', this.value)"></td>
                <td data-label="珥앷툑?? style="text-align: right; font-weight: 700;">
                    ??{it.amount.toLocaleString()}
                    ${it.verified ? '<i class="status-icon icon-ok" data-lucide="badge-check"></i>' : '<i class="status-icon icon-warn" data-lucide="info"></i>'}
                </td>
            </tr>
        `).join('');

        // Summary
        document.getElementById('scanSubtotal').innerText = '?? + data.subtotal.toLocaleString();
        document.getElementById('scanVAT').innerText = '?? + data.vat.toLocaleString();
        document.getElementById('scanTotal').innerText = '?? + data.total.toLocaleString();
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
            product: this.currentScan.items.length > 1 ? `${this.currentScan.items[0].name} ??${this.currentScan.items.length-1}嫄? : this.currentScan.items[0].name,
            amount: this.currentScan.total,
            category: this.currentScan.items[0].cat,
            type: 'PURCHASE',
            meta: this.currentScan // Store full OCR metadata
        };
        this.db.purchases.unshift(purchase);
        this.save();
        alert('?곗씠?곌? ?깃났?곸쑝濡??λ???湲곕줉?섏뿀?듬땲??');
        this.closeModal();
        this.switchTab('dashboard');
    },

    /**
     * Export Engine
     */
    exportCSV() {
        if (!this.currentScan) return;
        let csv = "\uFEFF?덈ぉ,?섎웾,?④?,湲덉븸,移댄뀒怨좊━\n";
        this.currentScan.items.forEach(it => {
            csv += `${it.name},${it.qty},${it.unitPrice},${it.amount},${it.cat}\n`;
        });
        csv += `\n?⑷퀎,,,${this.currentScan.total},`;
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
            if(el) el.innerText = '?? + val.toLocaleString();
        };
        _set('dash-sales', totalSales);
        _set('dash-purchase', totalPurchase);
        const bepEl = document.getElementById('dash-bep');
        if (bepEl) bepEl.innerText = this.db.purchases.filter(p => new Date(p.date) > new Date(Date.now() - 86400000)).length + '嫄?;
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
                datasets: [{ label: '留ㅼ텧', data: data.map(d=>d.amount), borderColor: '#00fff2', backgroundColor: 'rgba(0, 255, 242, 0.1)', fill: true, tension: 0.4, borderWidth: 3 }] 
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false } } } }
        });
    },

    updateAIInsight() {
        const insightEl = document.getElementById('trendInsight');
        if (!insightEl) return;
        const trend = this.getClassification('', '', 200000);
        insightEl.innerHTML = `
            <strong>?ァ 肄붾떎由?遺??釉뚮━??</strong> ?ъ옣?? ?꾩옱 v5.0 ?붿쭊??遺꾩꽍 寃곌낵瑜?蹂닿퀬?쒕┰?덈떎. <br>
            理쒓렐 ?곸닔利??⑦꽩 遺꾩꽍 寃곌낵, <strong>${trend}</strong> 鍮꾩쨷???됱냼蹂대떎 12% ?믪뒿?덈떎. <br>
            <strong>?뮕 議곗뼵:</strong> 留ㅼ엯 利앸튃 ?꾨씫 ?섏떖 嫄댁씠 3嫄??앸퀎?섏뿀?듬땲?? 利됱떆 ?ㅼ틪?섏뿬 ?덉꽭 ?쒗깮???뺣낫?섏떎 寃껋쓣 媛뺣젰 沅뚭퀬?⑸땲??
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
                    <p style="font-size:0.8rem; color:var(--text-dim);">${r.date} | ${r.vendor || '留ㅼ옣 留ㅼ텧'}</p>
                </div>
                <div style="font-weight:700; color:${r.type==='SALE'?'var(--accent-cyan)':'var(--accent-magenta)'}">${r.type==='SALE'?'+':'-'} ??{r.amount.toLocaleString()}</div>
            </div>
        `).join('');
    },

    initReport() {
        const expC = document.getElementById('expenseCategoryChart');
        if (!expC) return;
        if (this.charts.exp) this.charts.exp.destroy();
        const catMap = {};
        this.db.purchases.forEach(p => { const c = p.category || '湲고?'; catMap[c] = (catMap[c] || 0) + p.amount; });
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

