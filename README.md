## 使用

一些注意事项

* `SDK` 示例需要部署在服务器环境，否则无法加载

* `node` 版本需要 `8.x`

* 需要安装 `roolup`

首先安装相关依赖 `npm/cnpm install`，然后使用 `roolup` 进行工程化打包，执行命令为 `npm run build`

当控制台显示 `waiting for changes...` 即表示已经成功启动项目

接下来将项目部署至本地服务器环境启动，访问 `index.html` 即可

## SDK 依赖

如下所示，页面所需要引入相关文件

```html
<!-- 字体文件，需要注意放在首位加载，否则无法动态加载项目当中所使用的字体列表 -->
<link rel="stylesheet" href="./font-face.css">

<!-- D3 图表库 -->
<script src="./plugins/d3-chart.min.js"></script>
<script src="./plugins/d3.v5.min.js"></script>

<!-- handsontable -->
<script src="./plugins/handsontable.full.js"></script>
<link href="./plugins/handsontable.full.css" rel="stylesheet">

<!-- echarts 图表库（如果无 echarts 图表可以不用引入） -->
<script src="./plugins/echarts.min.js"></script>
<script src="./plugins/echarts-wordcloud.min.js"></script>

<!-- 核心 js 文件 -->
<script src="./main.js"></script>
<script src="./plugins/common.min.js"></script>
<script src="./plugins/util.min.js"></script>

<!-- 核心 css 文件 -->
<link rel="stylesheet" href="./main.css">
```

## 页面布局

如下所示，指定一个容器，内嵌一个编辑器配置项面板盒子即可（`id` 必须为指定项）

```html
<div id="editor-box">
  <div id="setting"></div>
</div>
```


## 实例化

实例化一个 `Editor` 对象即可，如下

```js
// 实例化对象
const editor = new Editor({
  showConfig: true,
  clientId: 'c53822d351882c0c49acafc7c44f09ca'
});
```

参数依次为下

* `showConfig`：布尔值，是否显示配置面板，选填项，默认为 `false`，不传递则不会显示配置面板，仅显示图表

* `clientId`：字符串，授权 `id`，必填项，不填写无法进行初始化操作

* `chartJSON`：`JSON` 格式对象，图表渲染 `JSON`，选填项，如果传递则需要为一个合法的 `JSON` 对象，否则使用默认列表第一个图表



## 方法接口

所有方法的使用方式均一致，首先生成一个实例化对象

```js
const editor = new Editor(...)
```

然后直接调用实例化对象 `editor` 上面的指定方法即可，方法依次如下

#### exportImage(options, callback)

获取当前图表转换为图片所生成的 `base64` 格式的图片文件

```js
// 导出图片接口
editor.exportImage({
  scale: 2,
  transparent: true,
  background: 'black'
}, function (res) {
  console.log(res)
})
```

* `options` 参数为一个对象结构，包含以下参数

  * `scale` 数字类型，选填项，指定导出图片放大倍数（默认比例为 `500*400`），默认一倍，最大为 `5` 倍值，不传递则默认为一倍图

  * `transparent` 布尔值，选填项，是否指定透明底，默认导出格式是透明底，如需导出指定颜色背景，可以配合 `background` 参数进行使用

  * `background` 字符串，选填项，该配置项只有在不传递 `transparent` 参数或者 `transparent` 参数指定为 `false` 的情况下生效，指定导出图片的背景颜色，默认值为白色

* `callback` 为回调函数，返回当前图表的 `base64` 格式图片文件
 

#### updateJSON(JSON, callback)

使用传递的 `JSON` 数据更新当前图表，需要注意，会重新渲染图表

```js
// 更新 JSON
editor.updateJSON(updateJSON, function () {
  console.log(`更新`)
})
```

* `updateJSON`，`JSON` 对象，必填项，用于更新图表的 `JSON` 格式数据，需要为标准 `JSON` 格式

* `callback` 更新完成后的回调函数



#### getJSON(callback)

获取当前图表的当前状态下的 `JSON` 对象

```js
// 获取当前图表 JSON 接口
editor.getJSON(function (res) {
  console.log(res)
})
```

* `callback` 返回当前图表的 `JSON`
