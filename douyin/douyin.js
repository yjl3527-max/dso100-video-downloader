let videoObj = {}  // 通过插件后台数据传输 补充视频详情
console.log('----- run -----')

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.downloadProgress) {
        const progress = request.downloadProgress
        T.downloadStatusHandleProgress(progress)
        sendResponse('收到下载进度')
        return
    }
    if (!request.videoData || !request.videoData.url) {
        sendResponse('忽略无效媒体消息')
        return
    }
    let obj = extractVidFromDouyinUrl(request.videoData.url)
    // console.log('req obj', obj)
    if (!videoObj[obj.id]) {
        videoObj[obj.id] = []
    }
    videoObj[obj.id].push(obj.url)
    if (request.cmd === 'test') alert(request.value)
    sendResponse('我收到了你的消息！')
})

function extractVidFromDouyinUrl(url) {
    // 使用 URL 对象来解析 URL
    var parser = new URL(url);

    // 获取 __vid 参数的值
    var vid = parser.searchParams.get('__vid');

    // 返回包含 __vid 和完整 URL 的对象
    return {
        id: vid,
        url: url
    };
}

function chromeToken() {
    chrome.runtime.sendMessage({ getToken: true }, function (response) {
        // console.log('收到来自后台的回复：' + response);
        if (response && response.token) {
            T.setCookie('dosToken', JSON.parse(response.token))
        } else {
            T.setCookie('dosToken', '')
        }
    })
}

chromeToken()

async function ajaxGet(url, name) {
    try {
        const blob = await T.fetchBlob(url);
        T.saveBlob(blob, name, 'mp4');
        return true;
    } catch (error) {
        T.showToast(2, `下载失败：${error.message || '网络错误'}`);
        return false;
    }
}

async function ajaxImgGet(name, imgURLs, spanContent) {
    T.showToast(1, '浏览器正在下载 请注意查看进度')
    var zip = new JSZip();
    var failed = 0;

    // 创建一个 Promise 数组，每个 Promise 获取一个图片并添加到压缩文件中
    var promises = imgURLs.map(url => {
        return T.fetchBlob(url)
            .then(blob => {
                // 获取 URL 中的文件名作为压缩文件中的文件名
                var filename = url.substring(url.lastIndexOf("/") + 1) + ".jpg";
                // 添加文件到 zip 对象，使用 name 和 filename
                zip.file(filename, blob, { binary: true });
            })
            .catch(error => {
                failed++;
                console.error('Error fetching image:', error)
            });
    });

    if (spanContent) {
        // 创建包含 spanContent 的 txt 文件的 Blob 对象
        var txtBlob = new Blob([spanContent], { type: 'text/plain' });
        // 将 txt 文件添加到 zip 对象，文件名为 name + '.txt'
        zip.file(`${name}.txt`, txtBlob);
    }

    // 等待所有 Promise 执行完成后生成压缩文件并下载
    Promise.all(promises)
        .then(() => {
            // console.log("所有 Promise 执行完成");
            // 生成压缩文件并下载
            zip.generateAsync({ type: "blob" }).then(function (content) {
                let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)

                saveAs(content, `${name}.zip`);
                if (failed) T.showToast(2, `${failed}个图片下载失败`);
            });
        })
        .catch(error => {

        });
}

async function ajaxImgGet20250212(name, imgURLs, spanContent) {
    T.showToast(1, '浏览器正在下载 请注意查看进度')
    var zip = new JSZip();
    var failed = 0;

    var promises = imgURLs.map(url => {
        console.log(url)
        return T.fetchBlob(url)
            .then(blob => {
                // 获取 URL 中的文件名作为压缩文件中的文件名
                var filename = Math.random().toString(36).substring(2, 15) + '.webp';
                console.log('Adding file to ZIP:', filename); // 打印文件名
                zip.file(filename, blob, { binary: true });
            })
            .catch(error => {
                failed++;
                console.error('Error fetching image:', error);
            });
    });

    // 文本
    var txtBlob = new Blob([name], { type: 'text/plain' });
    zip.file(`${name}.txt`, txtBlob);

    // 等待所有 Promise 执行完成后生成压缩文件并下载
    Promise.all(promises)
        .then(() => {
            // console.log("所有 Promise 执行完成");
            // 生成压缩文件并下载
            zip.generateAsync({ type: "blob" }).then(function (content) {
                let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                saveAs(content, `${name}.zip`);
                if (failed) T.showToast(2, `${failed}个图片下载失败`);
            });
        })
        .catch(error => {
            console.error('Error d:', error)

        });

}

async function send(urls, reuseStatus = false) {
    if (!Array.isArray(urls) || urls.length === 0) {
        T.showToast(2, '没有可下载的内容')
        return
    }
    if (!reuseStatus) {
        T.enqueueDownloads(urls, { mode: 'direct', delay: 150 })
        return
    }
    if (reuseStatus) {
        if (!T.downloadState || !T.downloadState.active) {
            if (!T.downloadStatusStart(urls.length, '准备下载')) return
        } else {
            T.downloadState.total = urls.length
            T.downloadState.done = 0
            T.downloadStatusUpdate({ phase: `已解析 ${urls.length} 个下载地址`, done: 0 })
        }
    } else if (!T.downloadStatusStart(urls.length, '准备下载')) return
    if (reuseStatus) {
        try {
            const result = await T.downloadZip(urls, 'douyin-batch-download')
            T.downloadStatusDone(result.failed ? '批量下载完成，部分文件失败' : '批量下载完成')
        } catch (error) {
            T.downloadStatusFail(error.message === '已取消' ? '已取消' : '批量打包失败')
            T.showToast(2, error.message === '已取消' ? '已取消下载' : '批量打包失败，请重试')
        }
        return
    }
}

function sendChrome(urls) {
    chrome.runtime.sendMessage({ urls: urls, time: Number($("#cjys").val()) }, function (response) {
        // console.log('收到来自后台的回复：' + response);
    });

}

function consoleFun(urls) {
    chrome.runtime.sendMessage({ urls }, function (response) {
        // console.log('收到来自后台的回复：' + response)
    })
}

let remote_elem = {}

var feeds = []
var feeds_note = []
var userId = ''
var cjys = 1000
var max_cursor = 0
var webid = '7256865999192950308'
var a_bogus = (new Date()).valueOf()
kk = 1

let setInt1 = null

let videoTopItems
/**
 * 加载配置文件 插件功能入口1.1
 */
$.ajax({
    url: 'https://openapi.dso100.com/browserPlugin/douYin',
    type: 'get',
    timeout: 15000,
    data: {
        code: '8kqxlt7VzWfNrdKM4m3YFN6FG6oeTAmRYOFBhETvSGGnUgKS1PIZfqvawGhnr8peSCoeea0l5bnCsi',
    },
    success: function (res) {
        console.log(res)
        remote_elem = {
            "index-function": '#slidelist .dySwiperSlide #sliderVideo',//推荐
            "search-multiple-row": `
        #search-content-area #waterFallScrollContainer .AMqhOzPC,
        #search-content-area .st17zJnd
      `, //搜索多列, https://www.douyin.com/discover/search/美食
            "search-single-row": `
        #search-content-area .SwZLHMKk #sliderVideo,
        #search-body-container #sliderVideo,
        #search-content-area div[data-rank]
      `, //搜索单列
            "search-user-row": ".HHwqaG_P .videoImage .lAJhgxAB",
            "search-simple-list": ".HHwqaG_P div.uuWylFaX .slider-video",
            "user-add-html": "#root .UTSD8keU>ul>li>div>a ",
            "popup-video-detail": "#root .modal-video-container .basePlayerContainer",
            "user-add-info-html": `
      #root .modal-video-container #slidelist,#root #slideMode .playerContaine
      #root #slidelist .dySwiperSlide .xg-video-container,
      #root #waterFallScrollContainer>div,
      #root #douyin-right-container div[data-e2e="feed-active-video"]
      `, // 我的、 、详情、首页、我的弹窗
            "user-info-multiple-download": "#root #user-tabbar .RdqC52V7" // 我的批量下载
        }
        // #root div[data-e2e="user-post-list"] .wqW3g_Kl,
        // 插件功能入口1.2
        // remote_elem = res.elem
        console.log(remote_elem)
        timeoutInit()
    },
    error: function (res) {

    },
})
const counter = {
    user_add_info: 1,
    // 搜索多列
    search_more_col: 1,
    // 搜索单列
    search_simple_col: 1,
}

// 从 Content-Disposition 中提取文件名的辅助函数
function getFilenameFromContentDisposition(contentDisposition) {
    var filename = "";
    if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    return filename;
}

/**
 * 时间标记
 * @returns {string}
 */
function dateSign() {
    let d = new Date()
    return d.getDate() + '-' + d.getHours() + '-' + d.getMinutes()
}

