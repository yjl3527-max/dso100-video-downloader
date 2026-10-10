setTimeout(()=>{
    chrome.runtime.sendMessage({ getToken: true }, function(response) {
        console.log('response.token')
        console.log(response.token)
        if(response.token&&response.token.length>10){
            let dostoken = JSON.parse(localStorage.getItem('token'))
            var token = JSON.parse(response.token).token;
            // 在此处使用获取到的 token，进行后续操作
            localStorage.setItem('token', token)
            localStorage.setItem('userInfo', response.token)
            if(!dostoken){
                setTimeout(() => {
                    location.reload();
                }, 1000);
            }
        }
    });
},200)
setTimeout(()=>{
    $("body").append(`
        <div id="deleteToken"></div>
        <div id="saveToken"></div>
    `)
    $('#deleteToken').click(()=>{
        T.setCookie('dosToken','')
     })
     $('#saveToken').click((e)=>{
       let dataVal = $('#saveToken').attr('data-val')
        T.setCookie('dosToken',JSON.parse(dataVal))
     })
     
},2000)

/**
 *  退出插件
 * document.getElementById('deleteToken').click();
 * 登录插件
 * const saveToken = document.getElementById('saveToken');
    saveToken.setAttribute('data-val', "{token:'2222'}")
    saveToken.click();
 * 
 */