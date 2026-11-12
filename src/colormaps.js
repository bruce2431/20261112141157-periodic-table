const PROPS = [
  { key: "eneg", idx: 8,  name: "电负性",       unit: "Pauling χ", fmt: v => v.toFixed(2), desc: "原子在化合物中吸引成键电子能力的相对大小（鲍林标度）" },
  { key: "ie1",  idx: 9,  name: "第一电离能",   unit: "kJ/mol",    fmt: v => v.toFixed(1), desc: "气态基态原子失去第一个电子转化为气态正离子所需的最低能量" },
  { key: "mass", idx: 7,  name: "原子质量",     unit: "u",         fmt: v => v < 10 ? v.toFixed(3) : v.toFixed(2), desc: "IUPAC 标准相对原子质量（放射性元素取最长寿同位素质量数）" },
  { key: "rad",  idx: 10, name: "原子半径",     unit: "pm",        fmt: v => Math.round(v) + "", desc: "经验/共价单键原子半径（皮米 pm），反映原子电子云空间尺度" },
  { key: "ea",   idx: 11, name: "电子亲和能",   unit: "kJ/mol",    fmt: v => v.toFixed(1), desc: "气态原子获得一个电子形成气态负离子时释放的能量" },
  { key: "mp",   idx: 12, name: "熔点",         unit: "K",         fmt: v => v < 100 ? v.toFixed(2) : Math.round(v) + "", desc: "标准大气压下纯元素固相与液相平衡热力学温度" },
  { key: "bp",   idx: 13, name: "沸点",         unit: "K",         fmt: v => v < 100 ? v.toFixed(2) : Math.round(v) + "", desc: "标准大气压下纯元素液相转变为气相的沸腾温度" },
  { key: "dens", idx: 14, name: "密度",         unit: "g/cm³",     fmt: v => v < 0.1 ? v.toExponential(2) : v.toFixed(2), desc: "标准状况（298 K, 1 atm）下元素单质的体相质量密度" }
];

const CATS = [
  { name: "活泼非金属", color: "#22c55e" },
  { name: "稀有气体",   color: "#a855f7" },
  { name: "碱金属",     color: "#ef4444" },
  { name: "碱土金属",   color: "#f97316" },
  { name: "类金属",     color: "#14b8a6" },
  { name: "卤素",       color: "#eab308" },
  { name: "过渡金属",   color: "#3b82f6" },
  { name: "后过渡金属", color: "#06b6d4" },
  { name: "镧系元素",   color: "#ec4899" },
  { name: "锕系元素",   color: "#f43f5e" }
];

const CHROMA_MAPS = {
  turbo: {
    label: "光谱色度 (Turbo)",
    stops: [[48,18,59],[70,107,227],[40,188,235],[50,242,152],[164,252,60],[238,207,58],[251,126,33],[208,47,5],[122,4,3]]
  },
  viridis: {
    label: "均匀感知色度 (Viridis)",
    stops: [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]]
  },
  plasma: {
    label: "等离子色度 (Plasma)",
    stops: [[13,8,135],[126,3,168],[204,71,120],[248,149,64],[240,249,33]]
  },
  coolwarm: {
    label: "冷暖双极色度 (Cool-Warm)",
    stops: [[30,64,175],[56,189,248],[226,232,240],[251,146,60],[185,28,28]]
  }
};

const DEPTH_MAPS = {
  cyan:    { label: "深海青深度", stopsDark: [[12,26,44],[14,78,118],[6,148,198],[125,236,255]], stopsLight: [[230,247,255],[138,212,248],[14,132,196],[8,51,88]] },
  emerald: { label: "翡翠绿深度", stopsDark: [[11,32,26],[13,92,66],[16,172,116],[134,250,198]], stopsLight: [[232,250,240],[134,228,178],[16,148,96],[6,64,43]] },
  amber:   { label: "琥珀金深度", stopsDark: [[36,22,10],[112,58,12],[210,122,16],[254,228,118]], stopsLight: [[254,249,226],[252,205,112],[217,119,6],[110,44,6]] },
  violet:  { label: "紫晶深度",   stopsDark: [[28,16,46],[86,40,145],[152,82,235],[230,198,255]], stopsLight: [[245,238,255],[196,164,250],[126,58,218],[54,18,108]] },
  mono:    { label: "纯粹灰阶深度", stopsDark: [[22,28,40],[72,85,106],[148,163,184],[241,245,249]], stopsLight: [[244,247,251],[182,194,210],[92,106,128],[18,24,38]] }
};

function interpStops(stops, t) {
  const c = Math.max(0, Math.min(1, t));
  const pos = c * (stops.length - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const a = stops[i], b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f)
  ];
}

function rgbStr(rgb) { return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }

function textContrast(rgb) {
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  return lum > 0.56 ? "#08111f" : "#f8fafc";
}
