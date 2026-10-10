/*
 * @Author: dengzewei
 * @Date: 2024-06-28 09:13:56
 * @LastEditors: dengzewei
 * @LastEditTime: 2024-11-14 18:27:13
 * @FilePath: /dso100-chrome-extension/background.js
 * @Description: 
 * 
 * Copyright (c) 2024 by 抖查查, All Rights Reserved. 
 * 
 */
importScripts("/init.js");
let time

// 与内容脚本通信
function sendMessageToContentScript (message, callback, tabId) {
  const send = (id) => chrome.tabs.sendMessage(id, message, function (response) {
    if (chrome.runtime.lastError) {
      console.log('发送消息错误:', chrome.runtime.lastError.message);
      return;
    }
    if (callback) callback(response);
  });

  if (Number.isInteger(tabId) && tabId >= 0) {
    send(tabId);
    return;
  }

  chrome.tabs.query({
    active: true,
    currentWindow: true,
  }, function (tabs) {
    if (chrome.runtime.lastError) {
      console.log('查询标签页错误:', chrome.runtime.lastError.message);
      return;
    }
    if (!tabs || !tabs[0]) {
      console.log('未找到活动标签页aaa');
      return;
    }
    send(tabs[0].id);
  });
}


// 测试 与内容脚本通信
sendMessageToContentScript(
  {
    cmd: 'test',
    value: '你好，我是popup！',
  },
  function (response) {
    console.log('来自content的回复：' + response)
  },
)

// 监听来自content-script的消息 内容脚本的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('----request---')
  console.log(request)
  if (request.token) {
    chrome.storage.local.set({ token: request.token }, function () {
      console.log('Token 已存储')
    })
  }
  if (request.getToken) {
    chrome.storage.local.get(['token'], function (result) {
      console.log('Token 已提取')
      console.log(result.token)
      sendResponse({ token: result.token })
    })
    return true // 需要在异步完成前返回 true
  }
  if (request.openDownloads) {
    chrome.tabs.create({ url: 'chrome://downloads/' });
    sendResponse({ ok: true });
    return;
  }
  if (request.urls) {
    const delay = Number(request.time);
    dowload(request.urls, Number.isFinite(delay) ? delay : 1000, sender?.tab?.id);
    sendResponse({ ok: true, count: Array.isArray(request.urls) ? request.urls.length : 0 });
  } else {
    sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request))
  }
})

