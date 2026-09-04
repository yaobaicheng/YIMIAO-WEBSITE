# 三语静态企业官网：使用说明

这是纯 HTML + CSS + JavaScript 的展示站，**不含后台、数据库、登录、表单提交**。客户通过页面中的邮箱、电话、Shopee、WhatsApp、二维码等入口自行联系。

日常只改两处：

1. `content.js`：所有文字、产品、外链、二维码、图片路径、三语内容。
2. `assets/`：存放你的图片和二维码。

请不要修改 `main.js`；它负责把 `content.js` 的内容显示到网页。

## 文件用途

| 文件 | 用途 | 日常是否修改 |
|---|---|---|
| `index.html` | 页面结构；含【A】到【N】位置注释 | 通常不改 |
| `styles.css` | 颜色、尺寸、响应式手机样式 | 需要改设计时才改 |
| `content.js` | 所有内容、产品、图片、三语 | 是 |
| `main.js` | 三语切换与页面渲染 | 不改 |
| `assets/` | 放产品图、背景图、二维码 | 是 |

## 页面位置速查

| 编号 | 网页位置 | content.js 对应位置 |
|---|---|---|
| 【A】 | 公司名称、页脚、地址、电话、邮箱 | `company` |
| 【B】 | 主导航和顶部快捷栏 | `locales > nav / utility` |
| 【C】 | 首屏 Banner | `assets.hero`、`locales > hero` |
| 【D】 | 企业介绍与数字 | `locales > about / stats` |
| 【E】 | 企业愿景横幅 | `assets.vision`、`locales > vision` |
| 【F】 | 产品中心和产品图片 | `products`、`productCategories` |
| 【G】 | 行业方案 | `solutions` |
| 【H】 | 服务支持 | `support` |
| 【I】 | 全球布局 | `assets.globalMap`、`locales > global` |
| 【J】 | 可持续发展 | `assets.sustainability`、`locales > sustainability` |
| 【K】 | 企业画廊 | `gallery` |
| 【L】 | 新闻列表 | `news` |
| 【M】 | 联系方式、Shopee、二维码 | `contactMainLink`、`contactLinks` |
| 【N】 | 页脚联络资料 | `company.contact` |

## 1. 替换背景、产品和画廊图片

先将图片直接复制/拖进 `assets` 文件夹。文件名和 `content.js` 写的路径必须完全相同（包含 `.jpg`、`.png` 后缀）。

例如，放入一张首屏背景：

```text
assets/hero.jpg
```

然后在 `content.js` 顶部找到并改为：

```js
assets:{hero:"assets/hero.jpg",vision:"assets/vision.jpg",globalMap:"assets/world-map.jpg",sustainability:"assets/green.jpg"},
```

| 图片位置 | 推荐尺寸 | 应修改的内容 |
|---|---:|---|
| 首屏 Banner | 1920 × 1080 以上 | `assets.hero` |
| 愿景 / 可持续横幅 | 1920 × 1080 以上 | `assets.vision` / `assets.sustainability` |
| 全球地图或全球工厂图 | 1600 × 1000 以上 | `assets.globalMap` |
| 产品图片 | 800 × 1000 左右 | 每个产品的 `image` |
| 解决方案背景 | 1600 × 800 以上 | 每项方案的 `image` |
| 企业画廊 | 1600 × 900 左右 | 每项画廊的 `image` |
| 二维码 | 500 × 500 以上 | 二维码项的 `image` |

没有配置图片时，页面会保留抽象背景；不会影响打开。

## 2. 修改中文 / 英文 / 印尼语

在 `content.js` 最下面找到：

```js
locales:{ zh:{...}, en:{...}, id:{...} }
```

- `zh` 是中文；`en` 是英文；`id` 是印尼语。
- 同一段文字要修改三种语言时，在三个语言对象中找到相同的键。例如首屏标题的路径是 `hero.title`。
- 标题换行可写 `<br>`，例如：`title:"我们专注<br>先进材料"`。
- 网页右上角的 `中文 / EN / ID` 可立即切换语言；所选语言会保存在当前浏览器中。

产品、方案、服务卡、新闻、画廊、Shopee 卡也已经分别内置 `zh` / `en` / `id` 文本。修改产品名时请改同一个产品下的三组 `name` 与 `text`。

## 3. 新增产品（复制粘贴）

在 `content.js` 的 `products:[ ... ]` 中，最后一个产品后面、结束的 `]` 前粘贴下面一项。请确保前一项结尾有逗号 `,`：

```js
{no:"13",category:"tube",image:"assets/product-13.jpg",tone:"copper",link:"#contact",
 name:{zh:"新产品名称",en:"New Product Name",id:"Nama Produk Baru"},
 text:{zh:"中文产品简介",en:"English product description",id:"Deskripsi produk bahasa Indonesia"}},
```

可用分类：`tube`（铜管）、`rod`（铜棒）、`foil`（铜箔）、`aluminum`（铝材）、`custom`（定制）。可用颜色：`copper`、`silver`、`blue`、`dark`。产品超过 8 个时，网页会自动显示“加载更多”。

要新加分类：在 `productCategories` 中加入英文内部代号（例如 `"catalyst"`），再在三种语言的 `locales > products > categories` 中各加入该代号的翻译。

## 4. 新增 Shopee、第三方平台或 WhatsApp 链接

在 `contactLinks:[ ... ]` 的最后一项后，复制以下代码，并替换 URL 和三语文字：

```js
{type:"link",icon:"↗",url:"https://shopee.tw/你的店铺",
 label:{zh:"Shopee 官方店铺",en:"Shopee Official Store",id:"Toko Resmi Shopee"},
 note:{zh:"前往选购",en:"Shop now",id:"Belanja sekarang"}},
```

淘宝、TikTok、Facebook、Instagram、独立站、Line、WhatsApp 等全都用同一段代码，只需修改 `url` 和文字。外链会新标签页打开。

## 5. 新增二维码（复制粘贴）

1. 将二维码图片放进 `assets`，例如 `assets/qr-line.png`。
2. 在 `contactLinks:[ ... ]` 最后粘贴：

```js
{type:"qr",image:"assets/qr-line.png",
 label:{zh:"LINE 客服",en:"LINE Customer Service",id:"Layanan LINE"},
 note:{zh:"扫码添加客服",en:"Scan to add us",id:"Pindai untuk menambahkan kami"}},
```

二维码会在“联系我们”区域显示为一张卡片。可以重复添加多个。

## 6. 新增新闻与画廊

新闻，复制到 `news:[ ... ]`：

```js
{date:"2026.09.01",type:{zh:"公司新闻",en:"Company News",id:"Berita Perusahaan"},
 title:{zh:"中文新闻标题",en:"English news title",id:"Judul berita Indonesia"},link:"https://你的链接"},
```

画廊，复制到 `gallery:[ ... ]`：

```js
{image:"assets/gallery-06.jpg",size:"normal",
 title:{zh:"图片中文标题",en:"Gallery title",id:"Judul galeri"}},
```

`size` 选项：`normal` 普通大小、`wide` 横向两格、`tall` 纵向两格。

## 7. 本地预览与部署

本地预览时直接双击 `index.html`。上线时，将下列内容一起上传到网站空间 / Vercel / Netlify 的根目录：

```text
index.html
styles.css
content.js
main.js
assets/ （以及里面的所有图片、二维码）
```

不要只上传 HTML，也不要忘记 `assets` 文件夹，否则图片无法展示。
