const wikiEntries = {
  zhongzhong: {
    category: "伙伴",
    title: "种种",
    image: "assets/gameplay-world.png",
    alt: "种种世界中的花园场景",
    intro: "种种是这些世界的发起者，也是植物、来信和日常碎片的长期记录者。",
    facts: [
      ["负责", "世界方向、内容整理与持续创作"],
      ["常在", "花园、酒馆和还没有命名的新地点"],
      ["喜欢", "慢慢长大的植物与真诚的来信"],
      ["随身", "一本写满小字的花种手账"],
    ],
    notes: [
      "最早的记录只是一颗种子和一小块空地。后来朋友变多，空地也逐渐连接成可以来回走动的世界。",
      "她会把大家遇见的植物、说过的话和共同完成的作品留在这里，作为下一次出发的线索。",
    ],
  },
  "world-builder": {
    category: "伙伴",
    title: "世界搭建伙伴",
    image: "assets/gameplay-dandelion.png",
    alt: "蒲公英大世界的岛屿场景",
    intro: "负责把草地、小屋、道路和岛屿拼成真正能探索的空间。",
    facts: [
      ["负责", "场景搭建、路线调整与交互测试"],
      ["工具", "地形格、色板与不断修改的草图"],
      ["在意", "走路是否顺手、转角是否有惊喜"],
      ["最近", "继续整理蒲公英岛的外沿区域"],
    ],
    notes: [
      "他们会先从一条能走通的小路开始，再慢慢补上水面、植物和停留的理由。",
      "每一次调整都要重新走一遍，因为地图好看只是第一步，愿意在里面多待一会儿才算完成。",
    ],
  },
  "plant-keeper": {
    category: "伙伴",
    title: "植物记录伙伴",
    image: "assets/scene-forage.png",
    alt: "林地中的植物观察画面",
    intro: "在叶片、花期和生长速度之间寻找规律，也负责提醒大家别忘记浇水。",
    facts: [
      ["负责", "植物辨认、图鉴整理与生长记录"],
      ["观察", "叶缘、气味、出现地点和天气"],
      ["常带", "放大镜、软尺和几张空白标签"],
      ["偏爱", "那些不显眼但很有韧性的植物"],
    ],
    notes: [
      "同一种植物在河岸和花园里可能长得很不一样，因此每条记录都会保留当时的环境。",
      "遇到还不能确认的名字时，资料会先以临时称呼保存，等下一次观察再继续补完。",
    ],
  },
  "story-host": {
    category: "伙伴",
    title: "酒馆故事伙伴",
    image: "assets/gameplay-tavern.png",
    alt: "种种酒馆的室内画面",
    intro: "守着酒馆夜灯和信箱，把来往的消息整理成可以被再次读到的故事。",
    facts: [
      ["负责", "来信接收、故事整理与酒馆值夜"],
      ["常在", "壁炉旁边那张有划痕的木桌"],
      ["擅长", "记住谁喜欢坐哪里和喝什么"],
      ["收藏", "写错地址却意外抵达的信"],
    ],
    notes: [
      "酒馆没有固定菜单，故事也没有统一格式。有人只写两句话，也有人寄来厚厚一叠手稿。",
      "每封信都会先被好好收下，再决定它适合放进博客、论坛，还是只留在酒馆的抽屉里。",
    ],
  },
  "dandelion-plant": {
    category: "植物",
    title: "蒲公英",
    image: "assets/gameplay-dandelion.png",
    alt: "蒲公英岛屿与风的画面",
    intro: "成熟以后把种子交给风，是蒲公英大世界里关于远行的第一个象征。",
    facts: [
      ["花期", "春末到初夏"],
      ["出现", "开阔草地、道路边缘与岛屿高处"],
      ["特征", "黄色花冠，成熟后形成白色绒球"],
      ["记录", "风越大，种子出现得越远"],
    ],
    notes: [
      "岛上的蒲公英不会一次全部散开。风向改变时，剩下的种子会继续等待下一阵风。",
      "最早的地图扩张测试就以一颗飘出画面边缘的种子作为起点。",
    ],
  },
  "four-leaf-sprite": {
    category: "植物",
    title: "四叶草精灵",
    image: "assets/scene-forage.png",
    alt: "潮湿林地与采集植物画面",
    intro: "藏在潮湿林地里的小型植物精灵，第四片叶子需要很久才会完全展开。",
    facts: [
      ["出现", "树影下、苔石边和雨后的木桩旁"],
      ["颜色", "嫩绿到带蓝的深绿"],
      ["习性", "安静时贴近地面，有脚步声就缩起叶片"],
      ["提示", "不要为了找第四片叶子翻动整片草地"],
    ],
    notes: [
      "它看起来像普通三叶草，只有在光线从侧面照过来时，藏着的第四片叶子才容易被看见。",
      "伙伴们更愿意把遇见它当成一次问候，而不是必须带走的幸运物。",
    ],
  },
  "moon-mint": {
    category: "植物",
    title: "月光薄荷",
    image: "assets/scene-town.png",
    alt: "夜色中的小镇与植物画面",
    intro: "天黑后叶缘会微微变亮，适合放在酒馆窗边陪着晚归的人。",
    facts: [
      ["气味", "清凉，随后有很淡的甜味"],
      ["出现", "夜间窗台和背阴花圃"],
      ["特征", "叶片边缘在月光下呈浅蓝色"],
      ["用途", "用于酒馆的无酒精薄荷饮"],
    ],
    notes: [
      "月光薄荷白天并不起眼，到了夜里才会显出柔和的浅色叶边。",
      "采摘后应留下靠近根部的新芽，让它在下一次月圆前重新长好。",
    ],
  },
  bellflower: {
    category: "植物",
    title: "风铃草",
    image: "assets/scene-river.png",
    alt: "河岸边的蓝色水面与植物",
    intro: "河岸边的淡蓝小花，风经过时整片花茎会朝同一个方向轻轻摆动。",
    facts: [
      ["花色", "淡蓝、蓝紫，偶尔接近白色"],
      ["出现", "河岸缓坡和湿润石缝"],
      ["花期", "初夏到盛夏"],
      ["观察", "傍晚的颜色比正午更明显"],
    ],
    notes: [
      "它没有真的发出铃声，但成片摆动时会让人误以为远处有人经过。",
      "河岸观察点保留了一小片不修剪的区域，专门记录它每年的开花范围。",
    ],
  },
  "cloud-moss": {
    category: "植物",
    title: "云朵苔",
    image: "assets/scene-forage.png",
    alt: "林地石面上的苔藓环境",
    intro: "贴着潮湿石面缓慢铺开的浅色苔藓，触感像刚晒过的软布。",
    facts: [
      ["颜色", "灰绿、浅薄荷绿"],
      ["出现", "背阴石阶、井边和老树根部"],
      ["生长", "雨季加快，干燥时暂时收缩"],
      ["痕迹", "轻踩会留下短暂的浅色印子"],
    ],
    notes: [
      "云朵苔并不稀少，只是很容易和石面的颜色混在一起。",
      "记录时通常只拍照和测量，不采集整块样本，以免破坏它缓慢形成的边缘。",
    ],
  },
  "spring-garden": {
    category: "地点",
    title: "春日花园",
    image: "assets/gameplay-world.png",
    alt: "种种世界的春日花园场景",
    intro: "种种世界里最早醒来的地方，苗圃、石径和小屋每天都有细小变化。",
    facts: [
      ["区域", "种种世界"],
      ["可见", "苗圃、小屋、石径与低矮果树"],
      ["适合", "散步、种植和第一次植物观察"],
      ["时间", "清晨的颜色最清楚"],
    ],
    notes: [
      "春日花园不是固定布景，植物的位置会随着记录和创作继续变化。",
      "从主路离开一点，可以看到尚未命名的小花和伙伴们留下的工作痕迹。",
    ],
  },
  "tavern-corner": {
    category: "地点",
    title: "酒馆角落",
    image: "assets/gameplay-tavern.png",
    alt: "种种酒馆靠近壁炉的角落",
    intro: "靠近壁炉的一张旧木桌，是交换消息、拆信和短暂停留的地方。",
    facts: [
      ["区域", "种种酒馆"],
      ["座位", "两把木椅和一只临时加来的矮凳"],
      ["可见", "信箱、烛灯、杯垫与墙上的贴纸"],
      ["热闹", "夜里九点以后"],
    ],
    notes: [
      "桌面有很多无法完全擦掉的划痕，其中几条被大家当成了即兴地图。",
      "新收到的信通常会先放在这里，等酒馆安静下来再慢慢打开。",
    ],
  },
  "dandelion-island": {
    category: "地点",
    title: "蒲公英岛",
    image: "assets/gameplay-dandelion.png",
    alt: "蒲公英大世界的岛屿全景",
    intro: "被海风围住的小岛，远处的道路和地形仍在随着版本继续生长。",
    facts: [
      ["区域", "蒲公英大世界"],
      ["地形", "草坡、浅滩、石地与高处平台"],
      ["天气", "风多，云层移动很快"],
      ["入口", "Deadlion 版本"],
    ],
    notes: [
      "岛屿的边缘不是结束，而是尚未抵达的下一段空间。",
      "每次扩张都会先确认旧路线仍然清楚，再把新的区域接到已有地形上。",
    ],
  },
  "river-watch": {
    category: "地点",
    title: "河岸观察点",
    image: "assets/scene-river.png",
    alt: "黄昏时的河岸观察点",
    intro: "黄昏时水面会变成粉蓝色，附近也最容易发现刚出现的湿地植物。",
    facts: [
      ["区域", "种种世界东侧河岸"],
      ["标记", "一块平石和插在土里的蓝色木牌"],
      ["适合", "记录水位、花期与经过的小动物"],
      ["时间", "雨后第二天或晴天傍晚"],
    ],
    notes: [
      "观察点没有围栏，标记也很小，走得太快就容易错过。",
      "这里的记录会同时写下天气，因为同一株风铃草在不同湿度下差异很明显。",
    ],
  },
  "seed-notebook": {
    category: "物品",
    title: "花种手账",
    image: "assets/merch-sticker-world.png",
    alt: "种种世界主题的植物记录图像",
    intro: "一本夹着种子袋、叶片拓印和未完成日期的随身记录册。",
    facts: [
      ["用途", "记录播种、出芽、花期与观察地点"],
      ["内页", "点阵纸、植物索引与自由书写页"],
      ["夹层", "可放种子袋、票据和小照片"],
      ["状态", "边角已经被频繁翻阅磨软"],
    ],
    notes: [
      "手账不要求每天填写，只有真正观察到变化时才增加一页。",
      "错误的名字不会被涂掉，而是保留在旁边，记下当时为什么会这样判断。",
    ],
  },
  "travel-clip": {
    category: "物品",
    title: "旅行地图夹",
    image: "assets/merch-sticker-map.png",
    alt: "蒲公英岛路线主题图像",
    intro: "把路线、票据和路边捡到的小纸片收在一起的便携地图夹。",
    facts: [
      ["用途", "保存地图、路线标记与途中资料"],
      ["材质", "硬纸板、布脊和可替换松紧带"],
      ["尺寸", "能放下折叠后的岛屿地图"],
      ["标记", "常用粉色笔圈出下次要去的地方"],
    ],
    notes: [
      "地图夹里的路线不一定最短，通常会经过值得停留的植物和景色。",
      "每次旅行结束后只整理新增部分，旧的折痕和手写箭头都会继续保留。",
    ],
  },
  "watering-can": {
    category: "物品",
    title: "蓝色浇水壶",
    image: "assets/hero-farm.png",
    alt: "花园与种植工具场景",
    intro: "容量不大，但刚好够照顾窗边那一排幼苗。",
    facts: [
      ["用途", "幼苗和小型盆栽的日常浇水"],
      ["颜色", "浅蓝色壶身，薄荷绿提手"],
      ["容量", "一次照顾七到九只小花盆"],
      ["位置", "通常放在花园入口的木架下"],
    ],
    notes: [
      "细长壶嘴让水流更容易靠近根部，不会直接冲倒刚发芽的幼苗。",
      "壶身上的几处掉漆没有修补，它们已经成了辨认这只浇水壶的记号。",
    ],
  },
  "sticker-album": {
    category: "物品",
    title: "伙伴贴纸册",
    image: "assets/merch-sticker-companions.png",
    alt: "种种伙伴贴纸图像",
    intro: "收藏不同季节、不同表情和不同小事件中的种种伙伴。",
    facts: [
      ["内容", "伙伴、植物、地点和小物件贴纸"],
      ["用途", "收藏、交换与装饰手账"],
      ["纸张", "可反复翻阅的离型纸内页"],
      ["来源", "种种文创周边系列"],
    ],
    notes: [
      "贴纸不是编号任务，可以随自己的顺序收集，也可以把喜欢的那一张重复贴很多次。",
      "册子里会保留几页空白，给以后还没有出现的新伙伴。",
    ],
  },
  "first-seed": {
    category: "故事",
    title: "第一颗种子",
    image: "assets/gameplay-world.png",
    alt: "种种世界最初的花园场景",
    intro: "一个很小的决定，后来长成了许多彼此相连的世界。",
    facts: [
      ["发生", "种种世界建立之前"],
      ["主角", "种种与一颗没有标签的种子"],
      ["地点", "一块暂时空着的小土地"],
      ["留下", "第一张发芽日期记录"],
    ],
    notes: [
      "没有人知道那颗种子会长成什么，因此最初的计划只是每天去看一眼。",
      "当第一片叶子出现，关于记录植物、搭建花园和邀请朋友的想法也一起出现了。",
    ],
  },
  "rain-letter": {
    category: "故事",
    title: "雨后的来信",
    image: "assets/scene-river.png",
    alt: "雨后河岸与来信故事场景",
    intro: "信封被雨打湿了一角，里面却还留着很淡的花香。",
    facts: [
      ["收到", "一个连续下雨的下午"],
      ["寄件人", "没有留下完整名字"],
      ["内容", "一段植物回忆和一张手绘路线"],
      ["去向", "后来收藏在酒馆角落的抽屉里"],
    ],
    notes: [
      "纸上的墨有几处散开，反而让手绘的小河看起来真的在流动。",
      "大家沿着路线找过一次，没有找到信里写的花，却发现了河岸观察点。",
    ],
  },
  "tavern-dinner": {
    category: "故事",
    title: "酒馆晚餐",
    image: "assets/gameplay-tavern.png",
    alt: "种种酒馆晚餐场景",
    intro: "一顿没有菜单的晚餐，每个人都带来了一点东西。",
    facts: [
      ["发生", "种种酒馆第一次坐满的晚上"],
      ["桌上", "汤、面包、薄荷饮和几只不同的杯子"],
      ["约定", "下一次仍然不提前准备菜单"],
      ["留下", "一张写满名字和涂鸦的杯垫"],
    ],
    notes: [
      "有人迟到，有人临时多带了一位朋友，但桌子最后还是挤出了位置。",
      "后来酒馆把这顿晚餐当成一种传统：不要求完整准备，只要愿意带着故事来。",
    ],
  },
  "dandelion-trip": {
    category: "故事",
    title: "蒲公英远行",
    image: "assets/gameplay-dandelion.png",
    alt: "蒲公英种子越过岛屿的场景",
    intro: "种子越过海面以后，新的地图才第一次向外展开。",
    facts: [
      ["起点", "蒲公英岛的最高草坡"],
      ["方向", "顺着海风向未完成的区域"],
      ["同行", "一张地图和三枚路标"],
      ["结果", "发现岛屿外仍有可以连接的地形"],
    ],
    notes: [
      "远行并不是离开已有世界，而是确认世界边缘之外还有新的可能。",
      "这次记录后来成为地图扩张的参考，每一段新路线都保留了风吹来的方向。",
    ],
  },
  world: {
    category: "项目",
    title: "种种世界",
    image: "assets/gameplay-world.png",
    alt: "种种世界像素风花园实机画面",
    intro: "关于植物、生活和缓慢生长的主世界，也是所有资料最早汇集的地方。",
    facts: [
      ["内容", "植物观察、生活记录与花园探索"],
      ["场景", "田野、小屋、森林和河岸"],
      ["入口", "pingnan-plants-site.vercel.app"],
      ["状态", "持续生长中"],
    ],
    notes: [
      "种种世界不是完成后才开放的展览，而是一边生活、一边记录、一边继续搭建的地方。",
      "植物图鉴、伙伴资料和很多故事都会先在这里出现，再慢慢连接到其他项目。",
    ],
  },
  tavern: {
    category: "项目",
    title: "种种酒馆",
    image: "assets/gameplay-tavern.png",
    alt: "种种酒馆像素风室内实机画面",
    intro: "收留故事、朋友与深夜来信的线上酒馆。",
    facts: [
      ["内容", "故事、交流、来信与朋友聚会"],
      ["场景", "吧台、壁炉、信箱和靠窗座位"],
      ["入口", "zhongzhongforever.net"],
      ["开放", "随时欢迎来坐一会儿"],
    ],
    notes: [
      "这里不强调完成任务，更像是一个可以暂时停下来读信、留言和认识朋友的空间。",
      "博客里的来信、论坛里的回复和伙伴们的故事，都会在酒馆留下痕迹。",
    ],
  },
  dandelion: {
    category: "项目",
    title: "蒲公英大世界",
    image: "assets/gameplay-dandelion.png",
    alt: "蒲公英大世界像素风岛屿实机画面",
    intro: "沿着海风与岛屿继续扩张的探索项目。",
    facts: [
      ["内容", "岛屿地形、路线探索与世界扩张"],
      ["场景", "草坡、浅滩、石地和未完成的远方"],
      ["版本", "Deadlion"],
      ["状态", "持续扩展与测试中"],
    ],
    notes: [
      "项目会先保证已有岛屿的路线和层次清楚，再继续向外连接新的地形。",
      "蒲公英是它的方向提示：种子飘到哪里，下一段世界就可能从哪里开始。",
    ],
  },
};

