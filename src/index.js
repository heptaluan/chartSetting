import './css/index.scss';
import './css/color-picker.scss';

import './js/static/color-picker';
import './js/static/dom-to-image';

import './js/static/rangeSlider';
import './js/static/dropdown';

import { chartTemplateList } from './js/static/chart-list'
import { themeList } from './js/static/theme-list'


class Editor {

  constructor(options) {

    // 生成密钥，授权判断
    const key = locked('U2FsdGVkX1/u6EfnJcBwjl1lkrkHd1SLbqY/JBKMPPGUREtzJjAbYQ==')
    if (options.clientId !== key) {
      throw new Error(`client id mismatch`)
    }

    // D3 密钥判断
    window.d3Chart.setUserMd(options.clientId)

    // 配置参数
    const defaultOptions = {
      config: options.showConfig === true ? true : false,
      downloadImage: '',
      exportImage: options.exportImage,
      chartJSON: options.chartJSON ? options.chartJSON : chartTemplateList[2],
      backgroundColor: options.backgroundColor ? options.backgroundColor : '#fff',
      chartColorList: themeList[0].theme.colors
    }

    // 词云图默认配置项
    this.echartsWordCloudOptions = {
      tooltip: {},
      series: [{
        type: 'wordCloud',
        gridSize: 2,
        sizeRange: [12, 50],
        rotationRange: [-90, 90],
        shape: 'pentagon',
        width: 600,
        height: 400,
        drawOutOfBound: true,
        textStyle: {
          normal: {
            color: function () {
              return 'rgb(' + [
                Math.round(Math.random() * 160),
                Math.round(Math.random() * 160),
                Math.round(Math.random() * 160)
              ].join(',') + ')';
            }
          },
          emphasis: {
            shadowBlur: 10,
            shadowColor: '#333'
          }
        },
        data: [
          {
            name: 'Sam S Club',
            value: 10000,
            textStyle: {
              normal: {
                color: 'black'
              },
              emphasis: {
                color: 'red'
              }
            }
          },
          {
            name: 'Macys',
            value: 6181
          },
          {
            name: 'Amy Schumer',
            value: 4386
          },
          {
            name: 'Jurassic World',
            value: 4055
          },
          {
            name: 'Charter Communications',
            value: 2467
          },
          {
            name: 'Chick Fil A',
            value: 2244
          },
          {
            name: 'Planet Fitness',
            value: 1898
          },
          {
            name: 'Pitch Perfect',
            value: 1484
          },
          {
            name: 'Express',
            value: 1112
          },
          {
            name: 'Home',
            value: 965
          },
          {
            name: 'Johnny Depp',
            value: 847
          },
          {
            name: 'Lena Dunham',
            value: 582
          },
          {
            name: 'Lewis Hamilton',
            value: 555
          },
          {
            name: 'KXAN',
            value: 550
          },
          {
            name: 'Mary Ellen Mark',
            value: 462
          },
          {
            name: 'Farrah Abraham',
            value: 366
          },
          {
            name: 'Rita Ora',
            value: 360
          },
          {
            name: 'Serena Williams',
            value: 282
          },
          {
            name: 'NCAA baseball tournament',
            value: 273
          },
          {
            name: 'Point Break',
            value: 265
          }
        ]
      }]
    };

    // 私有变量
    const privateOptions = {
      settingElement: document.getElementById('setting'),
      downloadElement: '',
      chartInstance: '',
      tableInstance: '',
      minValue: '',
      maxValue: '',
      fontFamilyListText: [],
      positionList: [
        '上居左',
        '上居中',
        '上居右',
        '下居左',
        '下居中',
        '下居右'
      ],
      gridPositionList: [
        '全部显示',
        'X轴显示',
        'Y轴显示',
        '不显示'
      ],
      axisLabelPositionList: [
        '全部显示',
        'X轴显示',
        'Y轴显示',
        '不显示'
      ]
    }

    // 合并参数
    this.opts = Object.assign({}, options, defaultOptions, privateOptions);

    // 图表配置项（默认为传入的 JSON）
    if (!this.opts.chartJSON) {
      throw new Error(`need chart json`)
    } else {
      this.block = this.deepClone(this.opts.chartJSON ? this.opts.chartJSON : chartTemplateList[2]);
    }

    // 表格配置项
    this.clipboardCache = '';
    const that = this;
    this.tableOptions = {
      data: that.deepClone(this.block.dataSrc.data[0]),
      manualColumnResize: true,        // 手动更改列距
      colHeaders: true,                // 自定义列表头，可以传递 data 或者布尔值
      rowHeaders: true,                // 行表头，同上
      className: 'htMiddle',
      minCols: 8,                      // 最小行列
      minRows: 13,
      minSpareCols: 1,                 // 列留白
      minSpareRows: 1,                 // 行留白
      rowHeights: 28,
      colWidths: 100,
      copyable: true,
      sortIndicator: true,
      columnSorting: false,             // 允许排序
      allowEmpty: false,
      afterCopy: (changes) => {
        that.clipboardCache = this.stringify(changes);
      },
      afterCut: (changes) => {
        that.clipboardCache = this.stringify(changes);
      },
      afterPaste: (changes) => {
        that.clipboardCache = this.stringify(changes);
      }
    };

    // 动态获取本地引用的字体
    this.getLocalFontFamilyList();

    // 初始化
    this.__initChartEditor();

    // 创建编辑器容器
    this.createEditorBox();

    // 渲染图表
    this.renderChart();

    // 渲染背景色
    this.renderBackgroundColor(this.opts.backgroundColor)

    // 保留一个当前图表的备份，用于补齐颜色面板
    this.oldBlock = this.deepClone(this.opts.chartJSON);

  }

  // 获取父元素
  getParentUrl() {
    var url = null;
    if (parent !== window) {
      try {
        url = parent.location.href;
      }
      catch (e) { url = document.referrer; }
    }
    return url;
  }

  // 解析参数
  getUrlParam(url) {
    const param = {};
    url.replace(/[?&](.*?)=([^&]*)/g, (m, $1, $2) => param[$1] = $2);
    return param;
  }





  /* -------------------------- 初始化 ------------------------------- */

  // 初始化编辑器
  __initChartEditor() {
    if (this.opts.config) {
      this.opts.settingElement.style.display = 'block';
    } else {
      this.opts.settingElement.style.display = 'none';
    }

    // 创建表格、配置面板表头、配置项具体内容
    this.createSettingHeader();
    this.createChoiceBlockListBox();
    this.createSettingContent();

    this.createTableBox();
    this.createTableList();
    this.setHandsontableContextMenu();

    // 头部 tab 切换和图表列表切换
    this.bindSettingTitleClickHandle();
    this.bindSettingContentListClickHandle();

    // 给配置面板当中的 input 添加键盘事件
    this.bindInputBlurHandle();

    // 表格创建完成后进行初始化操作
    this.__initTable();

  }

  // 绑定头部 TAB 切换
  bindSettingTitleClickHandle() {
    const tabSelect = document.querySelectorAll('.tab-select');
    const editBoxs = document.querySelectorAll('.edit-box');
    const tabLength = tabSelect.length;
    const editLength = editBoxs.length;
    const that = this;

    for (let i = 0; i < tabLength; i++) {
      tabSelect[i].onclick = function () {
        // 清除所有 tab 选项标记
        for (let j = 0; j < tabLength; j++) {
          if (tabSelect[j]) {
            tabSelect[j].classList.remove('active');
          }
        }

        // 选中 tab 添加 class active
        tabSelect[i].classList.add('active');

        // 清除所有 Tab 选项内容的显示样式
        for (let k = 0; k < editLength; k++) {
          if (editBoxs[k]) {
            editBoxs[k].classList.remove('active');
          }
        }

        // 选中 tab 对应 content 添加 class active
        editBoxs[i].classList.add('active');

        // 选中 handsontable 重新渲染表格，并且将表格滚动条复位
        if (i === 2) {
          document.querySelector('#table .wtHolder').scrollTo(0, 0)
          that.opts.tableInstance.render();
        }
      };
    }
  }

  // 绑定图表设置列表事件
  bindSettingContentListClickHandle() {
    // 每个配置项头部点击事件
    const settingGroup = document.querySelectorAll('.setting-group');
    const settingTitle = document.querySelectorAll('.setting-group .setting-title');
    const settingGroupLength = settingGroup.length;
    // 给每个标题添加点击事件
    for (let i = 0; i < settingGroupLength; i++) {
      settingTitle[i].addEventListener('click', function () {
        // 如果点击本身存在 active 移除
        if (settingGroup[i].classList.contains('active')) {
          settingGroup[i].classList.remove('active');
        } else {
          for (let j = 0; j < settingGroupLength; j++) {
            if (settingGroup[j]) {
              settingGroup[j].classList.remove('active');
            }
          }
          // 选中 tab 添加class active
          settingGroup[i].classList.add('active');
        }
      }, false);
    }
  }

  // 初始化表格
  __initTable() {
    const that = this;
    const hot = this.opts.tableInstance;

    // 绑定事件
    hot.addHook('afterChange', function (changeData) {
      that.updateTable(changeData, hot)
      that.uploadColorSetting();
    })

    hot.addHook('afterRemoveRow', function (changeData) {
      that.updateTable(changeData, hot)
      that.uploadColorSetting();
    })

    hot.addHook('afterRemoveCol', function (changeData) {
      that.updateTable(changeData, hot)
      that.uploadColorSetting();
    })

    hot.addHook('afterUndo', function (changeData) {
      that.updateTable(changeData, hot)
      that.uploadColorSetting();
    })

  }

  // 根据数据补齐颜色列表
  finishColorListLength() {

    // 根据图表类型确定颜色列表依据长度（横向或者竖向）
    let newLegendList
    switch (this.block.templateSwitch) {
      case 'cross':
        newLegendList = this.block.dataSrc.data[0][0];
        // 针对斜率图
        if (this.block.templateId === '154778232785223023') {
          newLegendList = _.unzip(this.block.dataSrc.data[0])[0];
        }
        break;
      case 'key-value':
        newLegendList = (_.unzip(this.block.dataSrc.data[0]))[0];
        break;
      case 'tree':
      case 'sunburst':
      case 'tree-value':
      case 'obj-n-value':
      case 'obj-type-value':
        newLegendList = _.uniq((_.unzip(this.block.dataSrc.data[0]))[0]);
        break;
      case 'sankey':
        newLegendList = _.compact(_.uniq([...(_.unzip(this.block.dataSrc.data[0]))[0], ...(_.unzip(this.block.dataSrc.data[0]))[1]]));
        break;
      default:
        break;
    }

    // 旧颜色列表
    let oldColorList = this.deepClone(this.oldBlock.props.colors.list);

    // 新数据长度减去旧颜色差值，小于等于0，将颜色变成（旧颜色列表取新数据长度-1），
    // 数据多一个行首需要-1，否则按规则变颜色（旧颜色最后一个颜色数字，后面数据颜色递增，字符串，后面从0开始递增，最大为14）
    let diffNum = newLegendList.length - 1 - oldColorList.length;
    if (diffNum <= 0) {
      // 针对清空操作
      if (newLegendList.length < 1) {
        oldColorList.length = 0;
      } else {
        // 针对 圆环进度图 / 半圆环进度图 / 条形进度图，始终只有有两个颜色
        if (this.block.templateId === "154778171740391769" || this.block.templateId === "154777820323716078" || this.block.templateId === '154778145806026722') {
          oldColorList.length = 2;
        } else {
          oldColorList.length = newLegendList.length - 1;
        }
      }

      this.block.props.colors.list = oldColorList;
    } else {
      let copyList = this.deepClone(oldColorList);
      let lastNum;
      if (copyList.length > 0) {
        lastNum = copyList.pop();
      } else {
        lastNum = -1;
      }
      // 判断颜色列表最后一个数字是否是数字，数字递增，字符串则从 0 开始， 0 - 14 为主题色
      if (typeof lastNum === 'number') {
        for (let i = 0; i < diffNum; i++) {
          let num = lastNum + i + 1;
          if (num > 14) {
            num = this.down14(num);
          }
          oldColorList.push(num);
        }
      } else {
        for (let i = 0; i < diffNum; i++) {
          let num = i;
          if (num > 14) {
            num = this.down14(num);
          }
          oldColorList.push(num);
        }
      }
      this.block.props.colors.list = oldColorList;
    }

  }

  // 处理大于 14 的数字转成 0- 14
  down14(num) {
    if (num % 15 === 0) {
      num = 0;
    } else {
      num = Math.abs(num - Math.floor(num / 15) * 15);
    }
    return num;
  }

