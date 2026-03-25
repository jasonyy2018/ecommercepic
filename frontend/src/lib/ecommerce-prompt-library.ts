/**
 * 电商视觉 / 生图用结构化提示词库（商用广告地毯场景为主，可扩展到其它品类）
 * 在「创建任务」页可一键套用或逐条追加到卖点、场景等字段。
 */

export type PromptLibraryChannel = "通用约束" | "卖点" | "场景" | "人群" | "生图长提示";

export type EcommercePromptEntry = {
  id: string;
  channel: PromptLibraryChannel;
  title: string;
  /** 可直接写入表单（一行）或作为完整生图 prompt */
  text: string;
};

export type EcommercePromptGroup = {
  id: string;
  title: string;
  description: string;
  /** 建议追加到的创建页字段 */
  applyTo: "sellingPoints" | "scenesBusiness" | "scenesHome" | "targetAudience";
  entries: EcommercePromptEntry[];
};

/** 一键套餐：整批写入对应字段（覆盖或合并由页面逻辑决定，默认合并去重） */
export type EcommercePresetPackage = {
  id: string;
  title: string;
  description: string;
  sellingPoints: string[];
  scenesBusiness: string[];
  scenesHome: string[];
  targetAudience: string;
};

export const ECOMMERCE_PRESET_PACKAGES: EcommercePresetPackage[] = [
  {
    id: "commercial_logo_mat_storefront",
    title: "商用地毯·门头直通车标准包",
    description: "抠图保真 + 双开玻璃门门头 + 大画幅地垫 + 商用价值卖点，适合车图/主图策划",
    sellingPoints: [
      "门店入口品牌识别：定制 LOGO 地垫强化第一印象与专业度",
      "商用级耐用：高人流踩踏场景下保持绒面/圈绒纹理清晰",
      "防滑底材：潮湿门口更安全，符合商铺/写字楼物业形象要求",
      "易清洁易维护：日常吸尘/冲洗即可，降低门店运维成本",
      "广告地毯即营销资产：提升溢价空间与到店转化心理暗示",
    ],
    scenesBusiness: [
      "高端写字楼沿街商铺双开玻璃门门口（地毯贴门槛、大面积铺设）",
      "连锁品牌门店入口（门头招牌+侧招+门口绿植+营销立牌）",
      "企业总部/展厅门厅（双开门+前台可视、地面瓷砖整洁）",
      "商场临街铺位入口（自然光斜射、广角透视）",
      "4S店/汽车服务店玻璃门入口（商务感、地面干净）",
      "酒店大堂侧门/员工通道门口（高档装修、灯光明亮）",
    ],
    scenesHome: ["高端住宅入户玄关（与商用同品质展示，强调礼品/自用两用）"],
    targetAudience:
      "25-50 岁门店老板、连锁运营、行政采购、品牌市场；关注门面形象、安全合规、品牌露出与广告转化。",
  },
  {
    id: "detail_macro_mat",
    title: "材质细节·微距与工艺",
    description: "用于 DETAIL 类生图策划时的卖点与场景词条补充",
    sellingPoints: [
      "微距呈现圈绒/割绒纹理走向，纤维边缘锐利无涂抹感",
      "锁边/包边工艺整齐，久踩不起翘",
      "LOGO 区域与毯面同色阶过渡自然，印刷/刺绣边缘清晰",
      "橡胶底防滑纹路与毯面形成材质对比，体现商用质感",
    ],
    scenesBusiness: [
      "门店门口白天自然光下的整体+细节过渡镜头",
      "侧逆光强调毯面立体纹理（避免虚假大阴影盖住 logo）",
    ],
    scenesHome: ["玄关自然光下的质感特写（与商用系列视觉统一）"],
    targetAudience: "对材质与工艺敏感的设计师、采购与品牌方。",
  },
];