const legacyWikiEntryIds = {
  characters: "zhongzhong",
  team: "zhongzhong",
  plants: "dandelion-plant",
  places: "spring-garden",
  items: "seed-notebook",
  stories: "first-seed",
};

const wikiFallbackImages = {
  伙伴: "assets/wiki-filter-team.png",
  植物: "assets/wiki-filter-plants.png",
  地点: "assets/wiki-filter-places.png",
  物品: "assets/wiki-filter-items.png",
  故事: "assets/wiki-filter-stories.png",
  产品: "assets/wiki-filter-projects.png",
  default: "assets/gameplay-world.png",
};

const wikiFactMarks = {
  气味: "＊",
  特征: "◇",
  出现: "○",
  用途: "＋",
  花期: "※",
  颜色: "□",
  生长: "〜",
  习性: "・",
  观察: "◎",
  记录: "〃",
  区域: "⌂",
  时间: "◦",
};

const requestedWikiEntry = new URLSearchParams(window.location.search).get("id");
const normalizedWikiEntry = legacyWikiEntryIds[requestedWikiEntry] || requestedWikiEntry;
const wikiEntry = wikiEntries[normalizedWikiEntry] || wikiEntries.zhongzhong;
const wikiCategory = document.querySelector("#wikiEntryCategory");
const wikiTitle = document.querySelector("#wikiEntryTitle");
const wikiIntro = document.querySelector("#wikiEntryIntro");
const wikiImage = document.querySelector("#wikiEntryImage");
const wikiFacts = document.querySelector("#wikiEntryFacts");
const wikiNotes = document.querySelector("#wikiEntryNotes");

if (wikiCategory && wikiTitle && wikiIntro && wikiImage && wikiFacts && wikiNotes) {
  wikiCategory.textContent = wikiEntry.category;
  wikiTitle.textContent = wikiEntry.title;
  wikiIntro.textContent = wikiEntry.intro;
  wikiImage.src = wikiEntry.image || wikiFallbackImages[wikiEntry.category] || wikiFallbackImages.default;
  wikiImage.alt = wikiEntry.alt || `${wikiEntry.title}的资料展位`;
  document.title = `${wikiEntry.title}｜种种大世界`;

  wikiEntry.facts.forEach(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = `${wikiFactMarks[label] || "·"} ${label}`;
    description.textContent = value;
    item.append(term, description);
    wikiFacts.append(item);
  });

  wikiEntry.notes.forEach((note) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = note;
    wikiNotes.append(paragraph);
  });
}