// 监听网络请求 network中的网络请求 data是网络数据
chrome.webRequest.onBeforeRequest.addListener(
  function (data) {
      try { findMedia(data, true); } catch (e) { console.log(e); }
  }, { urls: ["<all_urls>"] }, ["requestBody"]
);
// onResponseStarted 浏览器接收到第一个字节触发，保证有更多信息判断资源类型 data是网络数据
chrome.webRequest.onResponseStarted.addListener(
  function (data) {
      try {
          const requestHeaders = G.requestHeaders.get(data.requestId);
          if (requestHeaders) {
              data.requestHeaders = requestHeaders;
              G.requestHeaders.delete(data.requestId);
          }
          findMedia(data);
      } catch (e) { console.log(e, data); }
  }, { urls: ["<all_urls>"] }, ["responseHeaders"]
);
// 判断特殊页面
function isSpecialPage(url) {
  if (!url || url == "null") { return true; }
  // console.log('------3-------')

  return !(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:"));
}

// 获取文件名 后缀
function fileNameParse(pathname) {
  let fileName = decodeURI(pathname.split("/").pop());
  let ext = fileName.split(".");
  ext = ext.length == 1 ? undefined : ext.pop().toLowerCase();
  return [fileName, ext ? ext : undefined];
}

//检查扩展名以及大小限制
function CheckExtension(ext, size) {
  const Ext = G.Ext.get(ext);
  if (!Ext) { return false; }
  if (!Ext.state) { return "break"; }
  if (Ext.size != 0 && size != undefined && size <= Ext.size * 1024) { return "break"; }
  return true;
}

//获取Header属性的值
function getResponseHeadersValue(data) {
  const header = {};
  if (data.responseHeaders == undefined || data.responseHeaders.length == 0) { return header; }
  for (let item of data.responseHeaders) {
      item.name = item.name.toLowerCase();
      if (item.name == "content-length") {
          header.size ??= parseInt(item.value);
      } else if (item.name == "content-type") {
          header.type = item.value.split(";")[0].toLowerCase();
      } else if (item.name == "content-disposition") {
          header.attachment = item.value;
      } else if (item.name == "content-range") {
          let size = item.value.split('/')[1];
          if (size !== '*') {
              header.size = parseInt(size);
          }
      }
  }
  return header;
}

//检查类型以及大小限制
function CheckType(dataType, dataSize) {
  const typeInfo = G.Type.get(dataType.split("/")[0] + "/*") || G.Type.get(dataType);
  if (!typeInfo) { return false; }
  if (!typeInfo.state) { return "break"; }
  if (typeInfo.size != 0 && dataSize != undefined && dataSize <= typeInfo.size * 1024) { return "break"; }
  return true;
}

// 处理分析 network接收到的数据
function findMedia(data, isRegex = false, filter = false, timer = false) {
  if (timer) { return; }
  // Service Worker被强行杀死之后重新自我唤醒，等待全局变量初始化完成。
  if (!G || !G.initSyncComplete || !G.initLocalComplete || G.tabId == undefined || cacheData.init) {
      setTimeout(() => {
          findMedia(data, isRegex, filter, true);
      }, 233);
      return;
  }
  if (!G.enable) { return; }

  data.getTime = Date.now();  // 增加时间

  if (!isRegex && G.blackList.has(data.requestId)) {
      G.blackList.delete(data.requestId);
      return;
  }
  // 屏蔽特殊页面发起的资源
  if (data.initiator != "null" &&
      data.initiator != undefined &&
      isSpecialPage(data.initiator)) { return; }
  if (G.isFirefox &&
      data.originUrl &&
      isSpecialPage(data.originUrl)) { return; }

  // 屏蔽特殊页面的资源
  if (isSpecialPage(data.url)) { return; }

  const urlParsing = new URL(data.url);

  let [name, ext] = fileNameParse(urlParsing.pathname);

  //正则匹配
  if (isRegex && !filter) {
      for (let key in G.Regex) {
          if (!G.Regex[key].state) { continue; }
          G.Regex[key].regex.lastIndex = 0;
          let result = G.Regex[key].regex.exec(data.url);
          if (result == null) { continue; }
          if (G.Regex[key].blackList) {
              G.blackList.add(data.requestId);
              return;
          }
          data.extraExt = G.Regex[key].ext ? G.Regex[key].ext : undefined;
          if (result.length == 1) {
              findMedia(data, true, true);
              return;
          }
          result.shift();
          result = result.map(str => decodeURIComponent(str));
          if (!result[0].startsWith('https://') && !result[0].startsWith('http://')) {
              result[0] = urlParsing.protocol + "//" + data.url;
          }
          data.url = result.join("");
          findMedia(data, true, true);
          return;
      }
      return;
  }

  // 非正则匹配
  if (!isRegex) {
      data.header = getResponseHeadersValue(data);  // 获取头部信息

      //检查后缀
      if (!filter && ext != undefined) {
          filter = CheckExtension(ext, data.header?.size);
          if (filter == "break") { return; }
      }
      //检查类型
      if (!filter && data.header?.type != undefined) {
          filter = CheckType(data.header.type, data.header?.size);
          if (filter == "break") { return; }
      }
      //查找附件
      if (!filter && data.header?.attachment != undefined) {
          const res = data.header.attachment.match(reFilename);
          if (res && res[1]) {
              [name, ext] = fileNameParse(decodeURIComponent(res[1]));
              filter = CheckExtension(ext, 0);
              if (filter == "break") { return; }
          }
      }
      //放过类型为media的资源 媒体资源
      if (data.type == "media") {
          filter = true;
      }
  }

  if (!filter) { return; }
  // 谜之原因 获取得资源 tabId可能为 -1 firefox中则正常
  // 检查是 -1 使用当前激活标签得tabID
  data.tabId = data.tabId == -1 ? G.tabId : data.tabId;

  cacheData[data.tabId] ??= [];
  cacheData[G.tabId] ??= [];

  // 查重 避免CPU占用 大于500 强制关闭查重
  if (G.checkDuplicates && cacheData[data.tabId].length <= 500) {
      for (let item of cacheData[data.tabId]) {
          if (item.url.length == data.url.length &&
              item.cacheURL.pathname == urlParsing.pathname &&
              item.cacheURL.host == urlParsing.host &&
              item.cacheURL.search == urlParsing.search) { return; }
      }
  }

  chrome.tabs.get(data.tabId, async function (webInfo) {
      if (chrome.runtime.lastError ) { return; }
      // requestHeaders 中cookie 单独列出来
      if (data.requestHeaders?.cookie) {
          data.cookie = data.requestHeaders.cookie;
          data.requestHeaders.cookie = undefined;
      }
      const info = {
          name: name,
          url: data.url,
          size: data.header?.size,
          ext: ext,
          type: data.mime ?? data.header?.type,
          tabId: data.tabId,
          isRegex: isRegex,
          requestId: data.requestId ?? Date.now().toString(),
          extraExt: data.extraExt,
          initiator: data.initiator,
          requestHeaders: data.requestHeaders,
          cookie: data.cookie,
          cacheURL: { host: urlParsing.host, search: urlParsing.search, pathname: urlParsing.pathname },
          getTime: data.getTime
      };
      if(info.url){
        sendMessageToContentScript({videoData:info}, undefined, info.tabId)  // 插件打印日志
      }
      // videoId.push(info)
      // chrome.runtime.sendMessage(info, function () {
      //     if (G.featAutoDownTabId.size > 0 && G.featAutoDownTabId.has(info.tabId)) {
      //         const downDir = info.title == "NULL" ? "CatCatch/" : stringModify(info.title) + "/";
      //         chrome.downloads.download({
      //             url: info.url,
      //             filename: downDir + info.name
      //         });
      //     }
      //     if (G.send2local) {
      //         try { send2local("catch", info, info.tabId); } catch (e) { console.log(e); }
      //     }
      //     if (chrome.runtime.lastError) { return; }
      // });
      // console.log('----info----')
      // console.log(info)
      // 不存在 initiator 和 referer 使用web url代替initiator
      // if (info.initiator == undefined || info.initiator == "null") {
      //     info.initiator = info.requestHeaders?.referer ?? webInfo?.url;
      // }
      // // 装载页面信息
      // info.title = webInfo?.title ?? "NULL";
      // info.favIconUrl = webInfo?.favIconUrl;
      // info.webUrl = webInfo?.url;
      // // 屏蔽资源
      // if (!isRegex && G.blackList.has(data.requestId)) {
      //     G.blackList.delete(data.requestId);
      //     return;
      // }
      // 发送到popup 并检查自动下载
      // chrome.runtime.sendMessage(info, function () {
      //     if (G.featAutoDownTabId.size > 0 && G.featAutoDownTabId.has(info.tabId)) {
      //         const downDir = info.title == "NULL" ? "CatCatch/" : stringModify(info.title) + "/";
      //         chrome.downloads.download({
      //             url: info.url,
      //             filename: downDir + info.name
      //         });
      //     }
      //     if (G.send2local) {
      //         try { send2local("catch", info, info.tabId); } catch (e) { console.log(e); }
      //     }
      //     if (chrome.runtime.lastError) { return; }
      // });

      // // 储存数据
      // cacheData[info.tabId] ??= [];
      // cacheData[info.tabId].push(info);

      // // 当前标签媒体数量大于100 开启防抖 等待5秒储存 或 积累10个资源储存一次。
      // if (cacheData[info.tabId].length >= 100 && debounceCount <= 10) {
      //     debounceCount++;
      //     clearTimeout(debounce);
      //     debounce = setTimeout(function () { save(info.tabId); }, 5000);
      //     return;
      // }
      // // 时间间隔小于500毫秒 等待2秒储存
      // if (Date.now() - debounceTime <= 500) {
      //     clearTimeout(debounce);
      //     debounceTime = Date.now();
      //     debounce = setTimeout(function () { save(info.tabId); }, 2000);
      //     return;
      // }
      // save(info.tabId);
  });
}

/**
 * 执行下载
 * @param urls
 * @param callable
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeFileName(value, fallback = 'video') {
  let name = String(value ?? '').trim();
  name = name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/[. ]+$/g, '');
  if (!name) name = fallback;
  return name.slice(0, 180);
}

function getDownloadExtension(item) {
  const mime = String(item?.type || item?.mime || '').toLowerCase();
  const explicit = String(item?.ext || item?.extension || '').replace(/^\./, '').toLowerCase();
  const fromUrl = (() => {
    try { return new URL(item.url).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || ''; } catch (_) { return ''; }
  })();
  const fromName = String(item?.name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || '';
  let ext = explicit || fromUrl || fromName;
  if (!ext && mime.startsWith('image/')) ext = mime.split('/')[1];
  if (!ext && mime.startsWith('audio/')) ext = mime.split('/')[1];
  if (!ext || ['m3u8', 'm3u', 'mpd', 'm4s'].includes(ext)) ext = 'mp4';
  if (ext === 'jpeg') ext = 'jpg';
  return ext;
}

function normalizeDownloadItem(item) {
  if (typeof item === 'string') return { url: item, name: 'video' };
  return item && typeof item === 'object' ? item : null;
}

function downloadOne(item) {
  return new Promise(resolve => {
    item = normalizeDownloadItem(item);
    if (!item || !item.url) {
      resolve({ ok: false, error: 'empty-url' });
      return;
    }
    const ext = getDownloadExtension(item);
    const baseName = safeFileName(item.name, 'video');
    const filename = /\.[a-z0-9]{2,5}$/i.test(baseName) ? baseName : `${baseName}.${ext}`;
    chrome.downloads.download({
      url: item.url,
      filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, function (downloadId) {
      const error = chrome.runtime.lastError?.message;
      if (error) console.warn('下载失败:', filename, error);
      resolve({ ok: !error, id: downloadId, filename, error });
    });
  });
}

async function dowload(urls, delay = 1000, tabId) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  const list = urls.map(normalizeDownloadItem).filter(item => item && item.url);
  if (!list.length) return;
  const wait = Number.isFinite(Number(delay)) ? Math.max(100, Math.min(Number(delay), 60000)) : 1000;
  let failedCount = 0;
  for (let i = 0; i < list.length; i++) {
    if (i > 0) await sleep(wait);
    const item = list[i];
    const result = await downloadOne(item);
    if (!result.ok) failedCount++;
    if (Number.isInteger(tabId) && tabId >= 0) {
      sendMessageToContentScript({ downloadProgress: { index: i + 1, total: list.length, failedCount, item, ...result } }, undefined, tabId);
    }
  }
}