/** 约束类短句：建议追加到卖点最上方，强化「不改产品只换景」 */
export const PRODUCT_FIDELITY_ENTRIES: EcommercePromptEntry[] = [
  {
    id: "fid_1",
    channel: "通用约束",
    title: "抠图保真（总述）",
    text: "【技术约束】先完整抠除原背景再合成；产品颜色、绒毛/圈绒纹理、材质反光、LOGO 字形与内容必须与参考图一致，禁止重绘、涂抹、变形、缺字。",
  },
  {
    id: "fid_2",
    channel: "通用约束",
    title: "禁止脏阴影",
    text: "毯面纹路区域禁止出现模糊灰影、鬼影、二次投影；边缘干净锐利，可与环境光接触但不得糊掉纤维细节。",
  },
  {
    id: "fid_3",
    channel: "通用约束",
    title: "门头构图",
    text: "商用场景：双开玻璃门门口，地毯紧贴门槛，铺设面积大、长宽比例适中美观（禁止细长条），地面瓷砖整洁。",
  },
  {
    id: "fid_4",
    channel: "通用约束",
    title: "光影与镜头",
    text: "白天自然阳光斜射；超广角 20-24mm；平拍或略俯拍；2K 超清、超写实、适合淘宝直通车与主图投放。",
  },
];

export const ECOMMERCE_PROMPT_GROUPS: EcommercePromptGroup[] = [
  {
    id: "grp_fidelity",
    title: "抠图与保真（强约束）",
    description: "追加到「卖点」首段，减少模型乱改产品与 logo。",
    applyTo: "sellingPoints",
    entries: PRODUCT_FIDELITY_ENTRIES,
  },
  {
    id: "grp_selling_zhitongche",
    title: "直通车 / 主图卖点句式",
    description: "强调商用价值、品牌识别、溢价与转化。",
    applyTo: "sellingPoints",
    entries: [
      {
        id: "sell_1",
        channel: "卖点",
        title: "品牌门面",
        text: "门头第一张广告：定制 LOGO 地垫让进店客户在 3 秒内记住品牌。",
      },
      {
        id: "sell_2",
        channel: "卖点",
        title: "商用溢价",
        text: "同款服务场景下，专业门面陈列提升信任感与客单价想象空间。",
      },
      {
        id: "sell_3",
        channel: "卖点",
        title: "合规与安全",
        text: "防滑底材+吸水/刮尘功能，降低雨天门口湿滑风险，物业巡查更友好。",
      },
      {
        id: "sell_4",
        channel: "卖点",
        title: "耐用省心",
        text: "商用高人流场景下不易塌陷起球，日常打理成本低。",
      },
      {
        id: "sell_5",
        channel: "卖点",
        title: "定制灵活",
        text: "支持企业 VI 色与 LOGO 排版定制，批量门店统一形象输出。",
      },
    ],
  },
  {
    id: "grp_scenes_business",
    title: "商用场景词条",
    description: "每行一条，追加到「商用场景」。",
    applyTo: "scenesBusiness",
    entries: [
      {
        id: "biz_1",
        channel: "场景",
        title: "沿街旺铺",
        text: "繁华商圈沿街铺位，玻璃双开门，门头招牌与侧招完整，门前地砖干净。",
      },
      {
        id: "biz_2",
        channel: "场景",
        title: "写字楼底商",
        text: "甲级写字楼底层商铺入口，现代铝框玻璃门，室内灯光明亮通透。",
      },
      {
        id: "biz_3",
        channel: "场景",
        title: "品牌连锁",
        text: "统一 VI 的连锁门店入口，门口两侧绿植+促销展架，广角强调门口地垫画幅。",
      },
      {
        id: "biz_4",
        channel: "场景",
        title: "企业门厅",
        text: "企业前台后方双开门入口，地毯大面积铺开，商务稳重色调。",
      },
      {
        id: "biz_5",
        channel: "场景",
        title: "商场中岛邻近口",
        text: "商场内铺与通道交界处，地面抛光砖反光克制，自然光+筒灯混合。",
      },
    ],
  },
  {
    id: "grp_scenes_home",
    title: "家用 / 礼品向场景",
    description: "追加到「家用场景」，与商用系列形成对比组套图。",
    applyTo: "scenesHome",
    entries: [
      {
        id: "home_1",
        channel: "场景",
        title: "大平层玄关",
        text: "现代简约玄关，浅色地砖，自然光从侧窗打入，地垫居中大面积展示。",
      },
      {
        id: "home_2",
        channel: "场景",
        title: "别墅入户",
        text: "双开门入户+换鞋区，地毯与门套对齐，整体高端克制。",
      },
    ],
  },
  {
    id: "grp_audience",
    title: "人群画像短描述",
    description: "追加或覆盖「目标人群」字段。",
    applyTo: "targetAudience",
    entries: [
      {
        id: "aud_1",
        channel: "人群",
        title: "门店主理人",
        text: "个体老板与店长：重视门口第一印象、清洁度与防滑安全。",
      },
      {
        id: "aud_2",
        channel: "人群",
        title: "行政采购",
        text: "企业行政与后勤采购：关注耐用、易清洁、品牌形象统一与交付周期。",
      },
      {
        id: "aud_3",
        channel: "人群",
        title: "品牌市场",
        text: "品牌方市场与陈列：关注主图点击率、门头故事感与 VI 还原度。",
      },
    ],
  },
];