function timeoutInit() {
    // console.log('插件已将加载', remote_elem)
    setTimeout(function () {
        if (localStorage.__tea_cache_tokens_1300) {
            webid = JSON.parse(localStorage.__tea_cache_tokens_1300)
            webid = webid.web_id
        }

        // 指定视频页面 点击列表弹出的视频
        function videoIdFun() {
            // let def = '#root .modal-video-container .basePlayerContainer'
            let def = '#root .semi-tabs-pane-motion-overlay .zxKBl2bK>div .KF3T893E'
            let elem = remote_elem['popup-video-detail'] || def
            let sign = dateSign()
            $(elem).not(':has(.douyinDownload2)').each(function () {
                $(this).prepend(`
            <div class="douyinDownload2 douyinDownload8" data-sign="${sign}" data-position="popup-video-detail" style="z-index: 2;">
            
                <div class="douyinDownload6_top1 xhsSaveSo" id="show-tooltip" data-type="videoId">
              
              <span>收藏</span>
          </div>
                <div class="douyinDownload6_top1 douyinAlertUrl"  data-type="videoId">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                    <span>转文字</span>
                </div>
                <div class="douyinDownload5_top clickDetailDown">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>下载</span>
                </div>
            </div>
        `)

                setTimeout(function () {
                    $('#show-tooltip').hover(
                        function () {
                            // 获取提示框内容
                            const tooltipText = '点击后会把该内容存到so100.vip项目中去'//$(this).attr('data-tooltip');

                            // 创建提示框元素
                            const tooltip = $('<div class="tooltip"></div>').text(tooltipText);

                            // 将提示框添加到页面中
                            $('body').append(tooltip);

                            // 设置提示框的位置
                            const elementOffset = $(this).offset();
                            tooltip.css({
                                top: elementOffset.top + $(this).outerHeight() + 5,
                                left: elementOffset.left,
                            }).fadeIn();
                        },
                        function () {
                            // 鼠标离开时移除提示框
                            $('.tooltip').remove();
                        }
                    );
                }, 1000)
            })
        }
        //jingxuan
        function videoJingXuanFun() {
            // 精选页视频卡片 - 使用稳定的选择器
            let def = '.discover-video-card-item .waterfall-videoCardContainer'
            let elem = def
            $(def).css('position', 'relative');
            let sign = dateSign()
            $(elem).not(':has(.douyinDownload2)').each(function () {
                // 获取视频ID
                let videoId = $(this).closest('.discover-video-card-item').attr('data-aweme-id') || ''
                $(this).prepend(`
            <div class="douyinDownload2 douyinDownload-jingxuan" data-sign="${sign}" data-video-id="${videoId}" data-position="jingxuan-video" style="z-index: 10; position: absolute; top: 8px; right: 8px;">
                <div class="douyinDownload5_top clickJingxuanDown" data-video-id="${videoId}">
                    <img width="18px" height="18px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>下载</span>
                </div>
            </div>
        `)

            })
        }

        // 精选页下载点击事件
        $('#root').on('click', '.clickJingxuanDown', function (event) {
            event.preventDefault()
            event.stopImmediatePropagation()
            getCookieDow(() => {
                let videoId = $(this).attr('data-video-id') || $(this).closest('.discover-video-card-item').attr('data-aweme-id')
                let name = $(this).closest('.discover-video-card-item').find('.bWzvoR9D').text() || ''
                console.log('精选页下载', videoId, name)
                if (videoId) {
                    onedow(name, videoId)
                }
            })
        })

        $('#root').on('click', '.clickDetailDown', function (event) {
            console.log('点击了吗')
            // 
            event.preventDefault()
            event.stopImmediatePropagation()
            getCookieDow(() => {
                console.log(666)
                let name = $(this).parent().parent().find('.title').text()
                let isImg = $(this).parent().parent().find('.focusPanel')
                console.log(name)
                console.log(isImg)
                if (isImg.length) {
                    var imgElements = isImg[0].getElementsByTagName('img');
                    var srcValues = [];
                    for (var i = 0; i < imgElements.length; i++) {
                        srcValues.push(imgElements[i].getAttribute('src'));
                    }
                    let array = uniqueArray(srcValues)
                    console.log(array)
                    ajaxImgGet20250212(name, array)
                } else {
                    onedow('', getUrlParameter('modal_id'))
                }
            })
        })

        $('#root').on('click', '.clickDown', async function (event) {
            event.stopPropagation()
            event.preventDefault()

            event.stopImmediatePropagation()
            getCookieDow(() => {
                console.log(666)
                let name = $(this).parent().parent().find('.MR80_HYg').text()
                let isImg = $(this).parent().parent().find('.focusPanel')
                console.log(name)
                console.log(isImg)
                if (isImg.length) {
                    var imgElements = isImg[0].getElementsByTagName('img');
                    var srcValues = [];
                    for (var i = 0; i < imgElements.length; i++) {
                        srcValues.push(imgElements[i].getAttribute('src'));
                    }
                    let array = uniqueArray(srcValues)
                    console.log(array)
                    ajaxImgGet20250212(name, array)
                } else {
                    const href = $(this).parent().parent().find('.KF3T893E').attr('href')
                    onedow('', getBaseUrlLastId(href.indexOf('https') > -1 ? href : 'https:' + href), 'get')
                }

            })
            return false
        })

        // 需要执行的函数
        function searchFunction() {

            let elem_single = remote_elem['search-single-row'] ||
                '#search-content-area .HN50D2ec #sliderVideo'

            let elem_multiple = remote_elem['search-multiple-row'] ||
                '#search-content-area #waterFallScrollContainer .F5OVwGZ9'

            let sign = dateSign()
            let len = counter.search_more_col
            // 多列数字
            let number = $(`${elem_multiple}`)
            if (number.length == 0) {
                len = 1
            }

            if (isNaN(len) || len === 0) {
                len = 1
            }

            counter.search_more_col = len

            // 多个列表
            $(elem_multiple)
                .not(':has(.douyinDownload2)')
                .not(':has(.douyinDownload3)')
                .filter(function () {           // 进一步筛选

                    return ($(this).find('*').filter('.pMq55q1M').length > 0) ||  //https://www.douyin.com/search/美食?aid=6959ae38-0b1b-4c09-a60e-699014e846f4&type=general
                        ($(this).find('*').filter('.MwR2AYaY').length > 0) ||
                        ($(this).find('*').filter('.positionBox').length > 0) || //https://www.douyin.com/discover/search/美食?type=general
                        ($(this).find('*').filter('.LUd60iMQ').length > 0) // https://www.douyin.com/root/search/美食?aid=2a1664b4-686d-4182-abf4-b42cfb1a4745&type=general
                })
                .each(function () {
                    // 综合-获取视频名称
                    let name = $(this).find('.tEtM2Efb').text()
                    if (!name) {
                        name = $(this).parents('.YdZXj3v0').find('.zDmoEt1p').html()
                    }
                    if (!name) {
                        name = $(this).find('.f5gD3oyd').html()
                    }

                    // 用户-获取视频名称
                    if ($(this).parents('li').find('.swoZuiEM').length > 0) {
                        name = $(this).parents('li').find('.swoZuiEM').html()
                    }

                    name = name ? name : ''

                    $(this).prepend(`
                <div class="douyinDownload2" data-sign="${sign}" data-position="search-more-row-function" style="z-index: 199;">
                    <div class="number">${counter.search_more_col}</div>
                    <div class="douyinDownload2_top3">
                        <input type="hidden" name="video_name" value="${name}">
                        <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                        <span>下载</span>
                    </div>
                </div>
                    `)
                    counter.search_more_col++
                })

            //  单个列表-下载不了
            $(elem_single)
                .not(':has(.douyinDownload2)')
                .not(':has(.douyinDownload3)')
                .each(function () {

                    $(this).prepend(`
                <div class="douyinDownload2" data-position="search-simple-row-function">
                    <div class="douyinDownload2_top"  data-click="searchSingle">
                        <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                        <span>下载</span>
                    </div>
                </div>
            `)
                    counter.search_simple_col++
                })

            var div = document.querySelector('#waterFallScrollContainer>div');

            if (div && div.offsetWidth > 300) {
                var douyinDownload3 = div.querySelector('.douyinDownload3');
                var douyinDownload2 = div.querySelector('.douyinDownload2');
                if (douyinDownload3) {
                    douyinDownload3.style.position = 'absolute';
                    douyinDownload3.style.top = '90px';
                    douyinDownload3.style.right = '130px';
                }
                if (douyinDownload2) {
                    douyinDownload2.style.position = 'absolute';
                    douyinDownload2.style.top = '90px';
                    douyinDownload2.style.right = '130px';
                }

            }
        }

        // 根据url判断 判断网页修改逻辑
        clearInterval(setInt1)
        setInt1 = setInterval(() => {
            let url = window.location.href
            // 推荐
            if (url.indexOf('douyin.com/?recommend=1') > -1) {
                indexFunction()
            }

            // 指定用户中心[适配笔记]
            if (url.indexOf('douyin.com/user') > -1) {
                userAddHtml() // 批量下载
                userAddInfoHtml('user')  // 搜索模块详情
            }

            // 搜索模块
            if (url.indexOf('douyin.com/search') > -1 || url.indexOf('/root/search') > -1 || url.indexOf('/jingxuan/search') > -1 || url.indexOf('search/') > -1) {
                searchFunction()
                // // 搜索模块详情
                // userAddInfoHtml('search')
            }

            // 详情页:抖音视频
            if (url.indexOf('douyin.com/video') > -1) {
                videoInfo()
            }
            if (url.indexOf('douyin.com/jingxuan?modal_id') > -1 || url.indexOf('douyin.com/jingxuan/') > -1 || url.indexOf('douyin.com/user/') > -1 || url.indexOf('douyin.com/search/') > -1) {
                videoIdFun()
            }
            if (url.indexOf('douyin.com/jingxuan') > -1) {
                videoJingXuanFun()
            }


            // 详情页:抖音笔记
            if (url.indexOf('douyin.com/note') > -1) {
                noteInfo()
            }

            // 指定  https://www.douyin.com/discover?modal_id=7395919712388926772
            if (url.indexOf('douyin.com/discover') > -1) {
                // videoIdFun()
            }

            // 添加头部logo
            iqHX00brFun()
            douyinDownload3_top1Show()
        }, 1000)

        // 抖音视频详情页
        function videoInfo(params) {
            let elem = '#root .leftContainer .video-detail-container,#root .JF6IpCM7 .CbB5shA3'
            $(elem).not(':has(.douyinDownload2)').each(function () {
                let sign = dateSign()
                let trans_to_word = `
          <div class="douyinDownload6_top1 douyinAlertUrl"  data-type="videoInfo">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                    <span>转文字</span>
                </div>
          `

                $(this).prepend(`
            <div class="douyinDownload2 douyinDownload8" data-sign="${sign}" data-position="index-function" style="z-index: 10">
            <div class="douyinDownload6_top1 xhsSaveSo" id="show-tooltip2" data-type="videoInfo">
              
              <span>收藏</span>
          </div>
                ${trans_to_word}
                <div class="douyinDownload2_top" data-click="videoInfo">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>下载</span>
                </div>
            </div>
        `)
                // setTimeout(function () {
                //     $('#show-tooltip2').hover(
                //         function () {
                //             // 获取提示框内容
                //             const tooltipText = '点击后会把该内容存到so100.vip项目中去'//$(this).attr('data-tooltip');

                //             // 创建提示框元素
                //             const tooltip = $('<div class="tooltip"></div>').text(tooltipText);

                //             // 将提示框添加到页面中
                //             $('body').append(tooltip);

                //             // 设置提示框的位置
                //             const elementOffset = $(this).offset();
                //             tooltip.css({
                //                 top: elementOffset.top + $(this).outerHeight() + 5,
                //                 left: elementOffset.left,
                //             }).fadeIn();
                //         },
                //         function () {
                //             // 鼠标离开时移除提示框
                //             $('.tooltip').remove();
                //         }
                //     );
                // }, 1000)
            })
        }

        // 笔记视频详情页 gy
        function noteInfo(params) {
            let elem = '#root .note-detail-container,#root .JF6IpCM7 .CbB5shA3'
            $(elem).not(':has(.douyinDownload2)').each(function () {
                let sign = dateSign()
                let trans_to_word = `
          <div class="douyinDownload6_top1 douyinAlertUrl"  data-type="videoInfo">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                    <span>转文字</span>
                </div>
          `

                $(this).prepend(`
            <div class="douyinDownload2 douyinDownload8" data-sign="${sign}" data-position="index-function" style="z-index: 10">
            <div class="douyinDownload6_top1 xhsSaveSo" id="show-tooltip3" data-type="noteInfo">
              
              <span>收藏</span>
          </div>
                ${trans_to_word}
                <div class="douyinDownload2_top" data-click="noteInfo">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>下载</span>
                </div>
            </div>
        `)
                setTimeout(function () {
                    $('#show-tooltip3').hover(
                        function () {
                            // 获取提示框内容
                            const tooltipText = '点击后会把该内容存到so100.vip项目中去'//$(this).attr('data-tooltip');

                            // 创建提示框元素
                            const tooltip = $('<div class="tooltip"></div>').text(tooltipText);

                            // 将提示框添加到页面中
                            $('body').append(tooltip);

                            // 设置提示框的位置
                            const elementOffset = $(this).offset();
                            tooltip.css({
                                top: elementOffset.top + $(this).outerHeight() + 5,
                                left: elementOffset.left,
                            }).fadeIn();
                        },
                        function () {
                            // 鼠标离开时移除提示框
                            $('.tooltip').remove();
                        }
                    );
                }, 1000)
            })
        }

        // 推荐
        function indexFunction() {

            // 默认值
            let def = '#slidelist .dySwiperSlide'
            let elem = remote_elem['index-function'] || def
            let sign = dateSign()
            console.log('主页面', elem)
            $(elem).not(':has(.douyinDownload2)').each(function () {
                let index = 10
                if ($(this).hasClass('nFJH7DcV')) {
                    index = 198
                }

                let trans_to_word = ''

                // if ($(this).hasClass('dySwiperSlide')) {
                trans_to_word = `
            <div class="douyinDownload6_top1 douyinAlertUrl" data-type="index">
                      <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                      <span>转文字</span>
                  </div>
            `
                // }

                $(this).prepend(`
              <div class="douyinDownload2 douyinDownload8" data-sign="${sign}" data-position="index-function" style="z-index: ${index}">
              <div class="douyinDownload6_top1 xhsSaveSo" id="show-tooltip4" data-type="index">
              
              <span>收藏</span>
          </div>
                  ${trans_to_word}
                  <div class="douyinDownload2_top" data-click="index">
                      <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                      <span>下载</span>
                  </div>
              </div>
          `)
                setTimeout(function () {
                    $('#show-tooltip4').hover(
                        function () {
                            // 获取提示框内容
                            const tooltipText = '点击后会把该内容存到so100.vip项目中去'//$(this).attr('data-tooltip');

                            // 创建提示框元素
                            const tooltip = $('<div class="tooltip"></div>').text(tooltipText);

                            // 将提示框添加到页面中
                            $('body').append(tooltip);

                            // 设置提示框的位置
                            const elementOffset = $(this).offset();
                            tooltip.css({
                                top: elementOffset.top + $(this).outerHeight() + 5,
                                left: elementOffset.left,
                            }).fadeIn();
                        },
                        function () {
                            // 鼠标离开时移除提示框
                            $('.tooltip').remove();
                        }
                    );
                }, 1000)
            })
        }

        // 获取当前页面的URL中播放ID
        function getUrlParameter(parameterName) {
            // 使用 URL 对象来解析 URL
            let url = window.location.href
            let parsedUrl = new URL(url);

            // 获取指定参数名的参数值
            let parameterValue = parsedUrl.searchParams.get(parameterName);

            // 返回参数值
            return parameterValue;
        }
        function getUrlLastId() {
            // 使用 URL 对象来解析 URL
            let url = window.location.href
            let parsedUrl = new URL(url);

            // 获取指定参数名的参数值
            let parameterValue = parsedUrl.pathname.split('/').pop();

            // 返回参数值
            return parameterValue;
        }
        function getBaseUrlLastId(url) {
            // 使用 URL 对象来解析 URL
            let parsedUrl = new URL(url);

            // 获取指定参数名的参数值
            let parameterValue = parsedUrl.pathname.split('/').pop();

            // 返回参数值
            return parameterValue;
        }

        // 搜索页面
        $('#root').on('click', '.douyinDownload2_top3', function (event) {
            let name = $(this).find('[name=video_name]').val()
            console.log('name', name)
            getCookieDow(() => {
                let event2 = new MouseEvent('mousemove', {
                    'view': window,
                    'bubbles': true,
                    'cancelable': true,
                })
                // 获取具有特定class的元素
                let element = $(this).parent().parent().find('.videoImage')[0]
                console.log('element', element)
                // 触发鼠标滑入事件
                if (element) {
                    element.dispatchEvent(event2)
                    setTimeout(() => {
                        let this_video_id = $(this).parent().parent().attr('id');
                        console.log('this_video_id', this_video_id)
                        let isImg2 = $(this).parent().parent().find('.fnWBjiik')

                        // 图片类型判断
                        if (isImg2.length > 0) {
                            const numberPart = this_video_id.substring("waterfall_item_".length);
                            console.log(numberPart);
                            onedownote(name, numberPart)  // 用户主页下载入口
                        } else {
                            onedow(name)  // this 的source元素有src
                        }
                    }, 250)
                } else {
                    onedow(name)
                }
            })
        })

        function uniqueArray(array) {
            var unique = [];
            for (var i = 0; i < array.length; i++) {
                if (unique.indexOf(array[i]) === -1) {
                    unique.push(array[i]);
                }
            }
            return unique;
        }

        $('#root').on('click', '.douyinDownload4_top', function (event) {
            let dataType = $(this).attr('data-type')
            let obj = $('#slidelist div[data-e2e="feed-active-video"]')

            // 首页
            if (dataType === 'discover') {
                let modal_id = $(this).parent().parent().attr('id')
                let name = $(this).parent().parent().find('.bWzvoR9D').text()
                getCookieDow(() => {
                    onedow(name, modal_id, 'get')
                })
            }

            if (dataType === 'videoId') {
                let name = $(obj).find('.HGWtaPTo').text()
                if (!name) {
                    name = $(obj).find('.anRNZmcV').text()
                }
                let html = $(obj).find('.TnpQ5UcN').find('.DVhIq2rW')
                if (html.length === 0) {
                    html = $(obj).find('.oLQoaUK3').find('.LrgYn5wq')
                }
                let url_src = []
                for (const i in html) {
                    if (html[i].src) {
                        let html_src = html[i].src
                        let _i = parseFloat(i) + 1
                        url_src.push({
                            name: `${name}_${_i}`,
                            url: html_src,
                        })
                    }
                }
                getCookieDow(() => {
                    onedow(name, getUrlParameter('modal_id'))
                })
            }

            // 用户界面
            if (dataType === 'user') {
                let modal_id = $(this).parent().parent().attr('data-e2e-vid')
                let href = $(this).parent().parent().find('a').attr('href')
                console.log(modal_id)
                console.log(href)
                if (modal_id) {
                    // 我的弹窗
                    let name = $(this).parent().parent().find('.title').text()
                    getCookieDow(() => {
                        onedow(name, modal_id)
                        console.log('661', name, modal_id)
                    })
                } else if (href) {
                    let is_note = ''
                    let this_video_id = href.split('/video/')[1]
                    let name = $(this).parent().parent().find('.eJFBAbdI').text()
                    if (this_video_id === undefined) {
                        this_video_id = href.split('/note/')[1]
                        is_note = 'note'
                    }
                    getCookieDow(() => {
                        onedow(name, this_video_id, 'get', is_note)  // 用户主页下载入口
                    })
                } else {
                    T.showToast(2, '解析失败')
                }
            }


        })


        $('#root,.HHwqaG_P').on('click', '.douyinDownload2_top', function (event) {
            event.stopPropagation()
            event.preventDefault()

            let _this = $(this)
            let name = _this.parent().parent().find('.e_h_fqNj').text()
            let type_val = _this.attr('data-click')  // videoInfo
            let sel = '.di7KBufh'
            let obj = null
            let dataVid = ''
            var arrayImg = [];
            if (!name) {
                // 搜索-视频-多列
                sel = '.swoZuiEM'
                obj = _this.parents('.MgWTwktU').find(sel)
                if (obj.length) {
                    name = obj.text()
                }
            }

            if (type_val == 'searchSingle') {
                //  搜索-综合-单列
                name = _this.parent().parent().parent().parent().parent().find('.WWxp69eP').text()

                if (!name) {
                    name = _this.parent().parent().find('.anRNZmcV').text()
                }
                dataVid = _this.parent().parent().attr('data-e2e-vid')
                let isImg = $(this).parent().parent().find(' .focusPanel')
                if (isImg.length) {
                    var imgElements = isImg[0].getElementsByTagName('img');
                    var srcValues = [];
                    for (var i = 0; i < imgElements.length; i++) {
                        srcValues.push(imgElements[i].getAttribute('src'));
                    }
                    arrayImg = uniqueArray(srcValues)
                    // console.log(arrayImg)
                }
                console.log('步骤3', dataVid)
            }

            if (!name) {
                //  推荐
                sel = '.anRNZmcV .j5WZzJdp span'
                let texts = []
                _this.parents('.slider-video').find(sel).each(function () {
                    let text = $(this).text()
                    if (texts.indexOf(text) === -1) {
                        texts.push(text)
                    }
                    if (texts.length) {
                        name = texts.join('')
                    }
                })
            }

            //  抖音视频详情页
            if (type_val == 'videoInfo') {
                name = _this.parent().parent().parent().find('.j5WZzJdp').text()
                if (!name) {
                    name = _this.parents('#douyin-right-container').find('.a73s71Cr').text()
                }
                console.log('666666', name)
            }

            // 笔记详情处理
            if (type_val == 'noteInfo') {
                name = $(document).find('title').text();
                if (!name) {
                    name = '图文'
                }
                let isImg = $(this).parent().parent().parent().find('.ypKyQItw.vaTmTehn');
                if (isImg.length) {
                    var imgElements = isImg.find('img'); // 使用.find()来查找所有img元素
                    var srcValues = [];
                    for (var i = 0; i < imgElements.length; i++) {
                        srcValues.push(imgElements[i].getAttribute('src'));
                    }
                    arrayImg = uniqueArray(srcValues); // 假设uniqueArray是一个已经定义好的去重函数
                }
            }

            // ??
            if (type_val == 'index') {
                //  推荐
                name = _this.parent().parent().parent().find('.anRNZmcV span').text()
                dataVid = _this.parent().parent().parent().find('.sliderVideo').attr('data-e2e-vid')
            }
            console.log('步骤4', dataVid)
            getCookieDow(() => {
                if (arrayImg.length) {
                    ajaxImgGet20250212(name, arrayImg)
                } else {
                    if (!dataVid) {
                        console.log(getUrlLastId())
                        onedow(name, getUrlLastId())
                    } else {
                        onedow(name, dataVid)
                    }

                }
            })
        })

        function getCookieDow(succeed, err) {
            succeed()
        }

        // function getCookieDow(succeed, err) {
        //     /**
        //      * 如果按钮是vip才能使用，
        //      每天第一次使用是免费的，第二次就需要vip了，
        //      第二次那么则需要登录，如果登录后再点击vip功能，则引导跳转到购买界面
        //
        //      20240415 高阳
        //      - 没登录不可以修改
        //      - 登录后的免费版可以一直用
        //      - 会员无限制
        //      */
        //     let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
        //     let Token = T.getCookie('dosToken')
        //
        //     if (Token == "") {
        //         douyin_topFun()
        //         return
        //     }
        //
        //     if (douyinDownload && douyinDownload >= 99999999) {
        //         let Token = T.getCookie('dosToken')
        //         if (Token && Token.token) {
        //             // ['0', '1', '2', '3']
        //             // GRADELIST: ['FREE', 'EVIP', 'VIP', 'SVIP'],
        //             // ['普通用户', '企业版', '专业版', '旗舰版']
        //             if (Token.auth > 0) {
        //                 succeed()
        //             } else {
        //                 T.showToast(2, '每天使用次数已到限制，请先购买会员')
        //                 setTimeout(() => {
        //                     T.goUrl('https://dso100.com/pay')
        //                 }, 2000)
        //             }
        //
        //         } else {
        //             douyin_topFun()
        //             if (typeof err === 'function') {
        //                 err()
        //             }
        //         }
        //     } else {
        //         succeed()
        //     }
        // }

        //数组中 最长元素和最长长度
        function findLongestElement(arr) {
            // 初始化最长元素和最长长度
            let longestElement = "";
            let maxLength = -Infinity;

            // 遍历数组
            for (let element of arr) {
                // 检查当前元素的长度
                if (element.length > maxLength) {
                    maxLength = element.length;
                    longestElement = element;
                }
            }

            // 返回最长的元素
            return longestElement;
        }

        // 下单个视频 type=get 直接获取接口
        async function onedow(name, id, type, is_note = '') {
            let is_autoplay = 0
            if ($('video').length > 0) {
                let is_src = 0
                $('video').each(function () {
                    let autoplay = $(this).attr('autoplay')
                    let src = $(this).attr('src')
                    if (autoplay !== undefined) {

                        is_autoplay++
                        let src = $(this).find('source').eq(0).attr('src')  // gy html获取标签source 下的src 即下载链接
                        console.log('src', src)

                        let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                        T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                        if (src !== undefined) {
                            T.showToast(1, '浏览器正在下载 请注意查看进度')
                            is_src++
                            // https 之前用的是 http
                            if (name) {
                                console.log(6661)
                                send([{ 'name': name, 'url': src }])
                            } else {
                                console.log(6662, src)
                                send([{ 'name': 'video_' + kk, 'url': src }])
                            }
                            kk = kk + 1
                        }
                    }
                })
                console.log(id, videoObj, '信息')
                if (is_src === 0) {
                    if (id && videoObj[id]) {

                        let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                        T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                        console.log(6663)
                        send([{ 'name': name, 'url': findLongestElement(videoObj[id]) }])

                    } else {
                        let modal_idUrl = await modal_idUrlFun(id)
                        console.log('modal_idUrl', modal_idUrl)
                        if (modal_idUrl && modal_idUrl.url) {
                            let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                            T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                            T.showToast(1, '浏览器正在下载 请注意查看进度')
                            console.log(6664)
                            // sendChrome([modal_idUrl])
                            // T.showToast(2, '视频时间过长无法下载')
                            send([{ 'name': modal_idUrl.name, 'url': modal_idUrl.url }])

                        } else {
                            if (modal_idUrl && modal_idUrl.status == '411') {
                                douyin_topFun()
                            } else {
                                if (is_autoplay === 0) {
                                    T.showToast(2, '下载失败,未检测到视频链接,4564')
                                } else {
                                    if (is_src === 0) {
                                        T.showToast(2, '下载失败,未检测到视频链接。1566')
                                    }
                                }
                            }

                        }
                    }
                }
            } else {
                if (type === 'get') {
                    if (id && videoObj[id]) {
                        let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                        T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                        console.log(6665)
                        send([{ 'name': name, 'url': findLongestElement(videoObj[id]) }])
                    } else {
                        let modal_idUrl = await modal_idUrlFun(id)
                        console.log('modal_idUrl', modal_idUrl)
                        if (modal_idUrl && modal_idUrl.status == '411') {
                            douyin_topFun()
                        } else if (modal_idUrl && modal_idUrl.images && modal_idUrl.images.length > 0) {
                            await ajaxImgGet20250212(name, modal_idUrl.images)
                            T.showToast(1, '浏览器正在下载 请注意查看进度')
                        } else {
                            if (modal_idUrl && modal_idUrl.url) {
                                let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                                T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                                T.showToast(1, '浏览器正在下载 请注意查看进度')
                                console.log(66667)
                                // sendChrome([modal_idUrl])
                                send([{ 'name': modal_idUrl.name, 'url': modal_idUrl.url }])
                            } else {
                                T.showToast(2, '下载失败,错误代码：3005')
                            }
                        }

                    }
                } else {
                    T.showToast(2, '采集失败，请点击详情后下载')
                }
            }
        }

        // 搜索列表 图文下载 特殊
        async function onedownote(name, id) {
            let modal_idUrl = await modal_idUrlFun(id)
            console.log('modal_idUrl', modal_idUrl)
            if (modal_idUrl && modal_idUrl.status == '411') {
                douyin_topFun()
            } else if (modal_idUrl && modal_idUrl.images && modal_idUrl.images.length > 0) {
                await ajaxImgGet20250212(name, modal_idUrl.images)
                T.showToast(1, '浏览器正在下载 请注意查看进度')
            } else if (modal_idUrl && modal_idUrl.url) {
                let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
                T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
                T.showToast(1, '浏览器正在下载 请注意查看进度')
                console.log(66667)
                // sendChrome([modal_idUrl])
                send([{ 'name': modal_idUrl.name, 'url': modal_idUrl.url }])
            } else {

                T.showToast(2, '下载失败,错误代码：3005')


            }
        }

        // 用户详情
        function userAddInfoHtml(type) {

            let def = '#root .modal-video-container #slidelist,#root #slideMode .playerContainer'
            let elem = remote_elem['user-add-info-html'] || def
            let sign = dateSign()

            if ($(elem)) {
                $(elem)
                    .not(':has(.douyinDownload3)')  // 排除掉包含 .douyinDownload3 的元素
                    .filter(function () {           // 进一步筛选
                        return ($(this).find('*').filter('.x7P__y2r').length > 0) ||
                            ($(this).find('*').filter('.TCQQg7so').length > 0) ||
                            ($(this).find('*').filter('.author-card-user-video-like').length > 0) ||
                            ($(this).find('*').filter('.I6U7FiE8').length > 0) ||
                            ($(this).find('*').filter('.tuwZYy_k').length > 0)
                            ;  // 只保留包含 收藏 的元素
                    })
                    .each(function () {
                        // 在符合条件的 .elem 元素中添加
                        let text_html = `
            <div class="douyinDownload3_top1 douyinAlertUrl"  data-type="${type}" style="display: flex;    margin-right: 10px;">
                  <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                  <span>转文字</span>
              </div>
            `
                        let id = $(this).attr('id') //首页列表不加转文字
                        $(this).prepend(`
              <div class="douyinDownload3" style="width:auto;${(type == 'user') ? 'z-index: 10000;' : ''}" data-sign="${sign}" data-position="user-add-info-html">
              ${(type != 'user' && !id) ? text_html : ''}
              <div class="douyinDownload3_top douyinDownload4_top"  data-type="${type}">
                  <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                  <span>下载</span>
              </div>
          </div>`);
                    });
            }
        }

        // 转文字
        let setIntDocumentImg = null

        function douyinDownload3_top1Show() {
            if (!window.location.href.includes('modal_id')) {
                return
            }
            let documentImg = document.querySelector(
                '#root .modal-video-container #slidelist .ZfrXkYoG .Z6bzLUc0 img')
            if (documentImg) {
                let alt = documentImg.alt
                var regex = /https:\/\/v\.douyin\.com\/([a-zA-Z0-9/]+)/
                var match = alt.match(regex)
                $('#root .douyinDownload3 .douyinDownload3_top1').attr('data-alt', match[0])
                $('#root .douyinDownload3  .douyinDownload3_top1').attr('style', 'display: flex;')
            } else {
                if ($('#root .douyinDownload3 .douyinDownload3_top1')) {
                    // 创建一个鼠标滑入事件
                    var event = new MouseEvent('mouseover', {
                        'view': window,
                        'bubbles': true,
                        'cancelable': true,
                    })

                    // 获取具有特定class的元素
                    var element = document.querySelector('.Q79kf5XP')
                    if (element) {
                        // 触发鼠标滑入事件
                        element.dispatchEvent(event)

                        // 延迟200毫秒后移出鼠标
                        setTimeout(function () {
                            var mouseOutEvent = new MouseEvent('mouseout', {
                                'view': window,
                                'bubbles': true,
                                'cancelable': true,
                            })
                            element.dispatchEvent(mouseOutEvent)

                            setIntDocumentImg = setTimeout(() => {
                                let documentImg = document.querySelector(
                                    '#root #slidelist .ZfrXkYoG .Z6bzLUc0 img')
                                if (documentImg) {
                                    let alt = documentImg.alt
                                    var regex = /https:\/\/v\.douyin\.com\/([a-zA-Z0-9/]+)/
                                    var match = alt.match(regex)
                                    clearInterval(setIntDocumentImg)
                                    $('#root .douyinDownload3 .douyinDownload3_top1').attr('data-alt', match[0])
                                    $('#root .douyinDownload3  .douyinDownload3_top1').attr('style', 'display: flex;')
                                }
                            }, 300)
                        }, 100)
                    }
                }
            }
        }

        // 用户 批量下载
        function userAddHtml() {

            let def = '.dRAoSDJg .eGm1w069,.VCzQd6LR  .OphgX4T0'
            // let def = '.UuBdeq3u .OItTLx5x,.GE_yTyVX .ul1KmTQh'
            let elem = remote_elem['user-info-multiple-download'] || def
            let sign = dateSign()

            if ($(elem).length > 0) {
                $(elem).not(':has(.douyinDownload)').prepend(`<div class="douyinDownload" data-sign="${sign}">
                <div class="douyinDownload_top">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>批量下载</span>
                </div>
                <div class="douyinDownload_bottom" style="z-index: 111;">
                    <div class="douyinDownload_bottom_list">
                        <div >抓取条数：</div>
                        <input type="text" id='number' value='50' placeholder="请输入条数">
                    </div>
                    <div class="douyinDownload_bottom_list">
                        <div>下载时间间隔毫秒：</div>
                        <input type="text" id='cjys' value='1000' placeholder="请输入毫秒">
                    </div>
                    <div class="douyinDownload_bottom_btn"  id="start">
                        <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                        <span>确认并下载</span>
                    </div>
                </div>
                </div>`)
            }

            // 新版用户主页 - 使用稳定的选择器
            // 新DOM结构: li.wqW3g_Kl > div > a.uz1VJwFY > .XNarezzx (图片容器)
            let userListSelectors = [
                '#root .LPv6KBIL>ul>li>div>a .dRAoSDJg',  // 旧版选择器
                '#root div[data-e2e="user-post-list"] li.wqW3g_Kl .XNarezzx',  // 新版选择器1
                '#root ul li.wqW3g_Kl .XNarezzx'  // 新版选择器2 (更宽松)
            ]
            
            let foundElements = false
            for (let selector of userListSelectors) {
                let $items = $(selector).not(':has(.douyinDownload2)')
                if ($items.length > 0) {
                    foundElements = true
                    console.log('用户主页列表 - 使用选择器:', selector, '找到元素:', $items.length)
                    
                    // 确保父容器有相对定位
                    $items.css('position', 'relative')
                    
                    $items.each(function () {
                        // 获取视频链接用于下载
                        let $link = $(this).closest('a')
                        let href = $link.attr('href') || ''
                        let videoId = extractDouyinVideoId2(href)
                        
                        $(this).prepend(`
                    <div class="douyinDownload2 douyinDownload-user" data-sign="${sign}" data-position="user-add-html" data-video-id="${videoId}" style="z-index: 10; position: absolute; top: 8px; right: 8px;">
                        <div class="number">${counter.user_add_info}</div>
                        <div class="douyinDownload2_top7 douyinDownload2_top71 clickUserDown" data-video-id="${videoId}" style="width: auto;">
                            <img width="18px" height="18px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                            <span>下载</span>
                        </div>
                    </div>
                `)
                        counter.user_add_info++
                    })
                    break  // 找到就停止
                }
            }
            
            if (!foundElements) {
                console.log('用户主页列表 - 未找到匹配元素')
            }
        }

        $('#root').on('click', '.douyinDownload2_top71', function (event) {
            event.preventDefault()

            let name = $(this).parent().parent().parent().parent().parent().find('.Ja95nb2Z').text()
            let name2 = $(this).parent().parent().parent().parent().parent().find('a').attr('href')
            let href = $(this).parent().parent().parent().parent().find('a').attr('href')
            console.log(name, name2, href, extractDouyinVideoId2(href))
            let def = '#root div[data-e2e="modal-video-container"]'
            let elements = document.querySelectorAll(def)
            let setInt = setInterval(() => {
                if (elements.length) {
                    clearInterval(setInt)
                    for (var i = 0; i < elements.length; i++) {
                        elements[i].style.zIndex = '-1'
                    }
                } else {
                    elements = document.querySelectorAll(
                        '#root div[data-e2e="modal-video-container"]')
                }
            }, 10)
            getCookieDow(() => {
                setTimeout(() => {
                    onedow(name, extractDouyinVideoId2(href))
                    $('#douyin-right-container .pGZF8lyn .Vjmi41VB').click()
                }, 500)
            }, err => {
                $('#douyin-right-container .pGZF8lyn .Vjmi41VB').click()
            })
        })

        // 新版用户主页下载点击事件
        $('#root').on('click', '.clickUserDown', function (event) {
            event.preventDefault()
            event.stopImmediatePropagation()
            
            // 从 data 属性获取视频ID，或者从链接中提取
            let videoId = $(this).attr('data-video-id')
            if (!videoId) {
                let href = $(this).closest('a').attr('href') || ''
                videoId = extractDouyinVideoId2(href)
            }
            
            // 获取视频标题
            let name = $(this).closest('li').find('.EtttsrEw').text() || 
                       $(this).closest('li').find('.eJFBAbdI').text() || ''
            
            console.log('用户主页下载', videoId, name)
            
            getCookieDow(() => {
                if (videoId) {
                    onedow(name, videoId)
                }
            })
        })

        $('#douyin-right-container').on('click', '.douyinDownload_top', function () {
            let douyinDownload = T.getCookie('douyinDownloadAll') || false
            if (douyinDownload) {
                let Token = T.getCookie('dosToken')
                if (Token && Token.token) {
                    // ['0', '1', '2', '3']
                    // GRADELIST: ['FREE', 'EVIP', 'VIP', 'SVIP'],
                    // ['普通用户', '企业版', '专业版', '旗舰版']
                    if (Token.auth > 0) {
                        $('.douyinDownload_bottom').show()
                    } else {
                        T.showToast(2, '每天使用次数已到限制，请先购买会员')
                        setTimeout(() => {
                            T.goUrl('https://dso100.com/pay')
                        }, 2000)
                    }

                } else {
                    $('.douyin_top').trigger('click')
                }
            } else {
                $('.douyinDownload_bottom').show()
            }
        })
        $('.douyinDownload_bottom').on('click', function (event) {
            event.stopPropagation() // 阻止事件冒泡
        })
        $('#root').on('click', function (event) {
            // 新增：如果点击的是下载按钮，直接返回，不处理
            if ($(event.target).closest('.clickDown').length > 0) {
                return;
            }
            if (!$(event.target).closest('.douyinDownload').length) {
                $('.douyinDownload_bottom').hide()
            }
        })
        $('.douyin_alert_main').on('click', function (event) {
            event.stopPropagation() // 阻止事件冒泡
        })
        $('#douyin-right-container').on('click', '#start', function () {
            $('#start').text('采集中....请勿点击')
            feeds = []
            let url = window.location.href
            let result = url.split('?')[0].split('user/')
            if (result[1]) {
                userId = result[1]
            }
            get()
            T.setExpiresCookie('douyinDownloadAll', true)
        })

        // 添加头部logo
        function iqHX00brFun() {
            $('#root #douyin-header').not(':has(.douyin)').each(function () {
                console.log('到这里了吗')
                $(this).prepend(`
                <div class="douyin">
                  <div class="douyin_top">
                      <img src="data:image/png;base64,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" alt="">
                  </div>
                  <div class="douyin_bottom">
                      <div class="douyin_bottom_list">
                          <img class="img" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEySURBVHgB1VTbUcMwEDxnKMAlqAPoADpAVIA6CB2YDnAqwJRABUAHdGB1AKlA2YvWiSZjWZp8JTuzY/l0Wukeksilo8lNhBBafNbgA2ho9uAvuGmaxkstINaFiC+wBx35Co6c62rF3sE/0C74OArbklhHRyPljduSg2EobmZOQ32RCtwkY13gkewhEdKibCUWJTBEA58+J7hKxrfgB4Ucw7ZyrLDiDnxkNLYkqAs9x8+gkzx0bp1sPk45XdHYUtDIeWiRhn8d7HOoPxB9wvCbDhuJDXyfERjkGI2h7x7Zm6JgZXWh5iuAPzxNn/iM+HzCVtUFB2FtnRm7Y6uZksBy08qhb8e5jU4dLR1dwUev5yA14M0I0wmSx+GND0bInWzp+TISb482vKHZSyxMP7XJ9WEHmyL/btdc38QAAAAASUVORK5CYII=">
                          <img class="imgon" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAG4SURBVHgB1VTdUcJAEN47o8+UkA6gA311BCcUoCQVQAdAB1hBCBQg8jO+SgVgBaQD8Fly67eBQAaToG+6M4HL3d63u99+G6K/birv4Nnn0pVFTWa6ISZ77x3id3kR0dOtp8Ksezprczbk9qWmtYDheVeKuvJgPQe4E2laiQ/9xGYD9qcBr8c+O7k+PrvwWRX57BwDbovjq882nTGhJGv/wKGASCnKkHfnqX7aaRJwByVvqo+qR2fMShZbTS2gh2kwZNxEyA9wZ+OMx0N2NNZFwAdAZFDGxSAGGrCrI3qLFDnSiKQMZF9BgGtUM/q0qHL/oEangMcuI7LeyQJLaiBjNycJqcZFps0kuPCecBoD7l9sk+jt91aqe2pzAJQXY6i+NRRzYyBcy1A/77acqWhHT5yEomVyporCTn1uGTRKa3LAMVNEc9BRqnrHpki52HupNVQrDlYEmFwEsA3gUu1ETsKfKMDaV5ZreaJNm+hWshONpve/zbJoDXO8kOh5YOKDIVhgOUepnfRZJocTH5OhSYY/BD9BSk5l/FVIPhqGuqCgc3pXFZUUTw8En/58MRqzJeolMvl/9gWCWNuHS6Am5gAAAABJRU5ErkJggg==">
                          <a href="javascript:;" class="multiple-download">批量下载</a>
                      </div>
                      <div class="douyin_bottom_list bodyDouyinAlertUrl">
                          <img class="img"  width="18px" height="18px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAAAXNSR0IArs4c6QAAEbhJREFUeF7tnd15G7sVRQH6WTNWBykhqcBSBSkhLaQDixWkhCSVSO7gdpB0oJB+FicfSNOWKZIYDDZ+ufxyv2uDBwd7H6w5M0POWFPwz+vr94fj9KvV7sHa1Zfj/0/T9PPfCqbI1CggUcBa++ICTdPu2zHgbrd6ub+/2/99qT8298Ru03/6ZL4exGCT59af+WpVYFqXAEIWABw3PRu+1uIjr7oUmNYun3Ecn1LnlQwAbPrU1hH/NhSY1ilBkAQAm83myRi7b/P5gwIooFAgDQikAGDjK4wmBgpcU0ALAgkAaPcpWRTIqYDuGkE0ADjq5zSeuVDgvQLx3UAUALbb789c2ackUaCkAnEQWAQAWv6ShjM3CpwqsBwCwQBwm3+1mp4xAQVQoC4Fdjv7GPrNwiAAcL5fl+FkgwKnCoRCYDYA2PwUGwq0oUAIBGYBgLa/DePJEgWcAu6HR8Nw9zhHjVkA4Gr/HCkZgwL1KDAXAl4A0PrXYyqZoECYAv67A1cBwOYPk5vRKFCfAtchcBEAbP76rCQjFFiiwLWLglcAsJ2WTMZnUAAF6lLg2vWAswAoffQ/Pj6pLhnJBgWWK1D6K/OXuoALAMh79Hcb/u3NrEO/xbTcDj6JAuUUOBxg3Z98z8y41AV8AECuoz+bvlwBMnM9CuTab27F57qAMwDIcfT3356oxyIyQYH0CuQAwbku4DcApE5i7pcT0svNDChQnwJ5fmX7+8H3BAApj/4c9esrOTKqUYGUB+LTg/BPAKSc1Bg2f42FRk71KpByP76/FpABAGz+esuMzGpWINVvcC4AIEX7z+avucDIrX4FUkDg/WnAvgNI1W6M4+D9sVH9FpAhCpRTINVP8Y9dQEIAcPQvVzbM3JMCKbqAEwDo23+O/j2VIGspqUCKLuB4GmBTBOeqf8lyYe4eFUjRBbiDdBIAcPTvsQRZU0kFUhyo3WmA1V8A5Ny/ZKEwd78KqLsAANBvrbCyDhVoAgC0/x1WHkuqQgH9acC0tmqqAIAqaoUkOlQAAHRoKktCgRAFNhvdLXt3K9CqA859IUHIohmLAihwUEC9XwEAlYUCDSkAABoyi1RRQK0AAFArSjwUaEgBANCQWaSKAmoFAIBaUeKhQEMKAICGzCJVFFArAADUihIPBRpSAAA0ZBapooBaAQCgVpR4KNCQAgCgIbNIFQXUCgAAtaLEQ4GGFAAADZlFqiigVgAAqBUlHgo0pAAAaMgsUkUBtQIAQK0o8VCgIQUAQENmkSoKqBUAAGpFiYcCDSkAABoyi1RRQK0AAFArSjwUaEgBANCQWaSKAmoFAIBaUeKhQEMKAICGzCJVFFArAADUihIPBRpSAAA0ZBapooBaAQCgVpR4KNCQAgCgIbNIFQXUCgAAtaLEQ4GGFAAADZlFqiigVgAAqBUlHgo0pAAAKGiWez/7Yfrdnz+msfqjYGo3OPV5D+7v7156FgMAZHZ3s9n+yxjzV2PM58xTM12cAv81Zvr3OI5PcWHq+jQAyOSHO9qvVtM/jTF/yjQl0yRQYJrMt8+fhx+dW4IJMocEAJkEVwqdKWWmuaiA/WMc7/7Sg0DKurTWvlh1wGG4e2xd6M1m82SM/dr6Osj/lwK7nX3s4fqAer8CgDO7ZLPZ/ofWvzd89NEFAIAMdakUOUO6TDFPgf+N43A/b2i9o5S1ySnABZ+VItdbSjeXGQA4sRwAAICbosA4Drb1BSsPTgDgTDW8vm7+vlrZf7ReKOT/UQEA8LsmAAAA3BQnAAAA8BY8HYBXomYHAAAA4C1eAOCVqNkBAAAAeIsXAHglanYAAAAA3uIFAF6Jmh0AAACAt3gBgFeiZgcAAADgLV4A4JWo2QEAAAB4i/fHz4CfvQMZ0JwCAAAAeIsWAHglanYAAAAA3uIFAF6Jmh0AAACAt3gBgFeiZgcAAADgLV4A4JWo2QEAAAB4ixcAeCVqdgAAAADe4gUAXomaHQAAAIC3eBMAYP94au/EsgFJn2WYey1/Uz6aDQAAAO82UwPAWvMyDEO2B6UqHxhxKlbutWy32+dpMrJHegMAAAAAvApcHgAAIsQTfVQJeB4IcsYUOgAAINqrScIAgCSy/goKAABA4hKLCg8AouTzfxgAAAB/lZQbAQASaw8AAEDiEosKDwCi5PN/GAAAAH+VlBsBABJrrwaAMdM65yuqlQXCbcDExbYgvNJf7gJcMEApMgBYUOU/PsL3AD5qp6xNAHChNrWFRwewFAHKtzTn/g7D0jX7PgcAfAoJ/l0JgNyvpVYWSOlTAO3pWF4QC8rwbAilv3QAF1xSFl7ur58qC6Q0ANz8uvUAgI9+2herE9gYR5RhuMv2vfdUlHVxNV1A/qJT+lkHADZPxsT+wCm/D6lqU+kvHcAVl+K7gDJFpyyQGgBw6AKWQ8Cd+7+92fX9/d1Lqk2ZM67SXwAww7nQ4itdcMoCqQUARwhYa7/M/XWg82Gapm85b8HOKKfoIUp/AUCgHa4ruPaRGo4yygKpCQDvc2nBh8DSmj1c6S8AmC17OwOVBVIrANpxQ5+p0l8AoPeneERlgQCA4nZ+SEDpLwCoz9/ojJQFAgCi7ZAHUPoLAOT2lA+oLBAAUN7P0wyU/gKA+vyNzkhZIAAg2g55AKW/AEBuT/mAygIBAOX9pAOoz4OqMwIAVdsTnZzSXzqAaDvqC6AsEDqAvv0FAPX5G50RAIiWsOoASn8BQNVWL0tOWSB0AMs8SPkppb8AIKVThWIrCwQAFDLxyrRKfwFAff5GZ6QsEAAQbYc8gNJfACC3p3xAZYEAgPJ+chuwPg+qzggAVG1PdHJKf+kAou2oL4CyQOgA+vYXANTnb3RGACBawqoDKP0FAFVbvSw5ZYHQASzzIOWnlP4CgJROFYqtLBAAUMhEbgPWJ3wrGQGAVpxalqfSXzqAZR5U/SllgdAB1Ge10l8AUJ+/0RkpCwQARNshD6D0FwDI7SkfUFkgAKC8n6cZKP0FAPX5G52RskAAQLQd8gBKfwGA3J7yAZUFAgDK+0kHUJ8HVWcEAKq2Jzo5pb90ANF21BdAWSB0AH37CwDq8zc6IwAQLWHVAZT+AoCqrV6WnLJA6ACWeZDyU0p/AUBKpwrFVhYIAChk4pVplf4CgPr8jc5IWSAAINoOeQClvwBAbk/5gMoCAQDl/eQ2YH0eVJ0RAKjanujklP7SAUTbUV8AZYHQAfTtLwCoz9/ojABAtIRVB1D6CwCqtnpZcsoCoQNY5kHKTyn9BQApnSoUW1kgAKCQidwGrE/4VjICAK04tSxPpb90AMs8qPpTygKhA6jP6u32+/M0TQ+KzACAQsXKYgCAygwRp6MEgDHT2ioLxhFlGO4exWsmXIACSj/pAAKEzzT09fX7w2o1PSum2+3sIwBQKFlRDABQkRkJUlECYBwHCwASmFQyJAAoqX6euTWnAdN6HMcnAJDHs2yzAIBsUhedKNZnd/R3CwAARW3UTx5bGNcysta8DMPANR69bcER404FDkd/ABAse/0fAAD1e6TKcLPZPBljv86N5y7Sv72Z9f393cvxM3QAc9VrZBwAaMQoYZrzQPDrqP9+agAgNKKGUACgBhfK5HAAgTHWrr64/07T7ttut9of7d8f9QFAGX+yzAoAssjczSR0AN1YeVgIAOjM0MTLAQCJBc4dHgDkVrzt+QBA2/59yB4AdGZo4uUAgMQC5w4PAHIr3vZ8AKBt/+gAOvMv93IAQG7FE89HB5BY4M7CA4DODAUAnRmaeDkAILHAucMDgNyKtz0fAGjbP64BdOZf7uUAgNyKJ56PDiCxwJ2FBwCdGQoAOjM08XIAQGKBc4cHALkVb3s+ANC2f1wD6My/3MsBALkVTzwfHUBigTsLDwA6MxQAdGZo4uUAgMQC5w4PAHIr3vZ8AKBt/7gG0Jl/uZcDAHIrnng+OoDEAncWHgB0ZigA6MzQxMsBAIkFzh0eAORWvO35AEDb/nENoDP/ci8HAORWPPF8dACJBe4sPADozNDtdvs8TeYhxbJ4NVgKVcvGBABl9ZfPnhIAxpx/u4x8EQTMpgAAyCZ1nonmvSZqWS67nX289IaZZRH5VGkFAEBpB8TzAwCxoJ2HAwAdGpziNIDz/w4Lxb1HUHnV2L1+eBjueH984VqJe3f8+eTHcbCFl8X0CRQAAAlErSGkg8CnT9PX+DsCXPirwc9UOQCAVMpWEvcIgmM6PiC4Vt+Nnabpm/vvOI77V07zp08FAECfvrKqCAXchVRr7RcHyyMQ397susc7IAAgolD4aF8K+E6berwQCgD6qmFWs1CB+RdO+7omAgAWFgwf60eB+Zv/55WUdS/XRgBAP3XMShYoEL7595dIAcA5rfkewIIK5CPFFFi2+Y3p6VoAHUCx8mPikgos3fwuZwBwwTk6gJIlzdxzFYjZ/Ic5OAU4qzUAmFuCjCulQPzmN6anX0VyClCqEpk3uwKKzd/T0X9/OsOPgbLXIRMWUIDNf150AFCgGJkyrwJs/st6A4C8tchsmRVg818XHABkLkimy6cAm9+vNQDwa8SIBhVg888zDQDM04lRDSnA5p9vFgCYrxUjG1CAzR9mEgAI04vRFSug2fyHr/pWvMwPqbmnN+12q5clDywBAC05Ta4XFVBt/rYlDv+KMgBo23Gy/6FAikehtyluGAQAQJsuk/U7BTj6n5bDfAgAALZS8wqkfBtSm+IAgDZ9I+tFCtD+f5Rt7otc6AAWlRwfqkkBAPC7GyEPLAEANVUyuSxSgFMAALCocPhQPwoof9beuiohDyyhA2jdbfLfK0AXcCyE+RcA3ScAABuoGwWAQNjmBwDdlD4Lea/A6QtRe1Yn9iWudAA9VwdrQwGPAgCAEkGBG1bAbrffn6dpelBowGPBFSoSAwXyKSAFgEt77jeQ8i2RmVAABS4pIAdAyD1IbEEBFCirgFXfOgEAZQ1ldhQIUcCqf0rJdYAQ+RmLAmUVkAOA6wBlDWV2FAhRIAkAent/WoigjEWBlhSwLlnlrcDj4rkb0FIZkOutKpAMAHQBt1pSrLslBfYAUF8IPArAHYGWSqGPXA+1vHuw1n7pY0X+VUQ9FvwYPsXvqbkj4DePEToF1Le0dZnliRTyJKBjRvsOINV1ABcXCOQx/9ZnufXN/3NDW/MyDMPj3Hr4CYBUpwGHRMJ/pzx3AYxDgbS126K+8/fbTwC4ZaY4DfhFJvsyDHezydSi7ORcRgEA8FH3uXfhTgCweTLGfk1pIxcGU6p7m7F5KrAIAKm7gF9pzm9RbrOkWXWIApz/SwGQvgt4D4KlbzUNKRDG9q0AAPjd35C7Ab+dAhzDpPhmoL8Ep7WDgRu35DXH/viM6FmBlNev2tNtfod9FgBcVGnP8vcXW6dp9839/ziOT+2uJCxzuoCDXiFH//34SzKX6QLCTGf0HAXmHw3mRKt5zPFpwNNkJI+4q3mtl3ILvch+EQB0AS3afy3n2wKB+zpwWw7G330L3fxXOwD3j7RVbZWQL9slBeKLyb/HK6DYZ0u9vdgBHJelSC5eIiIoFOBr2QoVtTEU+2vp5vd2AMelcj1Aa3rZaLdzKlBWZ//spTf/bAC4gUDAb2grI+Z+TbSV9bSYZw2bPwgAXBRssczO5xzTMvajQrmV1LL5gwDgBgOBckWjnBkAKNUMi1XT5g8GwBECnz6Zr6rXiYXJx2iFAlwMVKgYHqO2zb8IAMdlKxYTLiGf0CjAhUCNjvOjKLrnFJ2b9zbgtSUCgfkFUNdIAJDbj9jfKqTY/FEdAJ1A7hLSzZeqmHQZ9hUp9uif0q+oDuC9TXQD7RQttwHzehWzN1JufkkH8BEC+7BJnyqU177eZqP9z+3oUgCk3vxyAHBakLu0wubj6n+YXqrRSwCQY/MnAwAgUJWONk6uotJm3Ue0kIuAOX2SXQO4ZtOvt7WsvvD9gfwF7Y78b29mzZOW8msfejDMufmTdwCX5D60RFwryFOOnPPn0dk/i+9UIPfmLwaAU6lch+D+7v1DHKxd3cy73fylEzbCPRKMh62GaZZr9PGpRW4+9+Qi9wgv926/Uo9v+z+svUB1uOy2jgAAAABJRU5ErkJggg==">
                          <img class="imgon"  width="18px" height="18px" alt="" src="data:image/png;base64,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">
                          <a href="javascript:;" >批量文案提取</a>
                      </div>
                      <div class="douyin_bottom_list">
                          <img class="img"  width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADxSURBVHgB1ZThDYIwEIWvxgG6gbiBI3QENpANdANdwQmQDXQCcALZQDfQDeq7cCRYWygk/uBLXsr1yuOubSCaNdbaFMogHchzzlAMbAK9bMMxsIYpu3OLHs8UaivbUiR9hq3JBUpiW/Ma4uUEg4Gu0EmmU5qKbDaTSfyQ/dTOup89DBneZbGW+CixGTJcesw2GFhPaI+Yp1eSPkAVjQEGuQ3z1XbstTFS3doRHw6bZTSiOiNfzT057VZkhw6l064J5EvJJyFDt2U+jFopVZGfgprtMBLX0Jv+iWof+M+CYUfTKNDVmR+695DLv9E0KpoNHxUz6FrF7eb4AAAAAElFTkSuQmCC">
                          <img class="imgon"  width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFpSURBVHgB1VTRTcMwFLxnt3xnA8IGGaG/CFWUAYBmAtigHQEmSEMHIBBV/IYNOkJG4Ltq/Hh20hBaAlHEB5wU2bKT87u7FwN/HfTd5vOSJ5rhbQokFyG97e+vHnhqCuTjkLLd2qCN7DFiTxlEDHgDBV+W5vvvMCMijUymNaFqIzzSmMjgVTKu0RGthFyRECGRwU+XPEJfwpeIfWEcyfRJPLp3i8ZV3I/QaEcGMkgqw3Mr2/qKPoRi9o0dN3BywQYxbDgDBPgBBymvIg7EP/thLunepjFDEY7lEBBjhkainQihpTp2M19kzqqKq9IRWNlf9eQOB5K5DCPXBifNRzhtON5QY4quFaaRaw1fWmVxGlLe3JPK5kPlvD2X5w5dKlS67D1DLoRPcDJJ/BMFrq26EIpcG8Z6fPnxbzZBhTsoNyjbyr4rPrf6+Suobxt7s6iq/3qQxGdXtLDzOpThFuutwit6QLogw7/BOz8GernQjJwsAAAAAElFTkSuQmCC">
                          <a href="https://dso100.com/DouyinVideoOcr" target="_blank">AI改写</a>
                      </div>
                      <div class="douyin_bottom_list">
                          <img  class="img" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADTSURBVHgB3ZTvDYIwEMWvxAFwg47QFdjAEdhAN0AnwA3QSRihbmA3ACeo75IjVgXk3xd8ySOX9t0vl3BA9Bfy3u/YtIQAyvxLGc2RwCo4FVeToWjMBWCCMyNnOY0RGgr4HsI+oHxXDAHFcCkNuienJcPZuA9mf8FaoDaEboLMAeaLRCnlENqjNh08h8wJmQS1hVP4zBdRS9BJvaVuPfgh2ZsM8jXhmxA+0gRFtLDWB4xppsKXUsP8FZQ0XDwAr9a1OVBNIcvJvyhN48SDXLAVNa1CT6VAqWG7JYy/AAAAAElFTkSuQmCC">
                          <img  class="imgon" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAEsSURBVHgB3ZRRTsJAEIb/WdDneoMeoVfgkagJHEClJ7CeAD2B3qAUDlBjbHzkCHKEHqG+WtlxpgppUkoLPMEkkzY7/3z7b7e7wEnE24wHmm20pkmQRDw2FrFmMuPxQUCFMRCQha/JFkETlOoK71N+BmMkoN6lT4tigpA9NphL1+Tqlh5aO0ymHApsUIZp6LuOaa3QNDmMQ3bOOoilwe1IY9+ndFPTR8ju8s9pmi8xHPqUVYAFTEWAsw1WgQJZLvoVtLsSdA2CMkw25F6m87B5XWn/hp4E2hPop6xqJKMvWjIV4b8zC1zUueMffOmz0BIWzHDWxuqaru/oEXtE44996sDSx9031psiJyATvCdHbt66Ww0wPLk4ogowBybnArUGLnYIMRJ9A684mvgFolGAgxr0hmYAAAAASUVORK5CYII=">
                          <a href="https://dso100.com/" target="_blank">我的主页</a>
                      </div>
                      <div class="douyin_bottom_list">
                          <img class="img" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADJSURBVHgB7ZJhDcIwEIWvDpAwCZVQHOAAHDAHzAE4aCXgAAmbA3AADspdcgtHubZk+7m95KXL23tflmYAi5PRwhijw8NBWYMx5loFIszicUM/0C/Ii3pbhA7ZBsIa9B3dQUXUQT9pU4MFmWk98Rx40+Rgvcgsf4EXmefMiqzn7QaSMakV2Tl+5NmjLqJ35GwHyp2k0BB/FcT7PWcdZO5xhJ6U7GtInSJMFNsMVIMd4B9RMYVOhpWgk2EadDZMgc6HCSj9pw5WaXoDsLJfc2nWfzUAAAAASUVORK5CYII=">
                          <img class="imgon" width="20px" height="20px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFSSURBVHgB7ZPRbcIwEIbPoQMwAiPQDdLHqtAN2iQTFCZImKBs4KQMUKoQ8Vh1gjICI2QBcv3P4AhZIYl4LfeQnH//98k+20T/LlSTmK/Yp4r8tkL2aPf8otadwELzGOZvpHvMlpeJNFYVPTxFancRuNU8OgDGRNk0UAm1RK45UR69DSq6f4zU3uqeC0P6Y2GiuSCrTSPj+ZKac5/nwMpJoEK7dWi/xQdra5bcaJiT8clbSu2n5qFod/KpiGQwQjKvWzSgAH0aMlMI0FFDbvye+c9OPUsxuxyQOcS1cnoSwzGfvKqlaJuMU/wCZ9eZ3cU24+BwBC5sm+oeSk+4ogVW9V6sOLZbMppdNQrrlmQcu7DG2GieYWVsoXb1ecZ1kcCMR3NIfUKMLvRqWBu0D0x1QfFqNA4rkauAfiV4HRFeR3oV8BxqzB2w3iEXGQfj0y2a4g/STNJBkNmvxgAAAABJRU5ErkJggg==">
                          <a href="https://dso100.com/pay" target="_blank">购买会员</a>
                      </div>
                  </div>
            `)
            })
        }

        $('body').append(`
	<div class="douyin_alert">
	  <div class="douyin_alert_w">
        <div class="douyin_alert_main_back"></div>
		<div class="douyin_alert_main">
			<div class="douyin_alert_main_t">
				<img width="30px" height="30px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAfCAYAAADwbH0HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAANOSURBVHgBrVfdUdtAEP7ubPysEpQKsB8zwUEHBcRUAKkAU4FNBUAFJBXgFMCcJw7Do00FUQmeCXkhti67upMty5IlAd+MRtLd6r69vf2TwCug9aOfflfqY4iaEFWELNHi1AABvbbp8nLExgbmh8TeqIoiYjfhJCCyASxhZQiIb0DjcpcCopj055WB6KeGxoJ2RAuOgZdQKTVfyz6QFZakpPiSVpIWHyrVvaxErPXUM/irAdNeE4K0745RAVpr36AxpKVP3dBMoHmS3b3IIZ0SqU+vc9rB5bE6uMYrQBbr0/d8TOQPIhT410lbSaaFDZ7vElKBhXotKUOpz9cCUvFavKZB8y49L9caTlZOxKSEGd4IpT7N1uQI7skKyZywpI+k0eI3P5N5Lt6y0zw4s18htmSzw+ftdrwcOD3CLCmfO1vDem4ZwUNb619X5GAbcc5mp9uYLi/CIt61ZCEK/LOYFuZrdrEl/nAsDw0ivYuc51iG1upHaPWy8xwZ7n7KnDJCo5fsNi9kGljyGJ+3V0SekMJ68EziZZSVcWvP7a5bPSkhD3nCxMlhGxwC7GxF5FlSChuVDps0yHLf+S6FOZTGJQoJM0YBisjrkDrqOFKMQZudy7eDYscH+eT1SHlzDReixpdYVZpmiBJkyeuQWrwkMp5EbbR8rKzE4EzX8lETRGxC+xh5ZcLZM0WJt2+j6buHueQwimlhAtQgZfPu8vY8RBDJ/Iy8Gk/8JAX265DymZaFWhYUOS508URxjDjYjTG9bKqzpJzHi723KrnNkLYIMafczCjN/raeCx8l3rvt7Us/K+MypJdkSOm2fsN3yqPn2wm+Sx2I7JSFDM8dqW6HZakojLJWo/GB5YiSnJ2YYW9qCzZGx6p7gncEVaxbW4hEeKQOPvCYTLRNKhNp0nNNwTuRTgZ51W+VQNikxpUuLoPvQW5JMXRrbjSMW13mvZ4Mhe2lWXgk0byo+6fgOppbOC9mUjq+YVomt69Ok1uh8gbdEk7JMZ/PiYijw7Ok+a3Ujoae++M97brOBOThnCojTjpzrAqM3HflNdiUXVwUNY2l/07UqJ0Z25wHqAb+47jJhlRt4rUC2idzB5xv6SNOr0m8c+NPXSNbodoPG+M/NwztcHuGDhwAAAAASUVORK5CYII=">
			</div>
			<!-- 二维码 -->
			<div class="douyin_alert_main_b" id="douyin_alert_img_html">
				<div class="douyin_alert_main_b_r" id="douyin_alert_img">
					<img width="48px" height="48px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAxCAYAAACcXioiAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHuSURBVHgB7ZpPTsJAFMa/Vwm65AjlABi8AdzAHeyIJxBPYDiB3kDYgRu5AXgDEnTPEbqURHi+RwpBkv4Bnc5U+0ugaTN05nvz55sZhnBAu84+HGY4o8X+PenXdZ0r5TVuidGV2wrcJpBPf3mG3nhGQUmflD8xIUId+UAD3JWAN+R6Ra1L7oLxgBwiQe9pDXT2nvWlTb3CbRoclpkZnZJEf9d0tPDDOfXhMO0a62UbdN9DzikE2KaUJlFobg1kyAcw1nE+KV0qAYLPKzwhQy4YC7lMk9IVfcA2f0AAbdpabvHIQzPPIjydX+dZxKYP7ERw/kTsfCBc6SyQM4ph1DaFANv8DwEytZ256hOpBOi83FWzS92EXHXso/qAiyKO7sSuiUi7pPyGipB1chMr3MMQHiNxPaycJEAJ5043sExhZLYpBFhFRsKTO3EcrRrrJpgPA/D+exlTggF0K5LXmEgGPkwh0Vc/MtKETJudRH2q79/kA4Mk1EQgmd/hWGTjYfhG0+2tUQFKjIjFaE5V/BDjo5Dp5pTJMGpSRGY+YEpEpkZmQkTmTrwT8Uu7gMZHoSj0fMb5anNCwI9JFojzDp7nNI5KYE2AktKxg+UZqlF/+FmdzKXsE7GnZ6zWwJawJl7ooLCsR2tWGIze6THqt189Wa1Ix6DVJAAAAABJRU5ErkJggg==">
				</div>
				<div class="douyin_alert_main_b_1">
					<img width="82.91px" height="72px" alt="" src="data:image/png;base64,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">
				</div>
				<div class="douyin_alert_main_b_2">
					微信二维码登录
				</div>
				<div class="douyin_alert_main_b_3">
					<img class="douyin_alert_main_b_3_back" width="173px" height="172px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK0AAACtCAYAAADCr/9DAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFxSURBVHgB7dvBbQIxEIbRMXIhNBCJbkKJpBukFMA2gpwcEmJxDYv4te+dduTDXj7Jvkw7Hsa+VnY6t6XYhGf01Me1LrW+VmzCM3raFYTp89BaLQX/sFZDY9T+9o/3t+/xx8dnc43zkuZOPQ+II1riiJY4oiWOaIkjWuKIljiiJY5oiSNa4oiWOKIljmiJI1riiJY4oiWOaIkjWuKIljiiJU63gUsCnQIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANxpx8PY/w6nc1sKXtDcaR/XukxnreAFzZ3uCsKIljiiJY5oiSNa4oiWOKIljmiJI1riiJY4oiWOaIkjWuKIljiiJY5oiSNa4oiWOKIljmiJ0+dh3nh8JFu+27FWQ+P6993vDi61Dlu+G7FiQzeeB8TprdVS8CDP6OkLtbYydhKPPt4AAAAASUVORK5CYII=">
					<div class="codeImg">
						<div class="douyin_alert_loading"></div>
					</div>
				</div>
				<div class="douyin_alert_main_b_4">
					- 欢迎使用极客 -
				</div>
				<div class="douyin_alert_main_b_5">
					<img width="17px" height="17px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHUSURBVHgBrVNdUhNBEO7ujcmCPOQIewPmCMkJTE4gnIBYSpVvkjfLUGVyAvAEwROIN5gbGE/gvESEzU779SargbABqviqpnZmp/vrn/maaQv0vcvKTUqBT3yos+MNxxPXXvyOR1F5gGN77WomrOeNXZncJbxFcoXIUug3cwbJpGC6SHIK1KAMho5Fj0iJYsLdnY9+tkHyn4B98yUd3pf+yuYztm6dSCoDXH4wytbI9+vqN6dmzocwC0mhZ/98qwj4HEThLj0AHvtQKL9BVZ2rd65TkhgBWKdUslOHHoGE477ZC3pUllilhUZ+VdKzir0O129dT5EP1hccnfmLpWXp7Zz6A9TqRR7IJsErEV+mIz+gYlmW3DEJ9ATIi6W90DOgYdETia+gVH8z1wzn73bx59iNmSCuCsz91id/oRHRRTNrqBbWYA6iykOsAQh+mU6i0Ln5aEJjNLtbreYuXdr/1mJ5D139sAabskvFljpZUJbukd82aBWuj/enCOhy5f7eyHuuMyz1EyNmhdvEGgqRSYppzuc6VabMhFnJvlFHspwRzmyW8Iw9nHs3c0w1U1gn2EqyQkDUn6w0s+gaeQh9jDcC1nnnxMPVkL+2r9Wfnm4SGP4CfWrpGSRmLyEAAAAASUVORK5CYII=">
					如遇问题请添加极客客服
					<div class="douyin_alert_main_b_5_back">
						<img width="140px" height="140px" alt="" src="data:image/jpeg;base64,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">
					</div>
				</div>
				<div class="douyin_alert_main_b_6">
					登录即表示您同意极客 <span><a href="https://www.dso100.com/draft/agreement_user.html" target="_blank" >用户协议</a></span> 与 <span><a href="https://www.dso100.com/draft/agreement_privacy.html" target="_blank">隐私协议</a></span>
				</div>
				
			</div>
			<!-- 手机号 -->
			<div class="douyin_alert_main_b2"  id="douyin_alert_code_html">
				<div class="douyin_alert_main_b_r"  id="douyin_alert_code">
					<img width="48px" height="48px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAxCAYAAACcXioiAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJqSURBVHgB7ZlBctMwFIZ/OV5k1xzBHKCMb0BzAsqKDhvCDTiCOQG9AWHXHXCCwgnIDAfA3AB2YWGp77lyR/HErlTFkTSTb6ZVLFvj/NV7v55U8fpcfcIECODHzS+x5s9X52qlgBeYgJx+VpgAdd+s298CF9TxFhOQIXEymurPSJic4nRFMcpT3k4xCXqHJ0DjX1Jzafn4mnMEjiiBBb3oo9nHOQBTRJd4rlw9V4VSdgLMBHd6R0nvaHYFPOQAi0gxnHLzgkWY16yYmmJo8BbYfN2Iv/DgslSLOVCOPFLfbEQ9dDPHGBKVGrG/+QzPqPESwF+ewuJ26L4Q+EBNNXQ/fRtF4owK2GZ4T5axQcSMCuAE/Z9hGbOIR0ModhFWORCziNz2QRZBnr2cS8oLzdbTQjW1tsr9SHzHCNYCGL1oVTggepGq8ESSt1GnGeijy4AFf6bV9Mx2HFWVZ7pMcaXod3gJaL+MxBcqY0u3Qbgmwdc4AF4hFIM7eecAixAZXpGIGgHwDiGGnYRiesnhJLqckPjX3Rdst4EEnpgagSPQ39n57OTelKqUOkyZg+TAo/R2dnNFzoXxEmGIpiHbNv4Ypx1ZaI4TQhkq0XTHpXSpPKpYhW9UvVqXLdFzFBcaYt/Rvuup3XFCaJhVv2PnWN6Ckwt5cYD6KKgAcV+K1/AgqACuYn1FhE5isxS/pQwuxp7V/x/4bfZFkcQ+MxGNC3UiaJX94zIu6ELmSrQh5MNJQGiC26gNuugrpMSin7RJzICY0em1QCH2nAAm40LagX7C2NAzyeQArxMz2R4G7OzmkloHmPaIpsFFd30Hg1jSY3EbEwIAAAAASUVORK5CYII=">
				</div>
				<div class="douyin_alert_main_b_1">
					<img width="82.91px" height="72px" alt="" src="data:image/png;base64,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">
				</div>
				<div class="douyin_alert_main_b_2">
					手机号登录
				</div>
				<div class="douyin_alert_main_b2_3">
					<div class="douyin_alert_main_b2_3_list">
						<img width="16px"  height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAQCAYAAADNo/U5AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADfSURBVHgB3ZKxbUIxEIa/My4oGYEFErxCNoAqKFU2SDZImCBkhHSvC0yQFZDSpAsjvBIQz8cdSIgCYaDkk6yz5Pvt890vGP2knTZ0KFDNZO5RnpKmpuGHM0TGvJUZyOOd/qtQo4yCWjyBBj7IEG3fDTCqfmVSemZ4r1N74C1wBbco8u6hSm+Y9LmUrA09jz4n5ULi7go+Zc24lKyRV4SXrUgCdfW385VjpXZz5nsVeJjMZO8SG27tdR1txAJqO5geCg7xP7lZk62ijYy+58Vli0G7YWyeSlJwuma+lpH3DbTuSqNLJq+ZAAAAAElFTkSuQmCC">
						<input type="text" type='number' id="inputMobile" placeholder="请输入手机号" >
					</div>
					<div class="douyin_alert_main_b2_3_list">
						<img width="16px" height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADUryzEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFSSURBVHgBpVNBTsJQEH3TNlF3PULZK5Yb4AlkJeyUE6gnMJxAOAG4McQNPQKeACJxjzdgqSb94xuKSQNtFX3p5M//fTN/3v9/BAVoxRoeOVw5xanNBXiGj+l4LsttrmwvXNT1UhR9uqEI1gGqiDgsFbh9WkiS53v5SSfWiMEjZaDv0Bi/SM1MfNRsK36TzrE2SxNoiiFZy08PZ4+vMv9et9I/PDTorpj8rjCB6ebQpA2SuaywBVujpIFxNtzsDGxykGLCnSNkWlf0dxJkJcICQ6uS/pTSesFhinuWFVN7kiNWgtzQsWhKjtA+UaUNsSfade1b7PoMqO2thHRNuymsAplMr2oXSmmx3PMqSnWCX+DfCYKqn9T5oA7hnxOMFzLCDxCe8syuPfDQdSh5QLuINs8eATutx3GYpphhH/C1Mra7bmfrQpci9lCtN493H4n1xxe883t4etb+kAAAAABJRU5ErkJggg==">
						<input type="text" id="inputCode" placeholder="请输入验证码">
						<div class="code" id="douyinAlertCode">发送验证码</div>
					</div>
					<div class="douyin_alert_main_b2_3_list2" id="douyin_alert_code">
						微信扫码注册
					</div>
					<div class="douyin_alert_main_b2_3_list3" id="douyinAlertCodeBtn">
						登录
					</div>
				</div>
				<div class="douyin_alert_main_b_4">
					- 欢迎使用极客 -
				</div>
				<div class="douyin_alert_main_b_5">
					<img width="17px" height="17px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHUSURBVHgBrVNdUhNBEO7ujcmCPOQIewPmCMkJTE4gnIBYSpVvkjfLUGVyAvAEwROIN5gbGE/gvESEzU779SargbABqviqpnZmp/vrn/maaQv0vcvKTUqBT3yos+MNxxPXXvyOR1F5gGN77WomrOeNXZncJbxFcoXIUug3cwbJpGC6SHIK1KAMho5Fj0iJYsLdnY9+tkHyn4B98yUd3pf+yuYztm6dSCoDXH4wytbI9+vqN6dmzocwC0mhZ/98qwj4HEThLj0AHvtQKL9BVZ2rd65TkhgBWKdUslOHHoGE477ZC3pUllilhUZ+VdKzir0O129dT5EP1hccnfmLpWXp7Zz6A9TqRR7IJsErEV+mIz+gYlmW3DEJ9ATIi6W90DOgYdETia+gVH8z1wzn73bx59iNmSCuCsz91id/oRHRRTNrqBbWYA6iykOsAQh+mU6i0Ln5aEJjNLtbreYuXdr/1mJ5D139sAabskvFljpZUJbukd82aBWuj/enCOhy5f7eyHuuMyz1EyNmhdvEGgqRSYppzuc6VabMhFnJvlFHspwRzmyW8Iw9nHs3c0w1U1gn2EqyQkDUn6w0s+gaeQh9jDcC1nnnxMPVkL+2r9Wfnm4SGP4CfWrpGSRmLyEAAAAASUVORK5CYII=">
					如遇问题请添加极客客服
					<div class="douyin_alert_main_b_5_back">
						<img width="140px" height="140px" alt="" src="data:image/jpeg;base64,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">
					</div>
				</div>
				<div class="douyin_alert_main_b_6">
					登录即表示您同意极客 <span><a href="https://www.dso100.com/draft/agreement_user.html" target="_blank" >用户协议</a></span> 与 <span><a href="https://www.dso100.com/draft/agreement_privacy.html" target="_blank">隐私协议</a></span>
				</div>
			</div>
			<!-- 微信未绑定账号 -->
			<div class="douyin_alert_main_b2"  id="douyin_alert_wx_html">
				
				<div class="douyin_alert_main_b_1">
					<img width="82.91px" height="72px" alt="" src="data:image/png;base64,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">
				</div>
				<div class="douyin_alert_main_b2_3">
					<div class="douyin_alert_main_b2_3_list">
						<img width="16px"  height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAQCAYAAADNo/U5AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADfSURBVHgB3ZKxbUIxEIa/My4oGYEFErxCNoAqKFU2SDZImCBkhHSvC0yQFZDSpAsjvBIQz8cdSIgCYaDkk6yz5Pvt890vGP2knTZ0KFDNZO5RnpKmpuGHM0TGvJUZyOOd/qtQo4yCWjyBBj7IEG3fDTCqfmVSemZ4r1N74C1wBbco8u6hSm+Y9LmUrA09jz4n5ULi7go+Zc24lKyRV4SXrUgCdfW385VjpXZz5nsVeJjMZO8SG27tdR1txAJqO5geCg7xP7lZk62ijYy+58Vli0G7YWyeSlJwuma+lpH3DbTuSqNLJq+ZAAAAAElFTkSuQmCC">
						<input type="text" type='number' id="inputMobile2" placeholder="请输入手机号" >
					</div>
					<div class="douyin_alert_main_b2_3_list">
						<img width="16px" height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADUryzEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFSSURBVHgBpVNBTsJQEH3TNlF3PULZK5Yb4AlkJeyUE6gnMJxAOAG4McQNPQKeACJxjzdgqSb94xuKSQNtFX3p5M//fTN/3v9/BAVoxRoeOVw5xanNBXiGj+l4LsttrmwvXNT1UhR9uqEI1gGqiDgsFbh9WkiS53v5SSfWiMEjZaDv0Bi/SM1MfNRsK36TzrE2SxNoiiFZy08PZ4+vMv9et9I/PDTorpj8rjCB6ebQpA2SuaywBVujpIFxNtzsDGxykGLCnSNkWlf0dxJkJcICQ6uS/pTSesFhinuWFVN7kiNWgtzQsWhKjtA+UaUNsSfade1b7PoMqO2thHRNuymsAplMr2oXSmmx3PMqSnWCX+DfCYKqn9T5oA7hnxOMFzLCDxCe8syuPfDQdSh5QLuINs8eATutx3GYpphhH/C1Mra7bmfrQpci9lCtN493H4n1xxe883t4etb+kAAAAABJRU5ErkJggg==">
						<input type="text" id="inputCode2" placeholder="请输入图形码">
						<div class="code captcha_code" >
							<div class="douyin_alert_loading" style="width: 14px;height: 14px;"></div>
						</div>
					</div>
					<div class="douyin_alert_main_b2_3_list" style="margin-top: 23px;">
						<img width="16px" height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADUryzEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFSSURBVHgBpVNBTsJQEH3TNlF3PULZK5Yb4AlkJeyUE6gnMJxAOAG4McQNPQKeACJxjzdgqSb94xuKSQNtFX3p5M//fTN/3v9/BAVoxRoeOVw5xanNBXiGj+l4LsttrmwvXNT1UhR9uqEI1gGqiDgsFbh9WkiS53v5SSfWiMEjZaDv0Bi/SM1MfNRsK36TzrE2SxNoiiFZy08PZ4+vMv9et9I/PDTorpj8rjCB6ebQpA2SuaywBVujpIFxNtzsDGxykGLCnSNkWlf0dxJkJcICQ6uS/pTSesFhinuWFVN7kiNWgtzQsWhKjtA+UaUNsSfade1b7PoMqO2thHRNuymsAplMr2oXSmmx3PMqSnWCX+DfCYKqn9T5oA7hnxOMFzLCDxCe8syuPfDQdSh5QLuINs8eATutx3GYpphhH/C1Mra7bmfrQpci9lCtN493H4n1xxe883t4etb+kAAAAABJRU5ErkJggg==">
						<input type="text" id="inputCodeWX" placeholder="请输入验证码">
						<div class="code" id="douyinAlertCode2">发送验证码</div>
					</div>
					<div class="douyin_alert_main_b2_3_list" style="margin-top: 23px;">
						<img width="16px" height="16px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADUryzEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFSSURBVHgBpVNBTsJQEH3TNlF3PULZK5Yb4AlkJeyUE6gnMJxAOAG4McQNPQKeACJxjzdgqSb94xuKSQNtFX3p5M//fTN/3v9/BAVoxRoeOVw5xanNBXiGj+l4LsttrmwvXNT1UhR9uqEI1gGqiDgsFbh9WkiS53v5SSfWiMEjZaDv0Bi/SM1MfNRsK36TzrE2SxNoiiFZy08PZ4+vMv9et9I/PDTorpj8rjCB6ebQpA2SuaywBVujpIFxNtzsDGxykGLCnSNkWlf0dxJkJcICQ6uS/pTSesFhinuWFVN7kiNWgtzQsWhKjtA+UaUNsSfade1b7PoMqO2thHRNuymsAplMr2oXSmmx3PMqSnWCX+DfCYKqn9T5oA7hnxOMFzLCDxCe8syuPfDQdSh5QLuINs8eATutx3GYpphhH/C1Mra7bmfrQpci9lCtN493H4n1xxe883t4etb+kAAAAABJRU5ErkJggg==">
						<input type="text" id="share_code" placeholder="请输入邀请码（选填）">
					</div>
					<div class="douyin_alert_main_b2_3_list4" id="douyin_alert_checkbox">
						<input type="checkbox" id="douyin_alert_checkbox_input">
						登录即表示您同意极客 <span><a href="https://www.dso100.com/draft/agreement_user.html" target="_blank" >用户协议</a></span> 与 <span><a href="https://www.dso100.com/draft/agreement_privacy.html" target="_blank">隐私协议</a></span>
					</div>
					<div class="douyin_alert_main_b2_3_list3" id="douyinAlertCodeBtnWX">
						绑定手机号
					</div>
				</div>
				<div class="douyin_alert_main_b_4">
					- 欢迎使用极客 -
				</div>
				<div class="douyin_alert_main_b_5">
					<img width="17px" height="17px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAASCAYAAAC9+TVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAHUSURBVHgBrVNdUhNBEO7ujcmCPOQIewPmCMkJTE4gnIBYSpVvkjfLUGVyAvAEwROIN5gbGE/gvESEzU779SargbABqviqpnZmp/vrn/maaQv0vcvKTUqBT3yos+MNxxPXXvyOR1F5gGN77WomrOeNXZncJbxFcoXIUug3cwbJpGC6SHIK1KAMho5Fj0iJYsLdnY9+tkHyn4B98yUd3pf+yuYztm6dSCoDXH4wytbI9+vqN6dmzocwC0mhZ/98qwj4HEThLj0AHvtQKL9BVZ2rd65TkhgBWKdUslOHHoGE477ZC3pUllilhUZ+VdKzir0O129dT5EP1hccnfmLpWXp7Zz6A9TqRR7IJsErEV+mIz+gYlmW3DEJ9ATIi6W90DOgYdETia+gVH8z1wzn73bx59iNmSCuCsz91id/oRHRRTNrqBbWYA6iykOsAQh+mU6i0Ln5aEJjNLtbreYuXdr/1mJ5D139sAabskvFljpZUJbukd82aBWuj/enCOhy5f7eyHuuMyz1EyNmhdvEGgqRSYppzuc6VabMhFnJvlFHspwRzmyW8Iw9nHs3c0w1U1gn2EqyQkDUn6w0s+gaeQh9jDcC1nnnxMPVkL+2r9Wfnm4SGP4CfWrpGSRmLyEAAAAASUVORK5CYII=">
					如遇问题请添加极客客服
					<div class="douyin_alert_main_b_5_back">
						<img width="140px" height="140px" alt="" src="data:image/jpeg;base64,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">
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="modal multiple-download-modal">
  <div class="modal-w">
      <div class="modal_main w550">
          <div class="modal-close">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAfCAYAAADwbH0HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAANOSURBVHgBrVfdUdtAEP7ubPysEpQKsB8zwUEHBcRUAKkAU4FNBUAFJBXgFMCcJw7Do00FUQmeCXkhti67upMty5IlAd+MRtLd6r69vf2TwCug9aOfflfqY4iaEFWELNHi1AABvbbp8nLExgbmh8TeqIoiYjfhJCCyASxhZQiIb0DjcpcCopj055WB6KeGxoJ2RAuOgZdQKTVfyz6QFZakpPiSVpIWHyrVvaxErPXUM/irAdNeE4K0745RAVpr36AxpKVP3dBMoHmS3b3IIZ0SqU+vc9rB5bE6uMYrQBbr0/d8TOQPIhT410lbSaaFDZ7vElKBhXotKUOpz9cCUvFavKZB8y49L9caTlZOxKSEGd4IpT7N1uQI7skKyZywpI+k0eI3P5N5Lt6y0zw4s18htmSzw+ftdrwcOD3CLCmfO1vDem4ZwUNb619X5GAbcc5mp9uYLi/CIt61ZCEK/LOYFuZrdrEl/nAsDw0ivYuc51iG1upHaPWy8xwZ7n7KnDJCo5fsNi9kGljyGJ+3V0SekMJ68EziZZSVcWvP7a5bPSkhD3nCxMlhGxwC7GxF5FlSChuVDps0yHLf+S6FOZTGJQoJM0YBisjrkDrqOFKMQZudy7eDYscH+eT1SHlzDReixpdYVZpmiBJkyeuQWrwkMp5EbbR8rKzE4EzX8lETRGxC+xh5ZcLZM0WJt2+j6buHueQwimlhAtQgZfPu8vY8RBDJ/Iy8Gk/8JAX265DymZaFWhYUOS508URxjDjYjTG9bKqzpJzHi723KrnNkLYIMafczCjN/raeCx8l3rvt7Us/K+MypJdkSOm2fsN3yqPn2wm+Sx2I7JSFDM8dqW6HZakojLJWo/GB5YiSnJ2YYW9qCzZGx6p7gncEVaxbW4hEeKQOPvCYTLRNKhNp0nNNwTuRTgZ51W+VQNikxpUuLoPvQW5JMXRrbjSMW13mvZ4Mhe2lWXgk0byo+6fgOppbOC9mUjq+YVomt69Ok1uh8gbdEk7JMZ/PiYijw7Ok+a3Ujoae++M97brOBOThnCojTjpzrAqM3HflNdiUXVwUNY2l/07UqJ0Z25wHqAb+47jJhlRt4rUC2idzB5xv6SNOr0m8c+NPXSNbodoPG+M/NwztcHuGDhwAAAAASUVORK5CYII=">
          </div>
          <div style="padding: 10px">
              <textarea name="video-items" placeholder="请输入抖音视频链接,单次最多100条&#10;格式如下:&#10;https://www.douyin.com/video/1111111111111111&#10;https://www.douyin.com/video/1111111111111111"></textarea>
          </div>
          <div class="flex p10">
                <div class="flex9">
                    <div class="flex" id="multiple-download-stat">
                        <div class="ml5">
                            总数：<span class="total">0</span>
                        </div>
                        <div class="ml10">
                            去重后：<span class="unique_after">0</span>
                        </div>
                        <div class="ml10">
                            已下载：<span class="success">0</span>
                        </div>
                        <div class="ml10">
                            下载耗时：<span class="spend_time">0</span>
                        </div>
                    </div>
                </div>
                <div class="flex3 batch-actions" style="display:flex;gap:8px;align-items:center;justify-content:flex-end;">
                    <button type="button" class="btn" id="multiple-download-btn">全部下载</button>
                    <button type="button" class="btn" id="multiple-download-select-btn">选择下载</button>
                </div>
                <div id="multiple-download-picker" hidden style="margin-top:12px;border-top:1px solid #eee;padding-top:12px;">
                    <label style="display:block;margin-bottom:8px;"><input type="checkbox" id="multiple-download-checkall" checked> 全选</label>
                    <div id="multiple-download-checklist" style="max-height:180px;overflow:auto;text-align:left;"></div>
                    <button type="button" class="btn" id="multiple-download-confirm-btn" style="margin-top:10px;">下载选中</button>
                </div>
          </div>
      </div>
  </div>
</div>

<!-- 转文案弹窗 -->

  <div class="douyin_alert_url" id="douyinAlertUrl_id">
    <div class="douyin_alert_url_w">
      <div class="douyin_alert_url_main">

        <div class="douyin_alert_url_w_t">
          <div>请输入抖音视频链接（单次最多支持转译100条）</div>
          <div class="del">✖️</div>
        </div>
        <div class="textarea">
          <textarea  name="video-top-items" placeholder="请输入视频链接格式,单次最多100条&#10;格式如下:&#10;https://www.douyin.com/video/1111111111111111&#10;https://www.douyin.com/video/1111111111111111"></textarea>
        </div>
        <div class="douyin_alert_url_b">
          <div>总数:0</div>
          <div>预计消耗次数:0</div>
          <div>剩余次数:0</div>
        </div>
        <div class="douyin_alert_url_b2">
          <div class="douyin_alert_url_b2_l">
            
          </div>
          <div class="btn" id="douyinAlertUrl_btn">
            <img class="img"  width="18px" height="18px" alt="" src="data:image/png;base64,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">
            立即提取
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- 转文案页面中弹窗 -->
    <div class="douyin_alert_copyWriters" id="douyin_alert_copyWritersId">
      <div class="douyin_alert_copyWriters_w">
        <div class="douyin_alert_copyWriters_main">
          <div class="douyin_alert_url_w_t">
            <div></div>
            <div class="copyWritersDel">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAfCAYAAADwbH0HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAANOSURBVHgBrVfdUdtAEP7ubPysEpQKsB8zwUEHBcRUAKkAU4FNBUAFJBXgFMCcJw7Do00FUQmeCXkhti67upMty5IlAd+MRtLd6r69vf2TwCug9aOfflfqY4iaEFWELNHi1AABvbbp8nLExgbmh8TeqIoiYjfhJCCyASxhZQiIb0DjcpcCopj055WB6KeGxoJ2RAuOgZdQKTVfyz6QFZakpPiSVpIWHyrVvaxErPXUM/irAdNeE4K0745RAVpr36AxpKVP3dBMoHmS3b3IIZ0SqU+vc9rB5bE6uMYrQBbr0/d8TOQPIhT410lbSaaFDZ7vElKBhXotKUOpz9cCUvFavKZB8y49L9caTlZOxKSEGd4IpT7N1uQI7skKyZywpI+k0eI3P5N5Lt6y0zw4s18htmSzw+ftdrwcOD3CLCmfO1vDem4ZwUNb619X5GAbcc5mp9uYLi/CIt61ZCEK/LOYFuZrdrEl/nAsDw0ivYuc51iG1upHaPWy8xwZ7n7KnDJCo5fsNi9kGljyGJ+3V0SekMJ68EziZZSVcWvP7a5bPSkhD3nCxMlhGxwC7GxF5FlSChuVDps0yHLf+S6FOZTGJQoJM0YBisjrkDrqOFKMQZudy7eDYscH+eT1SHlzDReixpdYVZpmiBJkyeuQWrwkMp5EbbR8rKzE4EzX8lETRGxC+xh5ZcLZM0WJt2+j6buHueQwimlhAtQgZfPu8vY8RBDJ/Iy8Gk/8JAX265DymZaFWhYUOS508URxjDjYjTG9bKqzpJzHi723KrnNkLYIMafczCjN/raeCx8l3rvt7Us/K+MypJdkSOm2fsN3yqPn2wm+Sx2I7JSFDM8dqW6HZakojLJWo/GB5YiSnJ2YYW9qCzZGx6p7gncEVaxbW4hEeKQOPvCYTLRNKhNp0nNNwTuRTgZ51W+VQNikxpUuLoPvQW5JMXRrbjSMW13mvZ4Mhe2lWXgk0byo+6fgOppbOC9mUjq+YVomt69Ok1uh8gbdEk7JMZ/PiYijw7Ok+a3Ujoae++M97brOBOThnCojTjpzrAqM3HflNdiUXVwUNY2l/07UqJ0Z25wHqAb+47jJhlRt4rUC2idzB5xv6SNOr0m8c+NPXSNbodoPG+M/NwztcHuGDhwAAAAASUVORK5CYII=">
            </div>
          </div>
          <div class="copyWritersTextarea">
            <textarea  name="video-view-items" placeholder=""></textarea>
          </div>
          <div class="douyin_alert_copyWriters_b">
            <div id="copyText">复制文案</div>
          <!--   <div>修改错别字</div> -->
            <div id="AIContent">Ai改写</div>
          </div>
          <!-- 请求中 -->
          <div class="rotate_loading_opyWritersRotate" id="copyWritersRotateLoading">
            <div class="rotate-loading"></div>
          </div>
          <!-- 无次数 -->
          <div class="CountAllCount" id="copyWritersCountAllCount">
            <div class="CountAllCount_main">
              <div>您的文案提取次数已用完，请至 <span  id="dso100pay2">会员购买</span> 进行升级。</div>
            </div>
          </div>
        </div>
      </div>
    </div>

   <!-- 加载动画 -->
    <div class="douyin_alert_rotate_loading" id="rotateLoadingId">
      <div class="douyin_alert_rotate_loading_w">
        <div class="rotate-loading"></div>
      </div>
    </div>
	  `)

        $('#root').on('mouseenter', '.douyin', async () => {
            let Token = T.getCookie('dosToken')
            if (Token && Token.token) {
                $('.douyin_bottom').show()
            }
        })
        $('#root').on('mouseleave', '.douyin', async () => {
            $('.douyin_bottom').hide()
        })
        $('#root').on('click', '.douyin_top', async () => {
            douyin_topFun()
        })

        // 关闭按钮
        $('.modal .modal-close').on('click', function () {
            $(this).parents('.modal').hide(300)
        })

        $('#root').on('click', '.multiple-download', async () => {
            $('.modal').show(300)
            renderDouyinBatchPicker($('[name=video-items]').val())
        })
        function renderDouyinBatchPicker(items) {
            const list = [...new Set(String(items || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean))]
            const box = document.getElementById('multiple-download-checklist')
            if (!box) return list
            box.replaceChildren()
            list.forEach((url, index) => {
                const label = document.createElement('label')
                label.style.cssText = 'display:block;padding:4px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
                const input = document.createElement('input')
                input.type = 'checkbox'
                input.checked = true
                input.dataset.url = url
                input.className = 'multiple-download-item-check'
                label.append(input, ` ${index + 1}. ${url}`)
                box.appendChild(label)
            })
            return list
        }
        $('body').on('input', '[name=video-items]', function () { renderDouyinBatchPicker(this.value) })
        $('body').on('click', '#multiple-download-select-btn', function () {
            renderDouyinBatchPicker($('[name=video-items]').val())
            $('#multiple-download-picker').prop('hidden', false)
        })
        $('body').on('change', '#multiple-download-checkall', function () {
            $('.multiple-download-item-check').prop('checked', this.checked)
        })
        $('body').on('click', '#multiple-download-confirm-btn', function () {
            const selected = $('.multiple-download-item-check:checked').map(function () { return this.dataset.url }).get()
            if (!selected.length) { T.showToast(2, '请至少选择一个链接'); return }
            $('[name=video-items]').val(selected.join('\n'))
            $('#multiple-download-picker').prop('hidden', true)
            $('#multiple-download-btn').trigger('click')
        })

        let multiple_download_flag = false
        $('#multiple-download-btn').click(async function () {
            if (multiple_download_flag || (T.downloadState && T.downloadState.active)) {
                T.downloadStatusUpdate({ phase: '已有下载任务进行中' })
                return false
            }
            multiple_download_flag = true
            const start_time = Date.now()
            const rawItems = $('[name=video-items]').val() || ''
            const rawList = rawItems.split(/\r?\n/).map(item => item.trim()).filter(Boolean)
            const list = [...new Set(rawList)]
            if (!list.length) {
                multiple_download_flag = false
                T.showToast(2, '请先输入要下载的抖音链接')
                return false
            }
            const obj = $('#multiple-download-stat')
            obj.find('.spend_time').text(0)
            obj.find('.success').text(0)
            obj.find('.total').text(rawList.length)
            obj.find('.unique_after').text(list.length)
            T.downloadStatusStart(list.length, '正在解析下载地址')
            let processed = 0
            let apiFailed = 0
            T.downloadStatusUpdate({ phase: `正在解析下载地址 0/${list.length}` })

            const results = await Promise.all(list.map(url => new Promise(resolve => {
                $.ajax({
                    url: 'https://pythonapi.yinliu.club/douyin_video_download_url/',
                    type: 'post',
                    timeout: 15000,
                    data: { token: '6auY6Ziz5piv5LiW55WM5LiK5pyA5Y6J5a6z55qE54is6Jmr5bel56iL5biI', video_url: url },
                    success: function (res) {
                        const data = res && res.data || {}
                        const item = data.title && data.url_download ? { name: data.title, url: data.url_download } : null
                        if (!item) apiFailed++
                        processed++
                        T.downloadStatusUpdate({ phase: `正在解析下载地址 ${processed}/${list.length}`, done: processed, failed: apiFailed })
                        resolve(item)
                    },
                    error: function () {
                        apiFailed++
                        processed++
                        T.downloadStatusUpdate({ phase: `正在解析下载地址 ${processed}/${list.length}`, done: processed, failed: apiFailed })
                        resolve(null)
                    }
                })
            })))
            const validUrls = results.filter(Boolean)
            if (!validUrls.length) {
                multiple_download_flag = false
                T.downloadStatusFail('没有解析到可下载地址')
                T.showToast(2, '没有解析到可下载地址')
                return false
            }
            // 解析阶段的失败数保留在状态面板，下载阶段只处理一次串行队列。
            T.downloadState.failed = apiFailed
            await send(validUrls, true)
            obj.find('.success').text(validUrls.length)
            obj.find('.spend_time').text(`${parseInt((Date.now() - start_time) / 1000)}s`)
            multiple_download_flag = false
        })


        function douyin_topFun() {
            let Token = T.getCookie('dosToken')
            //// console.log(Token)
            if (Token && Token.token) {
                T.goUrl('https://dso100.com/')
                return
            }
            $('#douyin_alert_img_html').show()
            $('#douyin_alert_code_html').hide()
            $('#douyin_alert_wx_html').hide()
            $('.douyin_alert').show(300)
            $(' .douyin_alert_main_b_3 .codeImg').html(`
            <div class="douyin_alert_loading"></div>
            `)
            setTimeout(() => {
                getTicket()
            }, 300)

        }

        $('.douyin_alert_main_t,.douyin_alert_main_back').click(() => {
            $('.douyin_alert').hide(300)
            clearInterval(loginTimer)
        })
        $('#douyin_alert_img').click(() => {
            clearInterval(loginTimer)
            $('#douyin_alert_img_html').hide()
            $('#douyin_alert_code_html').show()
        })
        $('#douyin_alert_code').click(() => {
            clearInterval(loginTimer)
            $('#douyin_alert_img_html').show()
            $('#douyin_alert_code_html').hide()
            $(' .douyin_alert_main_b_3 .codeImg').html(`
            <div class="douyin_alert_loading"></div>
                           `)
            setTimeout(() => {
                getTicket()
            }, 300)
        })
        let scene_id
        /**
         * 微信绑定手机号
         */
        $('#douyin_alert_checkbox,#douyin_alert_checkbox_input').on('click', function () {
            var checkbox = $('#douyin_alert_checkbox_input')
            if (checkbox.prop('checked')) {
                checkbox.prop('checked', false)
            } else {
                checkbox.prop('checked', true)
            }
            //// console.log(checkbox.prop('checked'));
        })

        // 绑定方式
        function userIndexCheckMobile(from) {
            return new Promise(async (resolve, reject) => {
                T.postFun('user/index/checkMobile', from, (res) => {
                    resolve(res)
                })
            })
        }

        $('.douyin_alert').on('click', '#douyinAlertCodeBtnWX', async () => {
            var isChecked = $('#douyin_alert_checkbox_input').prop('checked')

            // if (isChecked) {
            let mobile = $('#inputMobile2').val()
            let isLoginBind
            let resCheckMobile = await userIndexCheckMobile({ mobile })
            if (resCheckMobile && resCheckMobile.code) {
                isLoginBind = true
            } else {
                isLoginBind = false
            }
            if (isLoginBind) {
                // 登陆绑定
                const obj = {
                    mobile: $('#inputMobile2').val(),
                    code: $('#inputCodeWX').val(),
                    type: '1',
                    scene_id: scene_id,
                    _t_: T.generateUUID(),
                }

                T.postFun('user/index/login', obj, (res) => {
                    //// console.log(res)
                    if (res && res.data && res.data.token) {
                        T.showToast(1, '登录成功')
                        T.setCookie('dosToken', res.data)
                        $('.douyin_alert_main_t').trigger('click')
                    } else {
                        T.showToast(2, res.msg)
                    }
                })
            } else {
                // 注册绑定
                let share_code = $('#share_code').val()
                const obj = {
                    mobile: $('#inputMobile2').val(),
                    code: $('#inputCodeWX').val(),
                    verify: $('#inputCode2').val(),
                    scene_id: scene_id,
                    invite: share_code,
                    _t_: T.generateUUID(),
                }
                T.postFun('Register/add', obj, (res) => {
                    //// console.log(res)
                    if (res && res.data && res.data.token) {
                        T.showToast(1, '登录成功')
                        T.setCookie('dosToken', res.data)

                        $('.douyin_alert_main_t').trigger('click')
                    } else {
                        getRegisterCaptcha()
                        T.showToast(2, res.msg)
                    }
                })

            }

            // } else {
            //   T.showToast(2, '不同意用户协议与隐私协议，您将无法使用极客哟')
            // }
        })

        //    动态码
        function getRegisterCaptcha() {
            const obj = {
                _t_: T.generateUUID(),
                // responseType: 'blob'
            }
            T.getFun('overt/captcha', obj, (res, getUrl) => {
                $('.captcha_code').html(`
                    <img src="${getUrl}" alt="">
                `)
            })
        }

        $('.captcha_code').click(() => {
            $('.captcha_code').html(`
            <div class="douyin_alert_loading" style="width: 14px;height: 14px;"></div>
            `)
            getRegisterCaptcha()
        })
        // 倒计时
        let texts2, timer2

        function countDown2(num) {
            texts = num
            timer = setInterval(() => {
                if (texts === 0) {
                    clearInterval(timer)
                    $('#douyinAlertCode2').html('重新发送')
                } else {
                    texts--
                    $('#douyinAlertCode2').html(texts + 's')
                }
            }, 1000)
        }

        $('#douyinAlertCode2').click(async () => {
            let html = $('#douyinAlertCode2').html()
            let mobile = $('#inputMobile2').val()
            let inputCode2 = $('#inputCode2').val()
            let share_code = $('#share_code').val()
            if (!mobile) {
                T.showToast(2, '请输入正确手机号')
                return
            }
            if (!inputCode2) {
                T.showToast(2, '请输入条形码')
                return
            }
            if ((html == '发送验证码' || html == '重新发送') && mobile) {
                const resToken = await sendSmsCode({
                    mobile,
                    scene: 'register',
                    verify: inputCode2,
                    _t_: T.generateUUID(),
                    share_code: share_code,
                })
                //// console.log(resToken)

                if (resToken.code == 0) {
                    T.showToast(1, '发送成功')
                    countDown2(60)
                } else {
                    T.showToast(2, resToken.msg)
                }
            }
        })

        function sendSmsCode(from) {
            return new Promise(async (resolve, reject) => {
                T.postFun('overt/sendSmsCode', from, (res) => {
                    resolve(res)
                })
            })
        }

        /**
         * 微信扫码登录
         */
        //  二维码
        function getTicket() {
            T.postFun('WeiXin/getTicket', { status: 1 }, (res) => {
                scene_id = res.data.scene_id
                qrCodeResult()
                $(' .douyin_alert_main_b_3 .codeImg').html(`
               <img src="${res.data.url}" alt="">
               <div class="qrcode_line"></div>
               `)
            })
        }

        // 校验验证码
        let loginTimer

        function qrCodeResult() {
            // 轮询调用postCheckLogin校验
            postCheckLogin()
            clearInterval(loginTimer)
            loginTimer = setInterval(() => {
                postCheckLogin()
            }, 2000)
        }

        function postCheckLogin() {
            T.postFun('WeiXin/checkLogin', { scene_id: scene_id }, (res) => {
                if (res.code == '3003' || res.gotoBind) {
                    clearInterval(loginTimer)
                    getRegisterCaptcha()
                    // 未绑定完成需要绑定
                    $('#douyin_alert_wx_html').show()
                    $('#douyin_alert_img_html').hide()
                    $('#douyin_alert_code_html').hide()
                }
                if (res && res.data && res.data.token) {
                    T.showToast(1, '登录成功')
                    T.setCookie('dosToken', res.data)

                    $('.douyin_alert_main_t').trigger('click')
                }
            })
        }

        /**
         * 验证码登录
         * */
        $('.douyin_alert').on('click', '#douyinAlertCodeBtn', async () => {
            let mobile = $('#inputMobile').val()
            let code = $('#inputCode').val()
            T.postFun('user/index/login', {
                mobile,
                code,
                type: 1,
            }, (res) => {
                if (res && res.data && res.data.token) {
                    T.showToast(1, '登录成功')
                    T.setCookie('dosToken', res.data)

                    $('.douyin_alert_main_t').trigger('click')
                } else {
                    T.showToast(2, res.msg)
                }
            })
        })

        // 发送验证码
        function smsToken(mobile) {
            return new Promise((resolve, reject) => {
                T.postFun('Syscommon/smsToken', { mobile: mobile }, (res) => {
                    resolve(res.data)
                })
            })
        }

        function sendSms(mobile) {
            return new Promise(async (resolve, reject) => {
                const resToken = await smsToken(mobile)
                T.postFun('Syscommon/sendSms', {
                    mobile: mobile,
                    sms_token: resToken.sms_token,
                }, (res) => {
                    resolve(res)
                })
            })
        }

        // 倒计时
        let texts, timer

        function countDown(num) {
            texts = num
            timer = setInterval(() => {
                if (texts === 0) {
                    clearInterval(timer)
                    $('#douyinAlertCode').html('重新发送')
                } else {
                    texts--
                    $('#douyinAlertCode').html(texts + 's')
                }
            }, 1000)
        }

        $('#douyinAlertCode').click(async () => {
            let html = $('#douyinAlertCode').html()
            let mobile = $('#inputMobile').val()
            if (!mobile) {
                T.showToast(2, '请输入正确手机号')
                return
            }
            if ((html == '发送验证码' || html == '重新发送') && mobile) {
                const resToken = await sendSms(mobile)
                if (resToken.status == 200) {
                    T.showToast(1, resToken.msg)
                    countDown(60)
                } else {
                    T.showToast(2, resToken.msg)
                }
            }
        })


        // 转文案弹窗
        $('body').on('click', '.bodyDouyinAlertUrl', function () {
            let Token = T.getCookie('dosToken')
            if (Token && Token.token) {
                // T.showToast(2, '请稍后')
                $('#rotateLoadingId').show()
                setTimeout(() => {
                    postFunTextCount(0, () => {
                        $('#rotateLoadingId').hide()
                        $('#douyinAlertUrl_id').show()
                        videoTopItems = setInterval(() => {
                            videoTopItemsFun()
                        }, 500)
                    })
                }, 0)


            } else {
                douyin_topFun()
            }
        })

        // 计算用户输入次数
        function videoTopItemsFun(params) {
            let items = $('[name=video-top-items]').val()
            let total = 0
            if (items) {
                items = items.split('\n')
            }
            let list = []

            for (let i in items) {
                if (items[i] === '') {
                    continue
                }
                total++
                if (list.indexOf(items[i]) >= 0) {
                    continue
                }
                list.push(items[i])
            }
            $('.consumeTotal').html(`${total}`)
            $('.consumeTotal').attr('data-total', JSON.stringify(list))
        }

        function postFunTextCount(predictToday, success) {
            let from = {}
            T.postFun('DouyinVideoText/searchToTextCount', from, (res) => {
                // console.log('----res----')
                // console.log(res)
                // `<div class="div1"> 预计本次消耗2次，提取文案次数剩余499次</div>
                //   <div>若次数不足，可 <span>充值次数</span> 进行提取</div>`
                // <span class="resToday"> </span>
                $('.douyin_alert_url_b').html(`
          <div>总数:<span class="resToday">${res.data.today}</span></div>
          <div>预计消耗次数:<span class="consumeTotal">${predictToday} </span></div>
          <div>剩余次数:<span class="resCount">${res.data.count} </span></div>
          `)
                success()
            })
        }

        $('body').on('click', '#douyinAlertUrl_id .del', function () {
            // console.log('关闭')
            $('#douyinAlertUrl_id').hide()
            clearInterval(videoTopItems)
        })
        // 提取次数
        $('body').on('click', '#douyinAlertUrl_btn', function () {
            let resToday = $('.resToday').html()
            let consumeTotal = $('.consumeTotal').html()
            let list = $('.consumeTotal').attr('data-total')
            let resCount = $('.resCount').html()

            let html = ''
            if (resCount > consumeTotal) {
                html = `
        <div class="div1">后台已经开始执行提取文案操作</div>
        <div>请至 <span id="copyWriters">文案提取</span>进行查看</div>
        `

                videosToText(JSON.parse(list))
            } else {
                html = `
        <div class="div1">您的文案提取剩余次数为:${resCount},小于需要提取的文案数量</div>
        <div>请至<span id="dso100pay">会员购买</span>进行升级</div>
        `
            }

            $('.douyin_alert_url_b2_l').html(html)


        })

        function videosToText(checkedExtractList) {
            let from = {
                video_ids: checkedExtractList.join('\n')
            }
            T.postFun('DouyinVideoText/videosToText', from, (res) => {
                if (res.status != 200) {
                    T.showToast(2, res.msg)
                }
                postFunTextCount(checkedExtractList.length)
            })
        }

        $('body').on('click', '#copyWriters', function () {
            T.goUrl(`https://dso100.com/copyWriters?isBatch=false&source=chrome`)
        })
        $('body').on('click', '#dso100pay', function () {
            T.goUrl(`https://dso100.com/pay`)
        })

        /**
         *
         */
        $('body').on('click', '.douyinAlertUrl', function () {
            let Token = T.getCookie('dosToken')
            if (Token && Token.token) {
                $('#douyin_alert_copyWritersId').show()
                $('#copyWritersRotateLoading').show()
                $('#copyWritersCountAllCount').hide()
                let dataType = $(this).attr('data-type')
                let videoId = ''
                // console.log('dataType')
                // console.log(dataType)
                if (dataType == 'videoInfo') {
                    let douyinUrl = window.location.href
                    videoId = extractDouyinVideoId(douyinUrl)
                }
                if (dataType == 'index') {
                    let $videoId = $(this).parent().parent().parent().find('#sliderVideo')
                    videoId = $videoId.attr('data-e2e-vid')
                }
                if (dataType == 'videoId' || dataType == 'discover') {

                    const href = $(this).parent().parent().find('.KF3T893E').attr('href')
                    videoId = getUrlParameter('modal_id') || (getBaseUrlLastId(href.indexOf('http') > -1 ? href : 'https:' + href))
                    if (!videoId) {
                        // 兼容首页
                        videoId = $(this).parent().parent().attr('id')
                    }
                }
                // 搜索列表-上方单个
                if (dataType == 'search') {

                    videoId = $(this).parent().parent().find('[data-e2e-vid]').attr('data-e2e-vid')

                }


                setTimeout(async () => {
                    if (videoId) {
                        let CountAll = await postFunTextCountAll()
                        if (CountAll.count > 0) {
                            videoTextFun(videoId)
                        } else {
                            $('#copyWritersCountAllCount').show()
                            $('#copyWritersRotateLoading').hide()
                        }

                    } else {
                        T.showToast(2, '未检测到视频链接')
                    }
                }, 200)

            } else {
                douyin_topFun()
            }
        })
        //保存so100
        $('body').on('click', '.xhsSaveSo', async function (event) {
            event.stopPropagation()
            event.preventDefault()
            let Token = T.getCookie('dosToken')
            if (Token && Token.token) {
                T.getFun2('folder/person/getList', {}, (res) => {
                    console.log(res)
                    if (res && res.data) {
                        const href = window.location.href
                        let dataType = $(this).attr('data-type')
                        console.log(dataType)
                        let videoId = ''
                        // console.log('dataType')
                        // console.log(dataType)
                        if (dataType == 'videoInfo') {
                            let douyinUrl = window.location.href
                            videoId = extractDouyinVideoId(douyinUrl)
                        }
                        if (dataType == 'index') {
                            let $videoId = $(this).parent().parent().parent().find('#sliderVideo')
                            videoId = $videoId.attr('data-e2e-vid')
                        }
                        if (dataType == 'videoId' || dataType == 'discover') {

                            const href = $(this).parent().parent().find('.KF3T893E').attr('href')
                            videoId = getUrlParameter('modal_id') || (getBaseUrlLastId(href.indexOf('http') > -1 ? href : 'https:' + href))
                            if (!videoId) {
                                // 兼容首页
                                videoId = $(this).parent().parent().attr('id')
                            }
                        }
                        // 搜索列表-上方单个
                        if (dataType == 'search') {

                            videoId = $(this).parent().parent().find('[data-e2e-vid]').attr('data-e2e-vid')

                        }
                        console.log({ 'folder_id': res.data[0].id, 'platform': 'douyin', 'material_id': videoId, 'material_type': '2', 'url': '' })
                        T.postFun3('material/personal/join', { 'folder_id': res.data[0].id, 'platform': 'douyin', 'material_id': videoId, 'material_type': '2', 'url': '' }, (res2) => {
                            console.log(res2)
                            if (res2 && res2.code == 0) {
                                T.showToast(1, '收藏成功')
                            } else {
                                T.showToast(2, res2.msg)
                            }
                        }), (err) => {
                            console.log('错误了')
                        }


                    } else {
                        T.showToast(2, res.msg)
                    }
                }), (err) => {
                    console.log('错误了')
                }

            } else {
                douyin_topFun()
            }
        })

        // https://www.douyin.com/video/7397032934542281984
        function extractDouyinVideoId(url) {
            // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
            var regex = /\/video\/(\d+)/;
            var match = url.match(regex);

            if (match && match[1]) {
                return match[1]; // 返回匹配到的第一个分组，即视频ID部分
            } else {
                return null; // 如果未匹配到，则返回null或者可以抛出错误
            }
        }
        function extractDouyinVideoId2(url) {
            // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
            var regex = /\/video\/([A-Za-z0-9]+)/;
            var match = url.match(regex);

            if (match && match[1]) {
                return match[1]; // 返回匹配到的第一个分组，即视频ID部分
            } else {
                return null; // 如果未匹配到，则返回null或者可以抛出错误
            }
        }

        $('body').on('click', '#douyin_alert_copyWritersId .copyWritersDel', function () {
            $('[name=video-view-items]').val('')
            $('#douyin_alert_copyWritersId').hide()

        })

        function postFunTextCountAll() {
            return new Promise((resolve, reject) => {
                let from = {}
                T.postFun('DouyinVideoText/searchToTextCount', from, (res) => {
                    resolve(res.data)
                })
            })
        }

        function videoTextFun(params, num = 1) {
            let from = {
                video_url: `https://www.douyin.com/discover?modal_id=${params}`
            }
            T.postFun('DouyinVideoOcr/videoText', from, (res) => {
                // console.log('----res----')
                // console.log(res)
                if (res.status != 200) {


                    if (res.status == 413) {
                        $('#copyWritersCountAllCount').show()
                        $('#copyWritersRotateLoading').hide()
                    } else {
                        T.showToast(2, res.msg)
                        $('#copyWritersRotateLoading').hide()
                    }
                    return
                }
                if (res.data.ret_video_text) {
                    $('[name=video-view-items]').val(res.data.ret_video_text)
                    $('#copyWritersRotateLoading').hide()
                } else {
                    if (num == 1) {
                        videoTextFun(params, 2)
                    } else {
                        $('#copyWritersRotateLoading').hide()
                        T.showToast(2, '转换失败,请重试')
                    }

                }
            }, (err) => {
                // console.log('---err---')
                // console.log(err)
            })
        }

        $('body').on('click', '#douyin_alert_copyWritersId #copyText', function () {

            var textToCopy = $('[name=video-view-items]').val()
            var copied = copyTextToClipboard(textToCopy);

            if (copied) {
                T.showToast(1, '文本已成功复制到剪贴板')
            } else {
                T.showToast(2, '复制文本到剪贴板失败')
            }
        })

        // 复制文案
        function copyTextToClipboard(text) {
            var textArea = document.createElement('textarea');

            // 设置文本域的值，并将其隐藏
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.top = 0;
            textArea.style.left = 0;
            textArea.style.width = '2em';
            textArea.style.height = '2em';
            textArea.style.padding = 0;
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';
            textArea.style.background = 'transparent';

            document.body.appendChild(textArea);

            // 选中文本并复制到剪贴板
            textArea.select();
            var success = document.execCommand('copy');

            document.body.removeChild(textArea);

            return success;
        }

        // Ai改写
        $('body').on('click', '#AIContent', function () {
            var textToCopy = $('[name=video-view-items]').val()
            T.goUrl(`https://dso100.com/DouyinVideoOcr?content=${textToCopy}`)
        })

        $('body').on('click', '#dso100pay2', function () {
            T.goUrl(`https://dso100.com/pay`)
        })

    }, 3000)
}