  // 更新表格
  updateTable(changeData, hot) {
    if (!changeData) return;

    // 生成新数据
    const totalCol = hot.countCols();
    const totalRow = hot.countRows();

    // 过滤空项
    let wideCol = totalCol;
    for (let i = totalCol - 1; i >= 0; i--) {
      if (!hot.isEmptyCol(i)) {
        wideCol = i;
        break;
      }
    }
    let wideRow = totalRow;
    for (let i = totalRow - 1; i >= 0; i--) {
      if (!hot.isEmptyRow(i)) {
        wideRow = i;
        break;
      }
    }

    // 生成新数据
    const newData = hot.getData(0, 0, wideRow, wideCol);

    // 利用新数据更新图表
    this.block.dataSrc.data[0] = newData;
    this.opts.chartInstance.setOption(this.block)

    // 根据新数据的长度补齐颜色列表（增加或者减少）
    this.finishColorListLength()

    // 数据更新完成之后保留一份更改后的 的数据，用于之后的比对来进行颜色的补齐
    this.oldBlock = this.deepClone(this.block)

  }

  // 设置右键菜单
  setHandsontableContextMenu() {
    const that = this;
    const hotInstance = this.opts.tableInstance;
    this.opts.tableInstance.updateSettings({
      contextMenu: {
        callback: (key, options) => {
          that.opts.chartInstance.setOption(that.block);
        },
        items: {
          'cut': {
            name: '剪切'
          },
          'copy': {
            name: '复制'
          },
          'hr1': '---------',
          'paste': {
            name: '粘贴',
            disabled: function () {
              return that.clipboardCache.length === 0;
            },
            callback: function () {
              var plugin = this.getPlugin('copyPaste');
              this.listen();
              plugin.paste(that.clipboardCache);
              // 修复粘贴后，滚动条置底
              $('.innerBorderLeft .wtHolder').scrollLeft(0)
              $('.innerBorderLeft .wtHolder').scrollTop(0)
            }
          },
          'hr2': '---------',
          'remove': {
            name: '清除',
            callback: function () {
              return hotInstance.emptySelectedCells()
            }
          },
          'remove_row': {
            name: '删除所在行'
          },
          'remove_col': {
            name: '删除所在列'
          },
          'hr3': '---------',
          'row_above': {
            name: '在上方插入一行'
          },
          'row_below': {
            name: '在下方插入一行',
          },
          'col_left': {
            name: '在左侧插入一列',
          },
          'col_right': {
            name: '在右侧插入一列',
          }
        }
      }
    }, false);
  }

  // 处理表格粘贴内容
  stringify(arr) {
    var r, rlen, c, clen, str = '', val;
    for (r = 0, rlen = arr.length; r < rlen; r += 1) {
      for (c = 0, clen = arr[r].length; c < clen; c += 1) {
        if (c > 0) { str += '\t'; }
        val = arr[r][c];
        if (typeof val === 'string') {
          if (val.indexOf('\n') > -1) {
            str += '"' + val.replace(/"/g, '""') + '"';
          } else {
            str += val;
          }
        } else if (val === null || val === void 0) {
          str += '';
        } else {
          str += val;
        }
      }
      str += '\n';
    }
    return str;
  }

  // 重新更新图表
  reloadChart(data) {
    // 弹框
    this.showModal(data);
  }

  reloadTrueChart(data) {
    // 更新当前的 block（需要注意，不能直接操作之前的数组）
    this.block = this.deepClone(data);
    this.opts.chartJSON = this.deepClone(data);

    // 更新当前的表格数据
    this.tableOptions.data = (this.deepClone(data)).dataSrc.data[0];

    // 删除之前的图表（如果存在则清空之前的节点）并且利用新的数据和方式新增图表
    if (document.getElementById('editor')) {
      this.remove('#editor')
    }

    // color-picker 同理（批量删除）
    if (document.querySelector('.sp-container')) {
      const colorPickerElement = document.querySelectorAll('.sp-container');
      for (let i = 0; i < colorPickerElement.length; i++) {
        if (colorPickerElement[i]) {
          this.remove('.sp-container')
        }
      }
    }

    // 创建编辑器容器
    this.createEditorBox();

    // 渲染图表
    this.renderChart();

    // 重新渲染操作界面
    this.reloadSettingContent()

    // 切换图表之后保留一个当前图表的备份，用于补齐颜色面板
    this.oldBlock = this.deepClone(this.block);
  }

  // 打开弹框
  showModal(data) {
    let mask = document.createElement('div');
    let modal = document.createElement('div');
    const that = this;
    mask.id = 'mask';
    modal.id = 'modal';
    document.getElementById('editor-box').appendChild(mask);
    document.getElementById('editor-box').appendChild(modal);

    modal.innerHTML = `
      <h2>提示</h2>
      <p>切换新图表会替换原图表及数据，确定切换吗？</p>
      <div class='button-tip'>
        <button id='cancelButton'>取消</button>
        <button id='confirm'>确定</button>
      </div>
    `
    document.getElementById('cancelButton').onclick = function () {
      document.getElementById('editor-box').removeChild(modal);
      document.getElementById('editor-box').removeChild(mask);
    }

    document.getElementById('confirm').onclick = function () {
      document.getElementById('editor-box').removeChild(modal);
      document.getElementById('editor-box').removeChild(mask);

      // 执行重载图表
      that.reloadTrueChart(data);
    }
  }

  // 重新渲染操作界面
  reloadSettingContent() {
    // 重新渲染面板操作
    const settingBox = document.getElementById('setting-box')

    // 清空图表设置和编辑数据
    settingBox.innerHTML = '';

    // 重新生成
    this.createSettingContentList();

    // 绑定事件
    this.bindSettingContentListClickHandle();
    this.bindInputBlurHandle();

    // 重新更新数据
    this.opts.tableInstance.loadData(this.deepClone(this.block.dataSrc.data[0]))
  }


  /* -------------------------- API 接口列表 ------------------------------- */


  // 导出图片
  exportImage(options, callback) {
    let mask = document.createElement('div');
    let loading = document.createElement('div');
    mask.id = 'mask';
    loading.id = 'loading';
    document.getElementById('editor-box').appendChild(mask);
    document.getElementById('editor-box').appendChild(loading);
    loading.innerHTML = `
      <div class="circlebox">
        <p></p>
        <p></p>
        <p></p>
        <p></p>
      </div>
      <div class="circlebox">
        <p></p>
        <p></p>
        <p></p>
        <p></p>
      </div>
    `;

    this.filterProjectFonts();
    const box = document.getElementById('editor');
    if (!box) return;
    let scale = options.scale;
    if (scale) {
      scale = scale > 5 ? 5 : scale
    } else {
      scale = 1
    }
    if (!options.transparent) options.transparent = false

    domtoimage.toBlob(box, {
      width: 500 * scale,
      height: 400 * scale,
      style: {
        'margin': '0',
        'border': 'none',
        'border-radius': 0,
        'transform': `scale(${scale})`,
        'transform-origin': 'top left',
        'box-shadow': 'none',
        'background': options.transparent === false ? (options.background ? options.background : '#fff') : 'transparent'
      }
    }).then(function (blod) {
      $.ajax({
        url: 'https://dydata.io/vis/dychart/upload/binary_image',
        data: blod,
        type: 'POST',
        contentType: false,
        processData: false,
        success: function (res) {
          if (res.resultCode === 1000) {
            document.getElementById('editor-box').removeChild(loading);
            document.getElementById('editor-box').removeChild(mask);
            callback(res.data.url)
          }
        }
      })
    }).catch(function (error) {
      console.error('upload image error', error);
    });
  }

  // 更新 JSON
  updateJSON(updateJSON, callback) {
    if (!updateJSON) return;
    // 利用传递进来的 JSON 手动更新图表
    this.reloadChart(updateJSON)
    callback && callback()
  }

  // 导出 JSON
  getJSON(callback) {
    callback(this.block)
  }


  /* -------------------------- 创建面板操作 ------------------------------- */

  // 创建图表选择列表容器
  createChoiceBlockListBox() {
    const settingHeader = document.createElement('div');
    settingHeader.className = 'edit-box choice-block-box active';
    settingHeader.innerHTML = `
      <div class="block-list">${this.createChoiceBlockList()}</div>
    `
    this.opts.settingElement.appendChild(settingHeader);

    // 列表创建完成之后，绑定点击事件
    this.bindChartListClickHandle();

  }

  // 创建图表选择列表
  createChoiceBlockList() {
    let list = '';
    for (let i = 0; i < chartTemplateList.length; i++) {
      list += `
        <li class="chart-list">
          <img src="${chartTemplateList[i].thumb}">
          <span>${chartTemplateList[i].title}</span>
        </li>
      `
    }
    return list;
  }

  // 绑定图表选择列表
  bindChartListClickHandle() {
    const chartListElement = document.querySelectorAll('.chart-list')
    if (!chartListElement) return;
    const that = this;
    for (let i = 0; i < chartListElement.length; i++) {
      chartListElement[i].addEventListener('click', function () {
        that.reloadChart(chartTemplateList[i])
      }, false)
    }
  }

  // 创建表格容器
  createTableBox() {
    const table = document.createElement('div');
    table.className = 'edit-box table';
    table.id = 'table';
    this.opts.settingElement.appendChild(table);
  }

  // 创建表格具体内容
  createTableList() {
    // 表格创建完成以后保留一个表格句柄用于后面操作
    this.opts.tableInstance = new Handsontable(document.getElementById('table'), this.tableOptions);
  }

  // 创建配置面板表头编辑按钮并且绑定事件
  createSettingHeader() {
    const settingHeader = document.createElement('div');
    settingHeader.className = 'setting-header';
    settingHeader.innerHTML = `
      <div class="choice-block tab-select active">图表选择</div><div class="edit-block tab-select">图表设置</div><div class="edit-table tab-select">编辑数据</div>
    `
    this.opts.settingElement.appendChild(settingHeader);
  }

  // 创建配置面板
  createSettingContent() {

    const settingBox = document.createElement('div');
    settingBox.className = 'edit-box'
    settingBox.id = 'setting-box'
    this.opts.settingElement.appendChild(settingBox)

    this.createSettingContentList()
  }

  // 创建配置面板列表
  createSettingContentList() {
    // 添加主题面板
    this.createThemeSetting();

    // 只有标签配置项存在，才去加载标签面板（多维雷达图也没有轴标签）
    if (this.block.props.label) {
      this.createLabelSetting();
    }

    // 词云图的配置面板为单独项
    if (this.block.templateId === '114473474859453649') {
      // 词云图创建单独的颜色面板
      this.createWordcloudColorSettinge();
    } else {
      // 只有 key-value 类型图表才去创建映射面板
      if (
        this.block.templateSwitch === 'key-value' ||
        this.block.templateId === '4612096174443311107'  // 分组气泡图
      ) {
        this.createMapSetting();
      }

      this.createTitleSetting();
      this.createFontSetting();
      this.createColorSetting();
      this.createLegendSetting();
    }

    this.createAxisSetting();
    this.createTooltipSetting();
  }




  /* -------------------------- 主题面板 ------------------------------- */
  createThemeSetting() {
    const themeSetting = document.createElement('div');
    themeSetting.className = 'setting-group active'
    themeSetting.innerHTML = `
      <div class="setting-title">主题</div>
      <div class="setting-content">

        <div class="small-title">主题选择</div>
        <div id="themeDropdown" class="dropdown-menu"></div>

        <div class="color-picker-box">
          <input type="text" id="pageColorPicker">  
          <div class="color-picker-left">画布颜色</div>
        </div>

        <div id="themeReset" class="reset-btn">恢复默认设置</div>

      </div>
    `
    document.getElementById('setting-box').appendChild(themeSetting)

    // 绑定标题面板相关事件
    this.bindPageColorPickerHandle();

    this.bindThemeDropdownHandle()
    this.bindThemeResetHandle();

  }

  // 初始化题切换下拉菜单
  initThemeDropdown() {
    $('#themeDropdown').dropdown({
      list: this.formatDropdownColorList(themeList),
      index: 0,
      updateIndex: true
    })
  }

  // 绑定主题切换下拉菜单事件
  bindThemeDropdownHandle() {
    const that = this;
    $('#themeDropdown').dropdown({
      list: this.formatDropdownColorList(themeList),
      bindClick: true,
      callback: function (index) {
        // 主题切换需要将原始数据的主题同时修改
        that.opts.chartJSON.theme = themeList[index].theme
        that.block.theme = themeList[index].theme

        that.renderBackgroundColor(that.block.theme.backgroundColor)
        setTimeout(() => {
          $('#pageColorPicker').spectrum('set', that.block.theme.backgroundColor);
        }, 0);

        // 替换当前的颜色面板
        that.opts.chartColorList = themeList[index].theme.colors;

        // 替换当前 block
        that.replaceCurrentBlock();

        // 清除所有 color-picker
        $('.sdk-color-picker').remove();

        // 更新面板操作
        that.updateAllProject();

        // 更新主题-画布颜色
        that.bindPageColorPickerHandle();

        // 更新标签颜色
        that.bindLabelTextColorPicer();
        that.bindLabelNumberColorPicer();

        // 更新标题颜色
        that.bindTitleColorPickerHandle();

        // 更新文字颜色
        that.bindFontSizeColorPickerHandle();

        // 更新颜色面板
        that.uploadColorSetting();

        // 更新网格线颜色
        if (that.block.props.axis && that.block.props.axis.grid) {
          that.bindGridColorPickerHandle();
        }

        // 更新轴颜色
        if (that.block.props.axis && that.block.props.axis.color) {
          that.bindAxisColorPickerHandle();
        }

        that.opts.chartInstance.setOption(that.block);

      }
    })
  }

  // 绑定画布背景切换事件
  bindPageColorPickerHandle() {
    const that = this;
    $('#pageColorPicker').spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showPalette: true,
      showButtons: false,
      hideAfterPaletteSelect: true,
      showSelectionPalette: false,
      containerClassName: 'sdk-color-picker',
      color: that.opts.backgroundColor ? that.opts.backgroundColor : '#fff',
      palette: that.opts.chartColorList,
      change: function (color) {
        // 仅更新背景色
        that.renderBackgroundColor(color.toHexString())
      }
    });