/** /generate 页「门口地垫」四类镜头变体（与词库原则一致） */
export const DOORMAT_LONG_PROMPT_VARIANTS: readonly { id: string; title: string; text: string }[] = [
  {
    id: "dm_v1",
    title: "门头正对·超广角平拍",
    text: "先将地毯从原图完整抠出并去除背景，仅替换环境；logo、颜色、纹理、材质质感与原图完全一致，毯面无模糊脏影。场景：高端写字楼沿街商铺双开玻璃门入口，地毯紧贴门槛、大面积铺设、长宽比例适中（非细长条），地面瓷砖干净整洁。白天自然阳光斜射，20mm 超广角、平拍；门头有商家 logo 招牌，门口两侧绿植与营销立牌，店内温馨明亮、空间宽敞高档。2K 超清超写实，突出商用广告地毯提升门店辨识度与品牌溢价，适合淘宝直通车。",
  },
  {
    id: "dm_v2",
    title: "略俯拍·强调地垫画幅",
    text: "抠图保真：禁止改变产品任何细节与 logo。双开玻璃门店门口，略俯拍视角强化地垫在画幅中的面积占比，边缘齐门槛无悬空。自然光斜射+店内暖光，环境繁华整洁，门头与侧招可读。超广角，2K 超写实，商用广告地毯主视觉。",
  },
  {
    id: "dm_v3",
    title: "侧向透视·景深层次",
    text: "无损抠图合成；材质与 logo 零改动。从斜侧方拍摄双开玻璃门入口，前景地垫清晰，中景门扇与反射克制真实，远景街道虚化轻微。日光斜射，地面干净，植物与展架点缀两侧。强调商用门头品牌阵列与地垫广告价值，2K 车图质感。",
  },
  {
    id: "dm_v4",
    title: "轻奢内景可见·信任感",
    text: "抠图保真后合成；门店玻璃门微开或通透可见室内：灯光明亮、装修高档，门口大地毯展示品牌 logo。平拍至轻俯拍，超广角，日光与室内光平衡。突出「专业门面=溢价空间」的商用心理，画面干净无杂乱，2K 超写实。",
  },
];

export function mergeLines(existing: string, lines: string[]): string {
  const cur = existing
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const set = new Set(cur);
  for (const line of lines) {
    const t = line.trim();
    if (t && !set.has(t)) {
      set.add(t);
      cur.push(t);
    }
  }
  return cur.join("\n");
}

export function appendEntryToField(
  field: "sellingPoints" | "scenesBusiness" | "scenesHome" | "targetAudience",
  currentText: string,
  entryText: string,
): string {
  if (field === "targetAudience") {
    const t = entryText.trim();
    if (!t) return currentText;
    return currentText.trim() ? `${currentText.trim()}\n${t}` : t;
  }
  return mergeLines(currentText, [entryText]);
}

export function applyPresetPackage(pkg: EcommercePresetPackage): {
  sellingPointsText: string;
  scenesBusinessText: string;
  scenesHomeText: string;
  targetAudience: string;
} {
  return {
    sellingPointsText: pkg.sellingPoints.join("\n"),
    scenesBusinessText: pkg.scenesBusiness.join("\n"),
    scenesHomeText: pkg.scenesHome.join("\n"),
    targetAudience: pkg.targetAudience,
  };
}
