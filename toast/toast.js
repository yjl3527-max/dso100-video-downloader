/*
 * @Author: liguowei
 * @Date:   2019-04-08 10:25:42
 * @Last Modified by:   liguowei01
 * @Last Modified time: 2019-04-08 11:17:17
 */
function toast(){};
    toast.prototype = {
        init:function(){
            this.loadCss()
        },
        iconObj : {
            right:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAKjSURBVHgB7VbLcdswEF2QnkyO6iBKB3IHyjEj/3TO+MMKrFQgqYI4FTCxC4hiW5OjlAqiDsJ0wHtMrt+CoIckQFLUwb74HURQxO4DFm93QfSKZ4KiHfAr5P7DHvVl7HkUjz6pDXXE1sR3NzxUTFNiGuC1V/kcK0VrPH+OztS3bfy1Ei9DHrBPX0A4zElgtYFhJC9M2Hl5MZGf0oePgYp2Jl5+50s4vjIz15zQ/DBQa9fc25BPEPYphgMz//PBmbrqTFwiTeEkqHdSxH3IE/IQoRZyJ7GIJ/Hor4wZYavbZR3uQujBo5UmSGl/FNji81yGiTGSnXYlFWgb2MpY68MBa8fLa75gphDDzcG52qcO0JHy6fI/tDAOVHx/zSsRJXuI2ml5A64dH8tPmtKcOuBHyD0dKabJW6NwEaM8dRpWYBFzljbxUaAW1AFvfB2lPgQ5z1PJHFNs0q2eWHKWZLXIU+oAZMAUCz4B6dfDczUrfcx89eQYaolTE6K8ODw5xrlXDXPc3rAQzjCMQDqxJjD9k0deYp3ELujKBbHJ+VXJ5d1LdYh1taIOKBHvFcuggeQgZ0KT3F6Z48hzXdKuh1wd15ZIRe800QPOuo7YGFtigEhmUPlYSJAaf5Amk8SISfLVVSCekPmKq3M8xwq1GKQbFf8WlSOcktcRnOmmIQpuKqVy/pTp5nf1m51ODbknEdFniYaBNriwFFx1nmY+cBQLe38O5BWnrcM0odBkIlTA99aiXEYqyeqshLQa8m0gNnlnq1O7k1gLwRR5hGklYqItITsVG/0CH3Vqb7wIlHormkbq0fzo1F1KC1ejYU7aJLzWq08hX/vmr+arjwgvaUkx6nDZQ+G4IJ+OTROxLnuymKar0c7ElUUM8rou1a7tYveKF8UjVpVB88m34dgAAAAASUVORK5CYII=',
            err:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAKbSURBVHgB7VZLctNAEO0ZO1SW4gSEG4gb2EvKhIQ1lRCdgOQEKZ+A3EA4KdZAYhdLmRPEN4g5AVqDpaZ7PsVoPPrYqUo2eVUuyaOZfv3vAXjCA0HAFviR4t6qD3v8LiXko/diARuiM/HNFQ4EwjkgxPQ38j7nQsCcnt9Hx+JzF3mtxLMUY+zBJyIcWBI6taCDS/6DQJZXlVn2Shi+TsRya+LZBD+S4Auzc44FjPcTMQ/tvU7xkNx+Tq+x2X/25lhcbExcIS1JSFIvxMU0xVOQ5KEW8iAxJ08h4Y7fkdxWZ2UdblLKBwmZIijh1ShZTz4ZOliYQ2ypJZ19wfhrilEdGX/jBOR3dYbOKsV7xvo24tklngCoUllY97IFuILbHQm37A3/DK/xN7Iu42TkNXWWM52S0irUSEw4UMaWMLYLK1IC9I9DkLnkJiyZVfaPyXZlbaFlqDL0sBbj6QR/K40/iOfuOrtyRxOwRcu/FLtdKiGXlNaG7xKRd5FXsdi4KeI69RVigSzYWs5KtJEa03h/5IeoQlyaJiAcdzWQx62kDIRf/LAtNkjcBbtauQjuiQpx322DAfiJZH4xu7221AS8UEQryGuJTX/NTe9tJGX3um6vJdeycr+JyICGKhnc2mOBoUTyY+6TX1/hIeiw/PRp1ohDtfdME1ZI7TefvN//7y1ZahnUWL5BF0wvMaP6Q3qe2jXuXm0t03YtBg8ZJWOCd6H9wSGhZjC1QH6n53D/aMMhwZeGUvd7ms0vQ7M5WE4qEUyTZwGu5W1gSy0py6i7EDReBCqzlWJYShi/PRLBeDlXo4ElbZrhrVcfr4wYzVcfmkiigLPQDN6I2ILifgI9OEBt0dplj5VpuhptTewpEdu+zt2u7WL3hEfFPw34b9YCe6BDAAAAAElFTkSuQmCC',
            tip:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAABrUlEQVRIS+3WMUsDMRQA4PcKtlBQiu1J76UFpUgHVyd/gJs4iri4Cro4SxXBWdBFHARBHJxd/AUOrg4i0sVe2iMVcY69SCTDVSi9HDZdmuXg7iVfkktegjCmgmNyYQInmvkgCKqI2AAACQANIuomqhgLSjXVnPNnAFjS7Sil3hhjiyOHhRC+lJLHoVwuVy0Wiy0b3HrEnU5nLoqiMI7k8/nZQqHwOVJYKYXtdjuKIYqIMjaojrUesa7EOf8CgBmDdYnIcwU3AWDBLK5XxljdFfwEAMsGfmSMrbiCHwBg1cD3jLE1V/AtAGwa7JqItp3AQRCcI+KuwU6JaN8VfISIhwY7IKITV/AeIp4ZbIeILpzAnPMtALj5TQSIG77v3zmBwzCs9Xq9F41lMpl6uVzW+9qqpMpcWhBCkH56ntd3YCTVU8NJgUFxqWAhxLSUch0Ra1EUXTHG3m07kgr+cxFoEdE8IvZscGtY/1spZRBHstlspVQq9b0b1glrWCk1xTlvImLF5OoPIioj4vcwLP7dGjYrWl9/js0+vvR9X59WViUVbCUMCJ7A/zGLidr4AdwkmB8lttWIAAAAAElFTkSuQmCC'
        },
        toastTxtObj : {
            right:'成功',
            err:'失败',
            tip:'提示'
        },
        /*
        * icon 1成功   2失败  3 提示
        * toastTxt 提示语
        * time 关闭前的毫秒数 不传默认2000
        */
        showToast: function(icon,toastTxt,time){
            var iconSrc;        
            switch(parseInt(icon)){
                case 1:
                iconSrc = this.iconObj.right;
                break;
                case 2:
                iconSrc = this.iconObj.err;
                break;
                case 3:
                iconSrc = this.iconObj.tip;
                break;
                default:
                iconSrc = this.iconObj.right;
                break;
            }
            var toastTxt = toastTxt || this.toastTxtObj.right;
            
            html = '<div class="toast-icon"><img width="40px" height="40px" src="'+iconSrc+'"></div><div class="toast-tip">'+toastTxt+'</div></div>';
            toastBox = document.createElement('div');
            toastBox.className = 'toast';
            toastBox.id = 'toast';
            toastBox.innerHTML = html;
            document.body.appendChild(toastBox);
        setTimeout(function(){
        document.getElementById('toast').parentNode.removeChild(document.getElementById('toast'));
        },time||2000)
        },
        loadCss:function(){
            toastCss = document.createElement('link');
            toastCss.rel = 'stylesheet';
            toastCss.type = 'text/css';
            toastCss.href = this.T() + 'toast.css';
            document.head.appendChild(toastCss);
        },
        T:function() {
            var b, a, f = window['document']['getElementsByTagName']("script");
            for (var c = 0; c < f.length; c++) {
                b = f[c].getAttribute("src") || "";
                b = b.substr(0, b.toLowerCase().indexOf("toast.js"));
                var a = b.lastIndexOf("/");
                if (a > 0) {
                    b = b.substring(0, a + 1)
                }
                if (b) {
                    break;
                }
            }
            return b
        },
        postFun:function(url,data, successFunc, errorFunc){
            let headers = {}
            if(this.getCookie('dosToken') && this.getCookie('dosToken').token){
                headers = {
                    'Authorization':  this.getCookie('dosToken').token || ''
                }
            }
            $.ajax({
                type: "post",
                url: `https://dyapi.dso100.com/${url}`,
                data:data,
                async:true,
                timeout:15000,
                headers: headers,
                success: function(res){
                    if(successFunc){
                        successFunc(res);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        postFun2:function(url,data, successFunc, errorFunc){
            let headers = {}
            if(this.getCookie('dosToken') && this.getCookie('dosToken').token){
                headers = {
                    'Authorization':  this.getCookie('dosToken').token || ''
                }
            }
            $.ajax({
                type: "post",
                url: `https://dyapi.dso100.com/${url}`,
                data:data,
                async:true,
                timeout:15000,
                headers: headers,
                success: function(res){
                    if(successFunc){
                        successFunc(res);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        postFun3:function(url,data, successFunc, errorFunc){
            let headers = {}
            if(this.getCookie('dosToken') && this.getCookie('dosToken').token){
                headers = {
                    'Authorization':  this.getCookie('dosToken').token || ''
                }
            }
            $.ajax({
                type: "post",
                url: `https://inspiration-api.dso100.com/${url}`,
                data:data,
                async:true,
                timeout:15000,
                headers: headers,
                success: function(res){
                    if(successFunc){
                        successFunc(res);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        getFun:function(url,data, successFunc, errorFunc){
            let url_val = ''
            for (const i in data) {
                if(url_val){
                    url_val = `${url_val}&`
                }
                url_val = `${url_val}${i}=${data[i]}`
            }
            $.ajax({
                type: "get",
                url: `https://dyapi.dso100.com/${url}?${url_val}`,
                async:true,
                timeout:15000,
                success: function(res){
                    if(successFunc){

                        let getUrl=`https://dyapi.dso100.com/${url}?${url_val}`
                        successFunc(res,getUrl);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        getFun2:function(url,data, successFunc, errorFunc){
            let url_val = ''
            let headers = {}
            if(this.getCookie('dosToken') && this.getCookie('dosToken').token){
                headers = {
                    'Authorization':  this.getCookie('dosToken').token || ''
                }
            }
            $.ajax({
                type: "get",
                url: `https://inspiration-api.dso100.com/${url}?${url_val}`,
                async:true,
                timeout:15000,
                headers: headers,
                success: function(res){
                    if(successFunc){
                        successFunc(res);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        getUrlFun:function(url,data, successFunc, errorFunc){
            $.ajax({
                type: "get",
                url: `${url}`,
                async:true,
                timeout:15000,
                success: function(res){
                    if(successFunc){
                        successFunc(res);
                    }
                },
                error: function (err) {
                    if(errorFunc){
                        errorFunc(err);
                    }
                }
            });
        },
        fetchBlob: async function(url, timeout = 20000){
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.blob();
            } finally {
                clearTimeout(timer);
            }
        },
        saveBlob: function(blob, name, extension = 'mp4'){
            let safeName = String(name || 'video').trim()
                .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
                .replace(/[. ]+$/g, '').slice(0, 180) || 'video';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.${extension.replace(/^\./, '')}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        },
        downloadZip: async function(items, name = 'dso100-download'){
            const list = Array.isArray(items) ? items.filter(item => item && item.url) : [];
            if (!list.length) throw new Error('没有可打包的文件');
            if (typeof JSZip === 'undefined') throw new Error('ZIP 组件未加载');
            const zip = new JSZip();
            const state = this.downloadState || {};
            state.total = list.length;
            state.done = 0;
            this.downloadStatusUpdate({ phase: `正在打包 0/${list.length}`, total: list.length, done: 0 });
            const baseFailed = Number(state.failed) || 0;
            let failed = 0;
            const usedNames = new Set();
            for (let index = 0; index < list.length; index++) {
                if (this.downloadStatusIsCancelled()) break;
                const item = list[index];
                try {
                    const blob = await this.fetchBlob(item.url);
                    let filename = String(item.name || `file_${index + 1}`).trim()
                        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
                        .replace(/[. ]+$/g, '').slice(0, 180) || `file_${index + 1}`;
                    if (!/\.[a-z0-9]{2,5}$/i.test(filename)) filename += `.${item.ext || 'mp4'}`;
                    const originalName = filename;
                    let suffix = 2;
                    while (usedNames.has(filename)) {
                        const dot = originalName.lastIndexOf('.');
                        filename = `${originalName.slice(0, dot)}_${suffix++}${originalName.slice(dot)}`;
                    }
                    usedNames.add(filename);
                    zip.file(filename, blob, { binary: true });
                } catch (error) {
                    failed++;
                    this.downloadStatusRememberFailure(item, error);
                    console.warn('打包文件失败:', item.url, error);
                }
                this.downloadStatusUpdate({ phase: `正在打包 ${index + 1}/${list.length}`, total: list.length, done: index + 1, failed: baseFailed + failed });
            }
            if (this.downloadStatusIsCancelled()) throw new Error('已取消');
            if (!Object.keys(zip.files).length) throw new Error('没有成功下载的文件');
            const content = await zip.generateAsync({ type: 'blob' });
            this.saveBlob(content, name, 'zip');
            return { total: list.length, done: list.length - failed, failed: baseFailed + failed };
        },
        initDownloadStatus: function(){
            if (document.getElementById('dso100-download-status')) return;
            const style = document.createElement('style');
            style.id = 'dso100-download-status-style';
            style.textContent = `
                #dso100-download-status{position:fixed;right:20px;bottom:20px;width:330px;z-index:2147483647;background:#fff;color:#222;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden}
                #dso100-download-status[hidden]{display:none}
                #dso100-download-status .dso100-status-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #f0f0f0;font-weight:600}
                #dso100-download-status button{border:0;background:transparent;cursor:pointer;color:#666;font-size:16px;padding:0 3px}
                #dso100-download-status .dso100-status-body{padding:12px 14px}
                #dso100-download-status .dso100-status-phase{font-size:13px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                #dso100-download-status .dso100-status-meta{display:flex;justify-content:space-between;margin-top:8px;color:#777;font-size:12px}
                #dso100-download-status .dso100-status-bar{height:6px;background:#edf0f5;border-radius:99px;margin-top:10px;overflow:hidden}
                #dso100-download-status .dso100-status-bar>i{display:block;height:100%;width:0;background:#625df5;border-radius:99px;transition:width .2s ease}
                #dso100-download-status .dso100-status-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
                #dso100-download-status .dso100-status-actions button{border:1px solid #e5e7eb;border-radius:7px;padding:5px 9px;background:#fff;color:#555;font-size:12px;cursor:pointer}
                #dso100-download-status .dso100-status-actions button:hover{background:#f7f7fb}
                #dso100-download-status .dso100-status-cancel{color:#625df5!important;border-color:#dcd9ff!important}
                #dso100-download-status .dso100-status-retry{color:#625df5!important;border-color:#c9c5ff!important}
            `;
            document.head.appendChild(style);
            const box = document.createElement('div');
            box.id = 'dso100-download-status';
            box.hidden = true;
            box.innerHTML = `<div class="dso100-status-head"><span>下载队列</span><button type="button" data-role="close" aria-label="关闭">×</button></div><div class="dso100-status-body"><div class="dso100-status-phase" data-role="phase">准备中</div><div class="dso100-status-bar"><i data-role="bar"></i></div><div class="dso100-status-meta"><span data-role="count">已处理 0/0</span><span data-role="failed">失败 0</span></div><div class="dso100-status-actions"><button type="button" class="dso100-status-retry" data-role="retry" hidden>重试失败项</button><button type="button" class="dso100-status-open" data-role="open">查看下载列表</button><button type="button" class="dso100-status-cancel" data-role="cancel">取消任务</button></div></div>`;
            document.body.appendChild(box);
            box.querySelector('[data-role="close"]').onclick = () => { box.hidden = true; };
            box.querySelector('[data-role="cancel"]').onclick = () => {
                if (this.downloadState) this.downloadState.cancelled = true;
                if (this.downloadQueueWaiting?.finish) this.downloadQueueWaiting.finish({ ok: false, error: '已取消' });
                this.downloadStatusUpdate({ phase: '正在取消…' });
            };
            box.querySelector('[data-role="retry"]').onclick = () => this.retryFailedDownloads();
            box.querySelector('[data-role="open"]').onclick = () => {
                if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ openDownloads: true });
                } else {
                    window.open('chrome://downloads/', '_blank');
                }
            };
        },
        downloadStatusStart: function(total = 1, phase = '准备中'){
            this.initDownloadStatus();
            if (this.downloadState && this.downloadState.active) return false;
            this.downloadState = { active: true, cancelled: false, total: Math.max(1, Number(total) || 1), done: 0, failed: 0, failedItems: [], phase };
            this.downloadStatusUpdate();
            return true;
        },
        enqueueDownloads: function(items, options = {}){
            const list = Array.isArray(items) ? items.filter(item => item && item.url).map(item => ({ ...item })) : [];
            if (!list.length) return 0;
            const state = this.downloadState || {};
            if (state.active && !state.queueActive) {
                if (!options.adoptActive) {
                    this.showToast(3, '当前还有解析或打包任务，请稍后再点击下载');
                    return 0;
                }
                state.active = false;
            }
            if (!state.active) {
                this.downloadStatusStart(list.length, '已加入下载队列');
                this.downloadState.queueActive = true;
                this.downloadState.queueItems = [];
                this.downloadState.queueDone = 0;
                this.downloadState.queueCurrent = null;
            }
            const current = this.downloadState.queueCurrent;
            const queued = this.downloadState.queueItems || (this.downloadState.queueItems = []);
            const seen = new Set(queued.map(item => String(item.url)));
            if (current?.url) seen.add(String(current.url));
            const accepted = list.filter(item => {
                const key = String(item.url);
                if (seen.has(key)) return false;
                seen.add(key);
                item._queueMode = options.mode || 'background';
                item._queueDelay = Number(options.delay) || 500;
                return true;
            });
            if (!accepted.length) {
                this.showToast(3, '这些内容已经在下载队列中');
                return 0;
            }
            queued.push(...accepted);
            if (this.downloadState.queueDone === undefined) this.downloadState.queueDone = this.downloadState.done || 0;
            this.downloadState.total = Math.max(1, Number(this.downloadState.queueDone) || 0) + queued.length + (current ? 1 : 0);
            this.downloadState.phase = `已加入队列，等待 ${queued.length + (current ? 1 : 0)} 个`;
            this.downloadStatusUpdate();
            this.processDownloadQueue();
            return accepted.length;
        },
        processDownloadQueue: async function(){
            if (this.downloadQueueRunning) return;
            this.downloadQueueRunning = true;
            try {
                while (this.downloadState?.queueActive) {
                    const state = this.downloadState;
                    if (state.cancelled) {
                        state.queueItems = [];
                        state.queueCurrent = null;
                        state.queueActive = false;
                        this.downloadStatusFail('已取消，等待中的任务已清空');
                        break;
                    }
                    const item = state.queueItems?.shift();
                    if (!item) {
                        state.queueCurrent = null;
                        state.queueActive = false;
                        state.active = false;
                        state.phase = state.failed ? '队列完成，部分文件失败，可点击重试' : '队列下载完成';
                        state.done = state.total;
                        this.downloadStatusUpdate();
                        break;
                    }
                    state.queueCurrent = item;
                    this.downloadStatusUpdate({ phase: `正在下载：${item.name || '文件'}（队列剩余 ${state.queueItems.length} 个）` });
                    let result;
                    if (item._queueMode === 'direct') {
                        try {
                            const blob = await this.fetchBlob(item.url);
                            this.saveBlob(blob, item.name || 'video', item.ext || 'mp4');
                            result = { ok: true };
                        } catch (error) {
                            result = { ok: false, error: error?.message || '网络错误' };
                        }
                    } else {
                        result = await this.queueDownloadInBackground(item);
                    }
                    if (!result.ok) {
                        this.downloadStatusRememberFailure(item, result.error);
                        state.failed = (state.failed || 0) + 1;
                    }
                    state.queueDone = (state.queueDone || 0) + 1;
                    state.done = state.queueDone;
                    state.queueCurrent = null;
                    this.downloadStatusUpdate({ phase: result.ok ? `已完成：${item.name || '文件'}` : `下载失败：${item.name || '文件'}` });
                }
            } finally {
                this.downloadQueueRunning = false;
                if (this.downloadState?.queueActive && this.downloadState.queueItems?.length) this.processDownloadQueue();
            }
        },
        waitForDownloadQueue: function(timeout = 120000){
            return new Promise(resolve => {
                const startedAt = Date.now();
                const check = () => {
                    const state = this.downloadState;
                    if (!state?.queueActive || Date.now() - startedAt >= timeout) {
                        resolve();
                        return;
                    }
                    setTimeout(check, 100);
                };
                check();
            });
        },
        queueDownloadInBackground: function(item){
            return new Promise(resolve => {
                if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
                    resolve({ ok: false, error: '当前页面无法启动下载' });
                    return;
                }
                let settled = false;
                const finish = result => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    if (this.downloadQueueWaiting?.item === item) this.downloadQueueWaiting = null;
                    resolve(result || { ok: false, error: '下载无响应' });
                };
                const timer = setTimeout(() => finish({ ok: false, error: '下载超时' }), 60000);
                this.downloadQueueWaiting = { item, finish };
                chrome.runtime.sendMessage({ urls: [item], time: item._queueDelay || 500 }, response => {
                    if (chrome.runtime.lastError || !response || response.ok === false) {
                        finish({ ok: false, error: chrome.runtime.lastError?.message || '下载请求发送失败' });
                    }
                });
            });
        },
        downloadStatusRememberFailure: function(item, error){
            if (!item || !item.url) return;
            const state = this.downloadState || (this.downloadState = { failedItems: [] });
            if (!Array.isArray(state.failedItems)) state.failedItems = [];
            const key = String(item.url);
            if (!state.failedItems.some(entry => String(entry.url) === key)) {
                state.failedItems.push({ ...item, error: error?.message || String(error || '') });
            }
        },
        downloadStatusHandleProgress: function(progress){
            if (!progress) return;
            if (this.downloadState?.queueActive && this.downloadState.queueCurrent) {
                const current = this.downloadState.queueCurrent;
                if (progress.item?.url && String(progress.item.url) !== String(current.url)) return;
                const waiting = this.downloadQueueWaiting;
                if (waiting?.item === current) waiting.finish({ ok: !!progress.ok, error: progress.error });
                return;
            }
            if (!this.downloadState || !this.downloadState.active) {
                this.downloadStatusStart(progress.total || 1, '正在下载');
            }
            const state = this.downloadState || {};
            if (!progress.ok) this.downloadStatusRememberFailure(progress.item || progress.failedItem, progress.error);
            const failed = Number.isFinite(Number(progress.failedCount))
                ? Number(progress.failedCount)
                : (Number(state.failed) || 0) + (progress.ok ? 0 : 1);
            this.downloadStatusUpdate({
                mode: 'background',
                phase: progress.ok ? `正在下载 ${progress.index}/${progress.total}` : `下载失败：${progress.error || '浏览器拒绝下载'}`,
                done: progress.index,
                failed
            });
            if (progress.index >= progress.total) {
                failed === 0 ? this.downloadStatusDone() : this.downloadStatusFail('部分文件下载失败，可点击重试');
            }
        },
        retryFailedDownloads: function(){
            const state = this.downloadState || {};
            const items = Array.isArray(state.failedItems) ? state.failedItems.filter(item => item && item.url) : [];
            if (!items.length) {
                this.showToast(3, '当前没有可重试的失败任务');
                return;
            }
            this.downloadState.failedItems = [];
            this.enqueueDownloads(items, { mode: 'background', delay: 500 });
        },
        downloadStatusUpdate: function(values = {}){
            this.initDownloadStatus();
            this.downloadState = { ...(this.downloadState || {}), ...values };
            const state = this.downloadState;
            const box = document.getElementById('dso100-download-status');
            box.hidden = false;
            box.querySelector('[data-role="phase"]').textContent = state.phase || '处理中';
            box.querySelector('[data-role="count"]').textContent = `已处理 ${Math.min(state.done || 0, state.total || 0)}/${state.total || 0}`;
            box.querySelector('[data-role="failed"]').textContent = `失败 ${state.failed || 0}`;
            const percent = Math.max(0, Math.min(100, ((state.done || 0) / Math.max(1, state.total || 1)) * 100));
            box.querySelector('[data-role="bar"]').style.width = `${percent}%`;
            box.querySelector('[data-role="cancel"]').style.display = state.active ? '' : 'none';
            const retry = box.querySelector('[data-role="retry"]');
            retry.hidden = !!state.active || !(Array.isArray(state.failedItems) && state.failedItems.length);
            retry.textContent = state.failedItems?.length ? `重试失败项（${state.failedItems.length}）` : '重试失败项';
            box.querySelector('[data-role="open"]').style.display = state.active ? 'none' : '';
        },
        downloadStatusDone: function(phase = '下载完成'){
            if (!this.downloadState) return;
            if (this.downloadState.queueActive) {
                this.downloadState.phase = phase;
                this.downloadStatusUpdate();
                return;
            }
            this.downloadState.active = false;
            this.downloadState.phase = phase;
            this.downloadState.done = this.downloadState.total;
            this.downloadStatusUpdate();
        },
        downloadStatusFail: function(phase = '下载失败'){
            if (!this.downloadState) return;
            if (this.downloadState.queueActive) {
                this.downloadState.phase = phase;
                this.downloadStatusUpdate();
                return;
            }
            this.downloadState.active = false;
            this.downloadState.phase = phase;
            this.downloadStatusUpdate();
        },
        downloadStatusIsCancelled: function(){
            return !!this.downloadState?.cancelled;
        },
        getCookie:function(objname){//获取指定名称的cookie的值
            let cookie = document.cookie
            var arrstr = cookie.split("; ");
            for(var i = 0;i < arrstr.length;i ++){
            
                var temp = arrstr[i].split("=");
                if(temp[0] == objname) {
                    try { return JSON.parse(unescape(temp.slice(1).join('='))); }
                    catch (_) { return unescape(temp.slice(1).join('=')); }
                }
                
            }
        },
        // 设置cookie的值
        setCookie:function(objname,value){
            // console.log('---setCookie---')
            // console.log(objname)
            if(objname == 'dosToken'){
                this.storeTokenInCookie(JSON.stringify(value))
            }
            document.cookie = `${objname}=${JSON.stringify(value)}; path=/`;
        },
        setExpiresCookie(objname,value){
            // 获取当前日期和时间
            const currentDate = new Date();
            // 获取明天凌晨的时间
            const tomorrow = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            // 设置 Cookie 的过期时间
            document.cookie = `${objname}=${JSON.stringify(value)}; expires=${tomorrow.toUTCString()}; path=/`;
        },
        storeTokenInCookie(token) {
            // console.log('---storeTokenInCookie---')
            chrome.runtime.sendMessage({ token: token });
        },
        generateUUID:function generateUUID() {
            let _dso_t_ = this.getCookie('_dso_t_')
            if(_dso_t_){
                return  _dso_t_
            }else{
                const d = new Date().getTime()
                const _t_ = d + '' + parseInt(Math.random() * 1000000)
                this.setCookie('_dso_t_',_t_)
                return  _t_
            }
            
        },
        goUrl(url){
            window.open(url,'_blank');
        }
    }
var T = new toast();
T.init();
T.initDownloadStatus();
