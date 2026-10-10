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

function send(urls) {
    const list = Array.isArray(urls) ? urls.filter(item => item && item.url) : []
    if (!list.length) {
        T.showToast(2, '没有找到可下载内容')
        return
    }
    T.enqueueDownloads(list, { mode: 'background', delay: Number($('#cjys').val()) })
}

var pcursor,feeds=[]
	var userId="3xdn7rxspmmar5c"
    var cjys=1000	 
	var myDate = new Date();
	var pcursor=''
	var ti=1
    setTimeout(function(){
		$(".profile").prepend("<div id='my' style=''>用户id:<input type='text'  id='userid'/> 抓取条数:<input type='number'  id='number' value='50'/> 视频下载间隔延时,电脑越差设置越大值-毫秒：<input id='cjys' value='1000' placeholder=''/> <button id='start'>开始采集</button></div>")
						
	    $("#start").click(function(){
			pcursor = ''
			feeds = []
			ti = 0
			userId=$("#userid").val().trim();
			if (!userId) { alert('请输入用户ID'); return }
			if (!Number.isFinite(Number($('#number').val())) || Number($('#number').val()) <= 0) { alert('请输入有效的抓取条数'); return }
			$('#start').text("采集中....请勿点击")
			get()
        })

    },3000)


    function get(){
	        // console.log(myDate.getMinutes()+":"+myDate.getSeconds());


            $.ajax({
                type: "post",
				contentType: 'application/json',
                url: "https://c.kuaishou.com/rest/wd/feed/profile?kpn=KUAISHOU&captchaToken=",
                data:JSON.stringify({"eid":userId,"count":18,"pcursor":pcursor}),
                async:true,
                timeout:15000,
                success: function(res){
                        console.log(res)
                        pcursor=res.pcursor
						$('#start').text("采集中."+pcursor+".请勿点击")						
                        var feed=res.feeds
						var arr1=[]
						//循环此接口返回的作品
                        for(var i=0;i<feed.length;i++){
							var atlas=feed[i]['ext_params'].atlas
							if(atlas==undefined){
								console.log('非图片')
								continue;
							}
							//一个作品里的图片
							for(var j=0;j<atlas['list'].length;j++){
								let originalPath = atlas['list'][j]
								let url="https://p2.a.yximgs.com"+originalPath;
								let ext = (originalPath.match(/\.([a-z0-9]{2,5})(?:[?#].*)?$/i) || [,'png'])[1].toLowerCase()
								let fileName = (originalPath.split('/').pop() || ('image_' + ti + '_' + j)).replace(/\.[a-z0-9]{2,5}$/i, '')
								feeds.push({"name":fileName,"url":url,"ext":ext})
							}
                            
							ti=ti+1
							if(ti >= Number($('#number').val())){
								console.log("条数："+ti)
								pcursor="no_more";
								break;
							}
                        }
						
                        if(pcursor=="no_more"){
                           console.log("处理完毕")
						   $('#start').text("采集完成 浏览器正在下载 请注意查看进度")
                           console.log(feeds)
						   send(feeds)
                           return false;
                        }		
                        setTimeout(function(){
                            get()
                        },1000)
                        



                },
                error: function(){
                    $('#start').text('采集失败，请重试')
                    alert('快手接口请求失败，请稍后重试')
                }
            });

    }
	
	function leftTrim(str) {  
	  if (str.charAt(0) == " ") {  
		str = str.slice(1);  
		str = leftTrim(str);  
	  }  
		
	  return str;  
	}  
