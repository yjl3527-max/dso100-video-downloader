const appendHtml = {
  btnDownload: (index, counter) => {
    index = parseInt(index);
    if (isNaN(index) || index < 1) {
      index = 1;
    }
    counter = parseInt(counter);
    if (counter >= 0) {
      counter = `<div class="number">${counter}</div>`;
    }
    return `
<div class="douyinDownload2" style="z-index: ${index};">
    ${counter}
    <div class="douyinDownload2_top3">
        <img width="22px" height="22px" alt="" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAERSURBVHgB3VTtEYIwDA2eAzBCR+gIuIFu4AhuwAieE9AR3AA20A1gA9kAk7uHhhK+/nm+u3f08vGapqFEv45kztl1XcqfjOlgaphVkiQtbYEIMXPmC3yAshYUTLdWzDFrMDP8Z+V3a8UCjtvbL8IoNiA2nRMsrCAkF5EtRRuKueoEZ8MXrERpCXI+BeyU3zNbvsFAK8GxleQwj1OCT7X7ZG8iX0PfsRoICnSg9CensZjYSmUazOR+aifGSRJZIBaT2z6oODnZjYydUzQ4UzavhrunV/7+UhxZwG2Wkc1bYvDVk2ODAGcFofp4Nq9r/xa/8OvJMUur4qVKA/pTQ6DEusPaWblLz5ej8fN13/x8/TfekmRnUpx+2XYAAAAASUVORK5CYII=">
        <span>下载</span>
    </div>
</div>
`;
  }
};