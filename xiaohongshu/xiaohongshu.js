let videoObj = {}
let xhsDownloadIndex = 1
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // //// console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension");
    if (request.downloadProgress) {
        const progress = request.downloadProgress
        T.downloadStatusHandleProgress(progress)
        if (!progress.ok) T.showToast(2, `下载失败：${progress.error || '浏览器拒绝下载'}`)
        sendResponse('收到下载进度')
        return
    }
    if (!request.videoData || !request.videoData.url) {
        sendResponse('忽略无效媒体消息')
        return
    }
    let obj = extractVidFromDouyinUrl(request.videoData.url)
    if (!videoObj[obj.id]) {
        videoObj[obj.id] = []
    }
    videoObj[obj.id].push(obj.url)
    // console.log('---videoObj---')
    // console.log(videoObj)
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
        // console.log('chromeToken')
        // console.log(response.token)
        if (response && response.token) {
            T.setCookie('dosToken', JSON.parse(response.token))
        } else {
            T.setCookie('dosToken', '')
        }
    })
}

chromeToken()

let videoTopItems
let setInt

function convertToHTTPS(url) {
    if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
    }
    return url;  // 如果链接已经是 HTTPS，直接返回原链接
}

async function ajaxGet(url, name) {
    if (!url) return false
    return T.enqueueDownloads([{ url: convertToHTTPS(url), name, ext: 'mp4' }], { mode: 'background', adoptActive: true }) > 0
}
async function ajaxGetExcel(url, name) {
    // console.log(url,name)
    try {
        const blob = await T.fetchBlob(convertToHTTPS(url));
        T.saveBlob(blob, name, 'xlsx');
        // console.log('视频下载完成');
    } catch (error) {
        T.showToast(2, `导出失败：${error.message || '网络错误'}`);
    }
}

/**
 *
 * @param {*} name 文件名称
 * @param {*} imgURLs 图片地址数组
 * @param {*} spanContent 文本内容
 */
async function ajaxImgGet(name, imgURLs, spanContent) {
    const list = Array.isArray(imgURLs) ? imgURLs : []
    return T.enqueueDownloads(list.map((url, index) => ({
        url: convertToHTTPS(url), name: `${name || '图片'}_${index + 1}`, ext: 'jpg'
    })), { mode: 'background', adoptActive: true })
}

async function ajaxImgGet2(name, imgURLs, spanContent) {
    return ajaxImgGet(name, imgURLs, spanContent)
}

/**
 * 搜索结果页
 */
function search_resultFun(params) {
    let elem = `#global .feeds-container .note-item`;
    $(elem).not(':has(.douyinDownload)').each(function () {

        let playIcon = $(this).find('.play-icon')

        $(this).prepend(`
          <div class="douyinDownload data-position="popup-video-detail">
              <div>
              <!-- 
              <div class="douyinDownload_top douyinAlertUrl"  data-type="videoId">
                  <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
                  <span>转文字</span>
              </div>
              -->
              <div class="setIntIdClick-wrap">
                <div class="douyinDownload_top setIntIdClick">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>下载</span>
                </div>
                </div>
              </div>
          </div>
      `)
    })
    let elemAll = `#global #userPageContainer .reds-sticky .tertiary`;
    $(elemAll).not(':has(.douyinDownload)').each(function () {

        $(this).prepend(`
          <div class="douyinDownload douyinDownloadALL data-position="popup-video-detail">
              <div>
                <div class="douyinDownload_top setIntIdALLClick">
                    <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                    <span>全部下载</span>
                </div>
              </div>
          </div>
          <div class="douyinDownload douyinDownloadDetailALLExcel data-position="popup-video-detail">
              <div>
                <div class="douyinDownload_top setPersonDetailALLClickExcel">
                    
                    <span>统计作品数据</span>
                </div>
              </div>
          </div>
      `)
    })

    let elemAllExcel = `#global .channel-container .channel-scroll-container .content-container`;
    // let elemAllExcel = `#global .feeds-page`;
    $(elemAllExcel).not(':has(.douyinDownloadALLExcel)').each(function () {

        $(this).prepend(`
          <div class="douyinDownloadALLExcel data-position="popup-video-detail">
              <div>
                <div class="douyinDownload_top_2 setHomeALLClickExcel">
                    
                    <span>统计数据</span>
                </div>
              </div>
          </div>
      `)
    })

    let elemAllSortExcel = `#global .feeds-page .search-layout__top`;
    $(elemAllSortExcel).not(':has(.douyinDownloadALLExcel2)').each(function () {

        $(this).prepend(`
          <div class="douyinDownloadALLExcel2 data-position="popup-video-detail">
              <div>
                <div class="douyinDownload_top_2 setHomeALLClickExcel">
                    
                    <span>统计数据</span>
                </div>
              </div>
          </div>
      `)
    })
}

/**
 *
 *  详情页
 */
