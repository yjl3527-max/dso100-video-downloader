chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.downloadProgress) {
        const progress = request.downloadProgress
        T.downloadStatusHandleProgress(progress)
        sendResponse('收到下载进度')
        return
    }
    if (request.cmd == 'test') alert(request.value)
    sendResponse('我收到了你的消息！')
})
function chromeToken(){
    chrome.runtime.sendMessage({ getToken: true }, function(response) {
        console.log('response.token')
        console.log(response.token)
        if(response.token){
            T.setCookie('dosToken',JSON.parse(response.token))
        }else{
            T.setCookie('dosToken','')
        }
    });
}
chromeToken()

function send(urls) {
    const list = Array.isArray(urls) ? urls.filter(item => item && item.url) : []
    if (!list.length) {
        T.showToast(2, '没有检测到可下载的视频')
        return
    }
    T.enqueueDownloads(list, { mode: 'background', delay: Number($('#cjys').val()) })
}



kk=1
setTimeout(function(){
    function indexFunction(){
        setInterval(()=>{
            // $('.new-main .common-card_wrapper__Inr_n .tw-relative').not(':has(.douyinDownload)').each(function() {
            //     $(this).prepend(`
            //     <div class="douyinDownload">
            //         <div class="douyinDownload_top">
            //             <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
            //             <span>下载</span>
            //         </div>
            //     </div>
            // `)
            // })
            $('.new-main .tw-bg-black .xgplayer').not(':has(.douyinDownload)').each(function() {
                $(this).prepend(`
                <div class="douyinDownload">
                    <div class="douyinDownload_top">
                        <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
                        <span>下载</span>
                    </div>
                </div>
            `)
            })
        },500)
    }
    indexFunction()
    // $("body").append(`
    //     <iframe  frameborder="0" width="10000px" height="1000px" class="divIframe" id="your_iframe_id_here"></iframe>
    //     `
    // )
    $(".new-main .tw-bg-black .xgplayer").on("click", ".douyinDownload_top", function() {
        onedow()
    });
    $(".new-main .common-card_wrapper__Inr_n .tw-relative").on("click", '.douyinDownload', function() {
        // let href = $(this).next('a').attr('href')
        // src="https://www.dongchedi.com${href}"
        // var iframe = $('<iframe>').hide();

        // // 设置 iframe 的 src 属性为目标页面的地址
        // iframe.attr('src', 'https://www.example.com');

        // // 将 iframe 添加到文档中
        // $('body').append(iframe);
        // var siblingsHTML = $(this).siblings().map(function() {
        //     return this.outerHTML;
        //   }).get().join("");
        //   var regex =  /href="([^"]+)"/;
        //   var match = siblingsHTML.match(regex);
        //   const regex2 = /\/video\/(\d+)/;
        //     const match2 = match[0].match(regex2);
        //     get(match2[0]);
        // get(href)
      });
    // 下单个视频
    function onedow() {
        T.showToast(1,'浏览器正在下载 请注意查看进度')
        var videoElement = document.querySelector('video');
        if (videoElement && videoElement.src) {
            send([{"name":"video_"+kk,"url":videoElement.src}]) 
            kk=kk+1
        } else {
            T.showToast(2, '下载失败，未检测到视频地址')
        }

    }
    function onedow2(src) {
        send([{"name":"video_"+kk,"url":src}]) 
    }
    
    $("body").append(`
            <div  class="divIframe"  id="your_iframe_id_here"></div>
            `
    )
    function get(url){
        // T.showToast(1,`https://www.dongchedi.com${url}`,300000)
        $.ajax({
            type: "get",
            url: `https://www.dongchedi.com${url}`,
            async:true,
            timeout:15000,
            success: function(res){
                T.showToast(1,res)
                console.log('res');
                console.log(res);

                // $('#your_iframe_id_here').html(res)
                // onedow2(JSON.stringify(res))
                
    
            }
        });
    
    }
},1000)



// function getcookie(objname){//获取指定名称的cookie的值

// 	var arrstr = document.cookie.split("; ");
	
// 	for(var i = 0;i < arrstr.length;i ++){
	
// 		var temp = arrstr[i].split("=");
		
// 		if(temp[0] == objname) return unescape(temp[1]);
		
// 	}
	
// };
