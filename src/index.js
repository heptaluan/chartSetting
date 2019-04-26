import './css/index.scss';
import './css/color-picker.scss';

import './js/static/color-picker';
import './js/static/dom-to-image';
import './js/static/rangeSlider';

import { chartTemplateList } from './js/static/chart-list'

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
      chartJSON: options.chartJSON,
      chartColorList: options.chartColorList ? options.chartColorList : [
        ['black', 'white', 'blanchedalmond', 'rgb(255, 128, 0);', 'hsv 100 70 50'],
        ['red', 'yellow', 'green', 'blue', 'violet']
      ]
    }

    // 图表配置项（默认为传入的 JSON）
    if (!options.chartJSON) {
      throw new Error(`need chart json`)
    } else {
      this.block = this.deepClone(options.chartJSON);
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

    // 表格配置项
    this.clipboardCache = '';
    const that = this;
    this.tableOptions = {
      data: this.block.dataSrc.data[0],
      manualColumnResize: true,        // 手动更改列距
      colHeaders: true,                // 自定义列表头，可以传递 data 或者布尔值
      rowHeaders: true,                // 行表头，同上
      className: 'htMiddle',
      minCols: 8,                      // 最小行列
      minRows: 15,
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

    // 私有变量
    const privateOptions = {
      block: '',
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
        '横向网络',
        '纵向网络',
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

    // 动态获取本地引用的字体
    this.getLocalFontFamilyList();

    // 保留模版列表（测试使用）
    this.createChartTemplateListBox()

    // 初始化
    this.__initChartEditor();

    // 创建编辑器容器
    this.createEditorBox();

    // 渲染图表
    this.renderChart();

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
    this.createSettingContent();
    this.createTable()
    this.setHandsontableContextMenu();

    // 配置面板创建完成后绑定头部点击收缩事件
    this.bindSettingTitleClickHandler();

    // 给配置面板当中的 input 添加键盘事件
    this.bindInputBlurHandler();

    // 给配置面板的第一项默认展开
    this.setFirstSettingActive();

    // 表格创建完成后进行初始化操作
    this.__initTable();

  }

  // 每个配置项头部点击事件
  bindSettingTitleClickHandler() {
    $('.setting-title').click(function () {
      $(this).parents('.setting-group').toggleClass('active').siblings().removeClass('active')
    })
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

    // 新数据
    const newData = hot.getData(0, 0, wideRow, wideCol);

    // 利用新数据更新图表
    this.block.dataSrc.data[0] = newData;
    this.opts.chartInstance.setOption(this.block)
  }

  // 设置右键菜单
  setHandsontableContextMenu() {
    const that = this;
    const hotInstance = this.opts.tableInstance;
    this.opts.tableInstance.updateSettings({
      contextMenu: {
        callback: (key, options) => { },
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

  // 创建图表模版列表
  createChartTemplateListBox() {
    // 切换图表
    const chartTemplateListElement = document.createElement('ul');
    chartTemplateListElement.id = 'chartListBox'
    chartTemplateListElement.innerHTML = `
      ${this.createChartList()}
    `
    document.body.appendChild(chartTemplateListElement)

    // 绑定切换事件
    this.bindChartListClickHandler();
  }

  // 图表列表切换事件
  bindChartListClickHandler() {
    const chartListElement = document.querySelectorAll('.chart-list')
    if (!chartListElement) return;
    const that = this;
    for (let i = 0; i < chartListElement.length; i++) {
      chartListElement[i].addEventListener('click', function () {
        that.reloadChart(chartTemplateList[i])
      }, false)
    }
  }

  // 重新更新图表
  reloadChart(data) {
    // 更新当前的 block（需要注意，不能直接操作之前的数组）
    this.block = this.deepClone(data);

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

    // console.log(this.block)
    // console.log(this.opts.chartInstance)

    // 重新生成配置面板和表格（清空面板，然后进行图表初始化）
    this.opts.settingElement.innerHTML = '';
    this.__initChartEditor();
  }

  // 使配置面板第一项默认展开
  setFirstSettingActive() {
    const settingPanel = document.querySelectorAll('.setting-group');
    settingPanel[0].classList.add('active')
  }




  /* -------------------------- API 接口列表 ------------------------------- */


  // 导出图片
  exportImage(options, callback) {
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
    domtoimage.toPng(box, {
      width: 500 * scale,
      height: 400 * scale,
      style: {
        'border': 'none',
        'transform': `scale(${scale})`,
        'transform-origin': 'top left',
        'background': options.transparent === false ? (options.background ? options.background : '#fff') : 'transparent'
      }
    })
      .then(function (imgBase64) {
        callback(imgBase64)
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error);
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

  // 创建表格
  createTable() {
    const table = document.createElement('div');
    table.className = 'edit-box table'
    table.id = 'table'
    this.opts.settingElement.appendChild(table)

    // 表格创建完成以后保留一个表格句柄用于后面操作
    this.opts.tableInstance = new Handsontable(document.getElementById('table'), this.tableOptions)
  }

  // 创建配置面板表头编辑按钮并且绑定事件
  createSettingHeader() {
    const settingHeader = document.createElement('div');
    settingHeader.className = 'setting-header';
    settingHeader.innerHTML = `
      <div class="edit-block">编辑图表</div><div class="edit-table">编辑数据</div>
    `
    this.opts.settingElement.appendChild(settingHeader);

    settingHeader.addEventListener('click', function (e) {
      const editBox = document.querySelectorAll('.edit-box');
      const editBlock = document.querySelector('.edit-block');
      const editTable = document.querySelector('.edit-table');
      switch (e.target.className) {
        case 'edit-block':
          editBlock.style.color = '#e6794a';
          editTable.style.color = '#333';
          editBox[0].style.display = 'block';
          editBox[1].style.position = 'fixed';
          editBox[1].style.left = '-9999px';
          break;

        case 'edit-table':
          editBlock.style.color = '#333';
          editTable.style.color = '#e6794a';
          editBox[0].style.display = 'none';
          editBox[1].style.position = 'relative';
          editBox[1].style.left = '0';
          break;

        default:
          break;
      }
    }, false)
  }

  // 创建配置面板
  createSettingContent() {

    const settingBox = document.createElement('div');
    settingBox.className = 'edit-box'
    settingBox.id = 'setting-box'
    this.opts.settingElement.appendChild(settingBox)

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
      if (this.block.templateSwitch === 'key-value') {
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




  /* -------------------------- 标签面板 ------------------------------- */
  createLabelSetting() {
    const labelSetting = document.createElement('div');
    labelSetting.className = 'setting-group'
    labelSetting.innerHTML = `
      <div class="setting-title">标签</div>
      <div class="setting-content">

        <div class="small-title">标签显示</div>
        <input class="switch switch-anim title-margin" type="checkbox" id="labelSwitch">

        ${this.createyLabelPosition()}

        ${this.createyLabelContent()}
        
      </div>
    `
    document.getElementById('setting-box').appendChild(labelSetting)

    // 绑定标题面板相关事件
    this.bindLabelSwitchHandler();
    this.bindLabelPositionHandler();
    this.bindLabelCheckedboxChangeHandler();
  }

  // 创建标签位置列表
  createLabelPositionList(options) {
    if (!options) {
      return '';
    } else {
      let labePositionlOptions = '';
      for (let i = 0; i < options.length; i++) {
        labePositionlOptions += `
          <option value="${options[i]}">${options[i]}</option>
        `
      }
      return labePositionlOptions;
    }
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

  // 创建标签位置
  createyLabelPosition() {
    if (this.block.props.label.positionOptions) {
      return `
        <div class="small-title color-picker-margin">位置</div>
        <select id="labelPositionList" class="title-margin">
          ${this.createLabelPositionList(this.block.props.label.positionOptions)}
        </select>
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
        <div class="checked-box">
          ${this.createLabelCheckBox(this.block.props.label.contentOption)}
        </div>
      `;
    } else {
      return '';
    }
  }

  // 绑定标签开关事件
  bindLabelSwitchHandler() {
    const labelSwitchElement = document.getElementById('labelSwitch');
    if (!labelSwitchElement) return;

    // 设定 checkbox 默认状态
    if (this.block.props.label.display) {
      labelSwitchElement.setAttribute('checked', 'checked');
    } else {
      labelSwitchElement.removeAttribute('checked');
    }

    const that = this;
    labelSwitchElement.addEventListener('change', function (e) {
      that.block.props.label.display = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定标题位置事件
  bindLabelPositionHandler() {
    const labelPositionElement = document.getElementById('labelPositionList');
    if (!labelPositionElement) return;

    // 找到当前图表的字体，设置默认值
    var labelPositionSelectedIndex = this.block.props.label.positionOptions.indexOf(this.block.props.label.positionChoice);
    labelPositionSelectedIndex = labelPositionSelectedIndex > -1 ? labelPositionSelectedIndex : 0;
    if (labelPositionElement[labelPositionSelectedIndex]) {
      labelPositionElement[labelPositionSelectedIndex].selected = true;
    }
    const that = this;
    labelPositionElement.addEventListener('change', function (e) {
      that.block.props.label.positionChoice = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定标题内容选择框
  bindLabelCheckedboxChangeHandler() {
    // 获取所有 checkbox
    const labelCheckedboxElement = document.querySelectorAll('.label-checked-input');
    if (!labelCheckedboxElement) return;

    // 设置当前选中项
    this.setCurrentSelected(labelCheckedboxElement, this.block.props.label.contentChoice)

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
        that.opts.chartInstance.setOption(that.block)
      })
    }

  }

  // 设置当前 checkbox 选中项
  setCurrentSelected(labelCheckedboxElement, checkedOption) {
    if (!labelCheckedboxElement) return;
    for (let i = 0; i < labelCheckedboxElement.length; i++) {
      const needCheckedIndex = checkedOption.indexOf(labelCheckedboxElement[i].value);
      // 原理为先使用当前列表项去匹配需要选中的数组（确定需要选中项）
      // 然后再去原内容数组当中确定该项所在的位置
      if (needCheckedIndex >= 0) {
        const index = this.block.props.label.contentOption.indexOf(labelCheckedboxElement[i].value)
        labelCheckedboxElement[index].setAttribute('checked', 'checked');
      }
    }
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
    this.bindMapSelectHandler();
  }

  // 创建映射面板下拉框
  createMapSettingList() {
    var mapSettingList = this.block.props.map[0];
    var dataSrcTitle = (this.block.dataSrc.data[0])[0].filter(v => v !== null)
    var mapList = '';
    for (let i = 0; i < mapSettingList.length; i++) {
      mapList += `
        <div class="small-title">${mapSettingList[i].name}</div>
        <select class="map-list title-margin">
          ${this.createMapSettingOptionList(dataSrcTitle)}
        </select>
      `
    }
    return mapList;
  }

  // 创建映射面板下拉框
  createMapSettingOptionList(data) {
    var mapSettingList = '';
    for (let i = 0; i < data.length; i++) {
      mapSettingList += `
        <option value="${i}">${data[i]}</option>
      `
    }
    return mapSettingList;
  }

  // 绑定标题下拉框事件
  bindMapSelectHandler() {
    const mapOptionList = document.querySelectorAll('.map-list')
    const mapSrc = this.block.props.map[0];
    const that = this;
    if (!mapOptionList) return;
    // 循环设定默认选中值并且添加事件
    for (let i = 0; i < mapOptionList.length; i++) {
      if (mapOptionList[i]) {
        mapOptionList[i][mapSrc[i].index].selected = true;
        mapOptionList[i].addEventListener('change', function (e) {
          that.block.props.map[0][i].index = Number(e.target.value);
          that.opts.chartInstance.setOption(that.block)
        }, false)
      }
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

        <div class="small-title">颜色</div>
        <input type="text" id="titleColorPicker">

        <div class="small-title color-picker-margin">字体</div>
        <select id="titleFontFamily" class="title-margin">
          ${this.createFontSizeList()}
        </select>

        <div class="small-title">字号(px)</div>
        <div id="titleInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.titleDisplay.fontSize)}
        </div>

        <div class="small-title">位置</div>
        <select id="titlePositionList" class="title-margin">
          ${this.createPositionList()}
        </select>
        
      </div>
    `
    document.getElementById('setting-box').appendChild(titleSetting)

    // 绑定标题面板相关事件
    this.bindTitleSwitchHandler();
    this.bindTitleInputHandler();
    this.bindTitleColorPickerHandler();
    this.bindTitleSelectHandler();
    this.bindTitleInputRangeHandler();
    this.bindTitlePositionHandler();
  }

  // 绑定标题开关事件
  bindTitleSwitchHandler() {
    const titleSwitchElement = document.getElementById('titleSwitch');
    if (!titleSwitchElement) return;

    // 设定 checkbox 默认状态
    if (this.block.props.titleDisplay.show) {
      titleSwitchElement.setAttribute('checked', 'checked');
    } else {
      titleSwitchElement.removeAttribute('checked');
    }

    const that = this;
    titleSwitchElement.addEventListener('change', function (e) {
      that.block.props.titleDisplay.show = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定标题输入框事件
  bindTitleInputHandler() {
    const titleInputElement = document.getElementById('titleInput');
    if (!titleInputElement) return;
    const that = this;
    titleInputElement.value = this.block.props.titleDisplay.text;
    titleInputElement.addEventListener('blur', function (e) {
      that.block.props.titleDisplay.text = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定标题颜色选择事件
  bindTitleColorPickerHandler() {
    const that = this;
    $('#titleColorPicker').spectrum({
      showPaletteOnly: true,
      showPalette: true,
      hideAfterPaletteSelect: true,
      color: that.block.props.titleDisplay.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.titleDisplay.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 绑定标题下拉框事件
  bindTitleSelectHandler() {
    const titleFontFamilyElement = document.getElementById('titleFontFamily');
    if (!titleFontFamilyElement) return;

    // 找到当前图表的字体，设置默认值
    var index = this.opts.fontFamilyListText.indexOf(this.block.props.titleDisplay.fontFamily);
    index = index > -1 ? index : 0;
    if (titleFontFamilyElement[index]) {
      titleFontFamilyElement[index].selected = true;
    }
    const that = this;
    titleFontFamilyElement.addEventListener('change', function (e) {
      that.block.props.titleDisplay.fontFamily = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定标题 inputRange 事件
  bindTitleInputRangeHandler() {
    const titleInputRangeElement = document.querySelector('#titleInputRangeBox .input-range');
    if (!titleInputRangeElement) return;
    const that = this;
    // 滑块事件
    $(titleInputRangeElement).RangeSlider({
      min: 0, max: 100, step: 1, callback: () => {
        that.block.props.titleDisplay.fontSize = titleInputRangeElement.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 绑定标题位置事件
  bindTitlePositionHandler() {
    const titlePositionElement = document.getElementById('titlePositionList');
    if (!titlePositionElement) return;

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

    if (titlePositionElement[titlePositionIndex]) {
      titlePositionElement[titlePositionIndex].selected = true;
    }

    // 利用当前所选值更新数据
    const that = this;
    titlePositionElement.addEventListener('change', function () {
      switch (titlePositionElement.selectedIndex) {
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
    this.bindWordcloudColorSwitchHandler();

    // 颜色面板创建完成后在加载 colorPicker 组件
    this.__initColorPicker(newData);
  }

  // 绑定词云图专用颜色面板单色切换事件
  bindWordcloudColorSwitchHandler() {
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
    var colorPicker = '';
    for (let i = 0; i < data.length; i++) {
      colorPicker += `
        <div class="color-group">
          <input type="text" class="color-box${i}">
          <span>${hiddenLabel ? '' : data[i]}</span>
        </div>
      `
    }
    return colorPicker;
  }

  // 初始化 color-picker
  __initColorPicker(data) {
    const that = this;
    // 判断当前数据长度和颜色列表颜色是否匹配（超出部分进行补齐操作）
    let listColors;
    const oldColorsList = this.block.props.colors.list;
    const dataLength = data.length;
    if (data.length > oldColorsList.length) {
      const newColorsLength = [];
      for (let i = 0; i < Math.ceil(dataLength / oldColorsList.length); i++) {
        newColorsLength.push(...oldColorsList)
      }
      listColors = newColorsLength.slice(0, dataLength);
    } else {
      listColors = this.block.props.colors.list
    }
    const themeColors = this.block.theme.colors;
    const formattedListColors = this.formatColor(listColors, themeColors);
    for (let i = 0; i < data.length; i++) {
      $(`.color-box${i}`).spectrum({
        showPaletteOnly: true,
        showPalette: true,
        hideAfterPaletteSelect: true,
        color: formattedListColors[i],
        palette: that.opts.chartColorList,
        change: function (color) {
          // 利用新数据更新图表
          that.block.props.colors.list[i] = color.toHexString();
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
    const newColorContent = document.createElement('div');
    newColorContent.innerHTML = this.createColorPicker(newData);
    colorSettingBox.appendChild(newColorContent);

    // 更新数据
    this.__initColorPicker(newData);
  }




  /* -------------------------- 轴、网格线面板 ------------------------------- */

  // 创建轴、网格线面板
  createAxisSetting() {

    // 如果图表的轴不存在，直接返回
    if (!this.block.props.axis.grid) return;

    const axisSetting = document.createElement('div');
    axisSetting.className = 'setting-group'
    axisSetting.innerHTML = `
      <div class="setting-title">轴、网格线</div>
      <div class="setting-content">

        <div class="small-title">网格线</div>
        <select id="gridPositionList" class="title-margin">
          ${this.createGridPositionList()}
        </select>

        <div class="small-title">网格线颜色</div>
        <input type="text" id="gridColorPicker">

          ${this.createAxisLabelTitle()}

          ${this.createyAxisLabel()}

        

        

          ${this.createyAxisRange()}

      </div>
    `
    document.getElementById('setting-box').appendChild(axisSetting)

    // 绑定轴、网格线面板相关事件
    this.bindShowGridSelectedHandler();
    this.bindGridColorPickerHandler();
    this.bindxAxisInputHandler();
    this.bindyAxisInputHandler();
    this.bindShowAxisLabelSelectedHandler();
    this.bindAxisColorPickerHandler();

    // 如果 Range 存在，才执行
    if (this.block.props.axis.y.range) {
      this.bindyAxisMinRangeHandler();
      this.bindyAxisMaxRangeHandler();
    }

  }

  // 创建网格线是否显示的 option
  createGridPositionList() {
    var gridPositionList = this.opts.gridPositionList
    var posList = '';
    for (let i = 0; i < gridPositionList.length; i++) {
      posList += `
        <option value = "${gridPositionList[i]}">${gridPositionList[i]}</option>
      `
    }
    return posList;
  }

  // 创建轴标签是否显示的 option
  createAxisLabelPositionList() {
    var axisLabelPositionList = this.opts.axisLabelPositionList
    var posList = '';
    for (let i = 0; i < axisLabelPositionList.length; i++) {
      posList += `
        <option value = "${axisLabelPositionList[i]}">${axisLabelPositionList[i]}</option>
      `
    }
    return posList;
  }

  // 创建轴标题
  createAxisLabelTitle() {
    // 雷达图没有轴标题
    if (this.block.templateId === '5544734748594536491') {
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
    // 多维雷达图没有轴标签
    if (this.block.templateId === '5544734748594536491') {
      return '';
    } else {
      return `
        <div class="small-title color-picker-margin">轴标签</div>
        <select id="axisLabelPositionList" class="title-margin">
          ${this.createAxisLabelPositionList()}
        </select>
      `
    }
  }

  // 创建轴颜色
  createyAxisColorPicker() {
    // 多维雷达图没有轴颜色
    if (this.block.templateId === '5544734748594536491') {
      return '';
    } else {
      return `
        <div class="small-title">轴颜色</div>
        <input type="text" id="axisColorPicker">
      `
    }
  }

  // 创建 y 值取值范围
  createyAxisRange() {
    // 雷达图没有轴取值范围
    if (this.block.templateId === '5544734748594536491') {
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

  // 绑定网格线下拉框事件
  bindShowGridSelectedHandler() {
    const gridPositionListElement = document.getElementById('gridPositionList');
    if (!gridPositionListElement) return;

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

    if (gridPositionListElement[gridShowIndex]) {
      gridPositionListElement[gridShowIndex].selected = true;
    }

    // 利用当前所选值更新数据
    const that = this;
    gridPositionListElement.addEventListener('change', function () {
      switch (gridPositionListElement.selectedIndex) {
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
    })
  }

  // 绑定网格线颜色选择事件
  bindGridColorPickerHandler() {
    const that = this;
    $('#gridColorPicker').spectrum({
      showPaletteOnly: true,
      showPalette: true,
      hideAfterPaletteSelect: true,
      color: that.block.props.axis.grid.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.axis.grid.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 绑定 x 轴事件
  bindxAxisInputHandler() {
    const xAxisInputElement = document.getElementById('xAxisInput');
    if (!xAxisInputElement) return;
    const that = this;
    xAxisInputElement.value = this.block.props.axis.x.name
    xAxisInputElement.addEventListener('blur', function (e) {
      that.block.props.axis.x.name = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定 y 轴事件
  bindyAxisInputHandler() {
    const yAxisInputElement = document.getElementById('yAxisInput');
    if (!yAxisInputElement) return;
    const that = this;
    yAxisInputElement.value = this.block.props.axis.y.name
    yAxisInputElement.addEventListener('blur', function (e) {
      that.block.props.axis.y.name = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定轴标签显示下拉框事件
  bindShowAxisLabelSelectedHandler() {
    const axisPositionListElement = document.getElementById('axisLabelPositionList');
    if (!axisPositionListElement) return;

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

    if (axisPositionListElement[axisLabelShowIndex]) {
      axisPositionListElement[axisLabelShowIndex].selected = true;
    }

    // 利用当前所选值更新数据
    const that = this;
    axisPositionListElement.addEventListener('change', function () {
      if (that.opts.axisLabelPositionList.length === 4) {
        switch (axisPositionListElement.selectedIndex) {
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
        switch (axisPositionListElement.selectedIndex) {
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
        switch (axisPositionListElement.selectedIndex) {
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
    })
  }

  // 绑定轴颜色选择事件
  bindAxisColorPickerHandler() {
    const that = this;
    $('#axisColorPicker').spectrum({
      showPaletteOnly: true,
      showPalette: true,
      hideAfterPaletteSelect: true,
      color: that.block.props.axis.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.axis.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 绑定 y 轴取值最小值事件
  bindyAxisMinRangeHandler() {
    const yAxisMinInputElement = document.getElementById('yAxisMinRange');
    if (!yAxisMinInputElement) return;
    const that = this;
    const minValue = this.block.props.axis.y.range[0];
    yAxisMinInputElement.value = minValue ? minValue : null;
    yAxisMinInputElement.addEventListener('blur', function (e) {
      // 如果输入框的值没有变化则不更新
      if (e.target.value === that.opts.minValue) return;
      const targetValue = e.target.value;
      const yAxis = that.block.props.axis.y;
      if (targetValue === '') {
        that.opts.minValue = '';
        return;
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

  // 绑定 y 轴取值最大值事件
  bindyAxisMaxRangeHandler() {
    const yAxisMaxInputElement = document.getElementById('yAxisMaxRange');
    if (!yAxisMaxInputElement) return;
    const that = this;
    const maxValue = this.block.props.axis.y.range[1];
    yAxisMaxInputElement.value = maxValue ? maxValue : null;
    yAxisMaxInputElement.addEventListener('blur', function (e) {
      // 如果输入框的值没有变化则不更新
      if (e.target.value === that.opts.maxValue) return;
      const targetValue = e.target.value;
      const yAxis = that.block.props.axis.y;
      if (targetValue === '') {
        that.opts.maxValue = '';
        return;
      } else {
        if (Number(targetValue) > Number(that.opts.minValue)) {
          yAxis.range[1] = Number(targetValue);
          that.opts.maxValue = targetValue;
        }
      }
      that.opts.chartInstance.setOption(that.block)
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
        
        <div class="small-title">文字颜色</div>
        <input type="text" id="fontSizeColorPicker">

        <div class="small-title color-picker-margin">字体</div>
        <select id="fontSizeFontFamily" class="title-margin">
          ${this.createFontSizeList()}
        </select>

        <div class="small-title">字号(px)</div>
        <div id="fontSizeInputRangeBox" class="title-margin">
          ${this.createInputRange(this.block.props.font.fontSize)}
        </div>

      </div>
    `
    document.getElementById('setting-box').appendChild(fontSetting)

    // 绑定文字面板事件
    this.bindFontSizeColorPickerHandler();
    this.bindFontSizeSelectHandler();
    this.bindFontSizeInputRangeHandler();
  }

  // 绑定文字面板颜色事件
  bindFontSizeColorPickerHandler() {
    const that = this;
    $('#fontSizeColorPicker').spectrum({
      showPaletteOnly: true,
      showPalette: true,
      hideAfterPaletteSelect: true,
      color: that.block.props.font.color,
      palette: that.opts.chartColorList,
      change: function (color) {
        // 利用新数据更新图表
        that.block.props.font.color = color.toHexString();
        that.opts.chartInstance.setOption(that.block)
      }
    });
  }

  // 绑定文字面板字体事件
  bindFontSizeSelectHandler() {
    const fontSzieFontFamilyElement = document.getElementById('fontSizeFontFamily');
    if (!fontSzieFontFamilyElement) return;

    // 找到当前图表的字体，设置默认值
    var fontSizeIndex = this.opts.fontFamilyListText.indexOf(this.block.props.font.fontFamily);
    fontSizeIndex = fontSizeIndex > -1 ? fontSizeIndex : 0;
    if (fontSzieFontFamilyElement[fontSizeIndex]) {
      fontSzieFontFamilyElement[fontSizeIndex].selected = true;
    }
    const that = this;
    fontSzieFontFamilyElement.addEventListener('change', function (e) {
      that.block.props.font.fontFamily = e.target.value;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定文字面板字号事件
  bindFontSizeInputRangeHandler() {
    const fontSizeInputRangeElement = document.querySelector('#fontSizeInputRangeBox .input-range');
    if (!fontSizeInputRangeElement) return;
    const that = this;
    // 滑块事件
    $(fontSizeInputRangeElement).RangeSlider({
      min: 0, max: 100, step: 1, callback: () => {
        that.block.props.font.fontSize = fontSizeInputRangeElement.value;
        that.opts.chartInstance.setOption(that.block)
      }
    });
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
        <select id="legendPositionList" class="title-margin">
          ${this.createPositionList()}
        </select>

      </div>
    `
    document.getElementById('setting-box').appendChild(legendSetting)

    // 绑定图例面板事件
    this.bindLegendSwitchHandler();
    this.bindLegendPositionHandler();
  }

  // 绑定图例面板图例显示事件
  bindLegendSwitchHandler() {
    const legendSwitchElement = document.getElementById('legendSwitch');
    if (!legendSwitchElement) return;
    const that = this;

    // 设定 checkbox 默认状态
    if (this.block.props.legend.show) {
      legendSwitchElement.setAttribute('checked', 'checked');
    } else {
      legendSwitchElement.removeAttribute('checked');
    }

    legendSwitchElement.addEventListener('change', function (e) {
      that.block.props.legend.show = this.checked ? true : false;
      that.opts.chartInstance.setOption(that.block)
    })
  }

  // 绑定图例面板图例位置事件
  bindLegendPositionHandler() {
    const legendPositionElement = document.getElementById('legendPositionList');
    if (!legendPositionElement) return;

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
    legendPositionElement[legendPositionIndex].selected = true;

    // 利用当前所选值更新数据
    const that = this;
    legendPositionElement.addEventListener('change', function () {
      switch (legendPositionElement.selectedIndex) {
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
    })
  }






  /* -------------------------- 交互提示框面板 ------------------------------- */

  // 创建交互提示框面板
  createTooltipSetting() {
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
    this.bindTooltipSwitchHandler();
  }

  // 绑定交互提示框显示事件
  bindTooltipSwitchHandler() {
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
    editorElement.id = 'editor'

    // 将新的容器添加至页面
    const boxElement = document.getElementById('editor-box');
    boxElement.style.border = '1px solid #999'
    boxElement.insertBefore(editorElement, boxElement.childNodes[0]);
  }

  // 创建图表列表详情的 li
  createChartList() {
    const chartList = ['词云图', '变形饼图', '基础饼图', '基础环形图', '多条折线图', '多条阶梯折线图', '堆叠面积图', '基础柱状图', '分组柱状图', '堆叠柱状图', '分组气泡图', '多维雷达图', '漏斗图']
    let list = '';
    for (let i = 0; i < chartList.length; i++) {
      list += `
        <li class="chart-list">${chartList[i]}</li>
      `
    }
    return list;
  }

  // 创建字体下拉框当中的 option
  createFontSizeList() {
    var fontFamilyListText = this.opts.fontFamilyListText
    var fontFamilyList = '';
    for (let i = 0; i < fontFamilyListText.length; i++) {
      fontFamilyList += `
        <option value = "${fontFamilyListText[i]}">${fontFamilyListText[i]}</option>
      `
    }
    return fontFamilyList;
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

  // 创建位置选择框的 option
  createPositionList() {
    var positionList = this.opts.positionList
    var posList = '';
    for (let i = 0; i < positionList.length; i++) {
      posList += `
        <option value = "${positionList[i]}">${positionList[i]}</option>
      `
    }
    return posList;
  }






  /* -------------------------- 工具类函数 ------------------------------- */

  // 动态获取本地引用的字体
  getLocalFontFamilyList() {
    if (document.styleSheets[0] || document.styleSheets[0]) {
      const styleSheetsRules = document.styleSheets[0].rules || document.styleSheets[0].cssRules;
      const fontFamilyList = [];
      for (let i = 0; i < styleSheetsRules.length; i++) {
        fontFamilyList.push(styleSheetsRules[i].style.fontFamily)
      }
      this.opts.fontFamilyListText = [...new Set(fontFamilyList)]
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
        renderType = new window.d3Chart.PolygonRadarChart(renderBox)
        break;

      case '漏斗图':
        renderType = new window.d3Chart.FunnelChart(renderBox)
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
  bindInputBlurHandler() {
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

    const dataSrc = this.block.dataSrc.data[0];
    const dataMap = this.block.props.map[0]

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
            crossData = dataSrc[0].filter(v => v !== null)
          }
          crossData = crossData ? crossData : [];
          return crossData.slice(1);

        case 'key-value':
          let keyValueData = this.zip(dataSrc).filter(v => v !== null)
          keyValueData = keyValueData ? keyValueData : [];
          return keyValueData.slice(1);

        case 'obj-n-value':
          let objNvalueData = Array.from(new Set(this.zip(dataSrc))).filter(v => v !== null)
          objNvalueData = objNvalueData ? objNvalueData : [];
          return objNvalueData.slice(1);

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

}

window.Editor = Editor;