function modal_idUrlFun(video_url) {
    return new Promise(async (resolve, reject) => {
        let from = {
            // video_url: `https://www.douyin.com/discover?modal_id=${video_url}`
            video_url: `https://www.douyin.com/note/${video_url}`
        }
        console.log(from)
        T.postFun('DouyinTopic/videoInfo', from, (res) => {
            console.log('----res----')
            console.log(res)
            if (res.status == '411') {
                let obj = {
                    status: '411',
                }
                resolve(obj)
            }
            let obj = {
                name: '',
                url: ''
            }
            let url = ''
            if ((res && res.data && res.data.info) || (res && res.data && res.data.info_list)) {
                let { title = '', nickname = '', info = '', images = [], info_list = [] } = res.data
                if (JSON.stringify(res.data.info) !== '[]') {
                    obj = {
                        name: title || nickname,
                        url: info,
                        images: images
                    }
                } else if (info_list.length > 0) {
                    obj = {
                        name: title || nickname,
                        url: info_list[0],
                        images: images
                    }
                }
            }
            resolve(obj)
        })
    })
}

function get() {
    msToken = getcookie('msToken')
    url1 = 'device_platform=webapp&aid=6383&channel=channel_pc_web&sec_user_id=' +
        userId + '&max_cursor=' + max_cursor +
        '&locate_query=false&show_live_replay_strategy=1&count=18&publish_video_strategy_type=2&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1646&screen_height=1029&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=114.0.0.0&browser_online=true&engine_name=Blink&engine_version=114.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=100&webid=' +
        webid + '&msToken=' + msToken
    Bogus = window.get_nn(url1, undefined)
    $.ajax({
        type: 'get',
        url: 'https://www.douyin.com/aweme/v1/web/aweme/post/?' + url1 +
            '&X-Bogus=' + Bogus,
        async: true,
        timeout: 15000,
        success: function (res) {
            max_cursor = res.max_cursor
            $('#start').text('采集中...')
            var aweme_list = res.aweme_list
            var has_more = res.has_more

            console.log(aweme_list)
            if (aweme_list.length !== 0) {
                for (var i = 0; i < aweme_list.length; i++) {
                    if (typeof aweme_list[i]['video']['play_addr']['url_list'] ==
                        undefined) {
                        continue
                    }
                    url_list = aweme_list[i]['video']['play_addr']['url_list']
                    feeds.push({ 'name': aweme_list[i]['desc'], 'url': url_list[0] })

                    var aweme_type = aweme_list[i]['aweme_type']
                    if (aweme_type === 68) {
                        ajaxImgGet20250212(aweme_list[i]['desc'], aweme_list[i]['images'][0]['download_url_list'])
                    }
                    if (feeds.length == $('#number').val()) {
                        has_more = 0
                        break
                    }
                }
                if (has_more === 0) {
                    $('#start').text('确认并下载')
                    console.log(feeds)
                    $('.douyinDownload_bottom').hide()
                    T.showToast(1, '采集完成 浏览器正在下载 请注意查看进度')
                    send(feeds)
                    return false
                }

            } else {
                //// console.log('当前时间段为空,抖音告诉我还有更多,那继续查询下个时间段');
            }

            setTimeout(function () {
                get()
            }, 1000)
        },
    })


}

// 获取指定名称的cookie的值
function getcookie(objname) {
    var arrstr = document.cookie.split('; ')
    for (var i = 0; i < arrstr.length; i++) {
        var temp = arrstr[i].split('=')
        if (temp[0] == objname) return unescape(temp[1])
    }
}

// 批量下载视频
function multipleDownload() {
    $('.modal').show(300)
}
