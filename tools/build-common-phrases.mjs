// 生成"常见四字词语"补充库 → static/data/games/common-phrases.json
// 与现有 idioms.json 求差集，只保留新增条目（成语库已收的不重复加）
// 用法: node tools/build-common-phrases.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const IDIOM_PATH = 'static/data/games/idioms.json'
const OUT_PATH = 'static/data/games/common-phrases.json'

// 候选清单：常见 4 字词语，分组维护方便扩充
// pinyin 不带声调，与 idiom 库一致，空格分隔
const CANDIDATES = [
  // ===== AABB / ABAB 叠词类（生活、心情、性格、动作）=====
  ['红红火火', 'hong hong huo huo'],
  ['平平安安', 'ping ping an an'],
  ['健健康康', 'jian jian kang kang'],
  ['开开心心', 'kai kai xin xin'],
  ['团团圆圆', 'tuan tuan yuan yuan'],
  ['高高兴兴', 'gao gao xing xing'],
  ['顺顺利利', 'shun shun li li'],
  ['漂漂亮亮', 'piao piao liang liang'],
  ['干干净净', 'gan gan jing jing'],
  ['仔仔细细', 'zi zi xi xi'],
  ['整整齐齐', 'zheng zheng qi qi'],
  ['安安静静', 'an an jing jing'],
  ['快快乐乐', 'kuai kuai le le'],
  ['蹦蹦跳跳', 'beng beng tiao tiao'],
  ['慌慌张张', 'huang huang zhang zhang'],
  ['大大方方', 'da da fang fang'],
  ['客客气气', 'ke ke qi qi'],
  ['老老实实', 'lao lao shi shi'],
  ['认认真真', 'ren ren zhen zhen'],
  ['明明白白', 'ming ming bai bai'],
  ['清清楚楚', 'qing qing chu chu'],
  ['来来回回', 'lai lai hui hui'],
  ['上上下下', 'shang shang xia xia'],
  ['里里外外', 'li li wai wai'],
  ['前前后后', 'qian qian hou hou'],
  ['时时刻刻', 'shi shi ke ke'],
  ['日日夜夜', 'ri ri ye ye'],
  ['弯弯曲曲', 'wan wan qu qu'],
  ['高高低低', 'gao gao di di'],
  ['长长久久', 'chang chang jiu jiu'],
  ['多多少少', 'duo duo shao shao'],
  ['大大小小', 'da da xiao xiao'],
  ['红红绿绿', 'hong hong lv lv'],
  ['花花绿绿', 'hua hua lv lv'],
  ['普普通通', 'pu pu tong tong'],
  ['平平凡凡', 'ping ping fan fan'],
  ['平平淡淡', 'ping ping dan dan'],
  ['简简单单', 'jian jian dan dan'],
  ['轻轻松松', 'qing qing song song'],
  ['舒舒服服', 'shu shu fu fu'],
  ['热热闹闹', 're re nao nao'],
  ['冷冷清清', 'leng leng qing qing'],
  ['平平静静', 'ping ping jing jing'],
  ['稳稳当当', 'wen wen dang dang'],
  ['急急忙忙', 'ji ji mang mang'],
  ['匆匆忙忙', 'cong cong mang mang'],
  ['紧紧张张', 'jin jin zhang zhang'],
  ['慢慢悠悠', 'man man you you'],
  ['摇摇晃晃', 'yao yao huang huang'],
  ['摇摇摆摆', 'yao yao bai bai'],
  ['跌跌撞撞', 'die die zhuang zhuang'],
  ['哭哭啼啼', 'ku ku ti ti'],
  ['嘻嘻哈哈', 'xi xi ha ha'],
  ['唠唠叨叨', 'lao lao dao dao'],
  ['嘀嘀咕咕', 'di di gu gu'],
  ['叮叮当当', 'ding ding dang dang'],
  ['噼噼啪啪', 'pi pi pa pa'],
  ['滴滴答答', 'di di da da'],
  ['哗哗啦啦', 'hua hua la la'],
  ['轰轰隆隆', 'hong hong long long'],
  ['叽叽喳喳', 'ji ji zha zha'],
  ['咕咕嘎嘎', 'gu gu ga ga'],
  ['咕嘟咕嘟', 'gu du gu du'],
  ['哗啦哗啦', 'hua la hua la'],
  ['乒乒乓乓', 'ping ping pang pang'],
  ['咚咚锵锵', 'dong dong qiang qiang'],
  ['偷偷摸摸', 'tou tou mo mo'],
  ['鬼鬼祟祟', 'gui gui sui sui'],
  ['马马虎虎', 'ma ma hu hu'],
  ['磨磨蹭蹭', 'mo mo ceng ceng'],
  ['婆婆妈妈', 'po po ma ma'],
  ['里里外外', 'li li wai wai'],
  ['吵吵闹闹', 'chao chao nao nao'],
  ['打打闹闹', 'da da nao nao'],
  ['说说笑笑', 'shuo shuo xiao xiao'],
  ['蹦蹦跶跶', 'beng beng da da'],
  ['圆圆滚滚', 'yuan yuan gun gun'],
  ['白白胖胖', 'bai bai pang pang'],
  ['白白净净', 'bai bai jing jing'],
  ['圆圆的脸', null], // 五字，过滤

  // ===== ABAC / ABCA 节奏型 =====
  ['一心一意', 'yi xin yi yi'],
  ['一五一十', 'yi wu yi shi'],
  ['一来一回', 'yi lai yi hui'],
  ['一上一下', 'yi shang yi xia'],
  ['一前一后', 'yi qian yi hou'],
  ['一进一出', 'yi jin yi chu'],
  ['一长一短', 'yi chang yi duan'],
  ['一高一低', 'yi gao yi di'],
  ['一明一暗', 'yi ming yi an'],
  ['一动一静', 'yi dong yi jing'],
  ['一年一度', 'yi nian yi du'],
  ['一字一句', 'yi zi yi ju'],
  ['一笔一画', 'yi bi yi hua'],
  ['一点一滴', 'yi dian yi di'],
  ['一草一木', 'yi cao yi mu'],
  ['一山一水', 'yi shan yi shui'],
  ['一花一草', 'yi hua yi cao'],
  ['一鳞一爪', 'yi lin yi zhao'],

  // ===== 祝福 / 节日 =====
  ['新年快乐', 'xin nian kuai le'],
  ['新春快乐', 'xin chun kuai le'],
  ['春节快乐', 'chun jie kuai le'],
  ['元宵快乐', 'yuan xiao kuai le'],
  ['端午快乐', 'duan wu kuai le'],
  ['中秋快乐', 'zhong qiu kuai le'],
  ['国庆快乐', 'guo qing kuai le'],
  ['五一快乐', 'wu yi kuai le'],
  ['生日快乐', 'sheng ri kuai le'],
  ['节日快乐', 'jie ri kuai le'],
  ['周末愉快', 'zhou mo yu kuai'],
  ['寒假愉快', 'han jia yu kuai'],
  ['暑假愉快', 'shu jia yu kuai'],
  ['假期愉快', 'jia qi yu kuai'],
  ['恭喜发财', 'gong xi fa cai'],
  ['学业进步', 'xue ye jin bu'],
  ['学习进步', 'xue xi jin bu'],
  ['身体健康', 'shen ti jian kang'],
  ['工作顺利', 'gong zuo shun li'],
  ['步步高升', 'bu bu gao sheng'],
  ['万事顺意', 'wan shi shun yi'],
  ['阖家欢乐', 'he jia huan le'],
  ['出入平安', 'chu ru ping an'],
  ['福寿安康', 'fu shou an kang'],
  ['一路平安', 'yi lu ping an'],
  ['笑口常开', 'xiao kou chang kai'],
  ['年年有余', 'nian nian you yu'],
  ['岁岁平安', 'sui sui ping an'],
  ['吉祥如意', 'ji xiang ru yi'],
  ['大吉大利', 'da ji da li'],

  // ===== 季节 / 自然 / 物候（孩子能感知的）=====
  ['春暖花香', 'chun nuan hua xiang'],
  ['春风拂面', 'chun feng fu mian'],
  ['烈日炎炎', 'lie ri yan yan'],
  ['雪花飘飘', 'xue hua piao piao'],
  ['白雪皑皑', 'bai xue ai ai'],
  ['寒风刺骨', 'han feng ci gu'],
  ['秋叶飘落', 'qiu ye piao luo'],
  ['秋风萧瑟', 'qiu feng xiao se'],
  ['月明星稀', 'yue ming xing xi'],
  ['星光灿烂', 'xing guang can lan'],
  ['阳光明媚', 'yang guang ming mei'],
  ['细雨绵绵', 'xi yu mian mian'],
  ['大雨倾盆', 'da yu qing pen'],
  ['乌云密布', 'wu yun mi bu'],
  ['晴空万里', 'qing kong wan li'],
  ['碧空如洗', 'bi kong ru xi'],
  ['草长莺飞', 'cao zhang ying fei'],
  ['百花齐放', 'bai hua qi fang'],
  ['花团锦簇', 'hua tuan jin cu'],
  ['绿树成荫', 'lv shu cheng yin'],
  ['硕果累累', 'shuo guo lei lei'],

  // ===== 学习 / 校园场景 =====
  ['勤学苦练', 'qin xue ku lian'],
  ['好好学习', 'hao hao xue xi'],
  ['天天向上', 'tian tian xiang shang'],
  ['认真听讲', 'ren zhen ting jiang'],
  ['用心读书', 'yong xin du shu'],
  ['同学之间', 'tong xue zhi jian'],
  ['团结友爱', 'tuan jie you ai'],
  ['互帮互助', 'hu bang hu zhu'],
  ['尊敬师长', 'zun jing shi zhang'],

  // ===== 心情 / 动作描述 =====
  ['手舞足蹈', 'shou wu zu dao'],
  ['哈哈大笑', 'ha ha da xiao'],
  ['热泪盈眶', 're lei ying kuang'],
  ['泪流满面', 'lei liu man mian'],
  ['面红耳赤', 'mian hong er chi'],
  ['面带微笑', 'mian dai wei xiao'],
  ['眉开眼笑', 'mei kai yan xiao'],
  ['垂头丧气', 'chui tou sang qi'],
  ['唉声叹气', 'ai sheng tan qi'],
  ['火冒三丈', 'huo mao san zhang'],
  ['怒气冲冲', 'nu qi chong chong'],
  ['乐不可支', 'le bu ke zhi'],

  // ===== 颜色 / 形容 =====
  ['五颜六色', 'wu yan liu se'],
  ['五光十色', 'wu guang shi se'],
  ['五彩缤纷', 'wu cai bin fen'],
  ['绚丽多彩', 'xuan li duo cai'],
  ['色彩斑斓', 'se cai ban lan'],
  ['黑白分明', 'hei bai fen ming'],

  // ===== 动物 / 名词四字（孩子熟悉的）=====
  ['小猫小狗', 'xiao mao xiao gou'],
  ['花花世界', 'hua hua shi jie'],
  ['天上人间', 'tian shang ren jian'],
  ['爷爷奶奶', 'ye ye nai nai'],
  ['爸爸妈妈', 'ba ba ma ma'],
  ['哥哥姐姐', 'ge ge jie jie'],
  ['弟弟妹妹', 'di di mei mei'],
  ['叔叔阿姨', 'shu shu a yi'],
  ['老师同学', 'lao shi tong xue'],

  // ===== 日常表达 / 口语 =====
  ['没关系啦', null], // 过滤示例
  ['好好说话', 'hao hao shuo hua'],
  ['好好吃饭', 'hao hao chi fan'],
  ['好好睡觉', 'hao hao shui jiao'],
  ['加油加油', 'jia you jia you'],
  ['不慌不忙', 'bu huang bu mang'],
  ['不紧不慢', 'bu jin bu man'],
  ['不多不少', 'bu duo bu shao'],
  ['不偏不倚', 'bu pian bu yi'],
  ['不冷不热', 'bu leng bu re'],
  ['有说有笑', 'you shuo you xiao'],
  ['有声有色', 'you sheng you se'],
  ['有头有尾', 'you tou you wei'],
  ['有滋有味', 'you zi you wei'],
  ['有模有样', 'you mo you yang'],
  ['有板有眼', 'you ban you yan']
]

console.log(`[build-phrases] reading ${IDIOM_PATH} ...`)
const idiomSet = new Set(JSON.parse(readFileSync(resolve(IDIOM_PATH), 'utf-8')).map(x => x.w))
console.log(`[build-phrases] existing idiom count: ${idiomSet.size}`)

const out = []
let skipShape = 0
let skipDup = 0
const seen = new Set()

for (const [w, p] of CANDIDATES) {
  if (!w || w.length !== 4 || !/^[一-龥]+$/.test(w)) { skipShape++; continue }
  if (!p) { skipShape++; continue }
  const syll = p.trim().split(/\s+/).filter(Boolean)
  if (syll.length !== 4) { skipShape++; continue }
  if (idiomSet.has(w)) { skipDup++; continue }
  if (seen.has(w)) { skipDup++; continue }
  seen.add(w)
  out.push({ w, p: syll.join(' ') })
}

console.log(`[build-phrases] kept: ${out.length}, skipShape: ${skipShape}, dup-with-idioms: ${skipDup}`)

mkdirSync(dirname(resolve(OUT_PATH)), { recursive: true })
writeFileSync(resolve(OUT_PATH), JSON.stringify(out), 'utf-8')
console.log(`[build-phrases] wrote ${OUT_PATH}`)