function exploreFun() {
    let elem = `#noteContainer .media-container`;
    // console.log(elem)
    $(elem).not(':has(.douyinDownload2)').each(async function () {

        let playIcon = $(this).find('video')
        let liveControlContainer = $(this).find('.live-control-container .live-text').text()
        let htmlText = ''
        let url = window.location.href
        let typeValue = await getUrlFunPromise(url)
        if ((playIcon.length > 0 && liveControlContainer != 'LIVE') || typeValue == 'video') {
            htmlText = `
      <div class="douyinDownload_top3 douyinAlertUrl"  data-type="videoId">
              <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGnSURBVHgB7VTtUcJAEH2bBCb8Mh1IB6YDsQKwArACsQIpASpg7EAr0A4MFUAH5AdjkmOSdTcGZPAC6PjHGd/MDcvN5u3b2w/gHzYwc7DO+N5k/JqlvJTDasuZrhPuHPrWsV2alG9NhjkzOnmBJxBuCsZVkeNB7oKC8KzkScJtnAJVp8rSlId1PkomPvMs4RGOQZwHmuZqxSF+Cxo9sUTXYOkbP+JEeLsf6m+rRaNtkIx78oZtknckB2dGM/DQb/p0d4h0WyjHwSUXmKmt6Sda4QKhOHQ3PrmLkIGevqmpRCi0U6ykpIoIkdoNF0PXQR/16bWZMN1kI52yNOazDltSURBKiuf4IfIc8U7QSqmDq0YDC7ULYJSvEYjino3A8xEZg+vSt0AgTxe3fFp8IW02KdrYUqzSQd4uICCWE1RqIvIwISJVVXaD1oIq+1vQztAJstzrEHByZGxL7FezJlA5VTJ542O+0CpqdB3XOh9dKEqoC8YmgGpUDBxCSSpt9iKLZCb/Y7i40N6VTunImfg+WfeDlXSPvEvalx/FimRbzXwf46pYfxzvK4IBw62KzMwAAAAASUVORK5CYII=">
              <span>转文字</span>
          </div>
      `
        } else {
            htmlText = `
      <div class="douyinDownload_top3 more_z xhsAiAlertUrl" id="show-tooltip" data-type="videoId">
              
              <span>AI生图</span>
          </div>
      `
        }

        $(this).prepend(`
      <div class="douyinDownload2 data-position="popup-video-detail">
          <div>
          <div class="douyinDownload_top3 more_z xhsSaveSo" id="show-tooltip2" data-type="videoId">
              
              <span>收藏</span>
          </div>
            <div class='space_view'></div>
          ${htmlText}
            <div class="douyinDownload_top3 setIntIdClickUrl">
                <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                <span>下载</span>
            </div>
          </div>
      </div>
  `)
        $(this).prepend(`
    <div id="tooltip" class="tooltip">这是一个提示框！</div>
`)


        let elemAllPost = `#noteContainer .interaction-container .note-scroller`;
        $(elemAllPost).not(':has(.douyinDownload2)').each(function () {

            $(this).prepend(`
          <div class="douyinDownloadALLPostExcel data-position="popup-video-detail">
              <div>
                <div class="douyinDownload_bottom_post setPersonALLClickPostExcel">
                    
                    <span>下载评论</span>
                </div>
              </div>
          </div>
      `)
        })
    })

    setTimeout(function () {
        $('#show-tooltip').hover(
            function () {
                // 获取提示框内容
                const tooltipText = '点击后可获取图片中的文字，并带上文字跳转到HSO100图片制作系统，使用文字重新进行图片制作'//$(this).attr('data-tooltip');

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
    setTimeout(function () {
        $('#show-tooltip2').hover(
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
}

function getUrlFunPromise(url) {
    return new Promise((resolve, reject) => {
        T.getUrlFun(url, {}, async (res) => {
            var regex = /<meta\s+name="og:video"\s+content="([^"]*)"/;
            var match = res.match(regex);
            if (match) {
                resolve('video')
            } else {
                resolve('img')
            }
        })
    })
}

//
function timeoutInit(params) {
    console.log('这里')
    clearInterval(setInt)
    setInt = setInterval(() => {
        // 搜索结果页 发现  达人页
        let url = window.location.href
        if (
            url.indexOf('xiaohongshu.com/search_result') > -1 ||
            url.indexOf('xiaohongshu.com/explore') > -1 ||
            url.indexOf('xiaohongshu.com/user/profile') > -1
        ) {
            search_resultFun()
        }
        // 详情页
        if (url.indexOf('xiaohongshu.com/explore') > -1) {
            exploreFun()
        }



    }, 1000)



    /**
     *  转文字
     */
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

    $('body').on('click', '.douyinAlertUrl', function () {
        let Token = T.getCookie('dosToken')
        if (Token && Token.token) {
            $('#douyin_alert_copyWritersId').show()
            $('#copyWritersRotateLoading').show()
            $('#copyWritersCountAllCount').hide()
            let videoId = window.location.href
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
            douyin_alertFun()
        }
    })
    // setTimeout(function () {
    //     $('#show-tooltip').hover(
    //         function () {
    //             // 获取提示框内容
    //             const tooltipText = '点击后可获取图片中的文字，并带上文字跳转到HSO100图片制作系统，使用文字重新进行图片制作'//$(this).attr('data-tooltip');

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
    // }, 5000)


    $('body').on('click', '.xhsAiAlertUrl', async function () {
        let elem = `#noteContainer .slider-container .swiper-wrapper .swiper-slide-active .img-container`;
        let list = []
        $(elem).each(async function () {
            let $this = $(this);
            let src = $this.find(' .note-slider-img').attr('src');
            list.push(src)
            console.log(src)
        });



        


        // // 模拟异步操作（例如 AJAX 请求）
        // setTimeout(function () {
        //     // 隐藏加载动画
        //     spinner.fadeOut();
        //     alert('加载完成！');
        // }, 3000); // 3 秒后隐藏


        getCookieDow(async () => {
            // $(document).on('ajaxSend', function() {
            //     $('#rotateLoadingId').show(); // 显示加载动画
            // })
            const spinner = $('<div class="maskLoading"></div><div class="apple-loading"><div class="spinner"><img width="60px" height="60px" alt="" src="data:image/png;base64,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"></div><span>AI复刻中</span></div>');
            $('body').append(spinner);
            // 显示加载动画
            spinner.fadeIn();
            T.postFun2('XhsKeywordList/imgDesign', { 'img_url': list[0] }, (res) => {
                spinner.fadeOut();
                // $(document).on('ajaxComplete', function() {
                //     $('#rotateLoadingId').hide(); // 隐藏加载动画
                // });

                if (res && res.data) {
                    T.showToast(1, '复刻成功')
                    // T.goUrl('https://hso100.com/home?token=' + T.getCookie('dosToken')) 
                    // setTimeout(() => {
                    // console.log(res.data.img_url + '&token=' + T.getCookie('dosToken').token)
                    // T.goUrl(res.data.img_url + '&token=' + T.getCookie('dosToken').token)
                    // }, 2000);

                    T.postFun2('/FastPosterToolGenerate/aiPhoto', {}, (res2) => {
                        console.log(res2)
                        if (res2 && res2.data) {
                            const token = res2.data.url.slice(30)
                            console.log(res.data.img_url + '&token=' + token, token)
                            T.goUrl(res.data.img_url + '&token=' + token)
                        } else {
                            // T.showToast(2, res.msg)
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

        }, (err) => {
            console.log('错误了2')
        });
    })

    $('body').on('click', '.xhsSaveSo', async function () {
        console.log('点击保存')
        getCookieDow(async () => {
            T.getFun2('folder/person/getList', {}, (res) => {
                console.log(res)
                if (res && res.data) {
                    const href = window.location.href
                    let noteId = extractXhsVideoId(href) || extractXhsVideoId3(href)
                    let noteUrl = window.location.href
                    console.log(noteUrl)
                    console.log({'folder_id':res.data[0].id,'platform':'xhs','material_id':noteId,'material_type':'2','url':noteUrl})
                    T.postFun3('material/personal/join', {'folder_id':res.data[0].id,'platform':'xhs','material_id':noteId,'material_type':'2','url':noteUrl}, (res2) => {
                        console.log(res2)
                        if (res2 && res2.code == 0) {
                            T.showToast(1, res2.msg)
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

        }, (err) => {
            console.log('错误了2')
        });
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

    function extractXhsVideoId(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/explore\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        if (match && match[1]) {
            return match[1]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }
    function extractXhsVideoId3(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/search_result\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        console.log(match)
        if (match && match[1]) {
            return match[1]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }
    function extractXhsVideoId2(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/profile\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        console.log(match)
        if (match && match[2]) {
            return match[2]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }

    $('body').on('click', '#douyin_alert_copyWritersId .copyWritersDel', function () {
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
            video_url: `${params}`
        }
        T.postFun('DouyinVideoOcr/videoText', from, (res) => {
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
    /**
     * 搜索结果页下载
     */

    const xhsSingleQueue = []
    const xhsSinglePending = new Set()
    let xhsSingleQueueRunning = false
    async function enqueueXhsSingleTask(href) {
        if (!href) return
        const key = String(href)
        if (xhsSinglePending.has(key)) {
            T.showToast(3, '这条笔记已经在下载队列中')
            return
        }
        xhsSinglePending.add(key)
        xhsSingleQueue.push({ href, key })
        T.showToast(3, `已加入下载队列（等待 ${xhsSingleQueue.length} 条）`)
        processXhsSingleQueue()
    }

    async function processXhsSingleQueue() {
        if (xhsSingleQueueRunning) return
        xhsSingleQueueRunning = true
        try {
            while (xhsSingleQueue.length) {
                if (T.downloadStatusIsCancelled()) {
                    xhsSingleQueue.length = 0
                    T.downloadStatusFail('已取消，等待中的笔记已清空')
                    break
                }
                const task = xhsSingleQueue.shift()
                if (!T.downloadState || !T.downloadState.active) {
                    T.downloadStatusStart(1, '正在解析下载地址')
                }
                T.downloadStatusUpdate({ phase: `正在解析笔记（队列剩余 ${xhsSingleQueue.length} 条）` })
                const allowed = await new Promise(resolve => {
                    getCookieDow(() => resolve(true), () => resolve(false))
                })
                if (allowed) {
                    const taskId = await postDouccApiAddXhsTaskl(task.href)
                    if (taskId) {
                        T.downloadStatusUpdate({ phase: '已提交任务，等待解析结果' })
                        await postDouccApiGetXhsTaskList(taskId)
                        if (typeof T.waitForDownloadQueue === 'function') await T.waitForDownloadQueue()
                    } else {
                        T.downloadStatusFail('获取下载链接失败')
                        T.showToast(2, '获取下载链接失败')
                    }
                }
                xhsSinglePending.delete(task.key)
            }
        } finally {
            xhsSingleQueueRunning = false
            if (!xhsSingleQueue.length && !T.downloadState?.queueActive && T.downloadState?.active) {
                T.downloadStatusDone('小红书下载队列完成')
            }
        }
    }

    $('body').on('click', '.setIntIdClick', function () {
        let href = $(this).parents('.note-item').find('.cover').attr('href')
        if (href) {
            href = `https://www.xiaohongshu.com${href}`
        }
        enqueueXhsSingleTask(href)
    })
    // 当前页面批量下载：先让用户选择“全部”或“选择下载”。
    $('body').on('click', '.setIntIdALLClick', function () {
        const list = []
        $('#global .feeds-container .note-item').each(function () {
            let href = $(this).find('.cover').attr('href')
            if (!href) return
            const name = $(this).find('.footer .title, .title, [data-testid="note-title"]').first().text().trim()
            const thumb = $(this).find('.cover img, img').first().attr('src') || ''
            const author = $(this).find('.author, .name, [data-testid="user-name"]').first().text().trim()
            list.push({ url: href.startsWith('http') ? href : `https://www.xiaohongshu.com${href}`, name, thumb, author })
        })
        isDownFile = 1
        openXhsBatchModal(list)
    })

    // 全部下载导出为excel
    $('body').on('click', '.setHomeALLClickExcel', async function () {
        if (Stalist.length > 0) {
            console.log(Stalist)
            getCookieDow(async () => {

                T.postFun('XhsKeywordList/exportXhs', JSON.stringify(Stalist), (res) => {
                    console.log(res)
                    if (res && res.data) {
                        T.showToast(1, '导出成功')
                        window.location.href = res.data.url

                    } else {
                        T.showToast(2, res.msg)
                    }
                })

            })
            return
        }
        let elem = `#global .feeds-container  .note-item`;
        let list = []
        let namelist = []
        let noteIdList = []
        let countList = []
        $(elem).each(async function () {
            let $this = $(this);

            // var elementTop = $(this).offset().top;
            // var elementBottom = elementTop + $(this).outerHeight();

            // var viewportTop = $(window).scrollTop();
            // var viewportBottom = viewportTop + $(window).height();

            // if (elementBottom > viewportTop && elementTop < viewportBottom) {
            let href = $this.find('.cover').attr('href');
            let name = $this.find('.footer .title').text().trim();
            let count = $this.find('.footer .count').text().trim()
            if (href) {
                href = `https://www.xiaohongshu.com${href}`;
            }

            let noteId = extractXhsVideoId(href) || extractXhsVideoId3(href)
            list.push(href)
            namelist.push(name)
            noteIdList.push(noteId)
            countList.push(count)
            // }


        });
        const keyword = getUrlParameter('keyword')
        var data = []
        list.forEach((element, index) => {
            // if(data.length < 10){
            data.push({ 'keyword': keyword ? decodeURIComponent(keyword) : '', 'note_id': noteIdList[index], 'title': namelist[index], 'note_url': element, 'like_count': countList[index] })
            // }
        })
        console.log(data)
        getCookieDow(async () => {
            console.log(data)
            T.postFun('XhsKeywordList/exportXhs', JSON.stringify(data), (res) => {
                console.log(res)
                if (res && res.data) {
                    T.showToast(1, '导出成功')
                    window.location.href = res.data.url

                } else {
                    T.showToast(2, res.msg)
                }
            })

        })
    })

    $('body').on('click', '.setPersonDetailALLClickExcel', async function () {
        if (singleStalist.length > 0) {
            getCookieDow(async () => {
                console.log(data)
                T.postFun('XhsKeywordList/exportXhs', JSON.stringify(singleStalist), (res) => {
                    console.log(res)
                    if (res && res.data) {
                        T.showToast(1, '导出成功')
                        window.location.href = res.data.url

                    } else {
                        T.showToast(2, res.msg)
                    }
                })

            })
            return
        }
        let elem = `#global .feeds-container  .note-item`;
        let list = []
        let namelist = []
        let noteIdList = []
        let countList = []
        $(elem).each(async function () {
            let $this = $(this);

            // var elementTop = $(this).offset().top;
            // var elementBottom = elementTop + $(this).outerHeight();

            // var viewportTop = $(window).scrollTop();
            // var viewportBottom = viewportTop + $(window).height();

            // if (elementBottom > viewportTop && elementTop < viewportBottom) {
            let href = $this.find('.cover').attr('href');
            let name = $this.find('.footer .title').text().trim();
            let count = $this.find('.footer .count').text().trim()
            if (href) {
                href = `https://www.xiaohongshu.com${href}`;
            }
            console.log(href)
            let noteId = extractXhsVideoId2(href)
            list.push(href)
            namelist.push(name)
            noteIdList.push(noteId)
            countList.push(count)
            // }

        });
        var data = []
        list.forEach((element, index) => {
            data.push({ 'keyword': '', 'note_id': noteIdList[index], 'title': namelist[index], 'note_url': element, 'like_count': countList[index] })
        })
        console.log(data)
        getCookieDow(async () => {
            console.log(data)
            T.postFun('XhsKeywordList/exportXhs', JSON.stringify(data), (res) => {
                console.log(res)
                if (res && res.data) {
                    T.showToast(1, '导出成功')
                    window.location.href = res.data.url

                } else {
                    T.showToast(2, res.msg)
                }
            })

        })
    })


    // 全部评论下载导出为excel
    $('body').on('click', '.setPersonALLClickPostExcel', async function () {
        let elem = `.note-container  .interaction-container .comments-container .parent-comment`;
        let authorlist = []
        let doclist = []
        let good_count_list = []
        let create_time_list = []
        let comment_count_list = []
        console.log($(elem))
        $(elem).each(async function () {
            let $this = $(this);

            // var elementTop = $(this).offset().top;
            // var elementBottom = elementTop + $(this).outerHeight();

            // var viewportTop = $(window).scrollTop();
            // var viewportBottom = viewportTop + $(window).height();

            // if (elementBottom > viewportTop && elementTop < viewportBottom) {

            let nickname = $this.find('.comment-item .comment-inner-container .author:first').text().trim();
            let doc = $this.find('.comment-inner-container .content:first').text().trim();
            let good_count = $this.find('.comment-inner-container .like:first').text().trim();
            let create_time = $this.find('.comment-inner-container .date:first').text().trim();
            let comment_count = $this.find('.comment-inner-container .reply .count:first').text().trim();
            // let name = $this.find('.footer .title').text().trim();


            // let noteId = extractXhsVideoId(href)
            authorlist.push(nickname)
            doclist.push(doc)
            good_count_list.push(good_count)
            create_time_list.push(create_time)
            comment_count_list.push(comment_count)

            let elem2 = $this.find('.reply-container .comment-item-sub')
            $(elem2).each(async function (index, childElement) {
                let nickname2 = $(childElement).find('.comment-inner-container .author').text().trim();


                let doc2 = $(childElement).find('.comment-inner-container .content:first').text().trim();
                let good_count2 = $(childElement).find('.comment-inner-container .like:first').text().trim();
                let create_time2 = $(childElement).find('.comment-inner-container .date:first').text().trim();
                let comment_count2 = $(childElement).find('.comment-inner-container .reply .count:first').text().trim();

                authorlist.push(nickname2)
                doclist.push(doc2)
                good_count_list.push(good_count2)
                create_time_list.push(create_time2)
                comment_count_list.push(comment_count2)
            })

            // }


        });
        // console.log(authorlist,doclist,good_count_list,create_time_list,comment_count_list)
        var data = []
        authorlist.forEach((element, index) => {
            data.push({ 'nickname': element, 'doc': doclist[index], 'good_count': good_count_list[index] == '赞' ? '0' : good_count_list[index], 'create_time': create_time_list[index], 'comment_count': comment_count_list[index] == '回复' ? '0' : comment_count_list[index] })
        })
        console.log(data)



        getCookieDow(async () => {
            console.log(data)
            T.postFun('XhsKeywordList/exportXhs', JSON.stringify(data), (res) => {
                console.log(res)
                if (res && res.data) {
                    T.showToast(1, '导出成功')
                    window.location.href = res.data.url

                } else {
                    T.showToast(2, res.msg)
                }
            })

        })
    })

    /**
     * 页面详情下载
     */

    $('body').on('click', '.setIntIdClickUrl', function () {
        let href = window.location.href
        enqueueXhsSingleTask(href)
    })
}

// 通过任务ID轮询解析结果，并把每次进展同步到状态面板。
function pollXhsTask(task_id, ids = [], type = '', startedAt = Date.now(), pollCount = 0, shouldDownload = true, zipItems = []) {
    return new Promise((resolve) => {
        if (T.downloadStatusIsCancelled()) {
            multiple_download_flag = false
            T.downloadStatusFail('已取消')
            resolve({ ok: false, cancelled: true, ids })
            return
        }
        T.downloadStatusUpdate({ phase: `正在解析下载地址${ids.length ? `（已找到 ${ids.length} 个）` : ''}` })
        T.postFun('DouccApi/GetXhsTaskList', { task_id }, async (res) => {
            if (!res || !res.data) {
                multiple_download_flag = false
                T.downloadStatusFail('解析接口无响应')
                T.showToast(2, '下载任务接口无响应')
                resolve({ ok: false, ids })
                return
            }
            const data = res.data
            const data_ok = Array.isArray(data.data_ok) ? data.data_ok : []
            const task_status = data.task_status || ''
            const nextIds = ids.slice()
            const nextZipItems = zipItems.slice()
            for (const item of data_ok) {
                if (!item || !item.note_id || nextIds.includes(item.note_id)) continue
                nextIds.push(item.note_id)
                if (!shouldDownload) continue
                const name = String(item.note_desc || '小红书内容').substring(0, 20)
                if (item.note_type == '1' && item.video_dl_url) {
                    if (type === 'all') nextZipItems.push({ name, url: item.video_dl_url, ext: 'mp4' })
                    else onedow(item.video_dl_url, name)
                }
                if (item.note_type == '2' && item.note_dl_url) {
                    const imageUrls = Array.isArray(item.note_dl_url) ? item.note_dl_url : [item.note_dl_url]
                    if (type === 'all') {
                        imageUrls.forEach((url, index) => nextZipItems.push({ name: `${name}_${index + 1}`, url, ext: 'jpg' }))
                    } else {
                        T.enqueueDownloads(imageUrls.map((url, index) => ({
                            name: `${name}_${index + 1}`,
                            url: convertToHTTPS(url),
                            ext: 'jpg'
                        })), { mode: 'background', adoptActive: true })
                    }
                }
            }
            const state = T.downloadState || {}
            T.downloadStatusUpdate({
                phase: task_status === '已完成' ? '地址解析完成，准备下载' : `正在解析下载地址（已找到 ${nextIds.length} 个）`,
                done: Math.min(nextIds.length, state.total || nextIds.length || 1)
            })
            if (task_status === '已完成') {
                if (type === 'all' && shouldDownload) {
                    if (!nextZipItems.length) {
                        multiple_download_flag = false
                        T.downloadStatusFail('没有解析到可下载文件')
                        T.showToast(2, '没有解析到可下载文件')
                        resolve({ ok: false, ids: nextIds })
                        return
                    }
                    try {
                        const result = await T.downloadZip(nextZipItems, 'xiaohongshu-batch-download')
                        T.downloadStatusDone(result.failed ? '批量下载完成，部分文件失败' : '批量下载完成')
                        T.showToast(1, result.failed ? '批量下载完成，部分文件失败' : '批量下载完成')
                    } catch (error) {
                        T.downloadStatusFail(error.message === '已取消' ? '已取消' : '批量打包失败')
                        T.showToast(2, error.message === '已取消' ? '已取消下载' : '批量打包失败，请重试')
                        multiple_download_flag = false
                        resolve({ ok: false, ids: nextIds })
                        return
                    }
                } else {
                    T.downloadStatusDone(shouldDownload ? '已解析，已提交下载' : '解析完成')
                    if (shouldDownload) T.showToast(1, '已提交下载，请查看状态面板')
                }
                multiple_download_flag = false
                if (type === 'all') {
                    const obj = $('#multiple-download-stat')
                    obj.find('.spend_time').text(`${parseInt((Date.now() - start_time) / 1000)}s`)
                    obj.find('.success').text(nextIds.length)
                }
                resolve({ ok: true, ids: nextIds })
                return
            }
            if (pollCount >= 120 || Date.now() - startedAt >= 120000) {
                multiple_download_flag = false
                T.downloadStatusFail('解析超时，请重试')
                T.showToast(2, '下载任务超时，请稍后重试')
                resolve({ ok: false, timeout: true, ids: nextIds })
                return
            }
            setTimeout(() => {
                pollXhsTask(task_id, nextIds, type, startedAt, pollCount + 1, shouldDownload, nextZipItems).then(resolve)
            }, 1000)
        }, () => {
            multiple_download_flag = false
            T.downloadStatusFail('解析请求失败')
            T.showToast(2, '下载失败，请稍后尝试')
            resolve({ ok: false, ids })
        })
    })
}

// 通过任务ID获取下载链接
function postDouccApiGetXhsTaskList(task_id, ids = [], type = '', startedAt = Date.now(), pollCount = 0) {
    return pollXhsTask(task_id, ids, type, startedAt, pollCount, true)
}

// 批量导出只解析任务，不触发浏览器下载。
function postDouccApiGetXhsTaskList2(task_id, ids = [], type = '', startedAt = Date.now(), pollCount = 0) {
    return pollXhsTask(task_id, ids, type, startedAt, pollCount, false)
}
// 通过任务ID获取下载excel链接
function postXhsTaskList(task_id, ids = [], type = '') {
    console.log(task_id)
    return new Promise((resolve, reject) => {
        let from = {
            task_id: task_id
        }
        let _ids = ids
        T.postFun('XhsKeywordList/exportUrls', from, (res) => {
            if (res && res.data) {
                console.log(res)
                window.location.href = res.data.url
            } else {
                T.showToast(2, '导出接口无响应')
                resolve()
            }
        }, err => {
            T.showToast(2, '下载失败，请稍后尝试')
            resolve()
        })
    })
}

//  获取任务ID
function postDouccApiAddXhsTaskl(urls) {
    return new Promise((resolve, reject) => {
        let from = {
            urls: urls
        }
        T.postFun('DouccApi/AddXhsTask', from, (res) => {
            if (res.data && res.data.task_id) {
                resolve(res.data.task_id)
            } else {
                resolve(null)
            }
        }, err => {
            resolve(null)
        })
    })
}

/**
 * 批量文案提取
 */
function postFunTextCount(predictToday, success) {
    let from = {}
    T.postFun('DouyinVideoText/searchToTextCount', from, (res) => {
        // // console.log('----res----')
        // // console.log(res)
        // `<div class="div1"> 预计本次消耗2次，提取文案次数剩余499次</div>
        //   <div>若次数不足，可 <span>充值次数</span> 进行提取</div>`
        // <span class="resToday"> </span>
        $('.douyin_alert_url_b').html(`
          <div>总数:<span class="resToday">${res.data.today}</span></div>
          <div>预计消耗次数:<span class="consumeTotal">${predictToday} </span></div>
          <div>剩余次数:<span class="resCount">${res.data.count} </span></div>
          `)
        if (success) {
            success()
        }
    })
}

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
$('body').on('click', '#douyinAlertUrl_id .del', function () {
    // console.log('关闭')
    $('#douyinAlertUrl_id').hide()
    clearInterval(videoTopItems)
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

// 提取次数
$('body').on('click', '#douyinAlertUrl_btn', function () {
    let resToday = $('.resToday').html()
    let consumeTotal = $('.consumeTotal').html()
    let list = $('.consumeTotal').attr('data-total')
    let resCount = $('.resCount').html()
    let html = ''
    if (resCount * 1 >= consumeTotal * 1) {
        videosToText(JSON.parse(list))
    } else {
        html = `
         <div class="div1">您的文案提取剩余次数为:${resCount},小于需要提取的文案数量</div>
         <div>请至<span id="dso100pay">会员购买</span>进行升级</div>
         `
        $('.douyin_alert_url_b2_l').html(html)
    }
})

function videosToText(checkedExtractList) {
    let from = {
        video_ids: checkedExtractList.join('\n')
    }
    T.postFun('DouyinVideoText/videosToText', from, (res) => {
        let html
        if (res.status != 200) {
            T.showToast(2, res.msg)
            html = `
          <div class="div1">${res.msg}</div>
          `
        } else {
            html = `
          <div class="div1">后台已经开始执行提取文案操作</div>
          <div>请至 <span id="copyWriters">文案提取</span>进行查看</div>
          `
        }
        $('.douyin_alert_url_b2_l').html(html)
        postFunTextCount(checkedExtractList.length)
    })
}

/**
 * 批量下载
 */
var isDownFile = 1;
let currentXhsBatchItems = []
function normalizeXhsItems(items) {
    const source = Array.isArray(items) ? items : String(items || '').split(/\r?\n/)
    const seen = new Set()
    const result = []
    source.forEach(item => {
        const value = typeof item === 'string' ? { url: item, name: '' } : (item || {})
        const url = String(value.url || '').trim()
        if (!url || seen.has(url)) return
        seen.add(url)
        result.push({
            url,
            name: String(value.name || '').trim(),
            thumb: String(value.thumb || '').trim(),
            author: String(value.author || '').trim()
        })
    })
    return result
}
function uniqueXhsUrls(items) {
    return normalizeXhsItems(items).map(item => item.url)
}
function renderXhsBatchPicker(items) {
    const list = normalizeXhsItems(items)
    const box = document.getElementById('multiple-download-checklist')
    const summary = document.getElementById('multiple-download-summary')
    const count = document.getElementById('multiple-download-selected-count')
    if (summary) summary.textContent = list.length ? `已找到 ${list.length} 条内容` : '还没有添加内容'
    if (count) count.textContent = `已选 ${list.length} 条`
    if (!box) return list
    box.replaceChildren()
    list.forEach((item, index) => {
        const row = document.createElement('label')
        row.className = 'dso100-note-row'
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = true
        input.dataset.url = item.url
        input.className = 'multiple-download-item-check'
        const thumb = document.createElement('span')
        thumb.className = 'dso100-note-thumb'
        if (item.thumb) {
            const image = document.createElement('img')
            image.src = item.thumb
            image.alt = ''
            image.loading = 'lazy'
            thumb.appendChild(image)
        } else {
            thumb.textContent = '笔记'
        }
        const info = document.createElement('span')
        info.className = 'dso100-note-info'
        const title = document.createElement('strong')
        title.textContent = item.name || `第 ${index + 1} 条笔记`
        const meta = document.createElement('small')
        meta.textContent = item.author || '小红书笔记'
        info.append(title, meta)
        const number = document.createElement('em')
        number.textContent = `${index + 1}`
        row.append(input, thumb, info, number)
        row.title = item.url
        box.appendChild(row)
    })
    const checkAll = document.getElementById('multiple-download-checkall')
    if (checkAll) checkAll.checked = list.length > 0
    return list
}
function openXhsBatchModal(items) {
    const list = normalizeXhsItems(items)
    currentXhsBatchItems = list
    const textarea = $('textarea[name=video-items]')
    if (items !== undefined) textarea.val(list.map(item => item.url).join('\n'))
    else textarea.val('')
    renderXhsBatchPicker(list)
    $('#multiple-download-picker').prop('hidden', true)
    $('#multiple-download-url-editor').prop('hidden', list.length > 0)
    $('.multiple-download-modal').show(300)
}

async function startXhsBatchDownload(inputItems) {
    if (multiple_download_flag || (T.downloadState && T.downloadState.active)) {
        T.downloadStatusUpdate({ phase: '已有下载任务进行中' })
        return false
    }
    const rawList = uniqueXhsUrls(inputItems)
    if (!rawList.length) {
        T.showToast(2, '请先输入或选择小红书链接')
        return false
    }
    start_time = Date.now()
    if (!T.downloadStatusStart(rawList.length, isDownFile == 2 ? '正在准备导出任务' : '正在提交批量任务')) return false
    multiple_download_flag = true
    const obj = $('#multiple-download-stat')
    obj.find('.spend_time').text(0)
    obj.find('.success').text(0)
    obj.find('.total').text(rawList.length)
    obj.find('.unique_after').text(rawList.length)
    T.downloadStatusUpdate({ phase: `正在提交 ${rawList.length} 个任务` })
    getCookieDow(async () => {
        const task_id = await postDouccApiAddXhsTaskl(rawList.join('\n'))
        if (!task_id) {
            multiple_download_flag = false
            T.downloadStatusFail('提交任务失败')
            T.showToast(2, '获取下载链接失败')
            return
        }
        T.downloadStatusUpdate({ phase: '已提交任务，等待解析结果' })
        if (isDownFile == 2) {
            const finish = await postDouccApiGetXhsTaskList2(task_id, [], 'all')
            if (finish && finish.ok) await postXhsTaskList(task_id, [], 'all')
        } else {
            await postDouccApiGetXhsTaskList(task_id, [], 'all')
        }
    }, () => {
        multiple_download_flag = false
        T.downloadStatusFail('需要登录后下载')
    })
    return true
}
$('#global').on('click', '.multiple-download', () => { isDownFile = 1; openXhsBatchModal() })
$('body').on('click', '.modal .modal-close', function () {
    $(this).parents('.modal').hide(300)
})
$('#global').on('click', '.multiple-download-excel', () => {
    isDownFile = 2
    openXhsBatchModal()
})
$('body').on('input', 'textarea[name=video-items]', function () {
    currentXhsBatchItems = normalizeXhsItems($(this).val())
    renderXhsBatchPicker(currentXhsBatchItems)
})
$('body').on('click', '#multiple-download-btn', function () {
    $('#multiple-download-picker').prop('hidden', true)
    startXhsBatchDownload($('textarea[name=video-items]').val())
})
$('body').on('click', '#multiple-download-select-btn', function () {
    renderXhsBatchPicker(currentXhsBatchItems.length ? currentXhsBatchItems : $('textarea[name=video-items]').val())
    $('#multiple-download-url-editor').prop('hidden', true)
    $('#multiple-download-picker').prop('hidden', false)
})
$('body').on('click', '#multiple-download-paste-btn', function () {
    const editor = $('#multiple-download-url-editor')
    editor.prop('hidden', !editor.prop('hidden'))
    if (!editor.prop('hidden')) $('textarea[name=video-items]').trigger('focus')
})
$('body').on('change', '#multiple-download-checkall', function () {
    $('.multiple-download-item-check').prop('checked', this.checked)
    $('#multiple-download-selected-count').text(`已选 ${$('.multiple-download-item-check:checked').length} 条`)
})
$('body').on('change', '.multiple-download-item-check', function () {
    $('#multiple-download-selected-count').text(`已选 ${$('.multiple-download-item-check:checked').length} 条`)
})
$('body').on('click', '#multiple-download-confirm-btn', function () {
    const selected = $('.multiple-download-item-check:checked').map(function () { return this.dataset.url }).get()
    if (!selected.length) {
        T.showToast(2, '请至少选择一个链接')
        return
    }
    $('textarea[name=video-items]').val(selected.join('\n'))
    $('#multiple-download-picker').prop('hidden', true)
    startXhsBatchDownload(selected)
})

/**
 * 添加头部logo
 */
function headerFun() {
    let $global_input_box = $('#global .input-box')
    $global_input_box.prepend(`
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
                  <img class="img"  width="18px" height="18px" alt="" src="data:image/png;base64,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">
                  <img class="imgon"  width="18px" height="18px" alt="" src="data:image/png;base64,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">
                  <a href="javascript:;" >批量文案提取</a>
              </div>
              <div class="douyin_bottom_list ">
                  <img class="img"  width="20px" height="20px" alt="" src="data:image/png;base64,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">
                  <img class="imgon"  width="18px" height="18px" alt="" src="data:image/png;base64,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">
                  <a href="javascript:;" class="multiple-download-excel">批量统计数据</a>
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
}


$('#global').on('mouseenter', '.douyin', async () => {
    let Token = T.getCookie('dosToken')
    if (Token && Token.token) {
        $('.douyin_bottom').show()
    }
})
$('#global').on('click', '.douyin', async () => {
    let Token = T.getCookie('dosToken')
    if (!Token) {
        douyin_alertFun()
    }
})
$('#global').on('mouseleave', '.douyin', async () => {
    $('.douyin_bottom').hide()
})


function douyin_alertFun() {
    $('.douyin_alert').show(300)
    $(' .douyin_alert_main_b_3 .codeImg').html(`
      <div class="douyin_alert_loading"></div>
      `)
    setTimeout(() => {
        getTicket()
    }, 300)
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
        //     T.showToast(2, '不同意用户协议与隐私协议，您将无法使用极客哟')
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
}

function getCookieDow(succeed, err) {
    /**
     * 如果按钮是vip才能使用，
     每天第一次使用是免费的，第二次就需要vip了，
     第二次那么则需要登录，如果登录后再点击vip功能，则引导跳转到购买界面

     20240415 高阳
     - 没登录不可以修改
     - 登录后的免费版可以一直用
     - 会员无限制
     */
    let douyinDownload = T.getCookie('douyinDownloadNumber') || 0

    let Token = T.getCookie('dosToken')
    // console.log('---Token---')
    // console.log(Token)
    if (!Token) {
        douyin_alertFun()
        if (typeof err === 'function') err()
        return
    }

    // 设置免费会员次数 10 -> 9999999999999999
    if (douyinDownload && douyinDownload >= 99999999) {
        let Token = T.getCookie('dosToken')
        if (Token && Token.token) {
            // ['0', '1', '2', '3']
            // GRADELIST: ['FREE', 'EVIP', 'VIP', 'SVIP'],
            // ['普通用户', '企业版', '专业版', '旗舰版']
            if (Token.auth > 0) {
                succeed()
            } else {
                T.showToast(2, '每天使用次数已到限制，请先购买会员')
                setTimeout(() => {
                    T.goUrl('https://dso100.com/pay')
                }, 2000)
            }

        } else {
            douyin_alertFun()
            if (typeof err === 'function') {
                err()
            }
        }
    } else {
        succeed()
    }
}

$('body').on('click', '#copyWriters', function () {
    T.goUrl(`https://dso100.com/copyWriters?isBatch=false&source=chrome`)
})
$('body').on('click', '#dso100pay', function () {
    T.goUrl(`https://dso100.com/pay`)
})

// 公共弹出
$('body').append(`
   <!-- 登录 -->
    ${logIn}
    <!-- 批量下载 -->
    ${modalHtml}
    <!-- 加载动画 -->
    ${rotate_loading}
    <!-- 转文案页面中弹窗 -->
    ${copyWriters}
    <!-- 转文案弹窗 -->
     ${douyin_alert_url}
     <iframe id="myFrame" class="bodyHtml" src=''></iframe>
  `)

// 下单个视频
function onedow(urls, name) {
    // console.log(array)
    if (urls) {
        let douyinDownload = T.getCookie('douyinDownloadNumber') || 0
        T.setExpiresCookie('douyinDownloadNumber', douyinDownload + 1)
        T.showToast(1, '浏览器正在下载 请注意查看进度')
        if (!name) {
            name = `video_${xhsDownloadIndex++}`
        }
        T.enqueueDownloads([{ url: convertToHTTPS(urls), name, ext: 'mp4' }], { mode: 'background', adoptActive: true })
    } else {
        T.showToast(2, '采集失败，请点击详情后下载')
    }
}
function getUrlParameter(parameterName) {
    // 使用 URL 对象来解析 URL
    let url = window.location.href
    let parsedUrl = new URL(url);

    // 获取指定参数名的参数值
    let parameterValue = parsedUrl.searchParams.get(parameterName);

    // 返回参数值
    return parameterValue;
}

let isScrolling;
var Stalist = []
var PostList = []
var singleStalist = []
let saveUrl = ''
$(window).on('scroll', function () {
    if (isScrolling) {
        clearTimeout(isScrolling);
    }
    isScrolling = setTimeout(function () {
        // 滚动停止后执行的代码
        console.log('滚动停止了！');
        isScrolling = null;

        let url = window.location.href
        if (!(url.indexOf(saveUrl) > -1)) {
            Stalist = []
        }
        if (url.indexOf('xiaohongshu.com/search_result') > -1) {
            saveUrl = 'xiaohongshu.com/search_result'
        } else if (url.indexOf('xiaohongshu.com/explore') > -1) {
            saveUrl = 'xiaohongshu.com/explore'
        }
        if (url.indexOf('xiaohongshu.com/user/profile') > -1) {
            let elem2 = `#global .feeds-container  .note-item`;
            let list2 = []
            let namelist2 = []
            let noteIdList2 = []
            let countList = []
            $(elem2).each(async function () {
                let $this = $(this);


                let href = $this.find('.cover').attr('href');
                let name = $this.find('.footer .title').text().trim();
                let count = $this.find('.footer .count').text().trim()
                if (href) {
                    href = `https://www.xiaohongshu.com${href}`;
                }
                console.log(href, name)
                let noteId = extractXhsVideoId2(href)
                list2.push(href)
                namelist2.push(name)
                noteIdList2.push(noteId)
                countList.push(count)

            });

            list2.forEach((element, index) => {
                if (!singleStalist.some(obj => obj.note_url === element)) {
                    singleStalist.push({ 'keyword': '', 'note_id': noteIdList2[index], 'title': namelist2[index], 'note_url': element, 'like_count': countList[index] })
                }

            })
            console.log(singleStalist)
        } else {



            const keyword = getUrlParameter('keyword')
            console.log(keyword, decodeURIComponent(keyword), '身上')
            let elem = `#global .feeds-container  .note-item`;
            let list = []
            let namelist = []
            let noteIdList = []
            let countList = []
            $(elem).each(async function () {
                let $this = $(this);
                let href = $this.find('.cover').attr('href');
                let name = $this.find('.footer .title').text().trim();
                let count = $this.find('.footer .count').text().trim()
                if (href) {
                    href = `https://www.xiaohongshu.com${href}`;
                }

                let noteId = extractXhsVideoId(href) || extractXhsVideoId3(href)
                list.push(href)
                namelist.push(name)
                noteIdList.push(noteId)
                countList.push(count)
            });

            list.forEach((element, index) => {
                if (!Stalist.some(obj => obj.note_url === element)) {
                    Stalist.push({ 'keyword': keyword ? decodeURIComponent(keyword) : '', 'note_id': noteIdList[index], 'title': namelist[index], 'note_url': element, 'like_count': countList[index] })
                }

            })
            console.log(Stalist)
        }

    }, 66); // 66毫秒大约是一帧的时间，这样可以更准确地判断滚动是否结束
    function extractXhsVideoId(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/explore\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        console.log(match)
        if (match && match[1]) {
            return match[1]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }
    function extractXhsVideoId3(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/search_result\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        console.log(match)
        if (match && match[1]) {
            return match[1]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }
    function extractXhsVideoId2(url) {
        // 匹配URL中以 /video/ 开头的部分，后面跟着数字组成的ID
        var regex = /\/profile\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)/;
        var match = url.match(regex);
        console.log(match)
        if (match && match[2]) {
            return match[2]; // 返回匹配到的第一个分组，即视频ID部分
        } else {
            return null; // 如果未匹配到，则返回null或者可以抛出错误
        }
    }

});

$(window).on('hashchange popstate', function () {
    console.log('URL changed! New URL:', window.location.href);
});

(function () {
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                console.log('URL changed! New URL:', window.location.href);
                Stalist = []
                singleStalist = []
            }
        });
    });

    observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true
    });
})();
// 下载图文
let setIntGlobal
setIntGlobal = setInterval(() => {
    let global_input_box = $('#global .input-box')
    if (global_input_box) {
        headerFun()
        timeoutInit()
        clearInterval(setIntGlobal)
    }
}, 1000)
