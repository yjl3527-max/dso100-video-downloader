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
	var userId="3x9t74p8fqf2tt6"
    var cjys=1000	 
	var myDate = new Date();
	var kk=0
	function localDateTime(hour, minute){
		var d = new Date(); d.setHours(hour, minute, 0, 0)
		return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')
	}
	if(localStorage.start_time==undefined || localStorage.start_time.indexOf('2023-07-25') === 0){  localStorage.start_time=localDateTime(0, 1) }
	var start_time=localStorage.start_time
	if(localStorage.end_time==undefined || localStorage.end_time.indexOf('2023-07-25') === 0){  localStorage.end_time=localDateTime(23, 59) }
	var end_time=localStorage.end_time
    setTimeout(function(){

		$("body").append("<div id='my' style='z-index:999;top:75px;left:200px;position:absolute;color:red;'>用户id:<input type='text' id='userid'/> 开始时间:<input type='text' id='start_time' value='"+start_time+"'/>  结束时间:<input type='text' id='end_time' value='"+end_time+"'/>  抓取条数:<input type='number' id='number' value='50'/> 下载间隔毫秒：<input id='cjys' value='1000' placeholder=''/> <button id='start'>开始采集</button><div><button id='onedow'>下载这个视频</button></div></div>")
						
	    $("#start").click(function(){
			pcursor = undefined
			feeds = []
			localStorage.start_time=$('#start_time').val()
			start_time=new Date($('#start_time').val()).getTime()

			localStorage.end_time=$('#end_time').val()
			end_time=new Date($('#end_time').val()).getTime()
			
			userId=$("#userid").val().trim();
			if (!userId) { alert('请输入用户ID'); return }
			if (!Number.isFinite(Number($('#number').val())) || Number($('#number').val()) <= 0) { alert('请输入有效的抓取条数'); return }
			if (!Number.isFinite(start_time) || !Number.isFinite(end_time) || start_time > end_time) { alert('请输入有效的时间范围'); return }
			$('#start').text("采集中....请勿点击")
			get()
        })
		$("#onedow").click(function(){
			console.log('下单个视频')
			var src=$('.player-video').attr('src')
			console.log(src)
			var tt = new Date().getTime();
			send([{"name":kk+'_'+tt,"url":src}])
			kk=kk+1
        })

    },3000)


    function get(){
	        // console.log(myDate.getMinutes()+":"+myDate.getSeconds());
            $.ajax({
                type: "post",
                url: "https://www.kuaishou.com/graphql",
                data:{"operationName":"visionProfilePhotoList","variables":{"userId":userId,"pcursor":pcursor,"page":"profile"},"query":"fragment photoContent on PhotoEntity {\n  __typename\n  id\n  duration\n  caption\n  originCaption\n  likeCount\n  viewCount\n  commentCount\n  realLikeCount\n  coverUrl\n  photoUrl\n  photoH265Url\n  manifest\n  manifestH265\n  videoResource\n  coverUrls {\n    url\n    __typename\n  }\n  timestamp\n  expTag\n  animatedCoverUrl\n  distance\n  videoRatio\n  liked\n  stereoType\n  profileUserTopPhoto\n  musicBlocked\n}\n\nfragment recoPhotoFragment on recoPhotoEntity {\n  __typename\n  id\n  duration\n  caption\n  originCaption\n  likeCount\n  viewCount\n  commentCount\n  realLikeCount\n  coverUrl\n  photoUrl\n  photoH265Url\n  manifest\n  manifestH265\n  videoResource\n  coverUrls {\n    url\n    __typename\n  }\n  timestamp\n  expTag\n  animatedCoverUrl\n  distance\n  videoRatio\n  liked\n  stereoType\n  profileUserTopPhoto\n  musicBlocked\n}\n\nfragment feedContent on Feed {\n  type\n  author {\n    id\n    name\n    headerUrl\n    following\n    headerUrls {\n      url\n      __typename\n    }\n    __typename\n  }\n  photo {\n    ...photoContent\n    ...recoPhotoFragment\n    __typename\n  }\n  canAddComment\n  llsid\n  status\n  currentPcursor\n  tags {\n    type\n    name\n    __typename\n  }\n  __typename\n}\n\nquery visionProfilePhotoList($pcursor: String, $userId: String, $page: String, $webPageArea: String) {\n  visionProfilePhotoList(pcursor: $pcursor, userId: $userId, page: $page, webPageArea: $webPageArea) {\n    result\n    llsid\n    webPageArea\n    feeds {\n      ...feedContent\n      __typename\n    }\n    hostName\n    pcursor\n    __typename\n  }\n}\n"},
                async:true,
                timeout:15000,
                success: function(res){
                        console.log(res)
                        pcursor=res.data.visionProfilePhotoList.pcursor
						$('#start').text("采集中."+pcursor+".请勿点击")						
                        var feed=res.data.visionProfilePhotoList.feeds
						var arr1=[]

                        for(var i=0;i<feed.length;i++){
				var timestamp=feed[i]['photo'].timestamp
							console.log(js_date_time(timestamp))
							if(timestamp<start_time){
								console.log('都是后面的视频了')
								pcursor="no_more";
								break;
							}
							if(timestamp>end_time){
								console.log('视频时间还没到')
								continue;
							}
							var name=(feed[i]['photo'].caption).replace(/(^\s*)|(\s*$)/g, "")
							name=name.replace(/~/g,"。")
							name=name.replace(/@/g,"#")
							console.log(name);
				var url=feed[i]['photo'].photoUrl
                            feeds.push({"name":timestamp+'_'+name,"url":url})
								if (feeds.length >= Number($('#number').val())) {
									pcursor = "no_more";
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


	function js_date_time(unixtime) {
		var dateTime = new Date(parseInt(unixtime))
		var year = dateTime.getFullYear();
		var month = dateTime.getMonth() + 1;
		var day = dateTime.getDate();
		var hour = dateTime.getHours();
		var minute = dateTime.getMinutes();
		var second = dateTime.getSeconds();
		var now = new Date();
		var now_new = Date.parse(now.toDateString()); //typescript转换写法
		var milliseconds = now_new - dateTime;
		var timeSpanStr = year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
		return timeSpanStr;
	 }