    // 监听 dragstop 事件
    $('#pageColorPicker').on('dragstop.spectrum', function (e, color) {
      // 仅更新背景色
      that.renderBackgroundColor(color.toHexString())
    })

    // 手动监听 input 输入事件
    $('#pageColorPicker').spectrum('container').find('.sp-input').change(function (e) {
      if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
        // 仅更新背景色
        that.renderBackgroundColor(color.toHexString())
      }
    });
  }

  // 绑定主题重置事件
  bindThemeResetHandle() {
    const that = this;
    const themeResetElement = document.getElementById('themeReset');
    if (!themeResetElement) return;

    themeResetElement.addEventListener('click', function () {
      that.bindResetHandle('theme')
    })
  }

  // 用选择后的主题色替换当前的数据
  replaceCurrentBlock() {
    // 将新主题当中的参数替换给当前的 block
    // 暂时只更新部分字体与颜色
    if (this.block.props.axis) {
      this.block.props.axis.color = this.block.theme.axis.color;
      if (this.block.props.axis.grid) {
        this.block.props.axis.grid.color = this.block.theme.grid.color;
      }
    }
    this.block.props.font.color = this.block.theme.fonts.color;
    this.block.props.font.fontFamily = this.block.theme.fonts.fontFamily;
    this.block.props.font.fontSize = this.block.theme.fonts.fontSize;
  }

  // 初始化整体项目（主题切换之后数据还原）
  updateAllProject() {

    // 标签
    this.initLabelSwitch()
    this.initLabelCheckedbox()

    // 标题
    this.initTitleSwitch()
    this.initTitleInput()
    this.initTitleColorPicker()
    this.initTitleFontFamilySelected()
    this.initTitleInputRange()
    this.initTitlePositionSelected()

    // 文字
    this.initFontSizeColorPicker()
    this.initFontSizeSelected()
    this.initFontSizeInputRang()

    // 颜色
    this.uploadColorSetting()

    // 图例
    this.initLegendSwitch();
    this.initLegendPositionSelected();

  }


  /* -------------------------- 标签面板 ------------------------------- */
  createLabelSetting() {
    // 无标签列表
    // 没有标签的图表，暂时写死，
    const noLabelLists = [
      '4447460703254610041',      // 人形饼图
      '5543734748594536502',      // 权重树图
      '5543734748595436502',      // 无权重树图
      '111734748594536325',       // 象形柱状图
      '5544734748594536478',      // 分面柱图
      '4612096174443311107',      // 分组气泡图
      '5544734748594536500',      // 弦图
      '5543533748794536504',      // 桑基图纵向
      '5543733748594536504',      // 桑基图横向
      '5543733748594536505',      // 桑基图二列
      '5544734748594536484',      // 热力日历图
      '4447460703254610031',      // 水波图
      '154771854328053247',       // 弧长链接图
      '154777693253141239',       // 甘特图
      '114473474859453649',       // 词云图
      '4612096174443311114',      // 变形饼图（渐变色）
      '444746070325460995',       // 基础线形图
      '5544734748594536440',      // 雨量流量折线图
      '5544734748594536441',      // 雨量流量面积图
      '3612096174443311121',      // 极坐标气泡图
      '3612096174443311122',      // 打卡气泡图
      '3612096174443311123'       // 多轴气泡图
    ]
    // 如果没有标签就不需要此方法
    if (noLabelLists.indexOf(this.block.templateId) > -1) {
      return;
    }
    const labelSetting = document.createElement('div');
    labelSetting.className = 'setting-group'
    labelSetting.innerHTML = `
      <div class="setting-title">标签</div>
      <div class="setting-content">

        ${this.createLabelSwitch()}

        ${this.createyLabelSelected()}

        ${this.createyLabelContent()}

        ${this.createyLabelText()}

        ${this.createyLabelNumber()}

        <div id="labelReset" class="reset-btn">恢复默认设置</div>
        
      </div>
    `
    document.getElementById('setting-box').appendChild(labelSetting);

    // 初始化相关组件初始值，绑定标签面板相关事件
    this.initLabelSwitch();
    this.bindLabelSwitchHandle();

    this.initLabelBarSwitch();
    this.bindLabelBarSwitchHandle();

    this.initLabelLineSwitch();
    this.bindLabelLineSwitchHandle();

    this.initLabelTextSwitch();
    this.bindLabelTextSwitchHandle();

    this.initLabelNumberSwitch();
    this.bindLabelNumberSwitchHandle();

    this.bindLabelSelectedHandle();
    this.initLabelSelected();

    this.bindLabelBarSelectedHandle();
    this.initLabelBarSelected();

    this.bindLabelLineSelectedHandle();
    this.initLabelLineSelected();

    this.initLabelCheckedbox();
    this.bindLabelCheckedboxHandle();

    this.bindLabelTextColorPicer();
    this.bindLabelTextFamily();
    this.bindLabelTextFontSize();

    this.bindLabelNumberColorPicer();
    this.bindLabelNumberFamily();
    this.bindLabelNumberFontSize();

    this.initLabelText();
    this.initLabelNumber();

    this.bindLabelResetHandle();
  }

  // 创建标签显示内容
  createLabelCheckBox(options) {
    if (!options) {
      return '';
    } else {
      let labelContentOptions = '';
      for (let i = 0; i < options.length; i++) {
        labelContentOptions += `
          <div class="checked-list">
            <input value="${options[i]}" class="label-checked-input" type="checkbox" id="map-${i}">
            <label for="map-${i}">${options[i]}</label>
          </div>
        `
      }
      return labelContentOptions;
    }
  }

  createLabelSwitch() {
    // 圆环 / 半圆环进度图显示 '文字标签'，其他显示 '标签'
    const labelTextList = ['154778171740391769', '154777820323716078'];
    if (labelTextList.indexOf(this.block.templateId) > -1) {
      return ``;
      // 折柱混合单独标签样式
    } else if (this.block.templateId === '5544734748594536332') {
      return `
        <div class="small-title">显示柱形标签</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="labelBarSwitch">

        <div class="small-title">位置</div>
        <div class="dropdown-menu" id="barLabel"></div>

        <div class="small-title">显示折线标签</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="labelLineSwitch">

        <div class="small-title">位置</div>
        <div class="dropdown-menu" id="lineLabel"></div>
      `
    } else {
      return `
        <div class="small-title">标签显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="labelSwitch">
      `;
    }

  }

  // 创建标签位置
  createyLabelSelected() {
    if (this.block.props.label.positionOptions) {
      return `
        <div class="small-title">位置</div>
        <div class="dropdown-menu title-margin" id="labelPositionList"></div>
      `
    } else {
      return ''
    }
  }

  // 创建标签内容
  createyLabelContent() {
    if (this.block.props.label.contentOption) {
      return `
        <div class="small-title">显示内容</div>
        <div class="checked-box title-margin">
          ${this.createLabelCheckBox(this.block.props.label.contentOption)}
        </div>
      `;
    } else {
      return '';
    }
  }

  // 创建标签文本
  createyLabelText() {
    if (this.block.props.label.textLabel) {
      return `
        ${this.isShowTextLabelSwitch()}

        <div class="color-picker-box">
          <input type="text" id="labelTextColorPicker">  
          <div class="color-picker-left">颜色</div>
        </div>

        <div class="small-title color-picker-margin">字体</div>
        <div id="labelFontFamily" class="dropdown-menu title-margin"></div>
        
        <div class="small-title">字号(px)</div>
        <div id="labelInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.label.textLabel.fontSize)}
        </div>
      `;

    } else {
      return '';
    }
  }

  createyLabelNumber() {
    if (this.block.props.label && this.block.props.label.numberLabel) {
      return `
        <div class="small-title">数字标签显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="numberLabelSwitch">

        <div class="color-picker-box">
          <input type="text" id="labelNumberColorPicker">  
          <div class="color-picker-left">颜色</div>
        </div>

        <div class="small-title color-picker-margin">字体</div>
        <div id="labelNumberFontFamily" class="dropdown-menu title-margin"></div>
        
        <div class="small-title">字号(px)</div>
        <div id="labelNumberInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.label.numberLabel.fontSize)}
        </div>
      `;

    } else {
      return '';
    }
  }

  isShowTextLabelSwitch() {
    // 圆环 / 半圆环进度图显示 '文字标签'，其他显示 '标签'
    const labelTextList = ['154778171740391769', '154777820323716078'];
    // 半圆环/圆环
    if (labelTextList.indexOf(this.block.templateId) > -1) {
      return `
        <div class="small-title">文字标签显示</div>

        <input class="switch switch-anim title-margin" type="checkbox" id="textLabelSwitch">
      `;
    } else {
      return ``;
    }
  }

  // 绑定标签背景切换事件
  bindLabelTextColorPicer() {
    if (this.block.props.label && this.block.props.label.textLabel) {
      const that = this;
      $('#labelTextColorPicker').spectrum({
        preferredFormat: 'hex',
        showInput: true,
        showPalette: true,
        showButtons: false,
        hideAfterPaletteSelect: true,
        showSelectionPalette: false,
        containerClassName: 'sdk-color-picker',
        color: that.block.props.label.textLabel.color ? that.block.props.label.textLabel.color : '#000',
        palette: that.opts.chartColorList,
        change: function (color) {
          that.block.props.label.textLabel.color = color.toHexString();
          that.opts.chartInstance.setOption(that.block);
        }
      });

      // 监听 dragstop 事件
      $('#labelTextColorPicker').on('dragstop.spectrum', function (e, color) {
        that.block.props.label.textLabel.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block);
      })

      // 手动监听 input 输入事件
      $('#labelTextColorPicker').spectrum('container').find('.sp-input').change(function (e) {
        if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
          that.block.props.label.textLabel.color = color.toHexString();
          that.opts.chartInstance.setOption(that.block);
        }
      });

    }
  }

  // 绑定标签字体
  bindLabelTextFamily() {
    const that = this;
    $('#labelFontFamily').dropdown({
      list: that.deepClone(that.opts.fontFamilyListText),
      callback: function (index) {
        that.block.props.label.textLabel.fontFamily = that.opts.fontFamilyListText[index];
        that.opts.chartInstance.setOption(that.block);
      },
      bindClick: true
    })
  }

  // 绑定标签字体大小
  bindLabelTextFontSize() {
    if (this.block.props.label.textLabel) {
      const labelInputRangeBox = document.querySelector('#labelInputRangeBox .input-range');
      const that = this;
      // 滑块事件
      $(labelInputRangeBox).RangeSlider({
        min: 0,
        max: 100,
        step: 1,
        callback: _ => {
          that.block.props.label.textLabel.fontSize = labelInputRangeBox.value;
          that.opts.chartInstance.setOption(that.block);
        }
      });
    }
  }

  bindLabelNumberColorPicer() {
    if (this.block.props.label && this.block.props.label.numberLabel) {
      const that = this;
      $('#labelNumberColorPicker').spectrum({
        preferredFormat: 'hex',
        showInput: true,
        showPalette: true,
        showButtons: false,
        hideAfterPaletteSelect: true,
        showSelectionPalette: false,
        containerClassName: 'sdk-color-picker',
        color: that.block.props.label.numberLabel.color ? that.block.props.label.numberLabel.color : '#000',
        palette: that.opts.chartColorList,
        change: function (color) {
          that.block.props.label.numberLabel.color = color.toHexString();
          that.opts.chartInstance.setOption(that.block);
        }
      });

      // 监听 dragstop 事件
      $('#labelNumberColorPicker').on('dragstop.spectrum', function (e, color) {
        that.block.props.label.numberLabel.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block);
      })

      // 手动监听 input 输入事件
      $('#labelNumberColorPicker').spectrum('container').find('.sp-input').change(function (e) {
        if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
          that.block.props.label.numberLabel.color = color.toHexString();
          that.opts.chartInstance.setOption(that.block);
        }
      });

    }
  }

  // 绑定数字标签字体
  bindLabelNumberFamily() {
    const that = this;
    $('#labelNumberFontFamily').dropdown({
      list: that.deepClone(that.opts.fontFamilyListText),
      callback: function (index) {
        that.block.props.label.numberLabel.fontFamily = that.opts.fontFamilyListText[index];
        that.opts.chartInstance.setOption(that.block);
      },
      bindClick: true
    })
  }

  // 绑定数字标签字体大小
  bindLabelNumberFontSize() {
    if (this.block.props.label && this.block.props.label.numberLabel) {
      const labelInputRangeBox = document.querySelector('#labelNumberInputRangeBox .input-range');
      const that = this;
      // 滑块事件
      $(labelInputRangeBox).RangeSlider({
        min: 0,
        max: 100,
        step: 1,
        callback: _ => {
          that.block.props.label.numberLabel.fontSize = labelInputRangeBox.value;
          that.opts.chartInstance.setOption(that.block);
        }
      });
    }
  }

  // 初始化标签开关初始值
  initLabelSwitch() {
    const labelSwitchElement = document.getElementById('labelSwitch');
    // 设定 checkbox 默认状态
    if (labelSwitchElement) {
      labelSwitchElement.checked = this.block.props.label.display;
    }
  }

  // 绑定标签开关事件
  bindLabelSwitchHandle() {
    const labelSwitchElement = document.getElementById('labelSwitch');
    if (labelSwitchElement) {
      const that = this;
      labelSwitchElement.addEventListener('change', function (e) {
        that.block.props.label.display = this.checked ? true : false;
        that.opts.chartInstance.setOption(that.block)
      })
    }
  }

  initLabelBarSwitch() {
    const labelSwitchElement = document.getElementById('labelBarSwitch');
    // 设定 checkbox 默认状态
    if (labelSwitchElement) {
      labelSwitchElement.checked = this.block.props.label.bardisplay;
    }
  }

  // 绑定标签开关事件
  bindLabelBarSwitchHandle() {
    const labelSwitchElement = document.getElementById('labelBarSwitch');
    if (labelSwitchElement) {
      const that = this;
      labelSwitchElement.addEventListener('change', function (e) {
        that.block.props.label.bardisplay = this.checked ? true : false;
        that.opts.chartInstance.setOption(that.block)
      })
    }
  }

  initLabelLineSwitch() {
    const labelSwitchElement = document.getElementById('labelLineSwitch');
    // 设定 checkbox 默认状态
    if (labelSwitchElement) {
      labelSwitchElement.checked = this.block.props.label.linedisplay;
    }
  }

  // 绑定标签开关事件
  bindLabelLineSwitchHandle() {
    const labelSwitchElement = document.getElementById('labelLineSwitch');
    if (labelSwitchElement) {
      const that = this;
      labelSwitchElement.addEventListener('change', function (e) {
        that.block.props.label.linedisplay = this.checked ? true : false;
        that.opts.chartInstance.setOption(that.block)
      })
    }
  }

  // 初始化文本标签开关初始值
  initLabelTextSwitch() {
    const textLabelSwitchElement = document.getElementById('textLabelSwitch');
    // 设定 checkbox 默认状态
    if (textLabelSwitchElement) {
      textLabelSwitchElement.checked = this.block.props.label.textLabel.show;
    }
  }

  // 绑定文本标签开关事件
  bindLabelTextSwitchHandle() {
    const textLabelSwitchElement = document.getElementById('textLabelSwitch');
    const that = this;
    if (textLabelSwitchElement) {
      textLabelSwitchElement.addEventListener('change', function (e) {
        that.block.props.label.textLabel.show = e.target.checked;
        that.opts.chartInstance.setOption(that.block);
      })
    }
  }

  // 初始化数字标签开关初始值
  initLabelNumberSwitch() {
    const numberLabelSwitchElement = document.getElementById('numberLabelSwitch');
    // 设定 checkbox 默认状态
    if (numberLabelSwitchElement) {
      numberLabelSwitchElement.checked = this.block.props.label.numberLabel.show;
    }
  }

  // 绑定数字标签开关事件
  bindLabelNumberSwitchHandle() {
    const numberLabelSwitchElement = document.getElementById('numberLabelSwitch');
    const that = this;
    if (numberLabelSwitchElement) {
      numberLabelSwitchElement.addEventListener('change', function (e) {
        that.block.props.label.numberLabel.show = e.target.checked;
        that.opts.chartInstance.setOption(that.block);
      })
    }
  }


  // 初始化标签下拉框初始值
  initLabelSelected() {
    if (this.block.props.label.positionChoice) {
      const index = this.block.props.label.positionOptions.indexOf(this.block.props.label.positionChoice);
      const that = this;
      $("#labelPositionList").dropdown({
        list: that.block.props.label.positionOptions,
        index: index > -1 ? index : 0,
        updateIndex: true
      })
    }
  }

  // 绑定标签下拉框事件
  bindLabelSelectedHandle() {
    if (this.block.props.label.positionChoice) {
      const that = this;
      $("#labelPositionList").dropdown({
        list: that.deepClone(that.block.props.label.positionOptions),
        callback: function (index) {
          that.block.props.label.positionChoice = that.block.props.label.positionOptions[index];
          that.opts.chartInstance.setOption(that.block);
        },
        bindClick: true
      })
    }
  }

  bindLabelBarSelectedHandle() {
    if (this.block.props.label.barpositionOptions) {
      const that = this;
      $('#barLabel').dropdown({
        list: that.deepClone(that.block.props.label.barpositionOptions),
        callback: function (index) {
          that.block.props.label.barpositionChoice = that.block.props.label.barpositionOptions[index];
          that.opts.chartInstance.setOption(that.block);
        },
        bindClick: true
      })
    }
  }

  initLabelBarSelected() {
    if (this.block.props.label.barpositionChoice) {
      const index = this.block.props.label.barpositionOptions.indexOf(this.block.props.label.barpositionChoice);
      const that = this;
      $("#barLabel").dropdown({
        list: that.block.props.label.barpositionOptions,
        index: index > -1 ? index : 0,
        updateIndex: true
      })
    }
  }

  bindLabelLineSelectedHandle() {
    if (this.block.props.label.linepositionOptions) {
      const that = this;
      $('#lineLabel').dropdown({
        list: that.deepClone(that.block.props.label.linepositionOptions),
        callback: function (index) {
          that.block.props.label.linepositionChoice = that.block.props.label.linepositionOptions[index];
          that.opts.chartInstance.setOption(that.block);
        },
        bindClick: true
      })
    }
  }

  initLabelLineSelected() {
    if (this.block.props.label.linepositionChoice) {
      const index = this.block.props.label.linepositionOptions.indexOf(this.block.props.label.linepositionChoice);
      const that = this;
      $("#lineLabel").dropdown({
        list: that.block.props.label.linepositionOptions,
        index: index > -1 ? index : 0,
        updateIndex: true
      })
    }
  }

  // 初始化标签显示内容多选框初始值
  initLabelCheckedbox() {
    const labelCheckedboxElement = document.querySelectorAll('.label-checked-input');
    // 设置当前选中项
    for (let i = 0; i < labelCheckedboxElement.length; i++) {
      const needCheckedIndex = (this.block.props.label.contentChoice).indexOf(labelCheckedboxElement[i].value);
      // 原理为先使用当前列表项去匹配需要选中的数组（确定需要选中项）
      // 然后再去原内容数组当中确定该项所在的位置
      if (needCheckedIndex >= 0) {
        const index = this.block.props.label.contentOption.indexOf(labelCheckedboxElement[i].value)
        labelCheckedboxElement[index].checked = true;
      }
    }
  }

  // 绑定标签显示内容多选框事件
  bindLabelCheckedboxHandle() {
    const labelCheckedboxElement = document.querySelectorAll('.label-checked-input');
    // 绑定事件
    const that = this;
    const checkedInput = this.deepClone(this.block.props.label.contentChoice);
    for (let i = 0; i < labelCheckedboxElement.length; i++) {
      labelCheckedboxElement[i].addEventListener('change', function (e) {
        // 选中添加，取消删除
        if (this.checked) {
          checkedInput.push(e.target.value)
        } else {
          const deleteIndex = checkedInput.indexOf(e.target.value);
          if (deleteIndex >= 0) {
            checkedInput.splice(deleteIndex, 1);
          }
        }
        that.block.props.label.contentChoice = checkedInput;
        that.opts.chartInstance.setOption(that.block);
      })
    }

  }

  // 初始化文本标签字体选项
  initLabelText() {
    const label = this.block.props.label;
    const familyFontLists = this.opts.fontFamilyListText;
    if (label.textLabel) {
      // 初始化字体大小
      const labelInputRangeBox = document.querySelector('#labelInputRangeBox .input-range');
      $(labelInputRangeBox).RangeSlider({
        setValue: label.textLabel.fontSize
      });

      // 初始化字体 family
      var index = familyFontLists.indexOf(label.textLabel.fontFamily);
      index = index > -1 ? index : 0;
      $('#labelFontFamily').dropdown({
        list: this.deepClone(familyFontLists),
        index: index,
        updateIndex: true
      })

      // 初始化标签字体颜色
      $('#labelTextColorPicker').spectrum('set', this.setThemeListHexColor(label.textLabel.color));
    }
  }

  initLabelNumber() {
    const label = this.block.props.label;
    const familyFontLists = this.opts.fontFamilyListText;
    if (label.numberLabel) {
      // 初始化字体大小
      const labelInputRangeBox = document.querySelector('#labelNumberInputRangeBox .input-range');
      $(labelInputRangeBox).RangeSlider({
        setValue: label.numberLabel.fontSize
      });

      // 初始化字体 family
      var index = familyFontLists.indexOf(label.numberLabel.fontFamily);
      index = index > -1 ? index : 0;
      $('#labelNumberFontFamily').dropdown({
        list: this.deepClone(familyFontLists),
        index: index,
        updateIndex: true
      })

      // 初始化标签字体颜色
      $('#labelNumberColorPicker').spectrum('set', this.setThemeListHexColor(label.numberLabel.color));
    }
  }

  // 绑定标签重置事件
  bindLabelResetHandle() {
    const that = this;
    const labelResetElement = document.getElementById('labelReset');
    if (!labelResetElement) return;

    labelResetElement.addEventListener('click', function () {
      that.bindResetHandle('label')
    })
  }






  /* -------------------------- 映射面板 ------------------------------- */
  createMapSetting() {
    const mapSetting = document.createElement('div');
    mapSetting.className = 'setting-group'
    mapSetting.innerHTML = `
      <div class="setting-title">映射</div>
      <div class="setting-content">
        ${this.createMapSettingList()}
      </div>
    `

    document.getElementById('setting-box').appendChild(mapSetting)

    // 绑定标题面板相关事件
    this.bindMapSelectHandle();
  }

  // 创建映射面板下拉框
  createMapSettingList() {
    var mapSettingList = this.block.props.map[0];
    var mapList = '';
    for (let i = 0; i < mapSettingList.length; i++) {
      mapList += `
        <div class="small-title">${mapSettingList[i].name}</div>
        <div class="dropdown-menu mapSetting${[i]}"></div>
      `
    }
    return mapList;
  }

  // 绑定标题下拉框事件
  bindMapSelectHandle() {
    var mapSettingList = this.block.props.map[0];
    var dataSrcTitle = (this.block.dataSrc.data[0])[0].filter(v => v !== null)
    for (let i = 0; i < mapSettingList.length; i++) {
      const that = this;
      $(`.mapSetting${i}`).dropdown({
        list: dataSrcTitle,
        index: mapSettingList[i].index,
        callback: function (index) {
          that.block.props.map[0][i].index = index;
          that.opts.chartInstance.setOption(that.block)
        },
        bindClick: true
      })
    }
  }







  /* -------------------------- 标题面板 ------------------------------- */

  // 创建标题面板
  createTitleSetting() {
    const titleSetting = document.createElement('div');
    titleSetting.className = 'setting-group'
    titleSetting.innerHTML = `
      <div class="setting-title">标题</div>
      <div class="setting-content">

        <div class="small-title">标题显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="titleSwitch">

        <div class="small-title">名称</div>
        <input class="title-input title-margin input-text" type="text" id="titleInput">

        <div class="color-picker-box">
          <input type="text" id="titleColorPicker">
          <div class="color-picker-left">标题颜色</div>
        </div>

        <div class="small-title color-picker-margin">字体</div>
        <div id="titleFontSizeDropdown" class="dropdown-menu"></div>

        <div class="small-title">字号(px)</div>
        <div id="titleInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.titleDisplay.fontSize)}
        </div>

        <div class="small-title">位置</div>
        <div id="titlePositionDropdown" class="dropdown-menu"></div>

        <div id="titleReset" class="reset-btn">恢复默认设置</div>
        
      </div>
    `
    document.getElementById('setting-box').appendChild(titleSetting)

    // 绑定标题面板相关事件
    this.initTitleSwitch()
    this.bindTitleSwitchHandle();

    this.initTitleInput()
    this.bindTitleInputHandle();

    this.bindTitleFontFamilySelectedHandle();
    this.initTitleFontFamilySelected();

    this.bindTitlePositionSelectedHandle();
    this.initTitlePositionSelected();

    this.bindTitleInputRangeHandle();
    this.bindTitleColorPickerHandle();
    this.bindTitleResetHandle();
  }

  // 初始化标题开关
  initTitleSwitch() {
    const titleSwitchElement = document.getElementById('titleSwitch');
    // 设定 checkbox 默认状态
    if (this.block.props.titleDisplay.show) {
      titleSwitchElement.checked = true;
    } else {
      titleSwitchElement.checked = false;
    }
  }

  // 绑定标题开关事件
  bindTitleSwitchHandle() {
    const titleSwitchElement = document.getElementById('titleSwitch');
    const that = this;
    titleSwitchElement.addEventListener('change', function (e) {
      that.block.props.titleDisplay.show = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始化标题输入框事件
  initTitleInput() {
    const titleInputElement = document.getElementById('titleInput');
    titleInputElement.value = this.block.props.titleDisplay.text;
  }

  // 绑定标题输入框事件
  bindTitleInputHandle() {
    const titleInputElement = document.getElementById('titleInput');
    const that = this;
    titleInputElement.addEventListener('blur', function (e) {
      that.block.props.titleDisplay.text = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始化标题颜色选择
  initTitleColorPicker() {
    $('#titleColorPicker').spectrum('set', this.setThemeListHexColor(this.block.props.titleDisplay.color));
  }

  // 绑定标题颜色选择事件
  bindTitleColorPickerHandle() {
    const that = this;
    $('#titleColorPicker').spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showPalette: true,
      showButtons: false,
      hideAfterPaletteSelect: true,
      showSelectionPalette: false,
      containerClassName: 'sdk-color-picker',
      color: that.block.props.titleDisplay.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.titleDisplay.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });

    // 监听 dragstop 事件
    $('#titleColorPicker').on('dragstop.spectrum', function (e, color) {
      that.block.props.titleDisplay.color = color.toHexString();
      that.opts.chartInstance.setOption(that.block)
    })

    // 手动监听 input 输入事件
    $('#titleColorPicker').spectrum('container').find('.sp-input').change(function (e) {
      if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
        that.block.props.titleDisplay.color = e.target.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 初始化标题字体下拉框
  initTitleFontFamilySelected() {
    // 找到当前图表的字体，设置默认值
    var index = this.opts.fontFamilyListText.indexOf(this.block.props.titleDisplay.fontFamily);
    index = index > -1 ? index : 0;
    $('#titleFontSizeDropdown').dropdown({
      list: this.deepClone(this.opts.fontFamilyListText),
      index: index,
      updateIndex: true
    })
  }

  // 绑定标题字体下拉框事件
  bindTitleFontFamilySelectedHandle() {
    const that = this;
    $('#titleFontSizeDropdown').dropdown({
      list: that.deepClone(this.opts.fontFamilyListText),
      callback: function (index) {
        that.block.props.titleDisplay.fontFamily = that.opts.fontFamilyListText[index];
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 初始化标题 inputRange
  initTitleInputRange() {
    const titleInputRangeElement = document.querySelector('#titleInputRangeBox .input-range');
    $(titleInputRangeElement).RangeSlider({
      setValue: this.block.props.titleDisplay.fontSize
    });
  }

  // 绑定标题 inputRange 事件
  bindTitleInputRangeHandle() {
    const titleInputRangeElement = document.querySelector('#titleInputRangeBox .input-range');
    const that = this;
    // 滑块事件
    $(titleInputRangeElement).RangeSlider({
      min: 0,
      max: 100,
      step: 1,
      callback: _ => {
        that.block.props.titleDisplay.fontSize = titleInputRangeElement.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 初始化标题位置下拉框
  initTitlePositionSelected() {

    // 找到当前图表的字体，设置默认值
    var titlePositionIndex = 0;

    // 标题位置
    switch (this.block.props.titleDisplay.yPosition) {
      case 'top':
        switch (this.block.props.titleDisplay.xPosition) {
          case 'left':
            titlePositionIndex = 0;
            break;
          case 'center':
            titlePositionIndex = 1;
            break;
          case 'right':
            titlePositionIndex = 2;
            break;
          default:
            break;
        }
        break;
      case 'bottom':
        switch (this.block.props.titleDisplay.xPosition) {
          case 'left':
            titlePositionIndex = 3;
            break;
          case 'center':
            titlePositionIndex = 4;
            break;
          case 'right':
            titlePositionIndex = 5;
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }

    $('#titlePositionDropdown').dropdown({
      list: this.deepClone(this.opts.positionList),
      index: titlePositionIndex,
      updateIndex: true
    })
  }

  // 绑定标题位置下拉框事件
  bindTitlePositionSelectedHandle() {
    // 利用当前所选值更新数据
    const that = this;
    $('#titlePositionDropdown').dropdown({
      list: that.deepClone(this.opts.positionList),
      callback: function (index) {
        switch (index) {
          case 0:
            that.block.props.titleDisplay.xPosition = 'left';
            that.block.props.titleDisplay.yPosition = 'top';
            break;
          case 1:
            that.block.props.titleDisplay.xPosition = 'center';
            that.block.props.titleDisplay.yPosition = 'top';
            break;
          case 2:
            that.block.props.titleDisplay.xPosition = 'right';
            that.block.props.titleDisplay.yPosition = 'top';
            break;
          case 3:
            that.block.props.titleDisplay.xPosition = 'left';
            that.block.props.titleDisplay.yPosition = 'bottom';
            break;
          case 4:
            that.block.props.titleDisplay.xPosition = 'center';
            that.block.props.titleDisplay.yPosition = 'bottom';
            break;
          case 5:
            that.block.props.titleDisplay.xPosition = 'right';
            that.block.props.titleDisplay.yPosition = 'bottom';
            break;
          default:
            break;
        }
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 绑定标题重置事件
  bindTitleResetHandle() {
    const that = this;
    const labelResetElement = document.getElementById('titleReset');
    if (!labelResetElement) return;

    labelResetElement.addEventListener('click', function () {
      that.bindResetHandle('title')
    })
  }




  /* -------------------------- 颜色面板 ------------------------------- */

  // 创建颜色面板
  createColorSetting() {
    const colorSetting = document.createElement('div');
    colorSetting.className = 'setting-group';

    // 根据图表类型的不同生成对应的图表面板
    const newData = this.formatDataSrc()

    colorSetting.innerHTML = `
      <div class="setting-title">颜色</div>
      <div class="setting-content" id="colorSetting">
        ${this.createColorPicker(newData)}
      </div>
    `
    document.getElementById('setting-box').appendChild(colorSetting);

    // 颜色面板创建完成后在加载 colorPicker 组件
    this.__initColorPicker(newData);

    // 绑定重置事件
    this.bindColorResetHandle();
  }

  // 创建词云图专用颜色面板
  createWordcloudColorSettinge() {
    const wordcloudColorSetting = document.createElement('div');
    wordcloudColorSetting.className = 'setting-group';

    // 根据图表类型的不同生成对应的图表面板
    const newData = this.formatDataSrc()

    wordcloudColorSetting.innerHTML = `
      <div class="setting-title">颜色</div>
      <div class="setting-content">

        <div class="wordcloud-color-setting">
          <div class="use-single-color">使用单色</div>
          <input style="margin-bottom: 0;" class="switch switch-anim" type="checkbox" id="wordcloudColorSwitch">
        </div>

        ${this.createColorPicker(newData, true)}
      </div>
    `
    document.getElementById('setting-box').appendChild(wordcloudColorSetting);

    // 绑定面板事件
    this.bindWordcloudColorSwitchHandle();

    // 颜色面板创建完成后在加载 colorPicker 组件
    this.__initColorPicker(newData);
  }

  // 绑定词云图专用颜色面板单色切换事件
  bindWordcloudColorSwitchHandle() {
    const wordcloudColorSwitchElement = document.getElementById('wordcloudColorSwitch');
    if (!wordcloudColorSwitchElement) return;
    const that = this;

    // 设定 checkbox 默认状态
    // if (this.block.props.colors.type === 'single') {
    //   wordcloudColorSwitchElement.setAttribute('checked', 'checked');
    // } else {
    //   wordcloudColorSwitchElement.removeAttribute('checked');
    // }

    // wordcloudColorSwitchElement.addEventListener('change', function (e) {
    //   that.block.props.legend.show = this.checked ? true : false;

    // })

    // that.opts.chartInstance.setOption(that.block)
  }

  // 创建 color-picker
  createColorPicker(data, hiddenLabel) {
    if (data) {
      var colorPicker = '';
      for (let i = 0; i < data.length; i++) {
        colorPicker += `
          <div class="color-group">
            <input type="text" class="color-box${i}">
            <span>${hiddenLabel ? '' : data[i]}</span>
          </div>
        `
      }
      colorPicker += '<div id="colorReset" class="reset-btn">恢复默认设置</div>'
      return colorPicker;
    }
  }

  // 初始化 color-picker
  __initColorPicker(data) {
    const that = this;
    // 判断当前数据长度和颜色列表颜色是否匹配（超出部分进行补齐操作）
    let listColors;
    const oldColorsList = this.deepClone(this.block.props.colors.list);
    const dataLength = data.length;

    // 如果颜色列表长度小于数据长度，就根据数据的长度进行颜色补齐
    if (data.length > oldColorsList.length) {
      const newColorsLength = [];
      for (let i = 0; i < Math.ceil(dataLength / oldColorsList.length); i++) {
        newColorsLength.push(...oldColorsList)
      }
      listColors = newColorsLength.slice(0, dataLength);
      // 将补齐完成的列表重新赋予图表
      this.block.props.colors.list = this.deepClone(listColors)
    } else {
      listColors = this.deepClone(this.block.props.colors.list);
    }
    
    const themeColors = this.block.theme.colors;
    const formattedListColors = this.formatColor(listColors, themeColors);
    
    for (let i = 0; i < data.length; i++) {
      $(`.color-box${i}`).spectrum({
        preferredFormat: 'hex',
        showInput: true,
        showPalette: true,
        showButtons: false,
        hideAfterPaletteSelect: true,
        showSelectionPalette: false,
        containerClassName: 'sdk-color-picker',
        color: formattedListColors[i],
        palette: that.opts.chartColorList,
        change: function (color) {
          // 利用新数据更新图表
          that.block.props.colors.list[i] = color.toHexString();
          that.oldBlock.props.colors.list[i] = color.toHexString();
          that.opts.chartInstance.setOption(that.block)
        }
      });

      // 监听 dragstop 事件
      $(`.color-box${i}`).on('dragstop.spectrum', function (e, color) {
        that.block.props.colors.list[i] = color.toHexString();
        that.oldBlock.props.colors.list[i] = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      })

      // 手动监听 input 输入事件
      $(`.color-box${i}`).spectrum('container').find('.sp-input').change(function (e) {
        if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
          that.block.props.colors.list[i] = e.target.value;
          that.oldBlock.props.colors.list[i] = color.toHexString();
          that.opts.chartInstance.setOption(that.block)
        }
      });
    }
  }

  // 更新颜色面板
  uploadColorSetting() {
    // 清空颜色面板，重新生成
    const newData = this.formatDataSrc()
    const colorSettingBox = document.getElementById('colorSetting')
    colorSettingBox.innerHTML = '';

    // 生成新的面板数据并且插入
    colorSettingBox.innerHTML = this.createColorPicker(newData);

    // 重新绑定重置事件
    this.bindColorResetHandle();

    // 更新数据
    this.__initColorPicker(newData);
  }

  // 绑定颜色面板重置事件
  bindColorResetHandle() {
    const that = this;
    const colorResetElement = document.getElementById('colorReset');
    if (!colorResetElement) return;

    colorResetElement.addEventListener('click', function () {
      setTimeout(() => {
        that.bindResetHandle('color')
      }, 0);
    })
  }





  /* -------------------------- 轴、网格线面板 ------------------------------- */

  // 创建轴、网格线面板
  createAxisSetting() {

    // 如果图表的轴不存在，直接返回
    if (!this.block.props.axis) return;
    if (!this.block.props.axis.grid) return;

    const axisSetting = document.createElement('div');
    axisSetting.className = 'setting-group'
    axisSetting.innerHTML = `
      <div class="setting-title">轴、网格线</div>
      <div class="setting-content">

        <div class="small-title">网格线</div>
        <div id="gridPositionDropdown" class="dropdown-menu"></div>

        <div class="color-picker-box">
          <input type="text" id="gridColorPicker">
          <div class="color-picker-left">网格线颜色</div>
        </div>

          ${this.createAxisLabelTitle()}

          ${this.createyAxisLabel()}
        
          ${this.createyAxisColorPicker()}

          ${this.createyAxisRange()}

        <div id="gridAndAxisReset" class="reset-btn">恢复默认设置</div>

      </div>
    `
    document.getElementById('setting-box').appendChild(axisSetting)

    // 绑定轴、网格线面板相关事件
    this.bindGridSelectedHandle()
    this.initGridSelected()

    this.bindGridColorPickerHandle();

    this.initxAxisInput();
    this.bindxAxisInputHandle();

    this.inityAxisInput();
    this.bindyAxisInputHandle();

    this.bindAxisSelectedHandle();
    this.initAxisSelected()

    this.bindAxisColorPickerHandle();

    // 如果 Range 存在，才执行
    if (this.block.props.axis.y.range) {
      this.inityAxisMinRange()
      this.bindyAxisMinRangeHandle();

      this.inityAxisMaxRange()
      this.bindyAxisMaxRangeHandle();
    }

    // 重置事件
    this.bindGridAndAxisResetHandle();

  }

  // 初始化网格线下拉框
  initGridSelected() {

    // 找到当前网格线显示位置，设置默认值
    var gridShowIndex = 0;

    // 网格线显示位置
    switch (this.block.props.axis.grid.show) {
      case 'all':
        gridShowIndex = 0;
        break;
      case 'x':
        gridShowIndex = 1;
        break;
      case 'y':
        gridShowIndex = 2;
        break;
      case 'none':
        gridShowIndex = 3;
        break;
      default:
        gridShowIndex = 3;
        break;
    }

    $('#gridPositionDropdown').dropdown({
      list: this.deepClone(this.opts.gridPositionList),
      index: gridShowIndex,
      updateIndex: true
    })
  }

  // 绑定网格线下拉框事件
  bindGridSelectedHandle() {
    const that = this;
    $('#gridPositionDropdown').dropdown({
      list: that.deepClone(this.opts.gridPositionList),
      callback: function (index) {
        switch (index) {
          case 0:
            that.block.props.axis.grid.show = 'all';
            break;
          case 1:
            that.block.props.axis.grid.show = 'x';
            break;
          case 2:
            that.block.props.axis.grid.show = 'y';
            break;
          case 3:
            that.block.props.axis.grid.show = 'none';
            break;
          default:
            break;
        }
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 创建轴标题
  createAxisLabelTitle() {
    // 雷达图，玫瑰图没有轴标题
    if (
      this.block.templateId === '5544734748594536491' ||
      this.block.templateId === '5944734748594536331'
    ) {
      return '';
    } else {
      return `
        <div class="small-title color-picker-margin">X轴标题</div>
        <input class="axis-input title-margin input-text" type="text" id="xAxisInput">

        <div class="small-title">Y轴标题</div>
        <input class="axis-input title-margin input-text" type="text" id="yAxisInput">
      `
    }
  }

  // 创建轴标签
  createyAxisLabel() {
    // 雷达图，玫瑰图没有轴标题
    if (
      this.block.templateId === '5544734748594536491' ||
      this.block.templateId === '5944734748594536331'
    ) {
      return '';
    } else {
      return `
        <div class="small-title">轴标签</div>
        <div id="axisDropdown" class="dropdown-menu"></div>
      `
    }
  }

  // 创建轴颜色
  createyAxisColorPicker() {
    // 雷达图，玫瑰图没有轴标题
    if (
      this.block.templateId === '5544734748594536491' ||
      this.block.templateId === '5944734748594536331'
    ) {
      return '';
    } else {
      return `
        <div class="color-picker-box">
          <input type="text" id="axisColorPicker">
          <div class="color-picker-left">轴颜色</div>
        </div>
      `
    }
  }

  // 创建 y 值取值范围
  createyAxisRange() {
    // 雷达图，玫瑰图没有轴标题
    if (
      this.block.templateId === '5544734748594536491' ||
      this.block.templateId === '5944734748594536331'
    ) {
      return '';
    } else {
      return `
        <div class="small-title color-picker-margin">y轴取值范围（Min - Max）</div>
        <div class="y-axis-range">
          <input id="yAxisMinRange" class="input-text" type="text" onafterpaste="if(isNaN(value))execCommand('undo')" onkeyup="if(isNaN(value))execCommand('undo')">
          -
          <input id="yAxisMaxRange" class="input-text" type="text" onafterpaste="if(isNaN(value))execCommand('undo')" onkeyup="if(isNaN(value))execCommand('undo')">
        </div>
      `
    }
  }

  // 初始化网格线颜色选择
  initGridColorPicker() {
    $('#gridColorPicker').spectrum('set', this.block.props.axis.grid.color);
  }

  // 绑定网格线颜色选择事件
  bindGridColorPickerHandle() {
    const that = this;
    $('#gridColorPicker').spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showPalette: true,
      showButtons: false,
      hideAfterPaletteSelect: true,
      showSelectionPalette: false,
      containerClassName: 'sdk-color-picker',
      color: that.block.props.axis.grid.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.axis.grid.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });

    // 监听 dragstop 事件
    $('#gridColorPicker').on('dragstop.spectrum', function (e, color) {
      that.block.props.axis.grid.color = color.toHexString();
      that.opts.chartInstance.setOption(that.block)
    })

    // 手动监听 input 输入事件
    $('#gridColorPicker').spectrum('container').find('.sp-input').change(function (e) {
      if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
        that.block.props.axis.grid.color = e.target.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });

  }

  // 初始化 x 轴输入框
  initxAxisInput() {
    const xAxisInputElement = document.getElementById('xAxisInput');
    if (!xAxisInputElement) return;
    xAxisInputElement.value = this.block.props.axis.x.name
  }

  // 绑定 x 轴输入框事件
  bindxAxisInputHandle() {
    const xAxisInputElement = document.getElementById('xAxisInput');
    if (!xAxisInputElement) return;
    const that = this;
    xAxisInputElement.addEventListener('blur', function (e) {
      that.block.props.axis.x.name = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始化 y 轴输入框
  inityAxisInput() {
    const yAxisInputElement = document.getElementById('yAxisInput');
    if (!yAxisInputElement) return;
    yAxisInputElement.value = this.block.props.axis.y.name
  }

  // 绑定 y 轴输入框事件
  bindyAxisInputHandle() {
    const yAxisInputElement = document.getElementById('yAxisInput');
    if (!yAxisInputElement) return;
    const that = this;
    yAxisInputElement.addEventListener('blur', function (e) {
      that.block.props.axis.y.name = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始轴标签显示下拉框
  initAxisSelected() {

    // 找到当前网格线显示位置，设置默认值
    var axisLabelShowIndex = 0;
    if (this.block.props.axis.x && this.block.props.axis.y) {
      if (this.block.props.axis.x.labelShow && this.block.props.axis.y.labelShow) {
        axisLabelShowIndex = 0;
      } else if (this.block.props.axis.x.labelShow) {
        axisLabelShowIndex = 1;
      } else if (this.block.props.axis.y.labelShow) {
        axisLabelShowIndex = 2;
      } else {
        axisLabelShowIndex = 3;
      }
    } else if (this.block.props.axis.x) {
      if (this.block.props.axis.x.labelShow) {
        axisLabelShowIndex = 0;
      } else {
        axisLabelShowIndex = 1;
      }
    } else if (this.block.props.axis.y) {
      if (this.block.props.axis.y.labelShow) {
        axisLabelShowIndex = 0;
      } else {
        axisLabelShowIndex = 1;
      }
    }

    $('#axisDropdown').dropdown({
      list: this.deepClone(this.opts.gridPositionList),
      index: axisLabelShowIndex,
      updateIndex: true
    })
  }

  // 绑定轴标签显示下拉框事件
  bindAxisSelectedHandle() {
    const that = this;
    $('#axisDropdown').dropdown({
      list: that.deepClone(this.opts.gridPositionList),
      callback: function (index) {
        if (that.opts.axisLabelPositionList.length === 4) {
          switch (index) {
            case 0:
              that.block.props.axis.x.labelShow = true;
              that.block.props.axis.y.labelShow = true;
              break;
            case 1:
              that.block.props.axis.x.labelShow = true;
              that.block.props.axis.y.labelShow = false;
              break;
            case 2:
              that.block.props.axis.x.labelShow = false;
              that.block.props.axis.y.labelShow = true;
              break;
            case 3:
              that.block.props.axis.x.labelShow = false;
              that.block.props.axis.y.labelShow = false;
              break;
            default:
              break;
          }
        } else if (that.opts.axisLabelPositionList[0] === 'X轴显示') {
          switch (index) {
            case 0:
              that.block.props.axis.x.labelShow = true;
              break;
            case 1:
              that.block.props.axis.x.labelShow = false;
              break;
            default:
              break;
          }
        } else {
          switch (index) {
            case 0:
              that.block.props.axis.y.labelShow = true;
              break;
            case 1:
              that.block.props.axis.y.labelShow = false;
              break;
            default:
              break;
          }
        }
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 初始化轴颜色
  initAxisColorPicker() {
    $('#axisColorPicker').spectrum('set', this.block.props.axis.color);
  }

  // 绑定轴颜色选择事件
  bindAxisColorPickerHandle() {
    const that = this;
    $('#axisColorPicker').spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showPalette: true,
      showButtons: false,
      hideAfterPaletteSelect: true,
      showSelectionPalette: false,
      containerClassName: 'sdk-color-picker',
      color: that.block.props.axis.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.axis.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });

    // 监听 dragstop 事件
    $('#axisColorPicker').on('dragstop.spectrum', function (e, color) {
      that.block.props.axis.color = color.toHexString();
      that.opts.chartInstance.setOption(that.block)
    })

    // 手动监听 input 输入事件
    $('#axisColorPicker').spectrum('container').find('.sp-input').change(function (e) {
      if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
        that.block.props.axis.color = e.target.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });

  }

  // 初始化 y 轴取值最小值
  inityAxisMinRange() {
    const yAxisMinInputElement = document.getElementById('yAxisMinRange');
    if (!yAxisMinInputElement) return;
    const minValue = this.block.props.axis.y.range[0];
    yAxisMinInputElement.value = minValue ? minValue : null;
  }

  // 绑定 y 轴取值最小值事件
  bindyAxisMinRangeHandle() {
    const yAxisMinInputElement = document.getElementById('yAxisMinRange');
    if (!yAxisMinInputElement) return;
    const that = this;
    yAxisMinInputElement.addEventListener('blur', function (e) {
      // 如果输入框的值没有变化则不更新
      if (e.target.value === that.opts.minValue) return;
      const targetValue = e.target.value;
      const yAxis = that.block.props.axis.y;
      if (targetValue === '') {
        that.opts.minValue = '';
        yAxis.range[0] = null;
      } else {
        if (that.block.props.axis && yAxis.range[1]) {
          if (Number(targetValue) < Number(that.opts.maxValue)) {
            yAxis.range[0] = Number(targetValue);
            that.opts.minValue = targetValue;
          }
        } else {
          yAxis.range[0] = Number(targetValue);
          that.opts.minValue = targetValue;
        }
      }
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始化 y 轴取值最大值
  inityAxisMaxRange() {
    const yAxisMaxInputElement = document.getElementById('yAxisMaxRange');
    if (!yAxisMaxInputElement) return;
    const maxValue = this.block.props.axis.y.range[1];
    yAxisMaxInputElement.value = maxValue ? maxValue : null;
  }

  // 绑定 y 轴取值最大值事件
  bindyAxisMaxRangeHandle() {
    const yAxisMaxInputElement = document.getElementById('yAxisMaxRange');
    if (!yAxisMaxInputElement) return;
    const that = this;
    yAxisMaxInputElement.addEventListener('blur', function (e) {
      // 如果输入框的值没有变化则不更新
      if (e.target.value === that.opts.maxValue) return;
      const targetValue = e.target.value;
      const yAxis = that.block.props.axis.y;
      if (targetValue === '') {
        that.opts.maxValue = '';
        yAxis.range[1] = null;
      } else {
        if (Number(targetValue) > Number(that.opts.minValue)) {
          yAxis.range[1] = Number(targetValue);
          that.opts.maxValue = targetValue;
        }
      }
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定轴、网格线面板重置事件
  bindGridAndAxisResetHandle() {
    const that = this;
    const gridAndAxisResetElement = document.getElementById('gridAndAxisReset');
    if (!gridAndAxisResetElement) return;

    gridAndAxisResetElement.addEventListener('click', function () {
      setTimeout(() => {
        that.bindResetHandle('gridAndAxis')
      }, 0);
    })
  }






  /* -------------------------- 文字面板 ------------------------------- */

  // 创建文字面板
  createFontSetting() {
    const fontSetting = document.createElement('div');
    fontSetting.className = 'setting-group'
    fontSetting.innerHTML = `
      <div class="setting-title">文字</div>
      <div class="setting-content">

        <div class="color-picker-box">
          <input type="text" id="fontSizeColorPicker">
          <div class="color-picker-left">文字颜色</div>
        </div>

        <div class="small-title color-picker-margin">字体</div>
        <div id="fontSizeDropdown" class="dropdown-menu"></div>

        <div class="small-title">字号(px)</div>
        <div id="fontSizeInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.font.fontSize)}
        </div>

        <div id="fontSizeReset" class="reset-btn">恢复默认设置</div>

      </div>
    `
    document.getElementById('setting-box').appendChild(fontSetting);

    // 绑定文字面板事件
    this.bindFontSizeSelectedHandle();
    this.initFontSizeSelected()

    this.bindFontSizeInputRangeHandle();

    this.bindFontSizeColorPickerHandle();
    this.bindFontSizeResetHandle();
  }

  // 初始化文字面板颜色
  initFontSizeColorPicker() {
    $('#fontSizeColorPicker').spectrum('set', this.block.props.font.color);
  }

  // 绑定文字面板颜色事件
  bindFontSizeColorPickerHandle() {
    const that = this;
    $('#fontSizeColorPicker').spectrum({
      preferredFormat: 'hex',
      showInput: true,
      showPalette: true,
      showButtons: false,
      hideAfterPaletteSelect: true,
      showSelectionPalette: false,
      containerClassName: 'sdk-color-picker',
      color: that.block.props.font.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.font.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });

    // 监听 dragstop 事件
    $('#fontSizeColorPicker').on('dragstop.spectrum', function (e, color) {
      that.block.props.font.color = color.toHexString();
      that.opts.chartInstance.setOption(that.block)
    })

    // 手动监听 input 输入事件
    $('#fontSizeColorPicker').spectrum('container').find('.sp-input').change(function (e) {
      if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(e.target.value)) {
        that.block.props.font.color = e.target.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });

  }

  // 初始化文字面板字体
  initFontSizeSelected() {
    // 找到当前图表的字体，设置默认值
    var fontSizeIndex = this.opts.fontFamilyListText.indexOf(this.block.props.font.fontFamily);
    fontSizeIndex = fontSizeIndex > -1 ? fontSizeIndex : 0;
    $('#fontSizeDropdown').dropdown({
      list: this.deepClone(this.opts.fontFamilyListText),
      index: fontSizeIndex,
      updateIndex: true
    })
  }

  // 绑定文字面板字体事件
  bindFontSizeSelectedHandle() {
    const that = this;
    $('#fontSizeDropdown').dropdown({
      list: that.deepClone(this.opts.fontFamilyListText),
      callback: function (index) {
        that.block.props.font.fontFamily = that.opts.fontFamilyListText[index];
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 初始化文字面板字号
  initFontSizeInputRang() {
    const fontSizeInputRangeElement = document.querySelector('#fontSizeInputRangeBox .input-range');
    $(fontSizeInputRangeElement).RangeSlider({
      setValue: this.block.props.font.fontSize
    });
  }

  // 绑定文字面板字号事件
  bindFontSizeInputRangeHandle() {
    const fontSizeInputRangeElement = document.querySelector('#fontSizeInputRangeBox .input-range');
    if (!fontSizeInputRangeElement) return;
    const that = this;
    // 滑块事件
    $(fontSizeInputRangeElement).RangeSlider({
      min: 0, max: 100, step: 1, callback: () => {
        that.block.props.font.fontSize = fontSizeInputRangeElement.value;
        that.opts.chartInstance.setOption(that.block);
      }
    });
  }

  // 绑定文字面板重置事件
  bindFontSizeResetHandle() {
    const that = this;
    const fontSizeResetElement = document.getElementById('fontSizeReset');
    if (!fontSizeResetElement) return;

    fontSizeResetElement.addEventListener('click', function () {
      that.bindResetHandle('fontSize')
    })
  }






  /* -------------------------- 图例面板 ------------------------------- */

  // 创建图例面板
  createLegendSetting() {
    const legendSetting = document.createElement('div');
    legendSetting.className = 'setting-group'
    legendSetting.innerHTML = `
      <div class="setting-title">图例</div>
      <div class="setting-content">
        
        <div class="small-title">图例显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="legendSwitch">

        <div class="small-title">图例位置</div>
        <div id="legendDropdown" class="dropdown-menu"></div>

        <div id="legendReset" class="reset-btn">恢复默认设置</div>

      </div>
    `
    document.getElementById('setting-box').appendChild(legendSetting)

    // 绑定图例面板事件
    this.initLegendSwitch();
    this.bindLegendSwitchHandle();

    this.bindLegendPositionSelectedHandle();
    this.initLegendPositionSelected();

    this.bindLegendResetHandle();
  }

  // 初始化图例面板显示
  initLegendSwitch() {
    const legendSwitchElement = document.getElementById('legendSwitch');
    // 设定 checkbox 默认状态
    if (this.block.props.legend.show) {
      legendSwitchElement.checked = true;
    } else {
      legendSwitchElement.checked = false;
    }
  }

  // 绑定图例面板图例显示事件
  bindLegendSwitchHandle() {
    const legendSwitchElement = document.getElementById('legendSwitch');
    const that = this;
    legendSwitchElement.addEventListener('change', function (e) {
      that.block.props.legend.show = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 初始化图例面板位置
  initLegendPositionSelected() {
    // 找到当前图表的字体，设置默认值
    var legendPositionIndex = 0;
    // 标题位置
    switch (this.block.props.legend.yPosition) {
      case 'top':
        switch (this.block.props.legend.xPosition) {
          case 'left':
            legendPositionIndex = 0;
            break;
          case 'center':
            legendPositionIndex = 1;
            break;
          case 'right':
            legendPositionIndex = 2;
            break;
          default:
            break;
        }
        break;
      case 'bottom':
        switch (this.block.props.legend.xPosition) {
          case 'left':
            legendPositionIndex = 3;
            break;
          case 'center':
            legendPositionIndex = 4;
            break;
          case 'right':
            legendPositionIndex = 5;
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
    $('#legendDropdown').dropdown({
      list: this.deepClone(this.opts.positionList),
      index: legendPositionIndex,
      updateIndex: true
    })
  }

  // 绑定图例面板位置事件
  bindLegendPositionSelectedHandle() {
    // 利用当前所选值更新数据
    const that = this;
    $('#legendDropdown').dropdown({
      list: that.deepClone(this.opts.positionList),
      callback: function (index) {
        switch (index) {
          case 0:
            that.block.props.legend.xPosition = 'left';
            that.block.props.legend.yPosition = 'top';
            break;
          case 1:
            that.block.props.legend.xPosition = 'center';
            that.block.props.legend.yPosition = 'top';
            break;
          case 2:
            that.block.props.legend.xPosition = 'right';
            that.block.props.legend.yPosition = 'top';
            break;
          case 3:
            that.block.props.legend.xPosition = 'left';
            that.block.props.legend.yPosition = 'bottom';
            break;
          case 4:
            that.block.props.legend.xPosition = 'center';
            that.block.props.legend.yPosition = 'bottom';
            break;
          case 5:
            that.block.props.legend.xPosition = 'right';
            that.block.props.legend.yPosition = 'bottom';
            break;
          default:
            break;
        }
        that.opts.chartInstance.setOption(that.block)
      },
      bindClick: true
    })
  }

  // 绑定图例面板重置事件
  bindLegendResetHandle() {
    const that = this;
    const legendResetElement = document.getElementById('legendReset');
    if (!legendResetElement) return;

    legendResetElement.addEventListener('click', function () {
      that.bindResetHandle('legend')
    })
  }






  /* -------------------------- 交互提示框面板 ------------------------------- */

  // 创建交互提示框面板
  createTooltipSetting() {

    // 如果是水波图，直接返回，暂无交互提示框
    if (this.block.templateId === '4447460703254610031') return;

    const tooltipSetting = document.createElement('div');
    tooltipSetting.className = 'setting-group'
    tooltipSetting.innerHTML = `
      <div class="setting-title">交互提示框</div>
      <div class="setting-content">
        
        <div class="small-title">交互提示框显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="tooltipSwitch">

      </div>
    `
    document.getElementById('setting-box').appendChild(tooltipSetting)

    // 绑定交互提示框面板事件
    this.bindTooltipSwitchHandle();
  }

  // 绑定交互提示框显示事件
  bindTooltipSwitchHandle() {
    const tooltipSwitchElement = document.getElementById('tooltipSwitch');
    if (!tooltipSwitchElement) return;
    const that = this;

    // 设定 checkbox 默认状态
    if (this.block.props.tooltip) {
      tooltipSwitchElement.setAttribute('checked', 'checked');
    } else {
      tooltipSwitchElement.removeAttribute('checked');
    }

    tooltipSwitchElement.addEventListener('change', function (e) {
      that.block.props.tooltip = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }






  /* -------------------------- 初始化创建内容 ------------------------------- */


  // 创建编辑器容器
  createEditorBox() {
    // 创建新的容器（避免 echart 图片重复渲染问题）
    const editorElement = document.createElement('div');
    editorElement.id = 'editor';

    // 将新的容器添加至页面
    const boxElement = document.getElementById('editor-box');
    boxElement.insertBefore(editorElement, boxElement.childNodes[0]);
  }

  // 创建 inputRange 组件
  createInputRange(value) {
    const inputRange = `
      <div class="input-container-box">
        <input type="range" value="${value}" style="background-size: ${value}% 100%;" class="input-range">
        <div class="input-container">
          <input type="text" value="${value}" min="0" max="100" class="input-text" onafterpaste="if(isNaN(value))execCommand('undo')" onkeyup="if(isNaN(value))execCommand('undo')">
          <div class="num-box">
            <div class="num-btn add">
              <div class="text">+</div>
            </div>
            <div class="num-btn desc">
              <div class="text">-</div>
            </div>
          </div>
        </div>
      </div>
    `
    return inputRange;
  }

  // 通用恢复默认事件
  bindResetHandle(type) {

    switch (type) {
      // 主题
      case 'theme':
        // 主题恢复默认值相当于重新执行下拉框操作，默认选择第一个
        this.opts.chartJSON.theme = themeList[0].theme
        this.block.theme = themeList[0].theme

        this.renderBackgroundColor(this.block.theme.backgroundColor)
        $('#pageColorPicker').spectrum('set', this.block.theme.backgroundColor);

        // 替换当前的颜色面板
        this.opts.chartColorList = themeList[0].theme.colors;

        // 替换当前 block
        this.replaceCurrentBlock()

        // 下拉框归为
        this.initThemeDropdown()

        // 更新操作
        this.updateAllProject();
        this.opts.chartInstance.setOption(this.block)

        break;

      // 标签
      case 'label':
        // 恢复默认值
        this.block.props.label = this.deepClone(this.opts.chartJSON.props.label);

        // 初始化操作界面
        this.initLabelSwitch();
        this.initLabelCheckedbox();

        this.initLabelBarSwitch();
        this.initLabelBarSelected();

        this.initLabelLineSwitch();
        this.initLabelLineSelected();

        this.initLabelText();
        this.initLabelTextSwitch();

        this.initLabelNumber();
        this.initLabelNumberSwitch();

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        break;

      // 标题
      case 'title':
        // 恢复默认值
        this.block.props.titleDisplay = this.deepClone(this.opts.chartJSON.props.titleDisplay);

        // 初始化操作界面
        this.initTitleSwitch()
        this.initTitleInput()
        this.initTitleColorPicker()
        this.initTitleFontFamilySelected()
        this.initTitleInputRange()
        this.initTitlePositionSelected()

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        break;

      // 文字
      case 'fontSize':
        // 恢复默认值
        this.block.props.font = this.deepClone(this.opts.chartJSON.props.font);


        // 初始化操作界面
        this.initFontSizeColorPicker()
        this.initFontSizeSelected()
        this.initFontSizeInputRang()

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        break;

      // 颜色
      case 'color':
        // 恢复默认值
        this.block.props.colors = this.deepClone(this.opts.chartJSON.props.colors);

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        // 初始化操作界面
        this.uploadColorSetting()

        break;

      // 图例
      case 'legend':
        // 恢复默认值
        this.block.props.legend = this.deepClone(this.opts.chartJSON.props.legend);

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        // 初始化操作界面
        this.initLegendSwitch();
        this.initLegendPositionSelected();

        break;

      // 轴，网格线
      case 'gridAndAxis':
        // 恢复默认值
        this.block.props.axis = this.deepClone(this.opts.chartJSON.props.axis);

        // 重新渲染图表
        this.opts.chartInstance.setOption(this.block)

        // 初始化操作界面
        this.initGridSelected()
        this.initGridColorPicker()

        this.initxAxisInput();
        this.inityAxisInput();

        this.initAxisSelected()
        this.initAxisColorPicker()

        if (this.block.props.axis.y.range) {
          this.inityAxisMinRange()
          this.inityAxisMaxRange()
        }

        break;

      default:
        break;
    }
  }






  /* -------------------------- 工具类函数 ------------------------------- */

  // 动态获取本地引用的字体
  getLocalFontFamilyList() {
    if (document.styleSheets[0] || document.styleSheets[0]) {
      const styleSheetsRules = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
      const fontFamilyList = [];
      for (let i = 0; i < styleSheetsRules.length; i++) {
        if (styleSheetsRules[i].style.fontFamily === '"Noto Sans"') {
          fontFamilyList.push('Noto Sans')
        } else if (styleSheetsRules[i].style.fontFamily === '"Droid Sans Fallback"') {
          fontFamilyList.push('Droid Sans Fallback')
        } else {
          fontFamilyList.push(styleSheetsRules[i].style.fontFamily)
        }
      }
      this.opts.fontFamilyListText = [...new Set(fontFamilyList)];
    } else {
      this.opts.fontFamilyListText = []
    }
  }

  // 渲染图表
  renderChart() {
    // 根据图表类型的不同指定不同的渲染方式
    if (this.block.templateId === '114473474859453649') {
      this.opts.chartInstance = echarts.init(document.getElementById('editor'))
      this.opts.chartInstance.setOption(this.echartsWordCloudOptions, true);
    } else {
      this.opts.chartInstance = this.getCurrentD3ChartType()
      this.opts.chartInstance.setOption(this.block);
    }
  }

  // 渲染背景色
  renderBackgroundColor(color) {
    document.getElementById('editor').style.backgroundColor = color;
  }

  // 判断颜色是主题色还是 16 进制数
  setThemeListHexColor(color) {
    return typeof color === 'number' ? this.block.theme.colors[color] : color;
  }

  // 获取当前图表类型，指定渲染方式（d3/echarts）
  getCurrentD3ChartType() {
    // 根据 D3 图表不同指定对应的渲染方式
    // 基础饼图，基础环形图，阶梯折线图，堆叠面积图，分组气泡图，多维雷达图
    const renderBox = document.getElementById('editor');
    let renderType = '';
    switch (this.block.title) {
      case '基础饼图':
        renderType = new window.d3Chart.PieChart(renderBox)
        break;

      case '变形饼图':
        renderType = new window.d3Chart.DeformedPieChart(renderBox)
        break;

      case '基础环形图':
        renderType = new window.d3Chart.DonutChart(renderBox)
        break;

      case '多条折线图':
        renderType = new window.d3Chart.BeeLineChart(renderBox)
        break;

      case '多条阶梯折线图':
        renderType = new window.d3Chart.StepLineChart(renderBox)
        break;

      case '堆叠面积图':
        renderType = new window.d3Chart.StackedLinearChart(renderBox)
        break;

      case '基础柱状图':
        renderType = new window.d3Chart.SimpleBarChart(renderBox)
        break;

      case '分组柱状图':
        renderType = new window.d3Chart.GroupedBarChart(renderBox)
        break;

      case '堆叠柱状图':
        renderType = new window.d3Chart.StackBarChart(renderBox)
        break;

      case '分组气泡图':
        renderType = new window.d3Chart.GroupingBubbleChart(renderBox)
        break;

      case '多维雷达图':
        renderType = new window.d3Chart.RadarChart(renderBox)
        break;

      case '漏斗图':
        renderType = new window.d3Chart.FunnelChart(renderBox)
        break;

      case '半圆环进度图':
        renderType = new window.d3Chart.HalfProgressPieChart(renderBox)
        break;

      case '水波图':
        renderType = new window.d3Chart.WaveCircleChart(renderBox)
        break;

      case '玉玦图':
        renderType = new window.d3Chart.RadialBarChart(renderBox)
        break;

      case '玫瑰图':
        renderType = new window.d3Chart.RoseChart(renderBox)
        break;

      case '桑基图':
        renderType = new window.d3Chart.SankeyChart(renderBox)
        break;

      case '矩形树图（单层）':
        renderType = new window.d3Chart.OneLevelTreemapChart(renderBox)
        break;

      case '折柱混合':
        renderType = new window.d3Chart.MixLineBarChart(renderBox)
        break;

      default:
        break;
    }
    return renderType;
  }

  // 导出图片过程中过滤用户当前图表当中使用的所有字体
  filterProjectFonts() {
    let projectFonts = [];
    if (this.block.props.font) {
      projectFonts.push(this.block.props.font.fontFamily)
    }
    if (this.block.props.titleDisplay) {
      projectFonts.push(this.block.props.titleDisplay.fontFamily)
    }
    if (this.block.props.label && this.block.props.label.textLabel) {
      projectFonts.push(this.block.props.label.textLabel.fontFamily)
    }
    if (this.block.props.label && this.block.props.label.numberLabel) {
      projectFonts.push(this.block.props.label.numberLabel.fontFamily)
    }
    const filterFonts = projectFonts.map(function (item) {
      if (item === 'noto' || item === 'Noto Sans') {
        return item = '"Noto Sans"'
      } else if (item === 'Droid Sans Fallback') {
        return item = '"Droid Sans Fallback"'
      } else {
        return item;
      }
    })
    document.body.setAttribute('data-json', Array.from(new Set(filterFonts)))
  }

  // input 键盘事件（回车失去焦点）
  bindInputBlurHandle() {
    const inputs = document.querySelectorAll('.input-text');
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('keyup', function (e) {
        if (e.keyCode === 13) {
          this.blur();
        }
      }, false)
    }
  }

  // 格式化颜色取值，如果 list 当中传递的为数字，则去 theme 当中进行取值
  formatColor(listColors, themeColors) {
    const lColors = [...listColors]
    const tColors = [...themeColors]
    try {
      for (let i = 0; i < lColors.length; i++) {
        if (!isNaN(lColors[i])) {
          lColors[i] = tColors[lColors[i]]
        }
      }
      return lColors;
    } catch (err) {
      console.log(err)
    }
  }

  // 格式化数据，剔除 null
  formatDataSrc() {

    const dataSrc = this.deepClone(this.block.dataSrc.data[0]);
    const dataMap = this.deepClone(this.block.props.map[0]);

    // 针对玫瑰图改变类型
    if (this.block.props.colors.type === 'linear' && this.block.templateId === '5944734748594536331') {
      this.block.props.colors.type = 'multiple';
    }

    // 根据图表类型的不同生成对应的用于渲染的数据
    const colorType = this.block.props.colors.type;
    if (colorType === 'single') {
      // 如果是单色图表，根据 map 映射值的位置进行取值
      let index;
      for (let i = 0; i < dataMap.length; i++) {
        if (dataMap[i].function === 'vCol') {
          index = dataMap[i].index;
        }
      }
      return [dataSrc[0][index]];
    } else if (colorType === 'multiple') {

      switch (this.block.templateSwitch) {
        case 'cross':
          let crossData = [];
          // 如果是多维雷达图，数据单独进行处理
          if (this.block.templateId === '5544734748594536491') {
            crossData = this.zip(dataSrc)
          } else {
            crossData = dataSrc[0].filter(v => v !== null && Object.keys(v).length !== 0)
          }
          crossData = crossData ? crossData : [];
          return crossData.slice(1);

        case 'key-value':
          let keyValueData = this.zip(dataSrc).filter(v => v !== null && Object.keys(v).length !== 0)
          keyValueData = keyValueData ? keyValueData : [];
          return keyValueData.slice(1);

        case 'obj-n-value':
          let objNvalueData = Array.from(new Set(this.zip(dataSrc))).filter(v => v !== null && Object.keys(v).length !== 0)
          objNvalueData = objNvalueData ? objNvalueData : [];
          return objNvalueData.slice(1);

        case 'sankey':

          let indexList = [];
          let list1 = [];
          let list2 = [];

          dataMap.forEach((o, i) => {
            if (o.isLegend) {
              indexList.push(i);
            }
          })

          dataSrc.forEach((o, i) => {
            if (Number(i) > 0) {
              // 之所以两列，是需要先去重在拼接
              list1.push(o[indexList[0]]);
              list2.push(o[indexList[1]]);
            }
          })

          let zipArr = list1.map((item, index) => [item, list2[index]]), newArr = [];
          zipArr.map(item => {
            newArr.push(...item)
          })

          return Array.from(new Set(newArr));

        default:
          return [];
      }
    }
  }

  // 克隆函数（这里仅仅考虑对象与数组，够用即可）
  deepClone(obj) {
    if (typeof obj !== 'object' && typeof obj !== 'function') {
      // 如果是原始类型直接返回
      return obj;
    }
    var o = Array.isArray(obj) ? [] : {};
    for (let i in obj) {
      if (obj.hasOwnProperty(i)) {
        o[i] = typeof obj[i] === 'object' ? this.deepClone(obj[i]) : obj[i];
      }
    }
    return o;
  }

  // zip 方法（只需要第一列数据）
  zip(data) {
    if (!Array.isArray(data)) return;
    const zipData = [];
    for (let i = 0; i < data.length; i++) {
      zipData.push(data[i][0])
    }
    return zipData;
  }

  // 删除指定元素
  remove(el) {
    let toRemove = document.querySelector(el);
    if (toRemove) toRemove.parentNode.removeChild(toRemove);
  }

  // 格式化下拉框列表（添加取值色带）
  formatDropdownColorList(themeList) {
    let dropdownColorList = [];
    for (let i = 0; i < themeList.length; i++) {
      dropdownColorList.push(`${themeList[i].theme.name} ${this.getThemeColorZone(themeList[i].theme.colors)}`)
    }
    return dropdownColorList;
  }

  // 格式化颜色取值色带
  getThemeColorZone(themeColor) {
    let themeColorZone = '';
    for (let i = 0; i < 6; i++) {
      themeColorZone += `<div class="theme-color-zone" style="background:${themeColor[i]}"></div>`
    }
    return themeColorZone;
  }

}

window.Editor = Editor;